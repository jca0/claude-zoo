'use client';

import { useState, useRef, useCallback } from 'react';
import type { Session } from '@/lib/types';

interface SpeechBubbleProps {
  session: Session;
  onToggleExpand: () => void;
}

type Edge = 'left' | 'right' | 'top' | 'top-left' | 'top-right';

export default function SpeechBubble({ session, onToggleExpand }: SpeechBubbleProps) {
  const [size, setSize] = useState({ w: 240, h: 48 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const content = session.lastMessage ?? '...';

  const startResize = useCallback((edge: Edge) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = sizeRef.current.w;
    const startH = sizeRef.current.h;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newW = startW;
      let newH = startH;

      if (edge === 'right' || edge === 'top-right') newW = Math.max(120, startW + dx * 2);
      if (edge === 'left' || edge === 'top-left') newW = Math.max(120, startW - dx * 2);
      if (edge === 'top' || edge === 'top-left' || edge === 'top-right') newH = Math.max(36, startH - dy);

      setSize({ w: newW, h: newH });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3">
      <div
        className="relative flex items-center cursor-pointer overflow-hidden"
        onClick={onToggleExpand}
        style={{
          width: size.w,
          height: size.h,
          imageRendering: 'pixelated',
          background: '#FFFFFF',
          border: '2px solid #2A2A2A',
          borderRadius: '2px',
          boxShadow: '2px 2px 0 #2A2A2A',
        }}
      >
        <p
          className="w-full px-3"
          style={{
            fontFamily: 'monospace',
            color: '#2A2A2A',
            fontSize: 12,
            lineHeight: '16px',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical' as const,
            WebkitLineClamp: Math.max(1, Math.floor((size.h - 20) / 16)),
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </p>
        <div className="absolute top-0 left-0 w-[10px] h-[10px] cursor-nwse-resize" onMouseDown={startResize('top-left')} />
        <div className="absolute top-0 right-0 w-[10px] h-[10px] cursor-nesw-resize" onMouseDown={startResize('top-right')} />
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
