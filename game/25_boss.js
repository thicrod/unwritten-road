<script>
"use strict";
// =====================================================================
//  EPIC BOSS FIGHTS: more legendary actions as the party grows, a sweeping legendary strike,
//  a "last stand" at a quarter health (with minions), and lair hazards every round.
// =====================================================================
const legMax = (c, e) => e.legendary ? Math.max(e.legendary, partyLevel(c) >= 11 ? 3 : partyLevel(c) >= 5 ? 2 : 1) + (e.lastStand ? 1 : 0) : 0;
const dmgOf = (expr) => { const r = rollDice(expr); return typeof r === "number" ? r : (r?.total ?? 0); };
// one legendary action: usually an attack, sometimes a sweep across the whole front line
function legendaryAction(c, e){
  const L = partyLevel(c);
  const front = party(c).filter(x => x.kind === "pc" && isUp(c, x) && x.pos !== "back");
  if (front.length >= 2 && Math.random() < 0.3){
    const dc = 11 + Math.floor(L / 3), dice = `${1 + Math.ceil(L / 3)}d6`, t = e.atk?.[0]?.t || "bludgeoning";
    clog(c, "enemy", `Legendary action! ${B(e.name)} sweeps across the front line!`); fx(c, { k: "phase", to: e.id });
    for (const h of front){ const ok = heroSave(c, h, "DEX", dc, "sweep"); const n = dmgOf(dice); hurt(c, h, ok ? Math.floor(n / 2) : n, t); if (!c.combat || c.combat.status !== "active") return; }
    return;
  }
  const tg = reachableFoes(c, e, true); const tgt = tg.length ? pick(tg) : null; if (!tgt) return;
  const a = e.atk.find(x => !x.ranged) || e.atk[0];
  const r = resolveAttack(c, e, tgt, { ...a, melee: !a.ranged }); clog(c, "enemy", `Legendary action! ${attackText(e, tgt, a, r)}`);
}
// a quarter health left: the boss fights harder and calls for help
function bossLastStand(c, e){
  defer(c, "enemy", `${B(e.name)} makes a desperate last stand!`); fx(c, { k: "phase", to: e.id });
  const minion = enemies(c).find(x => !x.boss && x.base)?.base || enemies(c).find(x => !x.boss)?.name?.replace(/\s+\d+$/, "");
  if (minion && BESTIARY[minion]){ const added = addEnemies(c, [{ name: minion, count: partyMembers(c).length >= 3 ? 2 : 1 }], e); if (added?.length) defer(c, "enemy", `${added.map(x => x.name).join(", ")} answer${added.length === 1 ? "s" : ""} the call!`); }
}
// lair hazards: the boss's lair fights too, themed by what the boss is
const LAIR = {
  dragon: { name: "Flame vents erupt from the floor", save: "DEX", t: "fire" },
  undead: { name: "Grasping hands claw up from the ground", save: "STR", t: "necrotic", cond: "restrained" },
  fiend: { name: "Hellfire rains from above", save: "DEX", t: "fire" },
  giant: { name: "Rocks crash down from the ceiling", save: "DEX", t: "bludgeoning", cond: "prone" },
  aberration: { name: "Maddening whispers fill your minds", save: "WIS", t: "psychic" },
  construct: { name: "Gears grind and scalding steam bursts out", save: "CON", t: "fire" },
  default: { name: "The ground shakes violently", save: "DEX", t: "bludgeoning", cond: "prone" },
};
function lairAction(c){
  const cm = c.combat; if (!cm || cm.status !== "active" || cm.sandbox) return;
  const boss = enemies(c).find(e => e.boss && isUp(c, e)); if (!boss || cm.round < 2) return;
  const L = partyLevel(c); if (L < 8 && cm.round % 2) return;               // low levels: every other round
  const hz = LAIR[boss.type] || LAIR.default; const heroes = party(c).filter(x => x.kind === "pc" && isUp(c, x)); if (!heroes.length) return;
  const hits = [...heroes].sort(() => Math.random() - 0.5).slice(0, heroes.length >= 3 ? 2 : 1);
  const dc = 11 + Math.floor(L / 3), dice = `${1 + Math.ceil(L / 3)}d6`;
  clog(c, "enemy", `Lair action! ${hz.name}!`); cm.lairFx = { round: cm.round, name: hz.name };
  for (const h of hits){
    const ok = heroSave(c, h, hz.save, dc, hz.t); const n = dmgOf(dice); fx(c, { k: "phase", to: h.id });
    hurt(c, h, ok ? Math.floor(n / 2) : n, hz.t); if (!c.combat || cm.status !== "active") return;
    if (!ok && hz.cond && isUp(c, h)) addC(c, h, hz.cond, { rounds: 1 });
  }
}
function BossBar({ c, cm }){
  const b = enemies(c).find(e => e.boss && !e.fled); if (!b) return null;
  const frac = Math.max(0, b.hp) / (b.maxHp || 1), max = legMax(c, b), left = Math.max(0, max - (b.legUsed || 0));
  return html`<div className=${"bt-bossbar" + (isUp(c, b) ? "" : " dead")}><div className="bb-top"><b>${b.name}</b>${b.lastStand ? html`<span className="bb-tag last">Last stand</span>` : b.phase2 ? html`<span className="bb-tag">Phase 2</span>` : null}${max ? html`<span className="bb-pips" title="Legendary actions left this round">${Array.from({ length: max }, (_, i) => html`<i key=${i} className=${i < left ? "on" : ""}></i>`)}</span>` : null}</div>
    <div className="bb-hp"><i style=${{ width: (frac * 100) + "%" }}></i></div></div>`;
}
</script>
