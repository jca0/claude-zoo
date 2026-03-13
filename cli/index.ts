import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';

const projectRoot = path.resolve(import.meta.dir, '..');
const nextAppDir = path.resolve(projectRoot, 'claude-zoo');
const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
const settingsTmpPath = settingsPath + '.tmp';

const MARKER = 'localhost:3000/api/hooks/';

const HOOK_EVENTS: Record<string, string> = {
  SessionStart: 'http://localhost:3000/api/hooks/session-start',
  PreToolUse: 'http://localhost:3000/api/hooks/pre-tool-use',
  PostToolUse: 'http://localhost:3000/api/hooks/post-tool-use',
  Stop: 'http://localhost:3000/api/hooks/stop',
  SessionEnd: 'http://localhost:3000/api/hooks/session-end',
};

let nextProcess: ReturnType<typeof Bun.spawn> | null = null;
let cleaned = false;

function readSettings(): any {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettingsAtomic(settings: any): void {
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsTmpPath, JSON.stringify(settings, null, 2) + '\n');
  fs.renameSync(settingsTmpPath, settingsPath);
}

function removeClaudeZooHooks(settings: any): void {
  if (!settings.hooks || typeof settings.hooks !== 'object') return;
  for (const eventName of Object.keys(settings.hooks)) {
    if (!Array.isArray(settings.hooks[eventName])) continue;
    settings.hooks[eventName] = settings.hooks[eventName].filter((group: any) => {
      if (!group.hooks || !Array.isArray(group.hooks)) return true;
      return !group.hooks.some((h: any) => typeof h.url === 'string' && h.url.includes(MARKER));
    });
    if (settings.hooks[eventName].length === 0) {
      delete settings.hooks[eventName];
    }
  }
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }
}

function installHooks(settings: any): void {
  if (!settings.hooks) settings.hooks = {};
  for (const [eventName, url] of Object.entries(HOOK_EVENTS)) {
    if (!Array.isArray(settings.hooks[eventName])) {
      settings.hooks[eventName] = [];
    }
    settings.hooks[eventName].push({
      matcher: '',
      hooks: [{ type: 'http', url }],
    });
  }
}

function cleanup(): void {
  if (cleaned) return;
  cleaned = true;
  try {
    const settings = readSettings();
    removeClaudeZooHooks(settings);
    writeSettingsAtomic(settings);
  } catch (e) {
    console.error('Failed to clean up hooks:', e);
  }
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
}

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host: '127.0.0.1', port }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
    sock.setTimeout(1000, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(maxMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch('http://localhost:3000');
      if (res.ok || res.status < 500) return;
    } catch {
      // not ready yet
    }
    await Bun.sleep(500);
  }
  throw new Error('Server did not start within 30 seconds');
}

async function main() {
  // Check port availability
  if (await checkPort(3000)) {
    console.error('Port 3000 already in use. Is claude-zoo already running?');
    process.exit(1);
  }

  // Read settings, clean stale hooks, install fresh ones
  const settings = readSettings();
  removeClaudeZooHooks(settings);
  installHooks(settings);
  writeSettingsAtomic(settings);
  console.log('Installed Claude Code hooks.');

  // Spawn Next.js dev server
  nextProcess = Bun.spawn(['npx', 'next', 'dev'], {
    cwd: nextAppDir,
    stdout: 'inherit',
    stderr: 'inherit',
  });

  // Register cleanup handlers
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    cleanup();
    process.exit(1);
  });

  // Wait for server and open browser
  try {
    console.log('Waiting for Next.js server...');
    await waitForServer();
    console.log('Server ready. Opening browser...');
    Bun.spawn(['open', 'http://localhost:3000']);
  } catch (e) {
    console.error(String(e));
    cleanup();
    process.exit(1);
  }
}

main();
