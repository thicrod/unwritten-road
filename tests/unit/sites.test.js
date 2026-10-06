// The site generator (floor plans for taverns, dungeons, sewers…) runs in a bare VM with the game's data files,
// so these tests need no browser. They check that every kind of place generates a sane, connected, furnished map.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const strip = (f) => fs.readFileSync(path.join(root, "game", f), "utf8").replace(/<\/?script>/g, "");
const ctx = { console, crypto: globalThis.crypto, window: {}, document: { documentElement: { setAttribute(){}, removeAttribute(){} }, body: { classList: { toggle(){} } } }, localStorage: { getItem: () => null, setItem(){}, removeItem(){} }, structuredClone, setTimeout, clearTimeout, performance };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const f of ["02_data.js", "02b_content.js", "03_rules.js", "04_dm.js", "05_combat.js", "07_world.js", "08_party.js", "10_deep.js", "11_tactics.js", "12_story.js", "28_sites.js", "30_towns.js"]) {
  try { vm.runInContext(strip(f), ctx, { filename: f }); } catch (e) { throw new Error(`loading ${f}: ${e.message}`); }
}
function campaign(){
  const c = vm.runInContext(`(() => { const main = buildCompanion(COMPANIONS[0], 3); delete main.companion; main.name = "Tester";
    const c = { id: "camp1", name: "T", characters: { [main.id]: main }, activeCharId: main.id, partyIds: [main.id], companions: [], locations: {}, npcs: {}, quests: {}, log: [], chronicle: [], flags: {}, reputation: {}, time: { day: 1, phase: "morning" }, premise: { difficulty: "standard" } };
    c.locations.hollow = { id: "hollow", name: "Hollowmere", type: "town", x: 50, y: 50, discovered: true, visited: true, connections: [] };
    return c; })()`, ctx);
  return c;
}
const KINDS = ["tavern", "inn", "shop", "smith", "alchemist", "temple", "temple-dark", "guardhouse", "prison", "manor", "house", "library", "guildhall", "warehouse", "docks", "ship", "farm", "cemetery", "market", "square", "lab", "shrine", "grove", "camp", "cave", "mine", "crypt", "dungeon", "ruins", "tower", "castle", "lair", "sewer"];

test("every kind of place generates a connected, furnished floor plan", () => {
  for (const kind of KINDS) for (let seed = 0; seed < 6; seed++) {
    const c = campaign();
    const loc = { id: `${kind}-${seed}`, name: `Test ${kind} ${seed}`, type: kind === "tavern" ? "tavern" : "dungeon", parent: "hollow", description: "", connections: [] };
    c.locations[loc.id] = loc;
    const site = vm.runInContext("genSite", ctx)(c, loc, { kind });
    assert.equal(site.kind, kind);
    assert.ok(site.rooms.length >= 2, `${kind}: too few rooms (${site.rooms.length})`);
    assert.ok(site.floors.length >= 1);
    // every room is reachable from the entrance through doors (secret ones count once found)
    const seen = new Set([site.entrance]); const q = [site.entrance];
    while (q.length) { const id0 = q.shift(); const r = site.rooms.find(x => x.id === id0); for (const id of [...r.links, ...r.hiddenLinks]) if (!seen.has(id)) { seen.add(id); q.push(id); } }
    assert.equal(seen.size, site.rooms.length, `${kind} seed ${seed}: ${site.rooms.length - seen.size} unreachable rooms`);
    // rooms on the same floor never overlap, and every room has a floor
    for (const a of site.rooms) {
      assert.ok(site.floors.some(f => f.id === a.floorId), "room without floor");
      for (const b of site.rooms) if (a !== b && a.floorId === b.floorId) assert.ok(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h), `${kind} seed ${seed}: ${a.name} overlaps ${b.name}`);
      for (const o of a.objects) assert.ok(o.x >= a.x && o.y >= a.y && o.x + o.w <= a.x + a.w && o.y + o.h <= a.y + a.h, `${kind}: ${o.name} outside ${a.name}`);
      for (const d of a.doors) assert.ok(site.rooms.some(r => r.id === d.to), "door to nowhere");
    }
    assert.ok(site.rooms.some(r => r.objects.length > 0), `${kind}: no furniture at all`);
    if (site.hostile) { assert.ok(site.bossRoom, `${kind}: hostile site without a boss room`); assert.ok(site.rooms.some(r => r.enemies), `${kind}: no enemies`); }
  }
});

test("the same place always generates the same map", () => {
  const c = campaign(); const loc = { id: "lantern", name: "The Lantern & Thorn", type: "tavern", parent: "hollow", description: "", connections: [] }; c.locations.lantern = loc;
  const shape = (s) => s.rooms.map(r => [r.name, r.floorId, r.x, r.y, r.w, r.h, r.links.join(","), r.objects.map(o => o.kind).join(",")]);
  const a = vm.runInContext("genSite", ctx)(c, loc), b = vm.runInContext("genSite", ctx)(c, loc);
  assert.deepEqual(shape(a), shape(b));
});

test("old 5x3 dungeon saves upgrade into a floor plan without losing room state", () => {
  const c = campaign(); const loc = { id: "crypt", name: "The Sunless Crypt", type: "dungeon", x: 20, y: 20, description: "Old tomb.", connections: [] }; c.locations.crypt = loc;
  const d = { theme: "undead", current: "r0", cleared: false, bossRoom: "r2", rooms: [
    { id: "r0", x: 0, y: 1, links: ["r1"], hiddenLinks: [], state: "visited", type: "entrance", name: "Entrance" },
    { id: "r1", x: 1, y: 1, links: ["r0", "r2"], hiddenLinks: ["r3"], state: "cleared", type: "combat", name: "Ossuary", searched: true, found: ["r3"] },
    { id: "r2", x: 2, y: 1, links: ["r1"], hiddenLinks: [], state: "seen", type: "boss", name: "Lair", enemies: [{ name: "Wight", count: 1, boss: true }] },
    { id: "r3", x: 1, y: 0, links: [], hiddenLinks: ["r1"], state: "seen", type: "treasure", secret: true, name: "Vault", loot: { gold: 10, items: [] } }] };
  loc.dungeon = structuredClone(d);
  const site = vm.runInContext("ensureSite", ctx)(c, loc);
  assert.equal(site.v, 2); assert.equal(site.rooms.length, 4); assert.equal(site.rooms[1].state, "cleared"); assert.deepEqual(site.rooms[1].found, ["r3"]);
  assert.ok(site.rooms[1].doors.some(x => x.to === "r3" && x.secret));
  assert.equal(site.rooms[3].loot.gold, 10);
});

test("the DM gets a room description that keeps secrets", () => {
  const c = campaign(); const loc = { id: "lantern", name: "The Lantern & Thorn", type: "tavern", parent: "hollow", description: "", connections: [] }; c.locations.lantern = loc;
  const site = vm.runInContext("ensureSite", ctx)(c, loc, { kind: "tavern" }); c.explore = { loc: "lantern" }; c.currentLocationId = "lantern";
  const txt = vm.runInContext("siteContext", ctx)(c);
  assert.match(txt, /INSIDE The Lantern & Thorn \(tavern/);
  assert.match(txt, /Common room/);
  const hidden = site.rooms.flatMap(r => r.doors.filter(d => d.secret).map(d => site.rooms.find(x => x.id === d.to).name));
  for (const n of hidden) assert.ok(!txt.includes(`to ${n} [`), `secret room ${n} listed as an exit`);
});

test("towns get a map with buildings for their services, and buildings become places", () => {
  const c = campaign(); const town = c.locations.hollow; c.currentLocationId = "hollow";
  c.locations.lantern = { id: "lantern", name: "The Lantern & Thorn", type: "tavern", parent: "hollow", description: "", connections: [] };
  const t = vm.runInContext("ensureTown", ctx)(c, town);
  assert.ok(t.buildings.length >= 6);
  for (const k of ["tavern", "smith", "market", "temple"]) assert.ok(t.buildings.some(b => b.kind === k), `town lacks ${k}`);
  const tav = t.buildings.find(b => b.kind === "tavern"); assert.equal(tav.loc, "lantern", "the DM's tavern should be the town's tavern");
  for (const a of t.buildings) for (const b of t.buildings) if (a !== b) assert.ok(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h), `${a.name} overlaps ${b.name}`);
  const sewer = Object.values(c.locations).find(l => l.parent === "hollow" && /sewer/i.test(l.name)); assert.ok(sewer, "a town should have sewers"); assert.ok(sewer.hidden, "sewers start hidden");
});
