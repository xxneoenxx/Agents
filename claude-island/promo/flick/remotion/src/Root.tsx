import React from 'react';
import {Composition} from 'remotion';
import {fontsReady} from './lib/fonts';
import {FPS, H, W} from './lib/theme';
import {SCENES} from './scenes';
import {S01HookAltTab} from './scenes/S01HookAltTab';
import {S02ProblemVerpasst} from './scenes/S02ProblemVerpasst';
import {S03RevealIsland} from './scenes/S03RevealIsland';
import {S04ObenImVordergrund} from './scenes/S04ObenImVordergrund';
import {S05EinBlick} from './scenes/S05EinBlick';
import {S06MehrereSitzungen} from './scenes/S06MehrereSitzungen';
import {S07FreigabeKlapptAuf} from './scenes/S07FreigabeKlapptAuf';
import {S08Freigeben} from './scenes/S08Freigeben';
import {S09HaengtFest} from './scenes/S09HaengtFest';
import {S10LiveUndFertig} from './scenes/S10LiveUndFertig';
import {S11ModellAufwand} from './scenes/S11ModellAufwand';
import {S12MiniClaude} from './scenes/S12MiniClaude';
import {S13LokalKostenlos} from './scenes/S13LokalKostenlos';
import {S14CtaLoop} from './scenes/S14CtaLoop';

void fontsReady;

const COMPONENTS: Record<string, React.FC> = {
  S01HookAltTab,
  S02ProblemVerpasst,
  S03RevealIsland,
  S04ObenImVordergrund,
  S05EinBlick,
  S06MehrereSitzungen,
  S07FreigabeKlapptAuf,
  S08Freigeben,
  S09HaengtFest,
  S10LiveUndFertig,
  S11ModellAufwand,
  S12MiniClaude,
  S13LokalKostenlos,
  S14CtaLoop,
};

// Eine eigene Komposition je freigegebener Szene, keine Gesamtkomposition (Flick).
export const RemotionRoot: React.FC = () => (
  <>
    {SCENES.map((s) => (
      <Composition key={s.id} id={s.id} component={COMPONENTS[s.component]} durationInFrames={s.frames} fps={FPS} width={W} height={H} />
    ))}
  </>
);
