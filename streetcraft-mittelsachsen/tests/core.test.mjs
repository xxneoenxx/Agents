import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toLocal, toLatLng, inRegion, headingVector, headingBetween, nearestTown, findPlace } from '../src/geo.js';
import { PLACES } from '../src/config.js';
import { Inventory, clickSlot, moveStackInto } from '../src/inventory.js';
import { findRecipe, smeltResult } from '../src/crafting.js';
import { World } from '../src/world.js';
import { breakTime, canHarvest, blockDrops, getItem, allItems } from '../src/items.js';

test('geo: lat/lng <-> Meter hin und zurück', () => {
  const p = toLocal(50.9172, 13.3418);
  const back = toLatLng(p.x, p.z);
  assert.ok(Math.abs(back.lat - 50.9172) < 1e-9);
  assert.ok(Math.abs(back.lng - 13.3418) < 1e-9);
  // Freiberg liegt östlich und südlich vom Ursprung.
  assert.ok(p.x > 0 && p.z > 0);
});

test('geo: alle Startorte liegen in Mittelsachsen, Chemnitz/Dresden/Leipzig nicht', () => {
  for (const p of PLACES) assert.ok(inRegion(p.lat, p.lng), p.name);
  assert.equal(inRegion(50.8333, 12.9167), false); // Chemnitz
  assert.equal(inRegion(51.0504, 13.7373), false); // Dresden
  assert.equal(inRegion(51.3397, 12.3731), false); // Leipzig
});

test('geo: Richtungen', () => {
  const n = headingVector(0);
  assert.ok(Math.abs(n.x) < 1e-9 && Math.abs(n.z + 1) < 1e-9);
  const e = headingVector(90);
  assert.ok(Math.abs(e.x - 1) < 1e-9);
  assert.ok(Math.abs(headingBetween({ x: 0, z: 0 }, { x: 1, z: 0 }) - 90) < 1e-9);
  assert.ok(Math.abs(headingBetween({ x: 0, z: 0 }, { x: 0, z: 5 }) - 180) < 1e-9);
});

test('geo: Ortsnamen', () => {
  assert.equal(nearestTown(50.918, 13.343), 'Freiberg');
  assert.equal(findPlace('döbeln').id, 'doebeln');
  assert.equal(findPlace('Brand-Erbisdorf').id, 'brand-erbisdorf');
  assert.equal(findPlace('xyz'), null);
});

test('inventar: stapeln, entfernen, voll', () => {
  const inv = new Inventory();
  assert.equal(inv.add('dirt', 100), 0);
  assert.equal(inv.get(0).count, 64);
  assert.equal(inv.get(1).count, 36);
  assert.equal(inv.add('wooden_pickaxe', 2), 0);
  assert.equal(inv.get(2).count, 1);
  assert.equal(inv.get(3).count, 1);
  assert.ok(inv.remove('dirt', 70));
  assert.equal(inv.count('dirt'), 30);
  assert.equal(inv.remove('dirt', 31), false);
  for (let i = 0; i < 40; i++) inv.add('stone', 64);
  assert.ok(inv.add('stone', 64) > 0);
});

test('inventar: Werkzeug nutzt sich ab und zerbricht', () => {
  const inv = new Inventory();
  inv.add('wooden_pickaxe');
  let broke = false;
  for (let i = 0; i < 59; i++) broke = inv.damageSelected();
  assert.ok(broke);
  assert.equal(inv.get(0), null);
});

test('inventar: Klicken wie in Minecraft', () => {
  const slots = [{ id: 'dirt', count: 10 }, null, { id: 'dirt', count: 60 }];
  let cur = clickSlot(slots, 0, null, 2); // rechts: Hälfte nehmen
  assert.deepEqual(cur, { id: 'dirt', count: 5 });
  cur = clickSlot(slots, 1, cur, 2); // rechts: einen ablegen
  assert.equal(slots[1].count, 1);
  assert.equal(cur.count, 4);
  cur = clickSlot(slots, 2, cur, 0); // links: zusammenlegen bis 64
  assert.equal(slots[2].count, 64);
  assert.equal(cur, null);
  const rest = moveStackInto({ id: 'dirt', count: 70 }, slots, 0, 3);
  assert.equal(rest, null);
  assert.equal(slots[0].count, 64);
  assert.equal(slots[1].count, 12);
  assert.equal(moveStackInto({ id: 'dirt', count: 60 }, slots, 0, 3).count, 8);
});

test('crafting: Grundrezepte', () => {
  assert.deepEqual(findRecipe(['oak_log', null, null, null], 2), { id: 'planks', count: 4 });
  assert.deepEqual(findRecipe([null, 'spruce_log', null, null, null, null, null, null, null], 3), { id: 'planks', count: 4 });
  assert.deepEqual(findRecipe(['planks', null, 'planks', null], 2), { id: 'stick', count: 4 });
  assert.deepEqual(findRecipe(['planks', 'planks', 'planks', 'planks'], 2), { id: 'crafting_table', count: 1 });
  const P = 'planks', S = 'stick', C = 'cobblestone', _ = null;
  assert.equal(findRecipe([P, P, P, _, S, _, _, S, _], 3).id, 'wooden_pickaxe');
  assert.equal(findRecipe([C, C, _, C, S, _, _, S, _], 3).id, 'stone_axe');
  assert.equal(findRecipe([_, C, C, _, S, C, _, S, _], 3).id, 'stone_axe'); // gespiegelt
  assert.equal(findRecipe([C, C, C, C, _, C, C, C, C], 3).id, 'furnace');
  assert.equal(findRecipe(['coal', _, S, _], 2).id, 'torch');
  assert.equal(findRecipe([P, P, P, P, _, P, P, P, P], 3).id, 'chest');
  assert.equal(findRecipe([P, _, _, _], 2), null);
  assert.equal(smeltResult('silver_ore'), 'silver_ingot');
});

test('crafting: alle Rezept-Ergebnisse existieren', async () => {
  const { RECIPES, SMELTING } = await import('../src/crafting.js');
  for (const r of RECIPES) assert.ok(getItem(r.result.id), r.result.id);
  for (const [a, b] of Object.entries(SMELTING)) assert.ok(getItem(a) && getItem(b), a);
  for (const it of allItems()) assert.ok(it.name, it.id);
});

test('items: Abbauzeiten und Drops', () => {
  assert.ok(breakTime('stone', 'wooden_pickaxe') < breakTime('stone', null));
  assert.equal(canHarvest('stone', null), false);
  assert.equal(canHarvest('iron_ore', 'wooden_pickaxe'), false);
  assert.equal(canHarvest('iron_ore', 'stone_pickaxe'), true);
  assert.deepEqual(blockDrops('stone', 'wooden_pickaxe'), [{ id: 'cobblestone', count: 1 }]);
  assert.deepEqual(blockDrops('grass', null), [{ id: 'dirt', count: 1 }]);
  assert.deepEqual(blockDrops('clay', null), [{ id: 'clay_ball', count: 4 }]);
  assert.equal(breakTime('bedrock', 'diamond_pickaxe'), Infinity);
});

test('welt: setzen, entfernen, speichern, laden', () => {
  const w = new World(42);
  w.setBlock(1, 0, 2, 'planks');
  w.setBlock(1, 1, 2, 'chest', { items: [] });
  assert.equal(w.getBlock(1, 0, 2).id, 'planks');
  assert.equal(w.columnHeight(1, 2), 2);
  w.setBlock(1, 0, 2, null);
  assert.equal(w.getBlock(1, 0, 2), null);
  const w2 = World.fromJSON(JSON.parse(JSON.stringify(w.toJSON())));
  assert.equal(w2.getBlock(1, 0, 2), null);
  assert.equal(w2.getBlock(1, 1, 2).id, 'chest');
});

test('welt: Bäume sind deterministisch und Änderungen bleiben erhalten', () => {
  const a = new World(7);
  a.ensureChunk(0, 0, 'forest');
  const blocksA = [...a.blocks.keys()].sort();
  assert.ok(blocksA.length > 0, 'Wald sollte Bäume haben');
  const b = new World(7);
  b.ensureChunk(0, 0, 'forest');
  assert.deepEqual([...b.blocks.keys()].sort(), blocksA);
  // Einen Stamm abbauen, speichern, neu laden, Chunk neu erzeugen: bleibt weg.
  const logKey = blocksA.find((k) => a.blocks.get(k).id.endsWith('log'));
  const [x, y, z] = logKey.split(',').map(Number);
  a.setBlock(x, y, z, null);
  const c = World.fromJSON(JSON.parse(JSON.stringify(a.toJSON())));
  c.ensureChunk(0, 0, 'plains');
  assert.equal(c.getBlock(x, y, z), null);
  assert.equal(c.biomeAt(1, 1), 'forest');
});

test('welt: Graben liefert Schichten bis zum Grundgestein', () => {
  const w = new World(1, { miningCheck: () => true });
  assert.equal(w.digGround(3, 3), 'grass');
  assert.equal(w.digGround(3, 3), 'dirt');
  w.digGround(3, 3);
  const deep = w.digGround(3, 3);
  assert.ok(['stone', 'coal_ore'].includes(deep), deep);
  for (let i = 0; i < 40; i++) w.digGround(3, 3);
  assert.equal(w.groundTop(3, 3), 'bedrock');
  assert.equal(w.digGround(3, 3), null);
  assert.ok(w.tillGround(5, 5));
  assert.equal(w.groundTop(5, 5), 'farmland');
});

test('welt: Strahl trifft Block und Boden', () => {
  const w = new World(1);
  w.setBlock(0, 0, -3, 'stone');
  const hit = w.raycast({ x: 0.5, y: 0.5, z: 0.5 }, { x: 0, y: 0, z: -1 }, 10);
  assert.equal(hit.type, 'block');
  assert.deepEqual([hit.x, hit.y, hit.z], [0, 0, -3]);
  assert.deepEqual(hit.normal, { x: 0, y: 0, z: 1 });
  const d = { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 };
  const g = w.raycast({ x: 5.5, y: 2.5, z: 0.7 }, d, 10);
  assert.equal(g.type, 'ground');
  assert.equal(g.x, 5);
  assert.equal(g.z, -2);
  assert.equal(w.raycast({ x: 0.5, y: 2.5, z: 0.5 }, { x: 0, y: 1, z: 0 }, 5), null);
});
