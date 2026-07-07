import { describe, it, expect } from 'vitest';
import { GameController } from '../src/core/game';
import { createInitialState } from '../src/core/state';
import { ACHIEVEMENTS } from '../src/data/achievements';

function fresh(): GameController {
  return new GameController(createInitialState());
}

describe('Achievements', () => {
  it('startet ohne freigeschaltete Erfolge', () => {
    const gc = fresh();
    expect(Object.keys(gc.getState().achievements)).toHaveLength(0);
    expect(gc.listAchievements()).toHaveLength(ACHIEVEMENTS.length);
  });

  it('schaltet ein Ziel frei und zahlt die Belohnung', () => {
    const gc = fresh();
    gc.getState().stats.taps = 50;
    const before = gc.getState().coins;
    gc.checkAchievements();
    expect(gc.getState().achievements['first-taps']).toBe(true);
    expect(gc.getState().coins).toBe(before + 200);
  });

  it('zahlt die Belohnung nicht doppelt', () => {
    const gc = fresh();
    gc.getState().stats.taps = 50;
    gc.checkAchievements();
    const after = gc.getState().coins;
    gc.checkAchievements();
    expect(gc.getState().coins).toBe(after);
  });

  it('Manager-Ziel reagiert auf eingestellte Manager', () => {
    const gc = fresh();
    gc.getState().restaurants[0].stations[0].manager = true;
    gc.checkAchievements();
    expect(gc.getState().achievements['first-manager']).toBe(true);
  });

  it('meldet Freischaltung ueber den Event-Bus', () => {
    const gc = fresh();
    const unlocked: string[] = [];
    gc.bus.on('achievementUnlocked', (d) => unlocked.push(d.id));
    gc.getState().investors = 1;
    gc.checkAchievements();
    expect(unlocked).toContain('first-investors');
  });

  it('erkennt Umsatz- und Renovierungs-Ziele', () => {
    const gc = fresh();
    gc.getState().totalEarned = 1_000_000_000;
    gc.getState().restaurants[0].level = 2;
    gc.checkAchievements();
    expect(gc.getState().achievements['earn-1b']).toBe(true);
    expect(gc.getState().achievements['all-renovated']).toBe(true);
  });

  it('listAchievements liefert Fortschritt 0..1', () => {
    const gc = fresh();
    gc.getState().stats.taps = 25; // Haelfte von 50
    const item = gc.listAchievements().find((a) => a.def.id === 'first-taps')!;
    expect(item.progress).toBeCloseTo(0.5);
    expect(item.done).toBe(false);
  });
});
