import { GoogleGenAI } from '@google/genai';
import type { ConversationStage, CollectedData } from '@/types/chat';

const apiKey = process.env.GEMINI_API_KEY;

let genaiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({ apiKey });
  }
  return genaiClient;
}

const MODEL = 'gemini-2.5-flash';

function buildSystemPrompt(
  stage: ConversationStage,
  collectedData: Partial<CollectedData>
): string {
  const dataContext =
    Object.keys(collectedData).length > 0
      ? `\n\nData collected so far:\n${JSON.stringify(collectedData, null, 2)}`
      : '';

  return `You are LoanScreen AI, a professional and friendly loan pre-qualification specialist chatbot.
Your purpose is to guide users through a structured pre-qualification assessment for personal loans, auto loans, and mortgages.

IMPORTANT RULES:
- Ask ONE question at a time. Never ask multiple questions in a single response.
- Be conversational but professional. Use clear, simple language.
- Never give actual loan approval. You only provide pre-qualification ESTIMATES.
- Include appropriate disclaimers when discussing rates or amounts.
- If the user gives an unclear answer, politely ask for clarification.
- Keep responses concise (2-4 sentences max for questions).
- When you receive a valid answer, briefly acknowledge it before moving to the next question.

CONVERSATION FLOW (follow this exact order):
1. GREETING: Welcome the user and explain the pre-qualification process briefly. Ask if they are ready to begin.
2. LOAN TYPE SELECTION: Ask what type of loan they are interested in (Personal, Auto, or Mortgage).
3. INCOME & EMPLOYMENT: Ask about their annual income and employment status (full-time, part-time, self-employed, retired, unemployed). You can ask income first, then employment, or accept both if offered together.
4. DEBTS & EXPENSES: Ask about their total monthly debt payments (credit cards, existing loans, etc.).
5. CREDIT SCORE RANGE: Ask them to select their approximate credit score range (Excellent 800+, Very Good 740-799, Good 670-739, Fair 580-669, Poor below 580).
6. ASSETS: Ask about their total liquid assets (savings, investments, etc.).
7. ELIGIBILITY CALCULATION: The system will calculate their eligibility. Summarize what you have collected and indicate the system is calculating.

CURRENT STAGE: ${stage}
${dataContext}

RESPONSE FORMAT:
- When suggesting quick reply options, end your message with a line containing ONLY the following format:
  QUICK_REPLIES: option1|option2|option3
  For example: QUICK_REPLIES: Personal Loan|Auto Loan|Mortgage
- For credit score, use: QUICK_REPLIES: Excellent (800+)|Very Good (740-799)|Good (670-739)|Fair (580-669)|Poor (below 580)
- Only include QUICK_REPLIES when it makes sense (loan type selection, credit score range, yes/no questions).

STAGE TRANSITIONS:
- After receiving a valid loan type, include: STAGE: income_employment
- After receiving income and employment info, include: STAGE: debts_expenses
- After receiving debt information, include: STAGE: credit_score_range
- After receiving credit score range, include: STAGE: assets
- After receiving asset information, include: STAGE: eligibility_calc`;
}

export interface GeminiStreamCallbacks {
  onThinking: (text: string) => void;
  onContent: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  userMessage: string,
  stage: ConversationStage,
  collectedData: Partial<CollectedData>,
  conversationHistory: Array<{ role: 'user' | 'model'; text: string }>,
  callbacks: GeminiStreamCallbacks
): Promise<void> {
  const client = getClient();

  const contents = conversationHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  try {
    const stream = await client.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: buildSystemPrompt(stage, collectedData),
        thinkingConfig: {
          thinkingBudget: 1024,
        },
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    let fullText = '';
    let fullThinking = '';

    for await (const chunk of stream) {
      const candidates = chunk.candidates;
      if (!candidates || candidates.length === 0) continue;

      const parts = candidates[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.thought && part.text) {
          fullThinking += part.text;
          callbacks.onThinking(part.text);
        } else if (part.text) {
          fullText += part.text;
          callbacks.onContent(part.text);
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err : new Error(String(err));
    callbacks.onError(error);
  }
}

export function parseAssistantResponse(text: string): {
  content: string;
  quickReplies: Array<{ label: string; value: string }>;
  newStage: ConversationStage | null;
} {
  let content = text;
  let quickReplies: Array<{ label: string; value: string }> = [];
  let newStage: ConversationStage | null = null;

  const stageMatch = content.match(/STAGE:\s*(\S+)/);
  if (stageMatch?.[1]) {
    const validStages = new Set<string>([
      'greeting', 'loan_type_selection', 'income_employment',
      'debts_expenses', 'credit_score_range', 'assets',
      'eligibility_calc', 'summary', 'completed',
    ]);
    if (validStages.has(stageMatch[1])) {
      newStage = stageMatch[1] as ConversationStage;
    }
    content = content.replace(/STAGE:\s*\S+\n?/, '').trim();
  }

  const qrMatch = content.match(/QUICK_REPLIES:\s*(.+)/);
  if (qrMatch?.[1]) {
    quickReplies = qrMatch[1].split('|').map((opt) => {
      const trimmed = opt.trim();
      return { label: trimmed, value: trimmed };
    });
    content = content.replace(/QUICK_REPLIES:\s*.+\n?/, '').trim();
  }

  return { content, quickReplies, newStage };
}
