import { test, expect } from "@playwright/test";
import { openGame, newCampaign, fightOut } from "./helpers.js";

test("solo: start a campaign and the DM answers an action", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await openGame(page); await newCampaign(page);
  const before = await page.evaluate(() => C().log.filter(e => e.kind === "dm").length);
  await page.fill(".composer textarea", "I look around the tavern"); await page.keyboard.press("Enter");
  await page.waitForFunction((n) => C().log.filter(e => e.kind === "dm").length > n && !S().busy, before);
  expect(errors).toEqual([]);
});
test("combat: the party can win a fight, with the battle map shown", async ({ page }) => {
  await openGame(page); await newCampaign(page, "Paladin", 5);
  await page.evaluate(() => { startCombat({ enemies: [{ name: "Goblin", count: 3 }] }); store.set({ tab: "combat" }); });
  await expect(page.locator(".battlefield .bt-token")).toHaveCount(6);
  expect(await fightOut(page)).toBe("victory");
});
test("boss fights: legendary actions, phases and lair hazards happen", async ({ page }) => {
  await openGame(page); await newCampaign(page, "Paladin", 6, ["brakka", "mireille", "quill"]);
  const logs = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { store.camp(c => { c.combat = null; for (const m of partyMembers(c)) { m.hp = maxHp(m); m.dead = false; m.conditions = []; } }); startCombat({ enemies: [{ name: "Ogre", count: 1, boss: true }, { name: "Goblin", count: 2 }] }); store.camp(c => { const b = enemies(c).find(e => e.boss); b.maxHp = b.hp = 160; }); });
    await fightOut(page); logs.push(...await page.evaluate(() => C().combat.log.map(l => l.text || "")));
    await page.evaluate(() => leaveCombat());
  }
  expect(logs.some(l => l.includes("Legendary action!"))).toBe(true);
  expect(logs.some(l => l.startsWith("Lair action!"))).toBe(true);
  expect(logs.some(l => l.includes("last stand"))).toBe(true);
});
test("factions: standing changes unlock perks", async ({ page }) => {
  await openGame(page); await newCampaign(page);
  const tier = await page.evaluate(() => { const notes = []; store.camp(c => { const f = c.factions.find(x => x.kind === "merchants"); changeRep(c, f.name, 30, notes); }); return TIER_NAME[tierOf(C().factions.find(x => x.kind === "merchants").rep)]; });
  expect(tier).toBe("Liked");
  expect(await page.evaluate(() => factionPriceMult(C()))).toBeCloseTo(0.9);
});
test("report a problem: the report reaches the server", async ({ page, request }) => {
  await openGame(page); await newCampaign(page);
  await page.evaluate(() => openModal({ type: "report" }));
  await page.fill(".modal textarea", "Automated test report"); await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.locator(".modal")).toContainText("Report #");
  const list = await (await request.get("/api/reports?key=test-admin")).json();
  expect(list.some(r => (r.data?.note || "") === "Automated test report")).toBe(true);
  expect((await request.get("/api/reports")).status()).toBe(403);
});
