import { updateToolUse } from '@/lib/registry';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, cwd, tool_name, tool_input } = body;
    if (typeof session_id === 'string' && session_id) {
      updateToolUse(session_id, cwd ?? '', tool_name ?? '', tool_input?.file_path ?? tool_input?.command?.slice(0, 100) ?? undefined);
    }
  } catch {
    // hooks must never error
  }
  return Response.json({ ok: true });
}
