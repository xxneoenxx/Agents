import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseCommand } from '../src/chat.js';
import { Survival, DayCycle } from '../src/survival.js';
import { biomeFromTags } from '../src/biome.js';

test('chat: Befehle werden erkannt', () => {
  assert.deepEqual(parseCommand('/tp freiberg').action, 'tp');
  assert.equal(parseCommand('/tp döbeln').name, 'Döbeln (Obermarkt)');
  assert.deepEqual(parseCommand('/tp 50.9 13.3'), { action: 'tp', lat: 50.9, lng: 13.3 });
  assert.ok(parseCommand('/tp chemnitz').error);
  assert.equal(parseCommand('/time set night').time, 13500);
  assert.equal(parseCommand('/time set 30000').time, 6000);
  assert.equal(parseCommand('/gm 1').mode, 'creative');
  assert.equal(parseCommand('/gamemode survival').mode, 'survival');
  assert.deepEqual(parseCommand('/give diamond_pickaxe'), { action: 'give', id: 'diamond_pickaxe', count: 1 });
  assert.deepEqual(parseCommand('/give Fackel 32'), { action: 'give', id: 'torch', count: 32 });
  assert.ok(parseCommand('/give nichtda').error);
  assert.ok(parseCommand('/quatsch').error);
});

test('überleben: Hunger, Heilen, Essen, Tod', () => {
  const s = new Survival();
  s.health = 10;
  s.update(4.1);
  assert.equal(s.health, 11);
  s.hunger = 5;
  s.eat({ hunger: 8, saturation: 12.8 });
  assert.equal(s.hunger, 13);
  assert.ok(!s.damage(5));
  assert.ok(s.damage(100));
  // Verhungern: Schaden alle 4 Sekunden, aber nicht unter 1 Herz
  const t = new Survival();
  t.hunger = 0;
  t.saturation = 0;
  assert.equal(t.update(4.1), 1);
  t.health = 1;
  assert.equal(t.update(4.1), 0);
});

test('tageszeit: hell, dunkel, Uhr', () => {
  const d = new DayCycle(6000);
  assert.equal(d.brightness(), 1);
  assert.equal(d.isNight(), false);
  assert.equal(d.clock(), '12:00');
  d.time = 18000;
  assert.ok(d.isNight());
  assert.ok(d.brightness() < 0.3);
  assert.equal(d.clock(), '00:00');
  d.skipNight();
  assert.equal(d.isNight(), false);
});

test('biome: OSM-Tags', () => {
  assert.equal(biomeFromTags([{ landuse: 'forest' }], false), 'forest');
  assert.equal(biomeFromTags([{ landuse: 'residential' }, { leisure: 'park' }], false), 'park');
  assert.equal(biomeFromTags([{ landuse: 'residential' }], true), 'river');
  assert.equal(biomeFromTags([{ landuse: 'quarry' }, { natural: 'water' }], false), 'quarry');
  assert.equal(biomeFromTags([{ landuse: 'farmland' }], false), 'farmland');
  assert.equal(biomeFromTags([], false), 'plains');
});
