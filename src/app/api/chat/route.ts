import { streamChat, parseAssistantResponse } from '@/lib/gemini';
import { calculateEligibility } from '@/lib/rateEngine';
import { createSession, updateSession } from '@/lib/bigquery';
import { validateChatRequest, sanitizeString, validateCollectedData } from '@/lib/validators';
import type {
  ConversationStage,
  CollectedData,
  ChatRequest,
} from '@/types/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const validation = validateChatRequest(body);
  if (!validation.valid) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: validation.error } },
      { status: 400 }
    );
  }

  const chatRequest = body as ChatRequest;
  const message = sanitizeString(chatRequest.message);
  const { sessionId, userId, stage, collectedData } = chatRequest;

  // Create session in BigQuery on first message
  if (stage === 'greeting') {
    try {
      await createSession({
        sessionId,
        userId,
        stage,
        collectedData: collectedData ?? {},
      });
    } catch (bqErr: unknown) {
      const bqMsg = bqErr instanceof Error ? bqErr.message : String(bqErr);
      console.error(`[BigQuery] Failed to create session ${sessionId}: ${bqMsg}`);
    }
  }

  const conversationHistory: Array<{ role: 'user' | 'model'; text: string }> = [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown): void {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      }

      try {
        let fullResponse = '';

        await streamChat(
          message,
          stage,
          collectedData ?? {},
          conversationHistory,
          {
            onThinking(text: string) {
              send('thinking', { text });
            },
            onContent(text: string) {
              send('content', { text });
            },
            onComplete(fullText: string) {
              fullResponse = fullText;
            },
            onError(error: Error) {
              send('error', { message: error.message });
              controller.close();
            },
          }
        );

        if (!fullResponse) {
          send('done', { finished: true });
          controller.close();
          return;
        }

        const parsed = parseAssistantResponse(fullResponse);

        if (parsed.newStage) {
          send('stage_update', { stage: parsed.newStage });
        }

        if (parsed.quickReplies.length > 0) {
          send('quick_replies', { options: parsed.quickReplies });
        }

        const effectiveStage: ConversationStage =
          parsed.newStage ?? stage;

        if (effectiveStage === 'eligibility_calc') {
          const dataCheck = validateCollectedData(collectedData ?? {});
          if (dataCheck.complete) {
            const result = calculateEligibility(
              collectedData as CollectedData
            );
            send('result', result);
            send('stage_update', { stage: 'summary' });

            try {
              await updateSession(sessionId, {
                stage: 'summary',
                collectedData: collectedData ?? {},
                eligibilityResult: result,
              });
            } catch (bqErr: unknown) {
              const bqMsg = bqErr instanceof Error ? bqErr.message : String(bqErr);
              console.error(`[BigQuery] Failed to update session ${sessionId}: ${bqMsg}`);
            }
          } else {
            // Data incomplete — inform user and go back to collect missing fields
            const missingFields = dataCheck.missing.join(', ');
            send('content', {
              text: `\n\nI still need a few details before I can calculate your eligibility: ${missingFields}. Let me ask about those now.`,
            });

            // Determine which stage to return to based on first missing field
            const stageMap: Record<string, ConversationStage> = {
              loanType: 'loan_type_selection',
              annualIncome: 'income_employment',
              employmentStatus: 'income_employment',
              monthlyDebts: 'debts_expenses',
              creditScoreRange: 'credit_score_range',
              totalAssets: 'assets',
            };
            const firstMissing = dataCheck.missing[0];
            const backStage = stageMap[firstMissing] ?? 'income_employment';
            send('stage_update', { stage: backStage });
          }
        } else {
          try {
            await updateSession(sessionId, {
              stage: effectiveStage,
              collectedData: collectedData ?? {},
            });
          } catch (bqErr: unknown) {
            const bqMsg = bqErr instanceof Error ? bqErr.message : String(bqErr);
            console.error(`[BigQuery] Failed to update session ${sessionId}: ${bqMsg}`);
          }
        }

        send('done', { finished: true });
        controller.close();
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        send('error', { message: errorMessage });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
