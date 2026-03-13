'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Session, SessionStats, ParsedMessage } from '@/lib/types';
import ThoughtBubble from '@/components/ThoughtBubble';
import SpeechBubble from '@/components/SpeechBubble';
import StatsPopup from '@/components/StatsPopup';
import ConversationView from '@/components/ConversationView';

interface ClawdInstanceProps {
  session: Session;
  position: { x: number; y: number };
  onDrag: (sessionId: string, x: number, y: number) => void;
  name: string | null;
  onRename: (sessionId: string, name: string) => void;
  onHide: (sessionId: string) => void;
}

function shortenPath(cwd: string): string {
  const segments = cwd.split('/').filter(Boolean);
  return segments.slice(-2).join('/');
}

export default function ClawdInstance({ session, position, onDrag, name, onRename, onHide }: ClawdInstanceProps) {
  const [expanded, setExpanded] = useState(false);
  const [conversation, setConversation] = useState<ParsedMessage[] | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const isActive = session.status === 'active';
  const isIdle = session.status === 'idle';
  const [blinking, setBlinking] = useState(false);

  // Blink - toggle to blink sprite briefly every 3-5s
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 2000;
      return setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 150);
      }, delay);
    };
    let timer = scheduleBlink();
    const interval = setInterval(() => {
      clearTimeout(timer);
      timer = scheduleBlink();
    }, 5000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  // Idle wandering - random hops every few seconds
  useEffect(() => {
    if (!isIdle || expanded || showStats) return;
    const hop = () => {
      if (dragging.current) return;
      const dx = (Math.random() - 0.5) * 3;
      const dy = (Math.random() - 0.5) * 3;
      const newX = Math.max(0, Math.min(95, position.x + dx));
      const newY = Math.max(0, Math.min(90, position.y + dy));
      onDrag(session.id, newX, newY);
    };
    const delay = 2000 + Math.random() * 3000;
    const timer = setTimeout(hop, delay);
    return () => clearTimeout(timer);
  }, [isIdle, expanded, showStats, position, session.id, onDrag]);

  async function handleToggleExpand() {
    if (expanded) {
      setExpanded(false);
      setConversation(null);
    } else {
      setExpanded(true);
      try {
        const res = await fetch(`/api/session/${session.id}/conversation`);
        if (res.ok) {
          setConversation(await res.json());
        }
      } catch {
        // silently fail
      }
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from the clawd image area, not from bubbles/conversation
    dragging.current = true;
    didDrag.current = false;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: position.x, y: position.y };
    e.preventDefault();

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const container = document.querySelector('.min-h-screen');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = ((e.clientX - startMouse.current.x) / rect.width) * 100;
      const dy = ((e.clientY - startMouse.current.y) / rect.height) * 100;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) didDrag.current = true;
      const newX = Math.max(0, Math.min(95, startPos.current.x + dx));
      const newY = Math.max(0, Math.min(90, startPos.current.y + dy));
      onDrag(session.id, newX, newY);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      if (!didDrag.current) {
        setShowStats((prev) => {
          if (!prev) {
            fetch(`/api/session/${session.id}/stats`)
              .then((r) => r.ok ? r.json() : null)
              .then((data) => { if (data) setStats(data); })
              .catch(() => {});
          }
          return !prev;
        });
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [position, session.id, onDrag]);

  return (
    <div
      style={{ position: 'absolute', left: `${position.x}%`, top: `${position.y}%`, zIndex: (showStats || expanded) ? 10 : 1, transition: isIdle && !dragging.current ? 'left 0.6s ease-in-out, top 0.6s ease-in-out' : 'none' }}
      className="flex flex-col items-center relative"
    >
      <div className="relative flex flex-col items-center">
        {isActive && (
          <ThoughtBubble
            session={session}
            onToggleExpand={handleToggleExpand}
          />
        )}
        {isIdle && session.lastMessage && (
          <SpeechBubble
            session={session}
            onToggleExpand={handleToggleExpand}
          />
        )}
        <img
          src={blinking ? '/clawd_blink.svg' : '/clawd.svg'}
          alt="Clawd"
          width={80}
          height={80}
          style={{ imageRendering: 'pixelated' }}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          draggable={false}
        />
      </div>
      {editing ? (
        <input
          ref={inputRef}
          className="text-xs text-center mt-1 px-1 outline-none w-[120px]"
          style={{ fontFamily: 'monospace', color: '#2A2A2A', fontWeight: 'bold', background: '#FFFBE6', border: '2px solid #2A2A2A', borderRadius: '2px' }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            const trimmed = editValue.trim();
            if (trimmed) onRename(session.id, trimmed);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const trimmed = editValue.trim();
              if (trimmed) onRename(session.id, trimmed);
              setEditing(false);
            } else if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          className="text-xs mt-1 whitespace-nowrap select-none cursor-pointer"
          style={{ fontFamily: 'monospace', color: '#2A2A2A', fontWeight: 'bold', textShadow: '1px 1px 0 rgba(255,255,255,0.5)' }}
          onDoubleClick={() => {
            setEditValue(name || shortenPath(session.cwd));
            setEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          title="Double-click to rename"
        >
          {name || shortenPath(session.cwd)}
        </span>
      )}
      {showStats && stats && (
        <StatsPopup stats={stats} side="right" onHide={() => onHide(session.id)} />
      )}
      {expanded && conversation && (
        <ConversationView messages={conversation} />
      )}
    </div>
  );
}
