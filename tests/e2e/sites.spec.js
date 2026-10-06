import { test, expect } from "@playwright/test";
import { openGame, newCampaign, fightOut } from "./helpers.js";

const idle = (page) => page.waitForFunction(() => !S().busy && !C().pendingRoll, null, { timeout: 30000 });

test("towns: the starting town has a street map, and the DM's tavern is a building you can enter", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await openGame(page); await newCampaign(page);
  await page.evaluate(() => store.set({ tab: "map" }));
  await expect(page.locator("svg.town-map")).toBeVisible();
  const town = await page.evaluate(() => { const t = townOf(C()); return { buildings: t.town.buildings.length, tavern: t.town.buildings.find(b => b.kind === "tavern" || b.kind === "inn")?.loc, sewer: !!t.town.sewer }; });
  expect(town.buildings).toBeGreaterThan(8); expect(town.tavern).toBe("lantern-thorn"); expect(town.sewer).toBe(true);
  await page.evaluate(async () => { const t = townOf(C()); const b = t.town.buildings.find(b => b.loc === "lantern-thorn"); await enterBuilding(t.id, b.id); }); await idle(page);
  await expect(page.locator("svg.site-map")).toBeVisible();
  const inside = await page.evaluate(() => { const s = siteOf(C()); const r = roomOf(C()); return { kind: s.kind, hostile: s.hostile, room: r.name, people: r.npcs.map(n => n.name), maren: s.rooms.some(x => x.npcs.some(n => n.npcId === "maren")) }; });
  expect(["tavern", "inn"]).toContain(inside.kind); expect(inside.hostile).toBe(false); expect(inside.maren).toBe(true);
  // walk into the next room; the party's position and the DM's context follow
  await page.evaluate(() => moveToRoom(roomLinks(roomOf(C()))[0])); await idle(page);
  const ctx = await page.evaluate(() => siteContext(C()));
  expect(ctx).toMatch(/^INSIDE The Lantern & Thorn/); expect(ctx).toContain("room: " + await page.evaluate(() => roomOf(C()).name));
  expect(errors).toEqual([]);
});

test("objects and secrets: searching, opening and the DM revealing a hidden room", async ({ page }) => {
  await openGame(page); await newCampaign(page);
  await page.evaluate(async () => { await enterSite("lantern-thorn"); }); await idle(page);
  // a chest somewhere in the inn with loot in it: open it, loot arrives
  const gold0 = await page.evaluate(() => PC().gold);
  await page.evaluate(() => store.camp(c => { const s = siteOf(c); const r = roomOf(c); const o = r.objects.find(x => x.kind === "barrel") || r.objects[0]; o.acts = ["open"]; o.loot = { gold: 25, items: [] }; o.container = true; o.locked = null; }));
  await page.evaluate(() => useObject(roomOf(C()).objects.find(o => o.loot).id, "open")); await idle(page);
  expect(await page.evaluate(() => PC().gold)).toBe(gold0 + 25);
  // a secret door: the DM reveals it by name, then the party can walk through
  const secret = await page.evaluate(() => { let out = null; store.camp(c => { const s = siteOf(c); const r = roomOf(c); const t = s.rooms.find(x => x.id !== r.id && x.floorId === r.floorId); r.doors.push({ kind: "door", to: t.id, x: r.x + r.w, y: r.y + 0.5, side: "e", secret: true }); r.hiddenLinks.push(t.id); t.hiddenLinks.push(r.id); r.links = r.links.filter(id => id !== t.id); t.links = t.links.filter(id => id !== r.id); out = t.name; }); return out; });
  const notes = await page.evaluate((name) => { const notes = []; store.camp(c => applySiteState(c, { reveal: [name] }, notes)); return notes.map(n => n.text); }, secret);
  expect(notes.join(" ")).toContain("Found a hidden way");
  expect(await page.evaluate(() => roomLinks(roomOf(C())).length)).toBeGreaterThan(0);
});

test("dungeons: a hostile place has a floor plan, fights use the room's features, and old saves upgrade", async ({ page }) => {
  await openGame(page); await newCampaign(page, "Paladin", 5);
  await page.evaluate(async () => { store.camp(c => { const l = c.locations.crypt; l.discovered = true; l.hidden = false; moveTo(c, l); }); await enterDungeon("crypt"); }); await idle(page);
  const d = await page.evaluate(() => { const s = siteOf(C()); return { v: s.v, kind: s.kind, hostile: s.hostile, boss: !!s.bossRoom, floors: s.floors.length, combatRooms: s.rooms.filter(r => r.type === "combat").length }; });
  expect(d.v).toBe(2); expect(d.hostile).toBe(true); expect(d.boss).toBe(true); expect(d.combatRooms).toBeGreaterThan(0);
  // walk into the nearest fight
  await page.evaluate(async () => { const s = siteOf(C()); let guard = 0; while (!C().combat && guard++ < 6){ const cur = roomOf(C()); const next = roomLinks(cur).map(id => siteRoom(s, id)).find(r => r.type === "combat" || r.type === "boss") || roomLinks(cur).map(id => siteRoom(s, id)).find(r => r.state !== "visited" && r.state !== "cleared") || roomLinks(cur).map(id => siteRoom(s, id))[0]; if (!next) break; await moveToRoom(next.id); await new Promise(r => setTimeout(r, 200)); } });
  await page.waitForFunction(() => !!C().combat, null, { timeout: 30000 });
  const room = await page.evaluate(() => C().combat.room); expect(room).toBeTruthy(); expect(room.objects).toBeDefined();
  await page.evaluate(() => store.set({ tab: "combat" })); await expect(page.locator(".battlefield")).toBeVisible();
  expect(await fightOut(page)).toBe("victory");
  await page.evaluate(() => leaveCombat()); await idle(page);
  expect(await page.evaluate(() => roomOf(C()).state)).toBe("cleared");
  // an old-format dungeon in a save still loads, as a one-floor plan
  await page.evaluate(() => store.camp(c => { c.locations.greyspire.dungeon = { theme: "goblin", current: "r0", cleared: false, bossRoom: "r1", rooms: [{ id: "r0", x: 0, y: 1, links: ["r1"], hiddenLinks: [], state: "visited", type: "entrance", name: "Entrance" }, { id: "r1", x: 1, y: 1, links: ["r0"], hiddenLinks: [], state: "seen", type: "boss", name: "Lair", enemies: [{ name: "Goblin Boss", count: 1, boss: true }], bossName: "Grik" }] }; c.locations.greyspire.discovered = true; moveTo(c, c.locations.greyspire); }));
  await page.evaluate(async () => { await leaveDungeon(); await enterDungeon("greyspire"); }); await idle(page);
  expect(await page.evaluate(() => ({ v: siteOf(C()).v, rooms: siteOf(C()).rooms.length, boss: siteOf(C()).rooms[1].bossName }))).toEqual({ v: 2, rooms: 2, boss: "Grik" });
});

test("sewers: the grate in the alley leads under the town, and a tunnel comes back up", async ({ page }) => {
  await openGame(page); await newCampaign(page);
  await page.evaluate(() => store.camp(c => ensureTown(c, townOf(c))));
  await page.evaluate(async () => { const t = townOf(C()); const i = t.town.features.findIndex(f => f.kind === "grate"); store.camp(c => { const n = []; discoverSewer(c, townOf(c), n); }); await useTownFeature(t.id, i); }); await idle(page);
  const s = await page.evaluate(() => ({ kind: siteOf(C())?.kind, hostile: siteOf(C())?.hostile, up: siteOf(C())?.rooms.some(r => r.exit === "tavern"), ctx: siteContext(C()).slice(0, 60) }));
  expect(s.kind).toBe("sewer"); expect(s.hostile).toBe(true); expect(s.up).toBe(true);
  // take the tunnel up into the tavern's cellar (or its door)
  await page.evaluate(async () => { store.camp(c => { const ss = siteOf(c); const up = ss.rooms.find(r => r.exit === "tavern"); ss.current = up.id; markSeen(ss, up.id); }); await useExit(); }); await idle(page);
  expect(await page.evaluate(() => ({ loc: C().explore?.loc, kind: siteOf(C())?.kind }))).toEqual({ loc: "lantern-thorn", kind: await page.evaluate(() => siteOf(C())?.kind) });
  expect(["tavern", "inn"]).toContain(await page.evaluate(() => siteOf(C())?.kind));
});
