import { getUserById } from '@/lib/bigquery';
import { DEMO_USERS } from '@/types/user';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'User ID is required' } },
      { status: 400 }
    );
  }

  const demoUser = DEMO_USERS.find((u) => u.id === id);
  if (demoUser) {
    return Response.json({ data: demoUser });
  }

  try {
    const user = await getUserById(id);
    if (!user) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }
    return Response.json({ data: user });
  } catch {
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } },
      { status: 500 }
    );
  }
}
