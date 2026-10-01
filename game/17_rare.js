<script>
"use strict";
// =====================================================================
//  RARE ENCOUNTERS: uncommon road events with big rewards or real costs
//  rare (gold) · legendary (violet) · ominous (red). Each happens at most once per campaign.
// =====================================================================
const RARE_EVENTS = [
  { id: "r-peddler", rare: "rare", title: "The Peddler of Wonders", text: "A cart pulled by a white stag blocks the road. Its owner, a smiling woman with mismatched eyes, spreads a velvet cloth covered in glittering things. \"One treasure per traveller,\" she says. \"Priced for you alone.\"",
    choices: [ { label: "Buy her finest piece (pay 40% of your purse)", tags: ["greed"], ok: { goldPct: -0.4, magic: "rare", text: "She wraps a rare treasure in silk and bows. When you look back, the cart is gone." } },
      { label: "Haggle with her", check: { skill: "Persuasion", dc: 15 }, tags: ["cunning"], ok: { goldPct: -0.15, magic: "rare", xp: 15, text: "She laughs, delighted, and lets her finest piece go for a song." }, fail: { text: "\"Some things are not for bargaining.\" She snaps her fingers and the road is empty." } },
      { label: "Politely decline", tags: ["caution"], ok: { xp: 5, inspire: true, text: "She tips her hat. \"Wise. Most who buy from me regret it, eventually.\" You feel oddly lucky." } } ] },
  { id: "r-shrine", rare: "rare", title: "Shrine of a Forgotten God", text: "Half-swallowed by roots, a shrine to a god whose name has worn away still hums with power. Fresh offerings lie on the altar, though no one lives nearby.",
    choices: [ { label: "Kneel and pray", check: { skill: "Religion", dc: 13 }, tags: ["mercy"], ok: { abilityUp: "main", heal: true, text: "Warmth floods through you. You rise changed, stronger than before." }, fail: { heal: true, text: "The god does not answer, but the quiet heals your wounds." } },
      { label: "Take the offerings", tags: ["greed"], ok: { gold: "6d10", curse: "main", text: "Gold and gems… and a chill that settles in your bones and will not leave." } },
      { label: "Leave it in peace", tags: ["caution"], ok: { xp: 8, text: "Some doors are better left closed." } } ] },
  { id: "r-cairn", rare: "rare", title: "The Fallen Hero's Cairn", text: "A stone cairn crowned with a rusted helm. Driven into the earth beside it, a sword that has not rusted at all, its edge still bright after a hundred winters.",
    choices: [ { label: "Honor the fallen hero", tags: ["mercy"], ok: { xp: 20, cond: "blessed", who: "all", text: "As you bow your heads, a breeze carries a whisper of thanks. You feel watched over." } },
      { label: "Draw the sword", check: { save: "WIS", dc: 13 }, tags: ["bravery", "greed"], ok: { magic: "uncommon", xp: 15, text: "The blade sings as it leaves the earth. Its old master would approve." }, fail: { magic: "uncommon", curse: "main", text: "The sword is yours, and so is the restless spirit bound to it." } },
      { label: "Move on", ok: { text: "You leave the hero to their rest." } } ] },
  { id: "r-well", rare: "legendary", title: "The Wishing Well", text: "In a circle of silver birches stands an old well. A voice like water rises from the dark: \"Drop a coin, traveller, and wish. I grant one wish, and I always grant it… mostly.\"",
    choices: [ { label: "Wish for wealth", tags: ["greed"], ok: { gold: "20d12", days: 2, text: "Gold spills from the well in a glittering flood. Gathering it takes two whole days." } },
      { label: "Wish for strength", tags: ["bravery"], ok: { abilityUp: "all", disease: "random", text: "Power surges through the whole party, but one of you starts coughing, and doesn't stop." } },
      { label: "Wish for the truth about your enemy", tags: ["cunning"], ok: { revealLair: true, clue: "the well revealed the enemy's true plan", xp: 30, text: "The water shows you a vision: your enemy, their lair, and their plan." } },
      { label: "Keep your coin", tags: ["caution"], ok: { inspire: true, text: "\"Wise,\" sighs the well. \"So very few are.\"" } } ] },
  { id: "r-angel", rare: "legendary", title: "A Messenger of Light", text: "The clouds part and a winged figure of blinding radiance lands on the road. \"Champions,\" it says, \"the darkness grows. I bring a gift, and a warning.\"",
    choices: [ { label: "Accept the gift", tags: ["mercy"], ok: { heal: true, inspire: true, cond: "blessed", who: "all", threatBack: 4, text: "Light washes over you, healing every wound. Far away, your enemy's plans falter." } },
      { label: "Ask about the darkness", check: { skill: "Religion", dc: 14 }, tags: ["cunning"], ok: { clue: "the messenger named your enemy's weakness", revealLair: true, xp: 25, text: "The messenger speaks of your enemy's lair and the weakness in its defenses." }, fail: { xp: 10, text: "The messenger's words are too vast for mortal minds. You remember only the light." } } ] },
  { id: "r-idol", rare: "ominous", title: "The Golden Idol", text: "On a mossy altar in a roadside ruin sits a golden idol with ruby eyes. It's worth a fortune. The bones scattered around the altar suggest others thought so too.",
    choices: [ { label: "Take the idol", tags: ["greed"], ok: { gold: "15d10", curse: "all", threat: 3, text: "The rubies flare as you lift it. Somewhere, your enemy smiles. A curse settles on the whole party." } },
      { label: "Smash it", check: { skill: "Athletics", dc: 12 }, tags: ["bravery"], ok: { xp: 25, repNear: 10, text: "The idol shatters with a shriek. The nearby villagers will hear of this." }, fail: { damage: "2d6", who: "all", dtype: "necrotic", text: "Dark energy explodes outward as the idol cracks but holds." } },
      { label: "Leave it be", tags: ["caution"], ok: { text: "Whatever the idol wants, it won't get it from you." } } ] },
  { id: "r-plague", rare: "ominous", title: "The Sick Village", text: "Smoke rises from a small village where the bells toll for the dead. A gaunt man begs you for help: half the village has the grey fever.",
    choices: [ { label: "Help the sick", check: { skill: "Medicine", dc: 14 }, tags: ["mercy"], ok: { xp: 35, repNear: 20, text: "Your remedies turn the tide. The villagers will never forget you." }, fail: { xp: 15, repNear: 10, disease: "all", text: "You save some, but the fever follows you onto the road." } },
      { label: "Go around the village", tags: ["caution"], ok: { days: 1, text: "The detour costs a day, but you stay healthy." } },
      { label: "Loot the empty houses", tags: ["greed", "cruelty"], ok: { gold: "8d10", disease: "random", repNear: -25, text: "Easy pickings… and a fever, and a reputation." } } ] },
  { id: "r-thieves", rare: "ominous", title: "Thieves in the Night", text: "You wake at dawn to find your packs slit open. Footprints lead into the trees, and they're fresh.",
    choices: [ { label: "Chase them down", check: { skill: "Survival", dc: 13 }, tags: ["bravery"], ok: { combat: "bandit", surprise: "player", text: "You catch them sorting your belongings. Their surprise is your advantage." }, fail: { goldPct: -0.3, loseItem: true, text: "The trail goes cold. Your gold, and some of your gear, is gone." } },
      { label: "Let them go", ok: { goldPct: -0.3, text: "Gold can be earned again. Lives can't." } } ] },
  { id: "r-dragon", rare: "ominous", title: "Shadow of the Dragon", text: "A vast shadow sweeps over the road. High above, a dragon circles, scanning the land below.",
    choices: [ { label: "Hide", check: { skill: "Stealth", dc: 13, group: true }, tags: ["caution"], ok: { xp: 20, text: "You hold your breath under the trees until the shadow passes." }, fail: { damage: "3d6", who: "all", dtype: "fire", days: 1, text: "A gout of fire sweeps the road. You escape, scorched, and lose a day hiding." } },
      { label: "Follow it to its lair", tags: ["bravery", "greed"], ok: { loot: "boss", damage: "2d6", who: "all", dtype: "fire", text: "While it hunts, you raid the edge of its hoard and flee with blistered hands and full pockets." } } ] },
  { id: "r-caravan", rare: "rare", title: "The Lost Caravan", text: "Overturned wagons and scattered crates: a merchant caravan, abandoned in a hurry. Its strongboxes are still locked, but wolves pace among the wreckage.",
    choices: [ { label: "Fight for the treasure", tags: ["bravery"], ok: { enemies: [{ name: "Dire Wolf", count: 2 }], loot: "chest", text: "The wolves won't give up their prize without a fight." } },
      { label: "Sneak to the strongboxes", check: { skill: "Stealth", dc: 13 }, tags: ["cunning"], ok: { loot: "chest", xp: 15, text: "You slip in and out with a strongbox while the wolves sleep." }, fail: { enemies: [{ name: "Dire Wolf", count: 2 }], surprise: "enemies", text: "A twig snaps. Every wolf turns to look at you." } },
      { label: "Leave it", ok: { text: "Not worth the risk." } } ] },
  { id: "r-doppel", rare: "ominous", title: "Your Double", text: "A traveller approaches wearing your face, your clothes, your walk. \"Fine day,\" it says with your voice, and smiles too wide.",
    choices: [ { label: "Question it", check: { skill: "Insight", dc: 14 }, tags: ["cunning"], ok: { clue: "the shapeshifter let slip who it works for", xp: 20, text: "Under your questions the mask slips, and so does the name of its master." }, fail: { goldPct: -0.2, repNear: -15, text: "It slips away. Later you hear that 'you' ran up debts in town." } },
      { label: "Attack it", tags: ["bravery"], ok: { enemies: [{ name: "Bandit Captain", count: 1 }], text: "It draws a blade, your blade, and fights." } } ] },
  { id: "r-battlefield", rare: "rare", title: "The Field of Ghosts", text: "Mist hangs over an old battlefield. Pale soldiers still march here, fighting a war that ended centuries ago.",
    choices: [ { label: "Salute the fallen", tags: ["mercy"], ok: { xp: 20, cond: "blessed", who: "all", text: "The ghostly captain returns your salute, and the dead fall still at last." } },
      { label: "Search the dead for treasure", tags: ["greed"], ok: { magic: "uncommon", enemies: [{ name: "Skeleton", count: 3 }], text: "Your hand closes on an enchanted relic just as the bones begin to stand." } },
      { label: "Hurry past", tags: ["caution"], ok: { text: "You keep your eyes on the road until the mist is behind you." } } ] },
];
RARE_EVENTS.forEach(e => { e.dynamic = true; e.biomes = "fhmgsdw"; });
// how often: about 1 encounter in 9 on the road is rare, never twice within 3 days, each one once per campaign
function rollRareEncounter(c){
  if ((c.time?.day || 0) - (c.lastRareDay ?? -99) < 3 || Math.random() > 0.11) return null;
  const pool = RARE_EVENTS.filter(e => !(c.raresSeen || []).includes(e.id));
  return pool.length ? structuredClone(pick(pool)) : null;
}
function nearestTownTo(c){
  const here = topLoc(c, c.currentLocationId); const towns = topLevelLocs(c).filter(l => isSettlement(l) && !l.fallen); if (!towns.length) return null;
  const pos = (l) => [l.gx ?? l.x ?? 0, l.gy ?? l.y ?? 0];
  if (!here) return towns[0]; const [hx, hy] = pos(here);
  return towns.sort((a, b) => Math.hypot(pos(a)[0] - hx, pos(a)[1] - hy) - Math.hypot(pos(b)[0] - hx, pos(b)[1] - hy))[0];
}
function pickMagic(rarity){
  const all = MAGIC_ITEMS.map(([, it]) => it).filter(it => it.type !== "scroll");
  const want = all.filter(it => (it.rarity || "uncommon") === rarity);
  return structuredClone(pick(want.length ? want : all));
}
// the extra effects rare encounters use (everything else goes through the normal event effects)
function applyRareEffects(c, eff, notes, members, main){
  const victims = (w) => w === "all" ? members : w === "main" ? [main] : [pick(members)];
  if (eff.goldPct){ const before = main.gold; main.gold = Math.max(0, Math.round(main.gold * (1 + eff.goldPct))); if (before !== main.gold) notes.push({ kind: eff.goldPct < 0 ? "hurt" : "loot", text: `${eff.goldPct < 0 ? "Lost" : "Gained"} ${Math.abs(main.gold - before)} gold` }); }
  if (eff.magic){ giveLoot(c, { gold: 0, items: [pickMagic(eff.magic)] }, notes); }
  if (eff.abilityUp){ for (const m of victims(eff.abilityUp)){ const k = ABILS.filter(a => m.abilities[a] < 20).sort((a, b) => m.abilities[b] - m.abilities[a])[0]; if (k){ m.abilities[k]++; notes.push({ kind: "xp", text: `${firstName(m.name)}'s ${ABIL_NAME[k] || k} rises to ${m.abilities[k]}!` }); } } }
  if (eff.inspire){ main.inspiration = true; notes.push({ kind: "loot", text: `${firstName(main.name)} gains inspiration` }); }
  if (eff.curse){ for (const m of victims(eff.curse)){ if (!hasCond(m, "cursed")) addCond(m, "cursed", { long: true, note: "−2 to attack rolls until a temple lifts it" }); } notes.push({ kind: "hurt", text: `${eff.curse === "all" ? "The party is" : "Cursed:"} cursed (−2 to attacks until a temple lifts it)` }); }
  if (eff.disease){ for (const m of victims(eff.disease)){ if (!hasCond(m, "diseased")) addCond(m, "diseased", { long: true, note: "−2 to ability checks until cured at a temple" }); } notes.push({ kind: "hurt", text: `Disease (−2 to ability checks until cured at a temple)` }); }
  if (eff.loseItem){ const pool = members.flatMap(m => (m.inventory || []).filter(it => !it.quest && !isEquipped(m, it.id)).map(it => [m, it])); if (pool.length){ const [m, it] = pick(pool); dropItem(m, it.id); notes.push({ kind: "hurt", text: `Stolen: ${it.name}` }); } }
  if (eff.threat && c.threat && !isQuick(c)){ c.threat.next = Math.max(c.time.day + 1, (c.threat.next || c.time.day + 5) - eff.threat); notes.push({ kind: "hurt", text: `${c.villain?.name || "Your enemy"}'s plans move faster` }); }
  if (eff.threatBack && c.threat && !isQuick(c)) threatSetback(c, notes, eff.threatBack, "a divine intervention");
  if (eff.clue) addClue(c, eff.clue, notes);
  if (eff.repNear){ const t = townOf(c) || nearestTownTo(c); if (t) addRep(c, t.name, eff.repNear, notes); }
}
</script>
