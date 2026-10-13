import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {timing} from './timing';

// Die Sprachaufnahme einer Szene, ab ihrem Sprechstart. Ohne Aufnahme: nichts.
export const Voice: React.FC<{id: string; volume?: number}> = ({id, volume = 1}) => {
  const t = timing(id);
  if (!t.voice) return null;
  return (
    <Sequence from={t.start} layout="none">
      <Audio src={staticFile(t.voice)} volume={volume} />
    </Sequence>
  );
};

/** Lautstärke für Soundeffekte: leiser, solange gesprochen wird. */
export const sfxVolume = (id: string, at: number, base = 0.7) => {
  const t = timing(id);
  if (!t.voice) return base;
  return at >= t.start - 6 && at <= t.speechEnd + 6 ? base * 0.55 : base;
};
