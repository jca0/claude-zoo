'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@/lib/types';
import ClawdInstance from '@/components/ClawdInstance';

const STORAGE_KEY = 'claude-zoo-positions';
const NAMES_KEY = 'claude-zoo-names';

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

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => loadPositions());
  const [names, setNames] = useState<Record<string, string>>(() => loadNames());

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

  const FADE_DURATION_MS = 10_000;
  const now = Date.now();
  const visibleSessions = sessions
    .filter((s) => s.status !== 'done' || (s.endedAt && now - s.endedAt < FADE_DURATION_MS));

  if (visibleSessions.length === 0) {
    return (
      <div className="min-h-screen relative" style={{ backgroundImage: 'url(/grass.svg)', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />
    );
  }

  return (
    <div className="relative min-h-screen overflow-auto" style={{ backgroundImage: 'url(/grass.svg)', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}>
      {visibleSessions.map((session) => (
        <ClawdInstance
          key={session.id}
          session={session}
          position={positions[session.id] ?? { x: 50, y: 50 }}
          onDrag={handleDrag}
          name={names[session.id] ?? null}
          onRename={handleRename}
        />
      ))}
    </div>
  );
}
