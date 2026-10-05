<script>
"use strict";
// =====================================================================
//  SESSIONS, ACHIEVEMENTS & HALL OF FAME
// =====================================================================
// ---------- tallies (kept on the campaign, so co-op players share them) ----------
function tallyOf(c){ return c.tally = c.tally || { wins: 0, downs: 0, crits: 0, kills: 0, bestHit: null, slain: {}, dragons: 0, undead: 0, liberated: 0, lieutenants: 0, fastTravels: 0, spells: 0 }; }
// after every fight: read the combat log for kills, crits, knockdowns and the biggest hit
function metaAfterFight(c, status){
  const cm = c.combat; if (!cm || cm.sandbox) return; const T = tallyOf(c), S0 = c.session;
  if (status === "victory" || status === "surrender") T.wins++;
  const partyNames = new Set(partyMembers(c).map(m => m.name));
  for (const l of cm.log || []){
    const t = l.text || "";
    const hit = t.match(/^\*\*(.+?)\*\* (?:hits|lands a CRITICAL hit on) \*\*(.+?)\*\*.*?\*\*(\d+)\*\* damage/);
    if (hit && partyNames.has(hit[1])){ const dmg = +hit[3]; const rec = { who: hit[1], dmg, vs: hit[2], crit: /CRITICAL/.test(t), day: c.time.day };
      if (!T.bestHit || dmg > T.bestHit.dmg) T.bestHit = rec; if (S0 && (!S0.bestHit || dmg > S0.bestHit.dmg)) S0.bestHit = rec; }
    if (/CRITICAL/.test(t) && [...partyNames].some(n => t.startsWith(`**${n}**`))){ T.crits++; if (S0) S0.crits = (S0.crits || 0) + 1; }
    const down = t.match(/^\*\*(.+?)\*\* goes down!/); if (down && partyNames.has(down[1])){ T.downs++; if (S0){ S0.downs = S0.downs || {}; S0.downs[down[1]] = (S0.downs[down[1]] || 0) + 1; } }
  }
  for (const id of cm.kills || []){ const e = cm.cbt[id]; if (!e) continue; T.kills++; if (S0) S0.kills = (S0.kills || 0) + 1;
    const key = e.base || e.name; T.slain[key] = (T.slain[key] || 0) + 1;
    if (/dragon|wyrm|drake/i.test(key) || e.type === "dragon") T.dragons++; if (e.type === "undead") T.undead++; }
  T.spells += (cm.fx || []).filter(f => f.k === "cast" && cm.cbt[f.from]?.side === "party").length;
  if (S0) S0.fights = (S0.fights || 0) + 1;
  if (status === "victory" || status === "surrender"){ const n = []; try { factionsAfterFight(c, cm, n); } catch (e) { console.warn(e); } if (n.length) pushLog(c, { kind: "sys", notes: n }); }
}
// ---------- sessions ----------
function beginSession(c){
  if (c.session && !c.session.closed && Date.now() - c.session.at < 10 * 3600 * 1000) return;
  c.session = { at: Date.now(), day: c.time.day, gold: c.characters[c.activeCharId]?.gold || 0,
    heroes: Object.fromEntries(partyMembers(c).map(m => [m.id, { xp: m.xp, level: m.level, name: m.name }])),
    quests: Object.values(c.quests || {}).filter(q => q.status === "completed").length, clues: c.story?.clues || 0,
    rares: (c.raresSeen || []).length, items: partyMembers(c).reduce((a, m) => a + (m.inventory || []).length, 0), ach: [] };
}
function sessionSummary(c){
  const s = c.session || {}; const main = c.characters[c.activeCharId];
  const heroes = partyMembers(c).map(m => { const h = s.heroes?.[m.id] || { xp: m.xp, level: m.level }; return { m, xp: Math.max(0, m.xp - h.xp), levels: m.level - h.level, downs: s.downs?.[m.name] || 0 }; });
  const mvp = [...heroes].sort((a, b) => b.xp - a.xp)[0];
  return { minutes: Math.max(1, Math.round((Date.now() - (s.at || Date.now())) / 60000)), days: c.time.day - (s.day ?? c.time.day), gold: (main?.gold || 0) - (s.gold || 0),
    heroes, mvp, best: s.bestHit, fights: s.fights || 0, kills: s.kills || 0, crits: s.crits || 0,
    quests: Object.values(c.quests || {}).filter(q => q.status === "completed").length - (s.quests || 0), clues: (c.story?.clues || 0) - (s.clues || 0),
    rares: (c.raresSeen || []).length - (s.rares || 0), items: Math.max(0, partyMembers(c).reduce((a, m) => a + (m.inventory || []).length, 0) - (s.items || 0)), ach: s.ach || [] };
}
function summaryText(c, x){
  const L = [`🎲 The Unwritten Road: ${c.name}`, `Session recap · ${new Date().toLocaleDateString()} · ${x.minutes} min${x.days ? ` · ${x.days} in-game day${x.days > 1 ? "s" : ""}` : ""}`, ""];
  for (const h of x.heroes) L.push(`${h.m.name} (L${h.m.level} ${h.m.cls})${h.levels ? ` ⬆ +${h.levels} level${h.levels > 1 ? "s" : ""}` : ""}: +${h.xp} XP${h.downs ? `, went down ${h.downs}×` : ""}`);
  L.push("");
  if (x.best) L.push(`💥 Best hit: ${x.best.who}, ${x.best.dmg} damage on ${x.best.vs}${x.best.crit ? " (critical!)" : ""}`);
  if (x.mvp && x.mvp.xp) L.push(`🏅 MVP: ${x.mvp.m.name}`);
  L.push(`⚔ ${x.fights} fight${x.fights === 1 ? "" : "s"}, ${x.kills} foe${x.kills === 1 ? "" : "s"} defeated, ${x.crits} crit${x.crits === 1 ? "" : "s"}`);
  if (x.gold) L.push(`💰 ${x.gold > 0 ? "+" : ""}${x.gold} gold`); if (x.items) L.push(`🎒 ${x.items} item${x.items > 1 ? "s" : ""} found`);
  if (x.quests > 0) L.push(`📜 ${x.quests} quest${x.quests > 1 ? "s" : ""} completed`); if (x.clues > 0) L.push(`🔎 ${x.clues} clue${x.clues > 1 ? "s" : ""} found`);
  if (x.rares > 0) L.push(`✦ ${x.rares} rare encounter${x.rares > 1 ? "s" : ""}`);
  for (const id of x.ach) { const a = ACHIEVEMENTS.find(a => a.id === id); if (a) L.push(`🏆 ${a.name}`); }
  return L.join("\n");
}
async function summaryImage(c, x, root){
  const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, "#2a1d12"); grad.addColorStop(1, "#120c08"); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#c9a14a"; g.lineWidth = 6; g.strokeRect(24, 24, W - 48, H - 48);
  g.fillStyle = "#e6c65a"; g.font = "bold 34px Georgia, serif"; g.textAlign = "center"; g.fillText("THE UNWRITTEN ROAD · SESSION RECAP", W / 2, 96);
  g.fillStyle = "#fff3dc"; g.font = "bold 58px Georgia, serif"; g.fillText(c.name.slice(0, 30), W / 2, 170);
  g.fillStyle = "#cdb48a"; g.font = "28px Georgia, serif"; g.fillText(`${new Date().toLocaleDateString()} · ${x.minutes} minutes${x.days ? ` · ${x.days} in-game days` : ""}`, W / 2, 218);
  const svgs = [...root.querySelectorAll(".sess-hero svg.portrait")];
  const load = (svg) => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); const s = svg.outerHTML.includes("xmlns=") ? svg.outerHTML : svg.outerHTML.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); });
  const imgs = await Promise.all(svgs.map(load));
  let y = 280; g.textAlign = "left";
  x.heroes.forEach((h, i) => { const im = imgs[i]; if (im) g.drawImage(im, 80, y, 120, 120);
    g.fillStyle = "#fff3dc"; g.font = "bold 40px Georgia, serif"; g.fillText(`${h.m.name}`.slice(0, 22), 230, y + 48);
    g.fillStyle = "#cdb48a"; g.font = "28px Georgia, serif"; g.fillText(`Level ${h.m.level} ${h.m.cls}${h.levels ? `  ⬆ +${h.levels}` : ""}  ·  +${h.xp} XP${h.downs ? `  ·  went down ${h.downs}×` : ""}`, 230, y + 92); y += 150; });
  y += 10; g.fillStyle = "#e6c65a"; g.font = "bold 32px Georgia, serif";
  const lines = summaryText(c, x).split("\n").slice(3 + x.heroes.length + 1).filter(Boolean);
  for (const ln of lines.slice(0, 9)){ g.fillText(ln, 80, y); y += 52; g.fillStyle = "#fff3dc"; g.font = "30px Georgia, serif"; }
  return cv.toDataURL("image/png");
}
function SessionModal({ m }){
  const c = C(); const ref = useRef(null); const [copied, setCopied] = useState(false); if (!c) return null; const x = sessionSummary(c);
  const finish = () => { store.camp(c => { if (c.session) c.session.closed = true; }); closeModal(); if (m.then === "home"){ saveNow(); store.set({ view: "home", campaign: null, tab: "adventure" }); } };
  const copy = () => { navigator.clipboard?.writeText(summaryText(c, x)).then(() => { setCopied(true); toast("Summary copied: paste it in your group chat."); }).catch(() => toast("Couldn't copy here.", "bad")); };
  const saveImg = async () => { const url = await summaryImage(c, x, ref.current); const a = document.createElement("a"); a.href = url; a.download = `${slug(c.name)}-session.png`; document.body.appendChild(a); a.click(); a.remove(); };
  return html`<${Modal} title="Session recap" onClose=${closeModal} wide=${true} foot=${html`<button className="btn ghost" onClick=${copy}>${copied ? "Copied ✓" : "📋 Copy summary"}</button>${window.__WEB__ ? html`<button className="btn ghost" onClick=${saveImg}>🖼 Save image</button>` : null}<button className="btn primary" onClick=${finish}>${m.then === "home" ? "End session" : "Close"}</button>`}>
    <div className="sess" ref=${ref}>
      <p className="faint" style=${{ marginTop: 0 }}>${c.name} · ${x.minutes} minutes of play${x.days ? ` · ${x.days} in-game day${x.days > 1 ? "s" : ""}` : ""}</p>
      <div className="sess-heroes">${x.heroes.map(h => html`<div key=${h.m.id} className=${"sess-hero" + (x.mvp?.m.id === h.m.id && h.xp ? " mvp" : "")}><${Portrait} ch=${h.m} size=${64}/><b>${firstName(h.m.name)}</b><span className="faint">L${h.m.level} ${h.m.cls}${h.levels ? html` <span className="up">⬆+${h.levels}</span>` : ""}</span><span>+${h.xp} XP</span>${h.downs ? html`<span className="faint">down ${h.downs}×</span>` : null}${x.mvp?.m.id === h.m.id && h.xp ? html`<span className="mvp-tag">MVP</span>` : null}</div>`)}</div>
      <div className="sess-stats">${[["⚔", x.fights, "fights"], ["💀", x.kills, "foes defeated"], ["🎯", x.crits, "critical hits"], ["💰", (x.gold > 0 ? "+" : "") + x.gold, "gold"], ["🎒", x.items, "items found"], ["📜", Math.max(0, x.quests), "quests done"], ["🔎", Math.max(0, x.clues), "clues"], ["✦", Math.max(0, x.rares), "rare encounters"]].map(([i, v, l]) => html`<div key=${l} className="sess-stat"><span className="si">${i}</span><b>${v}</b><span className="faint">${l}</span></div>`)}</div>
      ${x.best && html`<div className="recap-act">💥 <b>Best hit:</b> ${x.best.who}, ${x.best.dmg} damage on ${x.best.vs}${x.best.crit ? " (critical!)" : ""}</div>`}
      ${x.ach.length > 0 && html`<div className="recap-act">🏆 <b>Achievements:</b> ${x.ach.map(id => ACHIEVEMENTS.find(a => a.id === id)?.name).filter(Boolean).join(", ")}</div>`}
    </div><//>`;
}
// ---------- achievements ----------
const sumStat = (c, k) => partyMembers(c).reduce((a, m) => a + (m.stats?.[k] || 0), 0);
const ACHIEVEMENTS = [
  { id: "first-blood", icon: "⚔", name: "First Blood", d: "Win your first fight.", n: 1, v: c => tallyOf(c).wins },
  { id: "veteran", icon: "🛡", name: "Battle-Hardened", d: "Win 25 fights.", n: 25, v: c => tallyOf(c).wins },
  { id: "hunter", icon: "💀", name: "Monster Hunter", d: "Defeat 100 foes.", n: 100, v: c => tallyOf(c).kills },
  { id: "crit", icon: "🎯", name: "Natural Twenty", d: "Land a critical hit.", n: 1, v: c => tallyOf(c).crits },
  { id: "crit25", icon: "🎯", name: "Crit Machine", d: "Land 25 critical hits.", n: 25, v: c => tallyOf(c).crits },
  { id: "bighit", icon: "💥", name: "Overkill", d: "Deal 30 damage in a single hit.", n: 30, v: c => tallyOf(c).bestHit?.dmg || 0 },
  { id: "close", icon: "❤", name: "Close Call", d: "Have a hero go down and live to tell the tale.", n: 1, v: c => tallyOf(c).downs },
  { id: "dragon", icon: "🐉", name: "Dragonslayer", d: "Slay a dragon.", n: 1, v: c => tallyOf(c).dragons },
  { id: "undead", icon: "🦴", name: "Gravekeeper", d: "Put 30 undead to rest.", n: 30, v: c => tallyOf(c).undead },
  { id: "spells", icon: "✨", name: "Spellslinger", d: "Cast 50 spells in combat.", n: 50, v: c => tallyOf(c).spells },
  { id: "rich", icon: "💰", name: "Well Off", d: "Hold 1,000 gold at once.", n: 1000, v: c => c.characters[c.activeCharId]?.gold || 0 },
  { id: "rich2", icon: "👑", name: "Dragon's Hoard", d: "Hold 10,000 gold at once.", n: 10000, v: c => c.characters[c.activeCharId]?.gold || 0 },
  { id: "explorer", icon: "🧭", name: "Explorer", d: "Visit 10 places.", n: 10, v: c => Object.values(c.locations || {}).filter(l => l.visited).length },
  { id: "quests", icon: "📜", name: "Hero for Hire", d: "Complete 5 quests.", n: 5, v: c => Object.values(c.quests || {}).filter(q => q.status === "completed").length },
  { id: "quests15", icon: "📜", name: "Hero of the Realm", d: "Complete 15 quests.", n: 15, v: c => Object.values(c.quests || {}).filter(q => q.status === "completed").length },
  { id: "fellowship", icon: "🤝", name: "Fellowship", d: "Travel with a full party of four.", n: 4, v: c => partyMembers(c).length },
  { id: "loyal", icon: "💛", name: "Loyalty", d: "Complete a companion's personal quest.", n: 1, v: c => companionsOf(c).filter(m => m.companion?.loyal).length },
  { id: "liberator", icon: "🏰", name: "Liberator", d: "Free a fallen town.", n: 1, v: c => tallyOf(c).liberated },
  { id: "act2", icon: "🔎", name: "Detective", d: "Finish the first act of the main story.", n: 1, v: c => (c.story?.act || 1) >= 2 || c.villainDefeated ? 1 : 0 },
  { id: "kingslayer", icon: "⚜", name: "Kingslayer", d: "Defeat the villain.", n: 1, v: c => c.villainDefeated ? 1 : 0 },
  { id: "swift", icon: "⚡", name: "Swift Justice", d: "Defeat the villain within 30 days.", n: 1, v: c => c.villainDefeated && c.time.day <= 30 ? 1 : 0 },
  { id: "rare3", icon: "✦", name: "Lucky Traveller", d: "Find 3 rare encounters.", n: 3, v: c => (c.raresSeen || []).length },
  { id: "legend", icon: "🌟", name: "Touched by Legend", d: "Find a legendary encounter.", n: 1, v: c => (c.raresSeen || []).filter(id => RARE_EVENTS.find(e => e.id === id)?.rare === "legendary").length },
  { id: "lvl5", icon: "⬆", name: "Seasoned", d: "Reach level 5.", n: 5, v: c => c.characters[c.activeCharId]?.level || 1 },
  { id: "lvl10", icon: "⬆", name: "Champion", d: "Reach level 10.", n: 10, v: c => c.characters[c.activeCharId]?.level || 1 },
  { id: "lvl20", icon: "🌠", name: "Living Legend", d: "Reach level 20.", n: 20, v: c => c.characters[c.activeCharId]?.level || 1 },
  { id: "home", icon: "🏠", name: "Homeowner", d: "Buy a base for your party.", n: 1, v: c => c.base ? 1 : 0 },
  { id: "builder", icon: "🔨", name: "Master Builder", d: "Build every upgrade in your base.", n: 1, v: c => c.base && typeof BASE_UPGRADES !== "undefined" && BASE_UPGRADES.every(u => c.base.up?.[u.id]) ? 1 : 0 },
  { id: "coach", icon: "🐎", name: "Frequent Traveller", d: "Fast travel 5 times.", n: 5, v: c => tallyOf(c).fastTravels },
  { id: "coop", icon: "🎲", name: "Game Night", d: "Win a fight with friends online.", n: 1, v: c => c.coopWin ? 1 : 0 },
];
const achStore = { get(){ try { return JSON.parse(localStorage.getItem("ur:ach") || "{}"); } catch { return {}; } }, set(v){ try { localStorage.setItem("ur:ach", JSON.stringify(v)); } catch {} } };
function checkAchievements(){
  const c = C(); if (!c || !c.world || S().view !== "game") return; const got = achStore.get(); let changed = false;
  for (const a of ACHIEVEMENTS){ if (got[a.id]) continue; let v = 0; try { v = a.v(c); } catch {} if (v >= a.n){ got[a.id] = { at: Date.now(), camp: c.name }; changed = true; toast(`🏆 Achievement unlocked: ${a.name}`, "gold"); Sfx.play("levelup"); if (!window.Net?.isGuest()) store.camp(c => { if (c.session){ c.session.ach = [...(c.session.ach || []), a.id]; } }); } }
  if (changed) achStore.set(got);
}
setInterval(() => { try { checkAchievements(); } catch (e) { console.warn(e); } }, 2500);
// ---------- hall of fame ----------
const hallStore = { get(){ try { return JSON.parse(localStorage.getItem("ur:hall") || "[]"); } catch { return []; } }, set(v){ try { localStorage.setItem("ur:hall", JSON.stringify(v)); } catch {} } };
function recordHallOfFame(c){
  const all = hallStore.get(); if (all.some(x => x.id === c.id)) return; const main = c.characters[c.activeCharId]; let e = null; try { e = computeEnding(c); } catch {}
  all.unshift({ id: c.id, name: c.name, date: Date.now(), days: c.time.day, villain: c.villain?.name, title: e?.title || main.name, renown: e?.renown || 0, mode: c.premise?.mode || "campaign",
    hero: { name: main.name, race: main.race, cls: main.cls, level: main.level, look: main.look || null, dragonType: main.dragonType || null, id: main.id },
    party: companionsOf(c).map(m => m.name) });
  hallStore.set(all.slice(0, 50));
}
function TrophiesModal({ m }){
  const [tab, setTab] = useState(m.tab || "ach"); const got = achStore.get(); const hall = hallStore.get(); const c = C();
  return html`<${Modal} title="Achievements & Hall of Fame" onClose=${closeModal} wide=${true}>
    <${Seg} value=${tab} options=${[["ach", `Achievements (${Object.keys(got).length}/${ACHIEVEMENTS.length})`], ["hall", `Hall of Fame (${hall.length})`]]} onChange=${setTab}/>
    ${tab === "ach" ? html`<div className="ach-grid">${ACHIEVEMENTS.map(a => { const g = got[a.id]; let v = 0; try { v = c ? a.v(c) : 0; } catch {}
        return html`<div key=${a.id} className=${"ach" + (g ? " got" : "")}><span className="ach-ico">${a.icon}</span><div><b>${a.name}</b><div className="faint" style=${{ fontSize: 12.5 }}>${a.d}</div>
          ${g ? html`<div className="faint" style=${{ fontSize: 11.5 }}>Unlocked ${new Date(g.at).toLocaleDateString()}${g.camp ? ` · ${g.camp}` : ""}</div>` : a.n > 1 && c ? html`<div className="ach-bar"><i style=${{ width: Math.min(100, (v / a.n) * 100) + "%" }}></i></div>` : null}</div></div>`; })}</div>`
      : hall.length ? html`<div className="hall">${hall.map(h => html`<div key=${h.id} className="hall-row"><${Portrait} ch=${h.hero} size=${60}/><div className="grow"><b>${h.title}</b><div className="faint">${h.name}${h.mode === "quick" ? " (quick adventure)" : ""} · defeated ${h.villain || "the villain"} on day ${h.days}</div><div className="faint" style=${{ fontSize: 12.5 }}>Level ${h.hero.level} ${h.hero.race} ${h.hero.cls}${h.party?.length ? ` · with ${h.party.join(", ")}` : ""} · renown ${h.renown} · ${new Date(h.date).toLocaleDateString()}</div></div></div>`)}</div>`
      : html`<p className="faint">Finish a campaign by defeating its villain to enter the Hall of Fame.</p>`}
  <//>`;
}
</script>
