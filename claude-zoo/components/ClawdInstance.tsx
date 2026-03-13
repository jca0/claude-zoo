'use client';

import { useState, useRef, useCallback } from 'react';
import type { Session, ParsedMessage } from '@/lib/types';
import ThoughtBubble from '@/components/ThoughtBubble';
import SpeechBubble from '@/components/SpeechBubble';
import ConversationView from '@/components/ConversationView';

interface ClawdInstanceProps {
  session: Session;
  position: { x: number; y: number };
  onDrag: (sessionId: string, x: number, y: number) => void;
  name: string | null;
  onRename: (sessionId: string, name: string) => void;
}

function shortenPath(cwd: string): string {
  const segments = cwd.split('/').filter(Boolean);
  return segments.slice(-2).join('/');
}

export default function ClawdInstance({ session, position, onDrag, name, onRename }: ClawdInstanceProps) {
  const [expanded, setExpanded] = useState(false);
  const [conversation, setConversation] = useState<ParsedMessage[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const isActive = session.status === 'active';
  const isIdle = session.status === 'idle';

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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [position, session.id, onDrag]);

  return (
    <div
      style={{ position: 'absolute', left: `${position.x}%`, top: `${position.y}%` }}
      className="flex flex-col items-center"
    >
      <div className="relative flex flex-col items-center">
        {isActive && (
          <ThoughtBubble
            session={session}
            onToggleExpand={handleToggleExpand}
            expanded={expanded}
          />
        )}
        {isIdle && session.lastMessage && (
          <SpeechBubble
            session={session}
            onToggleExpand={handleToggleExpand}
          />
        )}
        <img
          src="/clawd.svg"
          alt="Clawd"
          width={80}
          height={80}
          className={isActive ? 'animate-clawd-bounce cursor-grab active:cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}
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
      {expanded && conversation && (
        <ConversationView messages={conversation} />
      )}
    </div>
  );
}
