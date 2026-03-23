import { v4 as uuidv4 } from 'uuid';
import { createSession } from '@/lib/bigquery';

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

  if (typeof body !== 'object' || body === null) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Request body must be a JSON object' } },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;
  const userId = data.userId;

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'userId is required' } },
      { status: 400 }
    );
  }

  const sessionId = uuidv4();

  try {
    await createSession({
      sessionId,
      userId,
      stage: 'greeting',
      collectedData: {},
    });
  } catch {
    // BigQuery may not be configured in local dev; return session
    // ID regardless so the chat flow works without persistence.
  }

  return Response.json(
    { data: { sessionId, userId, stage: 'greeting' } },
    { status: 201 }
  );
}
