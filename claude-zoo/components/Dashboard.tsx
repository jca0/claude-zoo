'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@/lib/types';
import ClawdInstance from '@/components/ClawdInstance';

const STORAGE_KEY = 'claude-zoo-positions';
const NAMES_KEY = 'claude-zoo-names';
const HIDDEN_KEY = 'claude-zoo-hidden';

function loadPositions(): Record<string, { x: number; y: number }> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, { x: number; y: number }>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore
  }
}

function loadNames(): Record<string, string> {
  try {
    const stored = localStorage.getItem(NAMES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveNames(names: Record<string, string>) {
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  } catch {
    // ignore
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const mon = d.toLocaleString('en', { month: 'short' });
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${mon} ${day} ${h}:${m}`;
}

function shortenPath(cwd: string): string {
  const segments = cwd.split('/').filter(Boolean);
  return segments.slice(-2).join('/');
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => loadPositions());
  const [names, setNames] = useState<Record<string, string>>(() => loadNames());
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/sessions');
        if (!cancelled) {
          setSessions(await res.json());
          setTimeout(poll, 3000);
        }
      } catch {
        if (!cancelled) setTimeout(poll, 3000);
      }
    }
    poll();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const saved = loadPositions();
    const newPositions: Record<string, { x: number; y: number }> = {};
    let hasNew = false;
    for (const session of sessions) {
      if (!positions[session.id] && !saved[session.id]) {
        hasNew = true;
        newPositions[session.id] = {
          x: Math.random() * 80 + 5,
          y: Math.random() * 60 + 10,
        };
      } else if (!positions[session.id] && saved[session.id]) {
        hasNew = true;
        newPositions[session.id] = saved[session.id];
      }
    }
    if (hasNew) {
      setPositions((prev) => {
        const next = { ...prev, ...newPositions };
        savePositions(next);
        return next;
      });
    }
  }, [sessions]);

  const handleDrag = useCallback((sessionId: string, x: number, y: number) => {
    setPositions((prev) => {
      const next = { ...prev, [sessionId]: { x, y } };
      savePositions(next);
      return next;
    });
  }, []);

  const handleRename = useCallback((sessionId: string, name: string) => {
    setNames((prev) => {
      const next = { ...prev, [sessionId]: name };
      saveNames(next);
      return next;
    });
  }, []);

  const handleHide = useCallback((sessionId: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(sessionId);
      try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const handleUnhide = useCallback((sessionId: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const FADE_DURATION_MS = 10_000;
  const now = Date.now();
  const visibleSessions = sessions
    .filter((s) => s.status !== 'done' || (s.endedAt && now - s.endedAt < FADE_DURATION_MS))
    .filter((s) => !hidden.has(s.id));

  const menu = (
    <div className="absolute top-3 left-3" style={{ zIndex: 50 }}>
      <button
        className="cursor-pointer"
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: '#2A2A2A',
          background: '#FFFBE6',
          border: '2px solid #2A2A2A',
          borderRadius: '2px',
          boxShadow: '2px 2px 0 #2A2A2A',
          padding: '4px 8px',
          imageRendering: 'pixelated',
        }}
        onClick={() => setMenuOpen((p) => !p)}
      >
        sessions
      </button>
      {menuOpen && (
        <div
          className="mt-1 overflow-auto"
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: '#2A2A2A',
            background: '#FFFBE6',
            border: '2px solid #2A2A2A',
            borderRadius: '2px',
            boxShadow: '2px 2px 0 #2A2A2A',
            padding: 4,
            maxHeight: 400,
            minWidth: 200,
            imageRendering: 'pixelated',
          }}
        >
          {sessions.map((s) => {
            const isHidden = hidden.has(s.id);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 px-1 py-1 cursor-pointer hover:bg-black/5"
                style={{ opacity: isHidden ? 0.4 : 1 }}
                onClick={() => isHidden ? handleUnhide(s.id) : undefined}
              >
                <div className="truncate">
                  <span className="font-bold">{names[s.id] || shortenPath(s.cwd)}</span>
                  <span className="ml-1" style={{ color: '#7A7060' }}>{formatDate(s.startedAt)}</span>
                </div>
                <span style={{ color: '#7A7060', flexShrink: 0 }}>{s.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (visibleSessions.length === 0) {
    return (
      <div className="min-h-screen relative" style={{ backgroundImage: 'url(/grass.svg)', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}>
        {menu}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-auto" style={{ backgroundImage: 'url(/grass.svg)', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}>
      {menu}
      {visibleSessions.map((session) => (
        <ClawdInstance
          key={session.id}
          session={session}
          position={positions[session.id] ?? { x: 50, y: 50 }}
          onDrag={handleDrag}
          name={names[session.id] ?? null}
          onRename={handleRename}
          onHide={handleHide}
        />
      ))}
    </div>
  );
}
