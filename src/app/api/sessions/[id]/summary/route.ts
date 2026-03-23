import { getSession } from '@/lib/bigquery';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Session ID is required' } },
      { status: 400 }
    );
  }

  try {
    const session = await getSession(id);

    if (!session) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    const collectedData: unknown = session.collected_data
      ? JSON.parse(session.collected_data)
      : {};

    const eligibilityResult: unknown = session.eligibility_result
      ? JSON.parse(session.eligibility_result)
      : null;

    return Response.json({
      data: {
        sessionId: session.session_id,
        userId: session.user_id,
        stage: session.stage,
        collectedData,
        eligibilityResult,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
    });
  } catch {
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch session summary' } },
      { status: 500 }
    );
  }
}
