<script>
"use strict";
// =====================================================================
//  PLAYING A SITE: walking from room to room (and floor to floor), doors and locks, searching,
//  furniture and objects, people, trespassing, exits into other places (alley, sewers, keep),
//  and the mechanics the old dungeon rooms always had (fights, traps, treasure, shrines, rest).
//  Every function here is a "shared action": in co-op it runs on the host for whoever clicked.
// =====================================================================
Object.assign(BESTIARY, {
  "Guard":{hp:11,ac:16,xp:25,type:"humanoid",mods:{STR:1,DEX:1,CON:1},pp:12,atk:[["Spear",3,"1d6+1","piercing"],["Spear (thrown)",3,"1d6+1","piercing",1]],beh:"tactical"},
});
function genDungeon(c, loc){ return ensureSite(c, loc); }
function dungeonContext(c){ return siteContext(c); }
function siteRoom(site, id){ return site?.rooms.find(r => r.id === id) || null; }
function markSeen(site, roomId){ const r = siteRoom(site, roomId); if (!r) return; if (r.state !== "cleared") r.state = "visited"; for (const id of roomLinks(r)){ const n = siteRoom(site, id); if (n && n.state === "unseen") n.state = "seen"; } }
function siteTown(c, loc){ return loc?.parent ? c.locations[loc.parent] : null; }
function peopleLine(r){ return r.npcs.filter(n => !n.dead && !n.gone).map(n => `${n.name}${n.role ? ` (${n.role}${n.mood ? `, ${n.mood}` : ""})` : ""}${n.line ? `, who might say ${n.line}` : ""}`).join("; "); }
// ---------- entering and leaving ----------
async function enterDungeon(locId, roomId){ return enterSite(locId, roomId); }
async function enterSite(locId, roomId, o = {}){
  const c0 = C(); if (!c0 || S().busy || c0.combat) return; const loc0 = c0.locations[locId]; if (!loc0) return;
  let first = false, hostile = false;
  store.camp(c => {
    const l = c.locations[locId]; const town = siteTown(c, l); if (town) ensureTown(c, town);
    const site = ensureSite(c, l); hostile = !!site.hostile; first = !site.entered; site.entered = true;
    if (site.shifting && !first) for (const r of site.rooms) if (!r.entrance && r.state === "visited" && !roomBlocked(r)) r.state = "seen";   // a place that rearranges itself: explore it again
    const start = roomId && siteRoom(site, roomId) ? roomId : site.entrance; site.current = start; markSeen(site, start);
    c.explore = { loc: locId }; moveTo(c, l); l.discovered = true; l.hidden = false;
    pushLog(c, { kind: "player", text: `${o.via ? o.via : "Enter"}: ${l.name}` });
  });
  const loc = C().locations[locId]; const site = siteOf(C()); const r = roomOf(C());
  if (hostile) await saveCheckpoint(`Entering ${loc.name}`);
  hostUI(() => store.set({ tab: "map" }));
  if (!first){ store.camp(c => sysNote(c, { kind: "map", text: `Back at ${loc.name}: ${r.name}` })); return; }
  if (hostile) await runDM("event", { text: `The party enters ${loc.name}, a ${THEMES[site.theme]?.label || site.label}${site.blurb ? ` (${site.blurb})` : ""}. Describe the ${r.name} in 2-4 atmospheric sentences: sounds, smells, signs of what dwells within. Companions react briefly.`, offline: `You enter ${loc.name}. ${r.desc || ""}` });
  else await runDM("event", { text: `The party steps into ${loc.name} (${site.label}${site.blurb ? `: ${site.blurb}` : ""}; mood: ${site.mood}). They are in the ${r.name}: ${r.desc} People here: ${peopleLine(r) || "nobody"}. Describe the place in 2-4 vivid sentences and, if someone is here, have one of them greet or notice the party in their own voice. Companions may react briefly.`, offline: `You step into ${loc.name}. ${r.desc || ""}` });
}
// leave the place: back out to the town (for buildings) or the open air (for dungeons)
async function leaveDungeon(via){
  const c0 = C(); const site = siteOf(c0); if (!site || S().busy || c0.combat) return; const loc = c0.locations[c0.explore.loc]; const r = roomOf(c0);
  if (r && roomBlocked(r)) return coopNotify("Deal with the danger here first.", "bad");
  const town = siteTown(c0, loc);
  store.camp(c => { c.explore = null; if (town) moveTo(c, c.locations[town.id]); pushLog(c, { kind: "player", text: `Leave ${loc.name}${via ? ` (${via})` : ""}` }); });
  hostUI(() => store.set({ tab: town ? "map" : "adventure" }));
  if (!site.hostile){ store.camp(c => sysNote(c, { kind: "map", text: town ? `Back on the streets of ${town.name}` : `You leave ${loc.name}` })); return; }
  await runDM("event", { text: `The party ${r?.entrance ? "leaves" : "retraces its steps through the halls and leaves"} ${loc.name}${site.cleared ? ", its master defeated" : ", its depths not yet conquered"}, emerging into the open air${town ? ` of ${town.name}` : ""}. Describe it in 1-2 sentences.`, offline: `You leave ${loc.name} behind and step back into daylight.` });
}
function leaveSite(via){ return leaveDungeon(via); }
// ---------- moving between rooms ----------
async function moveToRoom(roomId, opt = {}){
  const c0 = C(); const site = siteOf(c0); if (!site || S().busy || c0.combat) return;
  const cur = roomOf(c0); const target = siteRoom(site, roomId); if (!cur || !target) return;
  if (!roomLinks(cur).includes(roomId) && !opt.dm) return coopNotify("You can't reach that room from here.", "bad");
  if (roomBlocked(cur) && !opt.dm) return coopNotify("Deal with the danger here first.", "bad");
  const door = cur.doors.find(d => d.to === roomId);
  if (door?.locked && !door.unlocked && !opt.dm) return coopNotify(`The way to the ${target.name} is locked.`, "bad");
  const loc = c0.locations[c0.explore.loc]; const first = target.state !== "visited" && target.state !== "cleared";
  // private rooms in peaceful places: sneak in, or be noticed
  if (!site.hostile && target.private && !target.trespassed && !opt.dm && !site.welcome){
    const owners = site.rooms.flatMap(r => r.npcs).filter(n => !n.dead && !n.gone && /keeper|owner|guard|sergeant|warden|steward|captain|priest|master|noble|harbormaster|foreman|librarian|resident|farmer/i.test(n.role || ""));
    if (owners.length){
      const dc = target.owner || target.evidence ? 14 : 12; const chk = await partyCheck("Stealth", dc, { group: partyMembers(C()).length > 1 });
      const notes = []; let fight = null;
      store.camp(c => { const s = siteOf(c); const t = siteRoom(s, roomId); t.trespassed = true;
        if (!chk.success){ const tn = siteTown(c, c.locations[c.explore.loc]); if (tn) addRep(c, tn.name, -5, notes); applyApproval(c, ["deceit"], notes); c.flags = { ...(c.flags || {}), [`caught_in_${slug(loc.name).replace(/-/g, "_")}`]: true };
          if (["guardhouse","prison","castle"].includes(s.kind)) fight = { enemies: [{ name: "Guard", count: Math.min(4, 1 + partyMembers(c).length) }], surprise: "none", terrain: t.name };
          if (notes.length) pushLog(c, { kind: "sys", notes }); } });
      if (!chk.success){
        if (fight){ await runDM("event", { text: `Sneaking into the ${target.name} of ${loc.name}, the party is caught by the guards. ${chk.text} Describe the shouted challenge in 2 sentences. Do NOT set "combat"; the game starts the fight.`, offline: `"Halt! Intruders!" Guards pour into the ${target.name}.` }); startCombat(fight, { origin: { kind: "room", loc: loc.id, room: roomId, wandering: true } }); return; }
        await runDM("event", { text: `The party slips into the ${target.name} of ${loc.name}, a private room, and is noticed by ${owners[0].name} (${owners[0].role}). ${chk.text} Play the confrontation in 2-4 sentences in ${owners[0].name}'s voice (suspicious, angry or merely curious, as fits ${owners[0].mood || "their mood"}); the party may talk their way out. Include "choices".`, offline: `${owners[0].name} catches you in the ${target.name}. "And what do you think you're doing in here?"` });
      }
    }
  }
  if (target.type === "boss" && target.state !== "cleared") await saveCheckpoint(`Before ${target.bossName || "the boss"}`);
  Sfx.play("door");
  store.camp(c => { const s = siteOf(c); s.current = roomId; markSeen(s, roomId); pushLog(c, { kind: "player", text: `${door?.kind === "stairs" ? (door.dir === "up" ? "Climb to" : "Descend to") : "Enter"}: ${target.name}` }); });
  await arriveInRoom(loc, first, !!opt.dm || !!opt.quiet);
}
// what happens on arrival in a room, by what the room holds
async function arriveInRoom(loc, first, quiet){
  const c0 = C(); const site = siteOf(c0); const r = roomOf(c0); if (!r) return; const notes = [];
  if (!first && !roomBlocked(r)){
    if (site.hostile && !site.cleared && !quiet && Math.random() < 0.12){
      const spec = randomCombat(c0, site.theme || "bandit", "easy"); const foes = spec.enemies.map(e => `${e.count} ${e.name}${e.count > 1 ? "s" : ""}`).join(" and ");
      await runDM("event", { text: `As the party passes back through the ${r.name} in ${loc.name}, they run into a wandering patrol: ${foes}. Describe the surprise meeting in 2 sentences. Do NOT set "combat".`, offline: `A wandering patrol, ${foes}, blunders into you in the ${r.name}!` });
      startCombat({ ...spec, terrain: r.name, room: roomFeatures(site, r) }, { origin: { kind: "room", loc: loc.id, room: r.id, wandering: true } }); return;
    }
    store.camp(c => sysNote(c, { kind: "map", text: `${r.name}${r.npcs.some(n => !n.gone && !n.dead) ? `: ${r.npcs.filter(n => !n.gone && !n.dead).map(n => n.name).join(", ")}` : ""}` })); return;
  }
  if (r.type === "room"){
    if (quiet) return;
    const people = peopleLine(r);
    await runDM("event", { text: `The party enters the ${r.name} of ${loc.name}${r.private ? " (a private room they are not meant to be in)" : ""}: ${r.desc} ${r.light === "dark" ? "It is dark." : r.light === "dim" ? "The light is dim." : ""} Visible here: ${roomObjects(r).map(o => o.name).join(", ") || "little"}. People: ${people || "nobody"}. Describe it in 2-3 sentences${people ? ", with a line or reaction from someone here" : ""}. Do not reveal anything hidden.`, offline: `${r.name}. ${r.desc || ""}${people ? ` Here: ${r.npcs.filter(n => !n.gone && !n.dead).map(n => n.name).join(", ")}.` : ""}` });
    return;
  }
  if (r.type === "treasure" && r.mimic){
    const chk = await partyCheck("Investigation", 13); const surprise = chk.success ? "enemies" : "player";
    store.camp(c => { const rr = roomOf(c); rr.mimic = false; rr.type = "combat"; rr.enemies = [{ name: "Mimic", count: partyLevel(c) >= 5 ? 2 : 1 }]; });
    await runDM("event", { text: `The party enters the ${r.name} in ${loc.name}: a treasure chamber with a fine chest. ${chk.text} ${chk.success ? "They notice the chest is breathing just before touching it: a mimic!" : "The moment someone touches it, the chest sprouts teeth and a sticky pseudopod: a mimic!"} Describe it in 2 sentences. Do NOT set "combat".`, offline: chk.success ? "The chest's wood grain is... breathing. Mimic!" : "The chest lunges at you with a mouthful of teeth. Mimic!" });
    startCombat({ enemies: roomOf(C()).enemies, surprise, terrain: r.name, room: roomFeatures(site, r) }, { origin: { kind: "room", loc: loc.id, room: r.id } }); return;
  }
  if (r.type === "combat" || r.type === "boss"){
    const foes = r.enemies.map(e => `${e.count} ${e.displayName || e.name}${e.count > 1 ? "s" : ""}`).join(", ");
    await runDM("event", { text: `The party enters the ${r.name} in ${loc.name}: ${r.desc} ${r.type === "boss" ? `This is the lair of ${r.bossName}, the master of this place${loc.villain ? ` (${loc.villain.title || "the campaign's villain"}; motive: ${loc.villain.motive || "unknown"})` : ""}. Give the boss a menacing line of dialogue.` : ""} Waiting inside: ${foes}. Describe the room and the moment the enemies notice the party in 2-4 sentences. Do NOT set "combat"; the game starts the fight.`, offline: `${r.name}: ${foes} turn toward you!` });
    startCombat({ enemies: r.enemies, terrain: r.name, theme: site.theme, room: roomFeatures(site, r), ...(r.type === "combat" && r.tactics ? r.tactics : {}) }, { origin: { kind: "room", loc: loc.id, room: r.id, boss: r.type === "boss" } }); return;
  }
  let extra = "";
  if (r.type === "trap"){
    const tr = r.trap; const spot = await partyCheck("Perception", tr.dc);
    if (spot.success){ store.camp(c => { for (const x of partyMembers(c)) gainXP(c, x, 25 * partyLevel(c), notes, "trap spotted", x.id !== c.activeCharId); }); extra = `${spot.text} They spot ${tr.n} and avoid it.`; }
    else {
      const victims = tr.all ? partyMembers(C()).filter(m => m.hp > 0) : [pick(partyMembers(C()).filter(m => m.hp > 0))]; const outs = [];
      for (const v of victims){ const sv = await partyCheck(tr.save, tr.dc, { save: true, who: v }); const dmg = rollDice(tr.dmg).total; const dealt = sv.success ? Math.floor(dmg / 2) : dmg; store.camp(c => damageChar(c, c.characters[v.id], dealt, tr.t, notes, firstName(v.name))); outs.push(`${v.name} ${sv.success ? "partly dodges" : "is caught"} (${dealt} ${tr.t})`); }
      extra = `${spot.text} ${tr.n} springs! ${outs.join("; ")}.`;
    }
    store.camp(c => { const rr = roomOf(c); rr.state = "cleared"; if (notes.length) pushLog(c, { kind: "sys", notes }); });
    await runDM("event", { text: `The party enters the ${r.name} in ${loc.name} (${r.desc}), which holds a trap: ${r.trap.n}. ${extra} Narrate it (results already applied).`, offline: extra }); return;
  }
  if (r.type === "treasure"){ store.camp(c => { const rr = roomOf(c); giveLoot(c, rr.loot, notes); rr.loot = null; rr.state = "cleared"; if (notes.length) pushLog(c, { kind: "sys", notes }); }); await runDM("event", { text: `The party enters the ${r.name}${r.secret ? " (a hidden chamber they uncovered)" : ""} in ${loc.name}: ${r.desc} They find treasure: ${notes.map(n => n.text).join(", ")}. Describe the discovery (items already added to their packs).`, offline: `${r.name}: ${notes.map(n => n.text).join(", ")}.` }); return; }
  if (r.type === "shrine"){ const chk = await partyCheck("Religion", 11 + lootTier(partyLevel(C()))); store.camp(c => { if (chk.success){ for (const m of partyMembers(c)) addCond(m, "blessed", { note: "shrine blessing, until your next battle", preCombat: true }); notes.push({ kind: "loot", text: "Party blessed" }); } roomOf(c).state = "cleared"; if (notes.length) pushLog(c, { kind: "sys", notes }); }); await runDM("event", { text: `The party finds an old shrine in the ${r.name}: ${r.desc} ${chk.text} ${chk.success ? "Its blessing settles on them (+1d4 to attacks and saves in the next battle)." : "It stays cold and silent."} Narrate briefly.`, offline: chk.success ? "A warmth settles over the party: blessed." : "The shrine stays cold." }); return; }
  if (r.type === "camp"){ store.camp(c => { roomOf(c).state = "cleared"; }); await runDM("event", { text: `The ${r.name} in ${loc.name} is quiet and defensible: a good spot for a short rest. ${r.desc} Describe it in 2 sentences.`, offline: `${r.name}: a safe place to rest.` }); return; }
  if (r.type === "entrance"){ store.camp(c => { roomOf(c).state = "cleared"; }); return; }
  store.camp(c => { roomOf(c).state = "cleared"; const n = []; addClue(c, `strange signs in the ${r.name} of ${loc.name}`, n); if (n.length) pushLog(c, { kind: "sys", notes: n }); });
  await runDM("event", { text: `The party enters the ${r.name} in ${loc.name}: ${r.desc} It holds ${r.feature}. Describe it vividly and leave the mystery for the party to investigate; if they solve it later, reward them with a small treasure or XP.`, offline: `${r.name}: ${r.feature}.` });
}
// what a room contributes to a fight that starts in it
function roomFeatures(site, r){
  const cover = r.objects.some(o => o.cover && !["broken","burned"].includes(o.state)) || r.choke;
  return { cover, choke: !!r.choke, high: !!r.high, escape: !!r.escape || r.doors.length >= 3, hazard: r.hazard || null, style: site.style, name: r.name, objects: r.objects.filter(o => !o.hidden || o.found).map(o => ({ kind: o.kind, x: o.x - r.x, y: o.y - r.y, w: o.w, h: o.h })), w: r.w, h: r.h, light: r.light };
}
// ---------- searching a room: secret doors, hidden stashes, loose coins ----------
async function searchRoom(){
  const c0 = C(); const r = roomOf(c0); if (!r || r.searched || S().busy || roomBlocked(r)) return;
  const tier = lootTier(partyLevel(c0)); const chk = await partyCheck("Investigation", 12 + tier); const notes = []; let found = [], things = [];
  store.camp(c => { const s = siteOf(c); const rr = roomOf(c); rr.searched = true;
    if (chk.success){ rr.found = [...(rr.found || []), ...rr.hiddenLinks]; found = rr.hiddenLinks.slice(); for (const id of rr.hiddenLinks){ const sr = siteRoom(s, id); if (sr.state === "unseen") sr.state = "seen"; sr.found = [...(sr.found || []), rr.id]; }
      for (const o of rr.objects.filter(o => o.hidden && !o.found)){ o.found = true; things.push(o.name); }
      if (!found.length && !things.length && rnd(2) === 0) giveLoot(c, rollLoot(partyLevel(c), "minor"), notes); }
    if (found.length) notes.push({ kind: "map", text: found.length > 1 ? "Found secret passages!" : "Found a secret passage!" }); for (const t of things) notes.push({ kind: "map", text: `Found: ${t}` });
    if (notes.length) pushLog(c, { kind: "sys", notes }); });
  const loc = c0.locations[c0.explore.loc];
  if (!found.length && !things.length){ store.camp(c => sysNote(c, { kind: "hurt", text: chk.success ? "Nothing more to find here." : "You find nothing." })); return; }
  await runDM("event", { text: `The party searches the ${r.name} of ${loc.name}. ${chk.text} They discover: ${[...(found.length ? ["a hidden passage"] : []), ...things].join(", ")}. Narrate the discovery in 1-3 sentences.`, offline: `Searching the ${r.name}, you find ${[...(found.length ? ["a hidden passage"] : []), ...things].join(" and ")}.` });
}
async function restInDungeon(){
  const c0 = C(); const r = roomOf(c0); const site = siteOf(c0); if (!r || !site || S().busy || roomBlocked(r)) return;
  const loc = c0.locations[c0.explore.loc];
  const safe = r.type === "camp" || !site.hostile || site.cleared;
  if (!safe && Math.random() < 0.3){
    const spec = randomCombat(c0, site.theme || "bandit", "easy");
    await runDM("event", { text: `The party tries to rest in the ${r.name}, but wandering ${spec.enemies.map(e => e.name).join(" and ")} stumble upon them. Describe the interruption in 2 sentences. Do NOT set "combat".`, offline: `Your rest is cut short: ${spec.enemies.map(e => e.name).join(" and ")} stumble in!` });
    startCombat({ ...spec, terrain: r.name, room: roomFeatures(site, r) }, { origin: { kind: "room", loc: loc.id, room: r.id, wandering: true } }); return;
  }
  if (Coop.remoteCall) doShortRest(autoRestPlan(C()), true); else openModal({ type: "shortrest" });
}
async function engageRoom(){
  const c0 = C(); const r = roomOf(c0); const site = siteOf(c0); if (!r || !roomBlocked(r) || c0.combat || S().busy) return; const loc = c0.locations[c0.explore.loc];
  startCombat({ enemies: r.enemies, terrain: r.name, theme: site.theme, room: roomFeatures(site, r), ...(r.type === "combat" && r.tactics ? r.tactics : {}) }, { origin: { kind: "room", loc: loc.id, room: r.id, boss: r.type === "boss" } });
}
// ---------- locked doors: a key, lockpicks or a shoulder ----------
function keyFor(c, lock){ if (!lock) return null; const want = String(lock.key || "").toLowerCase(); for (const m of partyMembers(c)) for (const it of m.inventory || []){ const n = it.name.toLowerCase(); if (n === want || (it.type === "key" && (n.includes("key") && (want.includes(n.replace(/ key$/, "")) || /^(iron|brass|old|rusty|small|cell) key$/.test(n))))) return { m, it }; } return null; }
async function unlockDoor(roomId, how){
  const c0 = C(); const site = siteOf(c0); const cur = roomOf(c0); if (!site || !cur || S().busy || c0.combat) return;
  const d = cur.doors.find(x => x.to === roomId); if (!d || !d.locked || d.unlocked) return; const target = siteRoom(site, roomId);
  const done = (text, kind) => store.camp(c => { const s = siteOf(c); const a = roomOf(c); const dd = a.doors.find(x => x.to === roomId); if (dd) dd.unlocked = true; const b = siteRoom(s, roomId); const back = b?.doors.find(x => x.to === a.id); if (back) back.unlocked = true; sysNote(c, { kind: kind || "map", text }); });
  if (how === "key"){ const k = keyFor(c0, d.locked); if (!k) return coopNotify("Nobody has a key that fits.", "bad"); done(`${firstName(k.m.name)}'s ${k.it.name} opens the way to the ${target.name}.`); return; }
  if (how === "pick"){
    const who = partyMembers(c0).filter(m => m.hp > 0).sort((a, b) => skillMod(b, "Sleight of Hand") - skillMod(a, "Sleight of Hand"))[0];
    const tools = partyMembers(c0).some(m => (m.inventory || []).some(it => /thieves' tools/i.test(it.name)));
    if (!tools) return coopNotify("Picking a lock needs Thieves' Tools.", "bad");
    const chk = await partyCheck("Sleight of Hand", d.locked.dc, { who });
    if (chk.success) done(`${firstName(who.name)} picks the lock to the ${target.name}.`); else store.camp(c => { const a = roomOf(c); const dd = a.doors.find(x => x.to === roomId); if (dd) dd.locked.dc = Math.min(25, dd.locked.dc + 2); sysNote(c, { kind: "hurt", text: `The lock resists ${firstName(who.name)}'s picks.` }); });
    return;
  }
  const chk = await partyCheck("Athletics", d.locked.dc + 2);
  if (chk.success){ done(`${firstName(chk.who?.name || "")} breaks the door to the ${target.name} open!`); if (site.hostile && Math.random() < 0.35) store.camp(c => { const s = siteOf(c); const t = siteRoom(s, roomId); if (t && t.type === "room" && !t.enemies){ t.type = "combat"; t.enemies = randomCombat(c, s.theme || "bandit", "easy").enemies; } }); }
  else store.camp(c => sysNote(c, { kind: "hurt", text: "The door holds. Everyone within earshot heard that." }));
}
// ---------- objects: furniture that does something ----------
function objState(o){ return o.looted ? "emptied" : o.open ? "open" : o.state || ""; }
async function useObject(objId, act){
  const c0 = C(); const site = siteOf(c0); const r = roomOf(c0); if (!site || !r || S().busy || c0.combat) return;
  const o = r.objects.find(x => x.id === objId); if (!o || (o.hidden && !o.found)) return;
  if (roomBlocked(r)) return coopNotify("Deal with the danger here first.", "bad");
  const loc = c0.locations[c0.explore.loc]; const notes = []; const level = partyLevel(c0); const tier = lootTier(level);
  const set = (fn) => store.camp(c => { const rr = roomOf(c); const oo = rr.objects.find(x => x.id === objId); fn(c, oo, rr); if (notes.length){ pushLog(c, { kind: "sys", notes }); notes.length = 0; } });
  if (act === "examine" || (act === "read" && !o.text)){
    if (o.note && !o.examined){ set((c, oo) => { oo.examined = true; }); await runDM("event", { text: `The party examines the ${o.name} in the ${r.name} of ${loc.name}: ${o.note} Narrate what they notice in 2-3 sentences and let them draw their own conclusions; do not state the full story.`, offline: o.note }); return; }
    const d = describeObject(o, r, site); set((c, oo) => { oo.examined = true; sysNote(c, { kind: "map", text: `${cap(o.name)}: ${d}` }); }); return;
  }
  if (act === "read"){ set((c, oo) => { oo.examined = true; sysNote(c, { kind: "map", text: oo.text }); }); return; }
  if (act === "search"){
    if (o.searched) return coopNotify("Already searched.", "bad");
    if (o.loot){ set((c, oo) => { oo.searched = true; oo.looted = true; giveLoot(c, oo.loot, notes); oo.loot = null; }); return; }
    const chk = await partyCheck("Investigation", 10 + tier);
    set((c, oo, rr) => { oo.searched = true; if (chk.success){ if (rnd(3) === 0) giveLoot(c, rollLoot(level, "minor"), notes); else if (rr.objects.some(x => x.hidden && !x.found) && rnd(2) === 0){ const h = rr.objects.find(x => x.hidden && !x.found); h.found = true; notes.push({ kind: "map", text: `Behind the ${oo.name}: ${h.name}` }); } else notes.push({ kind: "hurt", text: `Nothing in the ${oo.name}.` }); } else notes.push({ kind: "hurt", text: `Nothing in the ${oo.name}.` }); });
    return;
  }
  if (act === "open"){
    if (o.looted) return coopNotify("It's empty.", "bad");
    if (o.locked && !o.unlocked){ const k = keyFor(c0, o.locked); if (k){ set((c, oo) => { oo.unlocked = true; notes.push({ kind: "map", text: `${k.it.name} opens the ${oo.name}.` }); }); } else { const chk = await partyCheck(partyMembers(c0).some(m => (m.inventory || []).some(it => /thieves' tools/i.test(it.name))) ? "Sleight of Hand" : "Athletics", o.locked.dc); if (!chk.success){ set((c, oo) => { notes.push({ kind: "hurt", text: `The ${oo.name} stays locked.` }); }); return; } set((c, oo) => { oo.unlocked = true; }); } }
    if (o.prisoner && !o.prisoner.freed){
      const p = o.prisoner; set((c, oo, rr) => { oo.prisoner = { ...p, freed: true }; oo.open = true; const town = siteTown(c, c.locations[c.explore.loc]); const id = slug(p.name); c.npcs[id] = { ...(c.npcs[id] || {}), id, name: p.name, role: "freed prisoner", location: town?.id || c.currentLocationId, attitude: 60, status: "alive", personality: "Grateful, shaken", notes: `Freed by the party from ${c.locations[c.explore.loc].name}; was held for being ${p.why}.`, memories: [...((c.npcs[id] || {}).memories || []), "The party freed me from my cell."] }; c.flags = { ...(c.flags || {}), [`freed_${id.replace(/-/g, "_")}`]: true }; applyApproval(c, ["mercy"], notes); for (const m of partyMembers(c)) gainXP(c, m, 20 * partyLevel(c), notes, "a prisoner freed", m.id !== c.activeCharId); if (rnd(2) === 0) addClue(c, `what ${p.name} overheard in the cells`, notes); notes.push({ kind: "npc", text: `${p.name} is free` }); });
      await runDM("event", { text: `The party opens the ${o.name} in the ${r.name} of ${loc.name} and frees ${p.name}, held for being ${p.why}. Write ${p.name}'s first words and what they offer in thanks (a rumor, a secret or a favor), in 2-4 sentences. Include "choices".`, offline: `${p.name} stumbles out of the cell. "I won't forget this."` }); return;
    }
    if (["coffin","sarcophagus"].includes(o.kind) && site.hostile && !o.open && Math.random() < 0.4){
      set((c, oo) => { oo.open = true; }); const spec = { enemies: [{ name: level >= 5 ? "Ghoul" : "Skeleton", count: 1 + rnd(2) }], surprise: "player", terrain: r.name, room: roomFeatures(site, r) };
      await runDM("event", { text: `The party pries open the ${o.name} in the ${r.name} of ${loc.name}, and its occupant sits up. Describe it in 2 sentences. Do NOT set "combat".`, offline: `The lid scrapes aside, and the thing inside opens its eyes.` });
      startCombat(spec, { origin: { kind: "room", loc: loc.id, room: r.id, wandering: true } }); return;
    }
    if (o.trap && !o.trapSprung){ const tr = TRAPS[rnd(TRAPS.length)]; const v = pick(partyMembers(C()).filter(m => m.hp > 0)); const sv = await partyCheck(tr.save, 12 + tier, { save: true, who: v }); const dmg = rollDice(`${2 + tier}d6`).total; set((c, oo) => { oo.trapSprung = true; damageChar(c, c.characters[v.id], sv.success ? Math.floor(dmg / 2) : dmg, tr.t, notes, firstName(v.name)); notes.push({ kind: "hurt", text: `${cap(tr.n)} from the ${oo.name}!` }); }); }
    set((c, oo) => { oo.open = true; oo.looted = true; const l = oo.loot || (oo.kind === "hoard" ? rollLoot(level + 1, "boss") : rnd(3) ? rollLoot(level, oo.kind === "chest" ? "chest" : "minor") : null); if (l){ giveLoot(c, l, notes); } else notes.push({ kind: "hurt", text: `The ${oo.name} is empty.` }); oo.loot = null; });
    return;
  }
  if (act === "use"){
    if (o.kind === "lever" || o.kind === "wheel"){
      set((c, oo, rr) => { oo.state = oo.state === "pulled" ? "reset" : "pulled"; const s = siteOf(c);
        const secretDoor = rr.doors.find(d => d.secret && !(rr.found || []).includes(d.to)); const lockedDoor = rr.doors.find(d => d.locked && !d.unlocked);
        if (secretDoor){ rr.found = [...(rr.found || []), secretDoor.to]; const t = siteRoom(s, secretDoor.to); if (t){ if (t.state === "unseen") t.state = "seen"; t.found = [...(t.found || []), rr.id]; } notes.push({ kind: "map", text: "Stone grinds: a hidden passage opens!" }); }
        else if (lockedDoor){ lockedDoor.unlocked = true; const t = siteRoom(s, lockedDoor.to); const back = t?.doors.find(d => d.to === rr.id); if (back) back.unlocked = true; notes.push({ kind: "map", text: `A bolt slides back: the way to the ${t?.name} is open.` }); }
        else notes.push({ kind: "map", text: "Something grinds deep in the walls. Nothing else seems to change." }); });
      return;
    }
    if (o.kind === "bell"){ await runDM("event", { text: `The party rings the ${o.name} in the ${r.name} of ${loc.name}. Have whoever answers (${peopleLine(r) || "someone from this place"}) arrive and speak, in 2-3 sentences. Include "choices".`, offline: "The bell rings. Footsteps approach." }); return; }
  }
  if (act === "pray"){
    if (o.prayed) return coopNotify("You have already prayed here today.", "bad");
    const chk = await partyCheck("Religion", 11 + tier);
    set((c, oo) => { oo.prayed = true; if (chk.success){ for (const m of partyMembers(c)) addCond(m, "blessed", { note: "a blessing, until your next battle", preCombat: true }); notes.push({ kind: "loot", text: "Party blessed" }); } else notes.push({ kind: "hurt", text: "The altar stays silent." }); });
    return;
  }
  if (act === "rest"){
    if (!site.hostile || site.cleared){ hostUI(() => openModal({ type: "confirm", text: `Rest here in the ${r.name}? ${r.private && !site.welcome ? "It isn't yours, and someone may object." : "A long rest restores everyone and the day passes."}`, okLabel: "Rest", ok: () => { if (r.private && !site.welcome && Math.random() < 0.5){ runDM("event", { text: `The party beds down in the ${r.name} of ${loc.name} without permission. Someone who belongs here (${peopleLine(r) || "the owner"}) finds them. Play it out in 2-4 sentences; they may be thrown out, charged, or indulged. Include "choices".`, offline: "You are shaken awake. \"Out. Now.\"" }); return; } requestRest("long"); } })); return; }
    return restInDungeon();
  }
  if (act === "take"){
    if (o.taken) return coopNotify("Nothing left worth taking.", "bad");
    set((c, oo) => { oo.taken = true; const w = pick(LOOT_WEAPONS); const it = addItem(c.characters[c.activeCharId], makeItem(w)); notes.push({ kind: "loot", text: `Taken from the ${oo.name}: ${it.name}` }); if (!siteOf(c).hostile) addRep(c, siteTown(c, c.locations[c.explore.loc])?.name, -2, notes); });
    return;
  }
}
function describeObject(o, r, site){
  const D = { fireplace: o.state === "extinguished" ? "cold ashes." : "banked coals, still warm.", bar: "sticky, scarred, and well stocked.", bed: "straw ticking, a blanket, and a lingering warmth.", bookshelf: "ledgers, almanacs and a few books of poetry nobody reads.", shelf: "jars, cloth, string, and dust.", table: "scored by knives and rings of ale.", chair: "sturdy enough.", chest: o.looted ? "empty." : o.locked && !o.unlocked ? "locked, with a good lock." : "closed, unlocked.", crate: "nailed shut, stenciled with a merchant's mark.", barrel: "it sloshes.", sack: "grain, by the smell.", altar: "worn smooth by generations of hands.", statue: "a figure whose name has been chiselled off.", well: "deep; a dropped pebble takes a long time to splash.", lever: "iron, oiled, and recently used.", pillar: "cracked, but holding.", cage: o.prisoner && !o.prisoner.freed ? `${o.prisoner.name} sits inside, ${o.prisoner.why}.` : "empty, the door hanging open.", pool: "still, dark water; something glints at the bottom.", rubble: "fallen stone; it could be shifted.", bones: "picked clean, and not by time.", campfire: "ashes; the fire died a day or two ago.", forge: "the heat of it reaches you across the room.", anvil: "rings when you tap it.", cauldron: "something green and thick, cooling.", lectern: "a book lies open to a page with one line underlined.", candles: "guttering, the wax pooled in strange shapes.", cart: "a wheel is broken; the load was taken.", boat: "sound enough, with oars.", coffin: o.open ? "open, and empty." : "closed. Nailed, once.", sarcophagus: "carved with a sleeping figure whose hands clutch a stone sword.", rack: o.taken ? "empty hooks." : "a few serviceable weapons remain.", desk: "letters, ink, a half-written reply.", wardrobe: "clothes, and the smell of cedar.", painting: "a stern face. Its eyes seem to have been repainted.", notice: "bounties, bans and lost dogs.", throne: "cold stone and faded velvet.", torch: o.state === "extinguished" ? "unlit." : "burning with a steady flame.", hay: "dry and fresh.", grave: "the earth has been turned recently.", web: "thick as rope. Something moves in it.", mushrooms: "tall as a child, glowing faintly.", crystal: "humming, warm to the touch.", rune: "the symbols shift when you look away.", fountain: "dry, the basin full of leaves and coins.", tree: "old, gnarled, and home to something.", stall: "wares laid out under a striped awning.", tent: "patched canvas; someone's whole life inside.", keg: "full, and freshly tapped.", gallows: "the rope is new.", bars: "iron, rusted, and solid.", loom: "half a tapestry: a battle, unfinished.", trough: "water, green around the edges.", brazier: "coals glow and spit.", body: "cold. Pockets turned out.", stain: "dark and old. Blood, or wine, or both.", debris: "splintered wood; this was done in anger.", cloth: "torn from a sleeve. Fine weave.", marks: "two parallel lines in the dust, leading away.", footprints: "boots, several sets, in a hurry.", chains: "rusted manacles, one still closed.", idol: "a squat figure with too many eyes.", window: "shuttered, with a view of the street.", portal: "the air inside it is a different color.", egg: "warm. Something inside turns over.", hoard: "coins, cups, crowns: a dragon's accounting.", cannon: "loaded, aimed at the harbor mouth.", wheel: "it turns easily; the ship answers.", hammock: "swinging in a draft you can't feel.", map: "a coast you don't recognize, marked with an X nobody explained.", bell: "a bronze bell with a frayed cord.", plaque: "a name, a date, and 'never forgotten'.", grate: "iron bars over a drop into the dark. It stinks.", stairs: "worn steps.", ladder: "rungs polished by hands.", trapdoor: o.locked && !o.unlocked ? "a ring handle. It doesn't budge." : "a ring handle set in the floor.", stool: "three legs, one shorter.", bedroll: "someone's spare blanket." };
  return D[o.kind] || `an ordinary ${o.name}.`;
}
// ---------- people ----------
async function talkTo(npcTokId){
  const c0 = C(); const r = roomOf(c0); const n = r?.npcs.find(x => x.id === npcTokId); if (!n || n.dead || n.gone || S().busy || c0.combat) return;
  if (roomBlocked(r)) return coopNotify("Deal with the danger here first.", "bad");
  const who = Coop.remoteCall && window.Net?.isHost() ? Coop.whoLabel(Coop.remoteCall) : onlineWho();
  hostUI(() => store.set({ tab: "adventure" }));
  await runDM("action", { text: `I approach ${n.name}${n.role ? `, the ${n.role},` : ""} and start a conversation.${n.line ? ` (${n.name} is ${n.mood || "busy"}; a line they might open with: ${n.line})` : ""}`, who });
}
// ---------- exits into other places: alleys, sewers, the keep ----------
function exitInfo(c, site, r){
  if (!r?.exit) return null; const loc = c.locations[c.explore.loc]; const town = siteTown(c, loc);
  if (r.exit === "alley") return { label: town ? `Out to the streets of ${town.name}` : "Out the back way", kind: "alley" };
  if (r.exit === "sewer"){ const s = town ? sewerOf(c, town) : null; return s ? { label: `Down into the ${s.name}`, kind: "sewer", loc: s.id } : null; }
  if (r.exit === "tavern" || r.exit === "keep"){ const t = town?.town; const b = t?.buildings.find(b => r.exit === "tavern" ? ["tavern","inn"].includes(b.kind) : ["keep","guardhouse","prison","manor"].includes(b.kind)); return b ? { label: `Up into ${b.loc && c.locations[b.loc] ? c.locations[b.loc].name : b.name}`, kind: r.exit, building: b.id } : null; }
  return null;
}
async function useExit(){
  const c0 = C(); const site = siteOf(c0); const r = roomOf(c0); if (!site || !r || S().busy || c0.combat) return; if (roomBlocked(r)) return coopNotify("Deal with the danger here first.", "bad");
  const ex = exitInfo(c0, site, r); if (!ex) return; const loc = c0.locations[c0.explore.loc]; const town = siteTown(c0, loc);
  if (ex.kind === "alley") return leaveDungeon("by the back way");
  if (ex.kind === "sewer"){
    const notes = []; store.camp(c => { const t = siteTown(c, c.locations[c.explore.loc]); const s = discoverSewer(c, t, notes); if (s){ const ss = ensureSite(c, s); ss.links = { ...(ss.links || {}), [["guardhouse","prison","castle","manor"].includes(site.kind) ? "keep" : "tavern"]: loc.id }; } if (notes.length) pushLog(c, { kind: "sys", notes }); });
    const s = sewerOf(C(), town); if (!s) return; const ss = ensureSiteRO(C(), s); const back = ss.rooms.find(x => x.exit === (["guardhouse","prison","castle","manor"].includes(site.kind) ? "keep" : "tavern")) || ss.rooms.find(x => x.entrance);
    return enterSite(s.id, back?.id, { via: "Climb down into" });
  }
  // up from the sewers into a building
  const b = town?.town?.buildings.find(x => x.id === ex.building); if (!b) return;
  let target = null; store.camp(c => { const t = c.locations[town.id]; const bb = t.town.buildings.find(x => x.id === b.id); const l = buildingLocation(c, t, bb); const s = ensureSite(c, l); target = { loc: l.id, room: (s.rooms.find(x => x.exit === "sewer") || s.rooms.find(x => x.entrance))?.id }; const sw = siteOf(c); sw.links = { ...(sw.links || {}), [r.exit]: l.id }; });
  if (target) return enterSite(target.loc, target.room, { via: "Climb up into" });
}
function ensureSiteRO(c, loc){ return loc.dungeon && loc.dungeon.v >= SITE_V ? loc.dungeon : (store.camp(cc => ensureSite(cc, cc.locations[loc.id])), C().locations[loc.id].dungeon); }
// ---------- the town: walk into a building ----------
async function enterBuilding(townId, buildingId){
  const c0 = C(); if (S().busy || c0.combat) return; const town = c0.locations[townId]; if (!town || !town.town) return;
  const b = town.town.buildings.find(x => x.id === buildingId); if (!b) return;
  if (b.kind === "square" || b.kind === "market"){ /* open places: still a site, just outdoors */ }
  let locId = null; store.camp(c => { const t = c.locations[townId]; const bb = t.town.buildings.find(x => x.id === buildingId); const l = buildingLocation(c, t, bb); locId = l.id; });
  return enterSite(locId);
}
// the party sets out from a town square feature (well, grate, notice board)
async function useTownFeature(townId, idx){
  const c0 = C(); if (S().busy || c0.combat) return; const town = c0.locations[townId]; const f = town?.town?.features[idx]; if (!f) return;
  if (f.kind === "notice"){ hostUI(() => openModal({ type: "service", svc: "board", town: townId })); return; }
  if (f.kind === "grate"){
    const s = sewerOf(c0, town); if (!s) return;
    if (!s.discovered || s.hidden){ const chk = await partyCheck("Investigation", 11); if (!chk.success){ store.camp(c => sysNote(c, { kind: "hurt", text: "The grate is rusted shut, and you can't see a way down." })); return; }
      store.camp(c => { const n = []; discoverSewer(c, c.locations[townId], n); if (n.length) pushLog(c, { kind: "sys", notes: n }); }); }
    return enterSite(s.id, null, { via: "Climb down the grate into" });
  }
  if (f.kind === "well" || f.kind === "fountain"){ store.camp(c => sysNote(c, { kind: "map", text: f.kind === "well" ? "Cold, clean water. Someone has scratched a name into the rim." : "Coins glitter under the water. Wishes, or bribes." })); return; }
  if (f.kind === "statue"){ store.camp(c => sysNote(c, { kind: "map", text: `A statue of ${town.name}'s founder, pigeons and all.` })); }
}
// ---------- the Dungeon Master moving things inside a site ----------
function applySiteState(c, st, notes){
  const site = siteOf(c); if (!site) return;
  if (typeof st.room === "string"){ const t = siteRoom(site, st.room) || site.rooms.find(r => r.name.toLowerCase() === st.room.toLowerCase()); if (t && t.id !== site.current && !roomBlocked(roomOf(c))){ site.current = t.id; markSeen(site, t.id); notes.push({ kind: "map", text: `Now in: ${t.name}` }); } }
  if (Array.isArray(st.reveal)) for (const id of st.reveal){ const key = String(id).toLowerCase();
    for (const r of site.rooms){ for (const o of r.objects) if (o.hidden && !o.found && (o.id === id || o.name.toLowerCase() === key)){ o.found = true; notes.push({ kind: "map", text: `Found: ${o.name}` }); }
      for (const d of r.doors) if (d.secret && !(r.found || []).includes(d.to) && (d.to === id || siteRoom(site, d.to)?.name.toLowerCase() === key)){ r.found = [...(r.found || []), d.to]; const t = siteRoom(site, d.to); if (t){ if (t.state === "unseen") t.state = "seen"; t.found = [...(t.found || []), r.id]; } notes.push({ kind: "map", text: `Found a hidden way to the ${t?.name}` }); } } }
  if (st.object_state && typeof st.object_state === "object") for (const [id, v] of Object.entries(st.object_state).slice(0, 6)){ const key = String(id).toLowerCase(); for (const r of site.rooms) for (const o of r.objects) if (o.id === id || o.name.toLowerCase() === key){ o.state = String(v).slice(0, 30); if (/burn|fire|ablaze/i.test(o.state)) r.hazard = "fire"; } }
  if (st.welcome === true) site.welcome = true;
}
</script>
