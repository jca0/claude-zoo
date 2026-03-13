'use client';

import type { Session } from '@/lib/types';

interface SpeechBubbleProps {
  session: Session;
  onToggleExpand: () => void;
}

export default function SpeechBubble({ session, onToggleExpand }: SpeechBubbleProps) {
  const content = session.lastMessage
    ? (session.lastMessage.length > 40 ? session.lastMessage.slice(0, 40) + '...' : session.lastMessage)
    : '...';

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3">
      <div
        className="relative w-[240px] h-[48px] flex items-center cursor-pointer"
        onClick={onToggleExpand}
        style={{
          imageRendering: 'pixelated',
          background: '#FFFFFF',
          border: '3px solid #2A2A2A',
          borderRadius: '2px',
          boxShadow: '3px 3px 0 #2A2A2A',
        }}
      >
        <p
          className="w-full px-3 text-xs truncate"
          style={{ fontFamily: 'monospace', color: '#2A2A2A' }}
        >
          {content}
        </p>
      </div>
      {/* Pixel speech tail - triangular pointer */}
      <div className="flex justify-center" style={{ marginTop: -1 }}>
        <div style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '10px solid #2A2A2A',
        }} />
      </div>
    </div>
  );
}
