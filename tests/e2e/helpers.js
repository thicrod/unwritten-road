import { fileURLToPath } from "node:url";
// Serve React and htm from node_modules, so tests never depend on a CDN.
const lib = (p) => fileURLToPath(new URL(`../../node_modules/${p}`, import.meta.url));
const LIBS = { "react.production.min.js": lib("react/umd/react.production.min.js"), "react-dom.production.min.js": lib("react-dom/umd/react-dom.production.min.js"), "htm.umd.js": lib("htm/dist/htm.umd.js") };
export async function openGame(page, settings = {}) {
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/, (route) => {
    const u = route.request().url(); const hit = Object.keys(LIBS).find(k => u.endsWith(k));
    return hit ? route.fulfill({ path: LIBS[hit], contentType: "application/javascript" }) : route.fulfill({ body: "", contentType: "text/css" });
  });
  await page.addInitScript((s) => localStorage.setItem("ur:settings", JSON.stringify({ seenHelp: true, manualDice: false, diceAnim: "off", sfx: 0, tipsOff: true, ...s })), settings);
  await page.goto("/"); await page.waitForFunction(() => typeof createCampaign === "function");
}
export async function newCampaign(page, cls = "Fighter", level = 3, companions = ["brakka", "mireille"]) {
  await page.evaluate(async ({ cls, level, companions }) => { const main = buildCompanion(COMPANIONS.find(t => t.cls === cls), level); delete main.companion; main.name = "Joe"; await createCampaign(main, { name: "Test Tale" }, companions); }, { cls, level, companions });
  await page.waitForFunction(() => C() && C().log.some(e => e.kind === "dm"));
}
// play a whole fight with the AI taking every turn
export async function fightOut(page) {
  return page.evaluate(() => { for (let i = 0; i < 800; i++){ let st; store.camp(c => { const cm = c.combat; if (!cm || cm.status !== "active"){ st = cm && cm.status; return; } const cb = curCb(c); if (!cb){ advanceTurn(c); return; }
    if (cb.side === "enemy") enemyTurn(c, cb, null); else if (cb.kind === "pc") aiHeroTurn(c, cb); else companionTurn(c, cb); clog(c, "sys", ""); if (!checkEnd(c)) advanceTurn(c); st = c.combat && c.combat.status; }); if (st !== "active") return st; } return "timeout"; });
}
