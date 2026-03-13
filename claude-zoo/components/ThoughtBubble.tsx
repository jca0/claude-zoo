'use client';

import type { Session } from '@/lib/types';

interface ThoughtBubbleProps {
  session: Session;
  onToggleExpand: () => void;
  expanded: boolean;
}

export default function ThoughtBubble({ session, onToggleExpand, expanded }: ThoughtBubbleProps) {
  let content: string;
  if (session.lastToolInput) {
    content = session.lastToolInput.length > 40
      ? session.lastToolInput.slice(0, 40) + '...'
      : session.lastToolInput;
  } else if (session.lastTool) {
    content = `using ${session.lastTool}`;
  } else {
    content = 'thinking...';
  }

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3">
      {/* Pixel-art speech bubble */}
      <div
        className="relative w-[240px] h-[48px] flex items-center cursor-pointer"
        onClick={onToggleExpand}
        style={{
          imageRendering: 'pixelated',
          background: '#FFFBE6',
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
      {/* Pixel tail - two small squares */}
      <div className="flex flex-col items-center">
        <div style={{ width: 10, height: 10, background: '#FFFBE6', border: '2px solid #2A2A2A', marginTop: -1 }} />
        <div style={{ width: 6, height: 6, background: '#FFFBE6', border: '2px solid #2A2A2A', marginTop: 2 }} />
      </div>
    </div>
  );
}
