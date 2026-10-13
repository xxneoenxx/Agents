import React from 'react';
import {MiniClaude} from './MiniClaude';
import {LOOP} from './layout';

// Erstes Bild von 01 und letztes Bild von 14 – identisch, damit das Video nahtlos loopt.
// `frame` steuert die Stimmungsbewegung; für das exakte Loop-Bild frame={0} verwenden.
export const LoopHero: React.FC<{frame?: number; x?: number; y?: number; scale?: number; arms?: number; legs?: number}> = ({frame = 0, x = 0, y = 0, scale = 1, arms = 1, legs = 1}) => {
  const size = LOOP.size;
  const h = size * 0.625;
  return (
    <div
      style={{
        position: 'absolute',
        left: LOOP.cx - size / 2,
        top: LOOP.cy - h / 2,
        transformOrigin: '50% 100%',
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
      }}
    >
      <MiniClaude size={size} mood="waiting" frame={frame} arms={arms} legs={legs} />
    </div>
  );
};
