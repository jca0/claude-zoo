import type { Session } from '@/lib/types';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
      lastMessage: null,
    });
  }
}

export function updateToolUse(id: string, cwd: string, toolName: string, toolInput?: string): void {
  let session = registry.get(id);
  if (!session) {
    addSession(id, cwd);
    session = registry.get(id)!;
  }
  session.status = 'active';
  session.lastTool = toolName;
  session.lastToolInput = toolInput ?? null;
  session.lastActivity = Date.now();
}

export function idleSession(id: string, lastMessage?: string): void {
  const session = registry.get(id);
  if (session) {
    session.status = 'idle';
    if (lastMessage) {
      session.lastMessage = lastMessage;
    }
  }
}

export function endSession(id: string): void {
  const session = registry.get(id);
  if (session) {
    session.status = 'done';
    session.endedAt = Date.now();
  }
}

// Scan ~/.claude/projects/ for recently modified JSONL files and register them
function scanExistingSessions() {
  try {
    const projectsDir = path.join(os.homedir(), '.claude', 'projects');
    if (!fs.existsSync(projectsDir)) return;

    for (const dir of fs.readdirSync(projectsDir)) {
      const dirPath = path.join(projectsDir, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;

      for (const file of fs.readdirSync(dirPath)) {
        if (!file.endsWith('.jsonl')) continue;

        const sessionId = file.replace('.jsonl', '');
        if (registry.has(sessionId)) continue;

        // Only register if session directory exists (indicates active session)
        const sessionDir = path.join(dirPath, sessionId);
        if (!fs.existsSync(sessionDir) || !fs.statSync(sessionDir).isDirectory()) continue;

        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        // Reconstruct cwd from mangled dir name: -Users-foo-bar → /Users/foo/bar
        const cwd = dir.replace(/^-/, '/').replaceAll('-', '/');

        // Read first user line to get actual cwd if available
        let realCwd = cwd;
        try {
          const head = fs.readFileSync(filePath, 'utf-8').split('\n').slice(0, 10);
          for (const line of head) {
            try {
              const entry = JSON.parse(line);
              if (entry.cwd) { realCwd = entry.cwd; break; }
            } catch { continue; }
          }
        } catch { /* ignore */ }

        registry.set(sessionId, {
          id: sessionId,
          cwd: realCwd,
          status: 'idle',
          lastTool: null,
          lastToolInput: null,
          lastActivity: stat.mtimeMs,
          startedAt: stat.birthtimeMs,
          endedAt: null,
          lastMessage: null,
        });
      }
    }
  } catch (e) {
    console.error('[claude-zoo] scan error:', e);
  }
}

if (!(globalThis as any).__claudeZooScanned) {
  (globalThis as any).__claudeZooScanned = true;
  scanExistingSessions();
}

export function getAllSessions(): Session[] {
  return Array.from(registry.values());
}

export function getSession(id: string): Session | undefined {
  return registry.get(id);
}
