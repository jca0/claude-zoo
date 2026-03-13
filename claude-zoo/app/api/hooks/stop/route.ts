import { idleSession } from '@/lib/registry';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, last_assistant_message } = body;
    console.log('[claude-zoo] stop:', { session_id });
    if (typeof session_id === 'string' && session_id) {
      idleSession(session_id, typeof last_assistant_message === 'string' ? last_assistant_message : undefined);
    }
  } catch (e) {
    console.error('[claude-zoo] stop error:', e);
  }
  return Response.json({ ok: true });
}
