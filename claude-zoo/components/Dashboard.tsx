'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@/lib/types';
import ClawdInstance from '@/components/ClawdInstance';

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

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
    const newPositions: Record<string, { x: number; y: number }> = {};
    let hasNew = false;
    for (const session of sessions) {
      if (!positions[session.id]) {
        hasNew = true;
        newPositions[session.id] = {
          x: Math.random() * 80 + 5,
          y: Math.random() * 60 + 10,
        };
      }
    }
    if (hasNew) {
      setPositions((prev) => ({ ...prev, ...newPositions }));
    }
  }, [sessions]);

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
        />
      ))}
    </div>
  );
}
