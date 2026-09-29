<script>
"use strict";
// =====================================================================
//  STRUCTURED MAIN STORY (three acts) · QUICK ADVENTURES · DM MEMORY
// =====================================================================
const ACTS = { 1: "Investigate", 2: "Confront the lieutenant", 3: "Storm the lair" };
const isQuick = (c) => c?.premise?.mode === "quick";
function villainLair(c){ return c.villain?.lair ? c.locations[c.villain.lair] : null; }
function initStory(c){
  if (c.story || !c.villain || c.villainDefeated) return;
  const quick = isQuick(c);
  c.story = { act: 1, clues: 0, need: quick ? 1 : 3, lt: null, questId: null, log: [] };
  let q = Object.values(c.quests).find(q => q.kind === "main" && q.status === "active");
  if (!q){ q = { id: "main-" + slug(c.villain.name), title: `Stop ${c.villain.name}`, kind: "main", status: "active", giver: "", summary: c.villain.motive || "", objectives: [], createdAt: Date.now() }; c.quests[q.id] = q; }
  c.story.questId = q.id;
  const lair = villainLair(c);
  if (quick && lair){ lair.small = true; lair.lvl = Math.max(1, partyLevel(c)); }
  storyObjectives(c);
}
function storyObjectives(c){
  const st = c.story, q = st && c.quests[st.questId]; if (!q) return;
  const v = c.villain?.name || "the enemy", lair = villainLair(c);
  const objs = [{ id: "act1", text: `Act 1: Uncover ${v}'s plans (clues ${Math.min(st.clues, st.need)}/${st.need})`, done: st.act > 1 }];
  if (!isQuick(c)) objs.push({ id: "act2", text: st.lt ? `Act 2: Defeat ${st.lt.name} at ${c.locations[st.lt.loc]?.name || "their stronghold"}` : "Act 2: Find and defeat the lieutenant", done: st.act > 2 });
  objs.push({ id: "act3", text: `Act ${isQuick(c) ? 2 : 3}: Storm ${st.act >= 3 && lair ? lair.name : "the lair"} and defeat ${v}`, done: !!c.villainDefeated });
  q.objectives = [...(q.objectives || []).filter(o => !/^act\d$/.test(o.id) && !o.done).slice(0, 2), ...objs];
}
function addClue(c, source, notes){
  const st = c.story; if (!st || st.act !== 1 || c.villainDefeated) return;
  st.clues++; st.log = [...(st.log || []), { day: c.time.day, text: String(source).slice(0, 140) }].slice(-10);
  notes?.push({ kind: "quest", text: `Clue about ${c.villain?.name || "the enemy"} (${Math.min(st.clues, st.need)}/${st.need}): ${String(source).slice(0, 90)}` });
  if (st.clues >= st.need) advanceAct(c, notes); else storyObjectives(c);
}
function advanceAct(c, notes){
  const st = c.story; if (!st) return; const v = c.villain; const lair = villainLair(c);
  if (st.act === 1 && !isQuick(c)){
    // the clues point to a lieutenant: their stronghold becomes Act 2
    const near = lair || topLoc(c, c.currentLocationId);
    const name = `${pick(LT_FIRST)} ${pick(LT_TITLES)}`;
    const place = createPlace(c, pick(["castle", "tower", "ruins"]), near, { name: `${name.split(" ")[0]}'s Hold`, hostile: true, theme: v.theme || themeForLoc(near), discovered: true, description: `The stronghold of ${name}, ${v.name}'s trusted lieutenant.` });
    if (place){ place.lvl = Math.max(2, partyLevel(c) + 1); place.small = true; place.lieutenant = name; place.bossName = name; place.actBoss = true; st.lt = { name, loc: place.id }; }
    st.act = 2; threatSetback(c, notes || [], 4, "your investigation");
    notes?.push({ kind: "quest", text: `Act 2: ${name} holds ${place?.name || "a stronghold"}. Defeat them to find ${v.name}.` });
    c.chronicle.push({ t: Date.now(), day: c.time.day, text: `The party's investigation revealed ${name}, lieutenant of ${v.name}, at ${place?.name}.` });
    queueNews(c, `STORY: Act 1 is complete. The clues the party gathered point to ${name}, ${v.name}'s lieutenant, who holds ${place?.name} (now on the map). Present this as a satisfying revelation that pulls the clues together, and make the next step feel urgent.`, `The clues fit together: ${name}, ${v.name}'s lieutenant, holds ${place?.name}.`);
  } else if (st.act <= 2){
    // Act 3: the lair
    st.act = 3; if (lair){ lair.discovered = true; lair.hidden = false; if (isQuick(c)) lair.lvl = Math.max(1, partyLevel(c)); }
    if (!isQuick(c)) threatSetback(c, notes || [], 4, "the lieutenant's defeat");
    notes?.push({ kind: "quest", text: `Final act: ${v.name} waits at ${lair?.name || "their lair"}.` });
    c.chronicle.push({ t: Date.now(), day: c.time.day, text: `The party learned the way to ${lair?.name}, where ${v.name} waits.` });
    queueNews(c, `STORY: the final act begins. The party now knows the way to ${lair?.name}, where ${v.name} waits${isQuick(c) ? ". This is a one-evening quick adventure: build tension and point them straight there" : ""}. Describe the revelation and a companion's reaction.`, `The way to ${lair?.name} is clear. ${v.name} waits there.`);
  }
  storyObjectives(c);
}
function storyContext(c){
  const st = c.story; if (!st || !c.villain) return "";
  if (c.villainDefeated) return `MAIN STORY: complete. ${c.villain.name} is defeated.`;
  const v = c.villain.name, lair = villainLair(c), acts = isQuick(c) ? 2 : 3, act = isQuick(c) && st.act === 3 ? 2 : st.act;
  const goal = st.act === 1 ? `the party is investigating ${v}. They have ${Math.min(st.clues, st.need)} of ${st.need} clues. Offer leads: NPCs who know things, documents, strange signs. When the party genuinely uncovers something new about ${v}'s plans, identity or whereabouts, add "clue":"one line" to the state (at most one per reply).`
    : st.act === 2 ? `the party must defeat ${st.lt?.name}, ${v}'s lieutenant, at ${c.locations[st.lt?.loc]?.name}. Point them there and raise the stakes.`
    : `the party knows the way to ${lair?.name} and must defeat ${v} there. Build toward the confrontation.`;
  return `MAIN STORY: Act ${act} of ${acts}, ${ACTS[st.act]}: ${goal} Keep side scenes short and connected to this goal; nudge the party back to it if they drift.${isQuick(c) ? " QUICK ADVENTURE: a one-evening story of about 90 minutes. Keep the pace brisk, and make every scene move toward the lair." : ""}`;
}
function levelHeroTo(ch, lvl){ let g = 0; while (ch.level < lvl && g++ < 12){ ch.xp = Math.max(ch.xp, XP_TABLE[ch.level]); applyLevelUp(ch, autoLevelChoices(ch)); } ch.hp = maxHp(ch); }

// ---------- the DM's memory ----------
// A rolling "story so far" keeps long campaigns consistent: older log entries are folded into a short summary.
let summarizing = false;
async function maybeSummarize(){
  const c = C(); if (!c || summarizing || !SAMPLE || window.Net?.isGuest()) return;
  const mem = c.memory = c.memory || { summary: "", upTo: null, notes: [] };
  const idx = mem.upTo ? c.log.findIndex(e => e.id === mem.upTo) + 1 : 0;
  const older = c.log.slice(idx, Math.max(idx, c.log.length - 14));
  if (older.filter(e => e.kind === "dm" || e.kind === "player").length < 20) return;
  summarizing = true;
  try {
    const text = older.map(e => e.kind === "dm" ? `DM: ${e.text}` : e.kind === "player" ? `${e.who || "Player"}: ${e.text}` : e.kind === "sys" ? `(${(e.notes || []).map(n => n.text).join("; ")})` : "").filter(Boolean).join("\n").slice(-9000);
    const res = await askClaude(`You keep the campaign notes for a fantasy role-playing game.\nCURRENT SUMMARY:\n${mem.summary || "(none yet)"}\n\nNEW EVENTS:\n${text}\n\nWrite an updated summary of the whole story so far in at most 220 words: key events in order, names of important NPCs and places, promises made, debts owed, grudges, mysteries still open and unresolved threads. Plain prose, no headings.`, { tier: "quick" });
    const sum = String(res?.text || "").trim();
    if (sum.length > 40) store.camp(c => { c.memory = { ...(c.memory || {}), summary: sum.slice(0, 2400), upTo: older[older.length - 1].id }; });
  } catch (e) { console.warn("summary failed", e); }
  finally { summarizing = false; }
}
function memoryContext(c){
  const m = c.memory || {}; const L = [];
  if (m.summary) L.push(`STORY SO FAR (older events, summarized): ${m.summary}`);
  if ((m.notes || []).length) L.push(`YOUR PRIVATE DM NOTES (the players can't see these; pay off setups when the moment is right, and resolve them with "dm_notes_done"):\n${m.notes.map(n => `- ${n}`).join("\n")}`);
  return L.join("\n\n");
}
const DM_LANG = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };
const DM_LENGTH = { short: "Keep narration short: about 50-100 words.", medium: "", long: "Narration may be richer: about 180-320 words." };
function styleDirective(){
  const st = S().settings || {}; const L = [];
  if (st.dmLanguage && st.dmLanguage !== "en") L.push(`LANGUAGE: write all narration, dialogue, hints and choice texts in ${DM_LANG[st.dmLanguage] || "English"}. Keep JSON keys, ids, enum values and game terms (skill names, monster names) in English.`);
  if (DM_LENGTH[st.narration]) L.push(DM_LENGTH[st.narration]);
  return L.join("\n");
}
</script>
<script>
"use strict";
// ======================= "PREVIOUSLY ON…" RECAP =======================
// Shown when you continue a campaign (or join a friend's game mid-story), so game night starts with everyone caught up.
function maybeRecap(){ const c = C(); if (!c || c.combat || (c.log || []).filter(e => e.kind === "dm").length < 4) return; setTimeout(() => { if (!S().modal) openModal({ type: "recap" }); }, 350); }
function RecapModal(){
  const s = useStore(); const c = s.campaign; const [busy, setBusy] = useState(false); if (!c) return null;
  const st = c.story, v = c.villain, loc = topLoc(c, c.currentLocationId);
  const chron = (c.chronicle || []).map(x => x.text); const lively = chron.filter(t => !/joined the party/i.test(t));
  const sum = c.memory?.summary || lively.slice(-5).join(" ");
  const lastDm = [...(c.log || [])].reverse().find(e => e.kind === "dm")?.text || "";
  const tail = lastDm.length > 420 ? "…" + lastDm.slice(-420).replace(/^\S*\s/, "") : lastDm;
  const actLine = st && v ? (c.villainDefeated ? `${v.name} has been defeated.` : st.act === 1 ? `Act 1, Investigate: ${Math.min(st.clues, st.need)} of ${st.need} clues about ${v.name}.` : st.act === 2 ? `Act 2: defeat ${st.lt?.name} at ${c.locations[st.lt?.loc]?.name || "their stronghold"}.` : `Final act: storm ${villainLair(c)?.name || "the lair"} and face ${v.name}.`) : "";
  const ask = async () => { setBusy(true); closeModal(); await runDM("event", { text: `The players are returning to the game after a break. Before anything new happens, give a short, dramatic "Previously on…" recap (4-6 sentences, like a TV narrator) of the story so far: where the party is, what they're trying to do, the last important thing that happened, and one open question. Then end at the current moment. Don't advance the story or change anything.`, offline: "The story waits where you left it." }); setBusy(false); };
  return html`<${Modal} title=${`Previously on ${c.name}…`} onClose=${closeModal} wide=${true} foot=${html`${SAMPLE && !window.Net?.isGuest() ? html`<button className="btn ghost" disabled=${busy} onClick=${ask}>🎙 Ask the DM for a recap</button>` : null}<button className="btn primary" onClick=${closeModal}>Continue the story</button>`}>
    <div className="recap-party">${partyMembers(c).map(m => html`<div key=${m.id} className="recap-hero"><${Portrait} ch=${m} size=${54}/><b>${firstName(m.name)}</b><span className="faint">L${m.level} ${m.cls} · ${m.hp}/${maxHp(m)} HP</span></div>`)}</div>
    <p className="faint" style=${{ margin: "10px 0 4px" }}>Day ${c.time.day}, ${c.time.phase}${loc ? ` · ${loc.name}` : ""}${c.explore ? ` (inside ${c.locations[c.explore.loc]?.name})` : ""}</p>
    ${actLine && html`<div className="recap-act"><b>Main story:</b> ${actLine}</div>`}
    ${sum && html`<h3 className="panel-title" style=${{ marginTop: 12 }}>The story so far</h3><p style=${{ marginTop: 4 }}>${sum}</p>`}
    ${tail && html`<h3 className="panel-title" style=${{ marginTop: 12 }}>Where you left off</h3><div className="recap-last"><${Md} text=${tail}/></div>`}
  <//>`;
}
</script>
