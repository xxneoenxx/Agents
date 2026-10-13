import React from 'react';
import {MiniClaude} from '../lib/MiniClaude';
import {C, FONT, MOOD_COLOR} from '../lib/theme';

// Ein neutraler, dunkler Desktop für den Problemteil (Szenen 01–02):
// Editor, Browser und Terminal ohne Logos, Fenstertasten nur als Striche.

export type WinBox = {x: number; y: number; w: number; h: number};
export const TERMINAL: WinBox = {x: 210, y: 360, w: 800, h: 540};
export const EDITOR: WinBox = {x: 70, y: 300, w: 820, h: 580};
export const BROWSER: WinBox = {x: 130, y: 420, w: 840, h: 580};

const Win: React.FC<{box: WinBox; title: string; style?: React.CSSProperties; children?: React.ReactNode; glow?: number}> = ({box, title, style, children, glow = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: box.x,
      top: box.y,
      width: box.w,
      height: box.h,
      borderRadius: 18,
      background: '#1E1915',
      border: `2px solid ${C.lineStrong}`,
      boxShadow: `0 30px 70px rgba(0,0,0,0.55)${glow > 0 ? `, 0 0 ${60 * glow}px ${18 * glow}px rgba(255,200,87,${0.55 * glow})` : ''}`,
      overflow: 'hidden',
      ...style,
    }}
  >
    <div style={{height: 58, display: 'flex', alignItems: 'center', padding: '0 22px', borderBottom: `2px solid ${C.line}`, background: '#241E19'}}>
      <span style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 26, color: C.muted, flex: 1}}>{title}</span>
      {/* Fenstertasten, neutral */}
      <span style={{display: 'flex', gap: 26, alignItems: 'center'}}>
        <span style={{width: 20, height: 3, background: C.muted, opacity: 0.7}} />
        <span style={{width: 18, height: 18, border: `3px solid ${C.muted}`, opacity: 0.7, boxSizing: 'border-box'}} />
        <span style={{position: 'relative', width: 20, height: 20, opacity: 0.7}}>
          <span style={{position: 'absolute', left: 9, top: -3, width: 3, height: 26, background: C.muted, transform: 'rotate(45deg)'}} />
          <span style={{position: 'absolute', left: 9, top: -3, width: 3, height: 26, background: C.muted, transform: 'rotate(-45deg)'}} />
        </span>
      </span>
    </div>
    <div style={{position: 'relative', height: box.h - 58}}>{children}</div>
  </div>
);

const Line: React.FC<{w: number; color?: string; indent?: number}> = ({w, color = 'rgba(246,239,232,0.16)', indent = 0}) => (
  <div style={{height: 16, width: w, marginLeft: indent, borderRadius: 8, background: color}} />
);

/** Editor mit Code-Zeilen und einem halb geschriebenen Funktionsnamen. */
export const EditorWin: React.FC<{style?: React.CSSProperties; caretOn?: boolean; typed?: string}> = ({style, caretOn = true, typed = 'function validateKont'}) => (
  <Win box={EDITOR} title="kontakt.ts – Editor" style={style}>
    <div style={{padding: '34px 40px', display: 'flex', flexDirection: 'column', gap: 22}}>
      <Line w={260} color="rgba(143,184,255,0.35)" />
      <Line w={420} indent={40} />
      <Line w={340} indent={40} />
      <Line w={180} indent={40} color="rgba(255,154,98,0.35)" />
      <Line w={120} />
      <div style={{height: 10}} />
      <div style={{fontFamily: FONT.mono, fontSize: 30, color: C.text, display: 'flex', alignItems: 'center'}}>
        <span style={{color: '#8FB8FF'}}>{typed.split(' ')[0]}</span>&nbsp;{typed.split(' ').slice(1).join(' ')}
        <span style={{display: 'inline-block', width: 3, height: 34, marginLeft: 3, background: C.text, opacity: caretOn ? 1 : 0}} />
      </div>
      <div style={{height: 10}} />
      <Line w={300} />
      <Line w={460} indent={40} />
      <Line w={220} indent={40} />
    </div>
  </Win>
);

/** Browser mit Adresszeile und Inhaltsblöcken. */
export const BrowserWin: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <Win box={BROWSER} title="Dokumentation – Browser" style={style}>
    <div style={{padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: 22}}>
      <div style={{height: 46, borderRadius: 23, background: 'rgba(246,239,232,0.07)', display: 'flex', alignItems: 'center', padding: '0 24px'}}>
        <Line w={300} color="rgba(246,239,232,0.22)" />
      </div>
      <div style={{height: 150, borderRadius: 14, background: 'rgba(143,184,255,0.10)'}} />
      <Line w={620} />
      <Line w={560} />
      <Line w={600} />
      <Line w={380} />
    </div>
  </Win>
);

/** Terminal der Sitzung „portfolio“, optional mit wartendem Mini-Claude und Befehl. */
export const TerminalWin: React.FC<{style?: React.CSSProperties; glow?: number; mascot?: boolean; command?: boolean; tagPulse?: number; frame?: number}> = ({style, glow = 0, mascot = true, command = false, tagPulse = 1, frame}) => (
  <Win box={TERMINAL} title="Terminal · portfolio" style={style} glow={glow}>
    <div style={{padding: '30px 36px', fontFamily: FONT.mono, fontSize: 28, color: C.muted, display: 'flex', flexDirection: 'column', gap: 18}}>
      <span>
        <span style={{color: MOOD_COLOR.done}}>✓</span> 12 Tests bestanden
      </span>
      {command ? (
        <>
          <span style={{color: C.text}}>
            <span style={{color: C.accent}}>$</span> npm run build &amp;&amp; npm run deploy
          </span>
          <span
            style={{
              alignSelf: 'flex-start',
              padding: '8px 18px',
              borderRadius: 12,
              background: `rgba(255,200,87,${0.12 + 0.2 * tagPulse})`,
              border: `2px solid ${MOOD_COLOR.waiting}`,
              color: MOOD_COLOR.waiting,
              fontSize: 28,
            }}
          >
            ● wartet auf Freigabe
          </span>
        </>
      ) : null}
    </div>
    {mascot ? (
      <div style={{position: 'absolute', right: 70, bottom: 60}}>
        <MiniClaude size={150} mood="waiting" frame={frame} />
      </div>
    ) : null}
  </Win>
);

/** Umschalter-Streifen (Alt-Tab) mit drei Kacheln; `selected` 0..2 (darf zwischen den Kacheln liegen). */
export const Switcher: React.FC<{selected: number; opacity?: number; scale?: number}> = ({selected, opacity = 1, scale = 1}) => {
  const tiles = ['Editor', 'Browser', 'Terminal'];
  const tileW = 230;
  const gap = 26;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540,
        top: 610,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        padding: 26,
        borderRadius: 28,
        background: 'rgba(30,25,21,0.94)',
        border: `2px solid ${C.lineStrong}`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        display: 'flex',
        gap,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 26 + selected * (tileW + gap) - 8,
          top: 18,
          width: tileW + 16,
          height: 196,
          borderRadius: 20,
          border: `4px solid ${C.text}`,
          boxSizing: 'border-box',
        }}
      />
      {tiles.map((t) => (
        <div key={t} style={{width: tileW, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center'}}>
          <div style={{width: tileW, height: 130, borderRadius: 12, background: '#2A231E', border: `2px solid ${C.line}`}} />
          <span style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 28, color: C.text}}>{t}</span>
        </div>
      ))}
    </div>
  );
};
