import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';

// Flicks mitgelieferte Soundeffekte (public/sounds), nur zu sichtbaren Aktionen.
export type SoundName =
  | 'Click.mp3' | 'Correct.mp3' | 'Impact.mp3' | 'Notification.mp3' | 'Pop.mp3' | 'Popups.mp3' | 'Suspense.mp3'
  | 'Typing.mp3' | 'Zoomin-OR-out.mp3' | 'aha-moment.MP3' | 'energy.MP3' | 'riser.mp3' | 'transitions.mp3';

export const Sfx: React.FC<{at: number; src: SoundName; volume?: number; durationInFrames?: number}> = ({at, src, volume = 0.7, durationInFrames}) => (
  <Sequence from={Math.round(at)} durationInFrames={durationInFrames} layout="none">
    <Audio src={staticFile(`sounds/${src}`)} volume={volume} />
  </Sequence>
);
