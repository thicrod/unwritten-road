import { test, expect } from "@playwright/test";
import { openGame, newCampaign } from "./helpers.js";

test("co-op: a friend joins the room and sees the same story", async ({ browser }) => {
  const host = await (await browser.newContext()).newPage(); const guest = await (await browser.newContext()).newPage();
  await openGame(host); await newCampaign(host);
  const code = await host.evaluate(async () => (await Net.create("Joe")).room.code);
  await openGame(guest); await guest.evaluate((c) => Net.join(c, "Maria"), code);
  await guest.waitForFunction(() => C() && C().name === "Test Tale");
  const hostDM = await host.evaluate(() => C().log.filter(e => e.kind === "dm").pop().text);
  await guest.waitForFunction((t) => C().log.some(e => e.kind === "dm" && e.text === t), hostDM);
  await guest.evaluate(() => Net.chatSend("hello from Maria"));
  await host.waitForFunction(() => (S().chat || []).some(m => /hello from Maria/.test(m.text)));
  expect(await host.evaluate(() => Net.room.players.length)).toBe(2);
});
