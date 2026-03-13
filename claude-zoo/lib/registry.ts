import type { Session } from '@/lib/types';

const DONE_TTL = 30 * 60_000; // 30 minutes
const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes

const registry = ((globalThis as any).__claudeZooRegistry ??= new Map<string, Session>());

function cleanup() {
  const now = Date.now();
  for (const [id, session] of registry) {
    if (session.status === 'done' && session.endedAt && now - session.endedAt > DONE_TTL) {
      registry.delete(id);
    }
  }
}

if (!(globalThis as any).__claudeZooCleanupInterval) {
  (globalThis as any).__claudeZooCleanupInterval = setInterval(cleanup, CLEANUP_INTERVAL);
}

export function addSession(id: string, cwd: string): void {
  const existing = registry.get(id);
  if (existing) {
    existing.status = 'active';
    existing.endedAt = null;
    existing.lastActivity = Date.now();
  } else {
    registry.set(id, {
      id,
      cwd,
      status: 'active',
      lastTool: null,
      lastToolInput: null,
      lastActivity: Date.now(),
      startedAt: Date.now(),
      endedAt: null,
    });
  }
}

export function updateToolUse(id: string, cwd: string, toolName: string, toolInput?: string): void {
  let session = registry.get(id);
  if (!session) {
    addSession(id, cwd);
    session = registry.get(id)!;
  }
  session.lastTool = toolName;
  session.lastToolInput = toolInput ?? null;
  session.lastActivity = Date.now();
}

export function idleSession(id: string): void {
  const session = registry.get(id);
  if (session) {
    session.status = 'idle';
  }
}

export function endSession(id: string): void {
  const session = registry.get(id);
  if (session) {
    session.status = 'done';
    session.endedAt = Date.now();
  }
}

export function getAllSessions(): Session[] {
  return Array.from(registry.values());
}

export function getSession(id: string): Session | undefined {
  return registry.get(id);
}
