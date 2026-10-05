<script>
"use strict";
// =====================================================================
//  DEEPER GAMEPLAY: companion quests, villain clock, reputation,
//  endings, checkpoints, crafting
// =====================================================================

// ---------- 1. Companion questlines ----------
const CQUESTS = {
  brakka:{ title:"Ashes of the Longhouse", place:{type:"castle", name:"Skarn's Warcamp"}, theme:"giant", boss:"Warlord Skarn",
    intro:"Brakka has found the trail of the warlord who burned her clan's longhouse. His warcamp lies close.",
    dilemma:{ text:"Warlord Skarn kneels in the mud, his axe broken. 'Kill me and my sons will hunt you to the end of the world,' he spits. Brakka's knuckles are white on her axe.",
      choices:[{label:"Let Brakka take her revenge", tags:["violence","bravery"], text:"One swing. Brakka closes her eyes, and for the first time in years, she is quiet."},
               {label:"Spare him; exile him from these lands", tags:["mercy"], text:"Brakka lowers the axe. 'Run, little warlord. If I see you again, Mother eats.'"}]},
    item:{name:"Mother's Fury", type:"weapon", base:"Greataxe", bonus:2, extra_damage:"1d6", extra_damage_type:"fire", rarity:"rare", magic:true, description:"Brakka's greataxe, reforged in the embers of her clan's longhouse."},
    perk:"Blood of the Clan", ab:"STR", ending:"Brakka rebuilt her clan's longhouse with her own hands. Travellers say there's a seat by its fire that's always kept for you." },
  aldric:{ title:"The Vane Inheritance", place:{type:"castle", name:"Vane Hall"}, theme:"bandit", boss:"Lord Corwin the Usurper",
    intro:"Aldric has learned that his cousin Corwin framed him, and now holds Vane Hall with hired swords.",
    dilemma:{ text:"Corwin is cornered, ledger of forged letters in hand. 'Burn it,' he begs Aldric, 'and I'll confess quietly. No scandal. The family name survives.'",
      choices:[{label:"Expose him publicly with the ledger", tags:["honesty","bravery"], text:"The ledger is read aloud in the market square. Aldric's name is cleared before a hundred witnesses."},
               {label:"Take the quiet confession", tags:["mercy","caution"], text:"Corwin confesses to the magistrate in private. Aldric's title is restored without a scandal."}]},
    item:{name:"Shield of the Vane Crest", type:"shield", bonus:2, rarity:"rare", magic:true, description:"The ancestral shield of House Vane, its crest freshly repainted."},
    perk:"Knight Restored", ab:"CON", ending:"Ser Aldric Vane holds his lands again and is known as the fairest lord in the region. His motto is new: 'Honour those who stood by you.'" },
  mireille:{ title:"The Lost Cure", place:{type:"ruins", name:"The Plundered Abbey"}, theme:"cult", boss:"The Raider-Priest",
    intro:"Mireille has heard that the raiders who stole her abbey's plague-cure are holed up in its ruins.",
    dilemma:{ text:"The raider-priest is dying of the very plague the cure was made for. There is exactly one dose left in the chest.",
      choices:[{label:"Give him the cure", tags:["mercy","piety"], text:"Mireille kneels beside the man who burned her abbey and saves his life. He weeps. She copies the formula from memory."},
               {label:"Keep the dose for the villages", tags:["caution"], text:"'I'm sorry,' she whispers, and means it. The dose will save a child instead."}]},
    item:{name:"Sunburst of Saint Ilde", type:"amulet", save_bonus:1, ability_bonus:{WIS:2}, rarity:"rare", magic:true, description:"The abbey's holy pendant, warm to the touch."},
    perk:"Saint's Grace", ab:"WIS", recipe:"Panacea", ending:"Sister Mireille founded a new abbey where anyone, even enemies, may be healed. The plague never returned." },
  quill:{ title:"The Hollow Menagerie", place:{type:"dungeon", name:"The Hollow Menagerie"}, theme:"beast", boss:"The Menagerie's Keeper",
    intro:"Quill has found notes about a mad collector's menagerie full of creatures missing from his bestiary.",
    dilemma:{ text:"Rows of cages hold starving, rare creatures. Quill could study them properly for weeks, or you could simply open the doors.",
      choices:[{label:"Free the creatures", tags:["mercy"], text:"The beasts scatter into the wild. Quill sketches them as they go, grinning."},
               {label:"Let Quill study them first, safely", tags:["curiosity","caution"], text:"Three careful days of notes, then the cages open. Quill's bestiary doubles in size."}]},
    item:{name:"Circlet of the Scholar", type:"wondrous", ability_bonus:{INT:2}, rarity:"rare", magic:true, description:"A thin silver circlet that makes every fact stick."},
    perk:"Encyclopedic Mind", ab:"INT", ending:"Ferrowick's Complete Bestiary became the most copied book in the realm. Your party appears in the dedication, and in chapter nine." },
  nix:{ title:"Settling Accounts", place:{type:"dungeon", name:"The Gilded Rat's Vault"}, theme:"bandit", boss:"Madame Vex",
    intro:"Nix's creditors have run out of patience. Madame Vex of the Gilded Rat wants payment, and she keeps her ledgers in her vault.",
    dilemma:{ text:"Madame Vex is beaten. Her ledger lists Nix's debt, and the debts of a hundred poor families.",
      choices:[{label:"Burn the whole ledger", tags:["mercy","deceit"], text:"A hundred debts go up in smoke. Nix laughs so hard she has to sit down."},
               {label:"Pay Nix's debt honestly and leave", tags:["honesty"], cost:100, text:"You count out the coins. Nix stares at you as if you've grown a second head. 'Nobody's ever... huh.'"}]},
    item:{name:"Guildmaster's Gloves", type:"wondrous", ability_bonus:{DEX:2}, rarity:"rare", magic:true, description:"Supple black gloves; locks seem to open themselves."},
    perk:"Free and Clear", ab:"DEX", ending:"Nix opened a tavern called The Honest Thief. Nobody believes the name, and everybody drinks there." },
  tamsin:{ title:"The Rotting Heart", place:{type:"ruins", name:"The Blighted Grove"}, theme:"swamp", boss:"The Blight-Mother",
    intro:"Tamsin has tracked the blight killing her forest to a grove where something old has taken root.",
    dilemma:{ text:"The source of the blight is a single ancient tree, still alive at its core. It could be burned out, or slowly healed.",
      choices:[{label:"Burn it, quickly and completely", tags:["violence","caution"], text:"The grove burns for a day and a night. By spring, green shoots return."},
               {label:"Heal the tree, however long it takes", tags:["mercy"], text:"Tamsin stays three nights singing to the roots. The rot recedes."}]},
    item:{name:"Heartwood Bow", type:"weapon", base:"Longbow", bonus:2, rarity:"rare", magic:true, description:"Carved from the healed heart of the forest."},
    perk:"Forest's Chosen", ab:"DEX", ending:"Tamsin became warden of the healed forest. Hunters who take more than they need tend to get lost there." },
  lark:{ title:"The Immortal Ballad", place:{type:"ruins", name:"The Theatre of Ghosts"}, theme:"undead", boss:"The Phantom Maestro",
    intro:"Lark has heard of a haunted theatre whose ghostly orchestra still plays the lost Ballad of Ages.",
    dilemma:{ text:"The Maestro fades, offering Lark the Ballad of Ages. Sung truthfully, it tells of failure and loss; sung the way crowds like it, it tells of glory.",
      choices:[{label:"Sing it true", tags:["honesty"], text:"Lark sings the true ballad. It's not a crowd-pleaser, but it makes old soldiers cry."},
               {label:"Make it a legend", tags:["deceit","bravery"], text:"Lark improves it. Dragons are added. Crowds go wild."}]},
    item:{name:"Muse's Pendant", type:"amulet", ability_bonus:{CHA:2}, rarity:"rare", magic:true, description:"A tiny silver lute that hums along with any song."},
    perk:"Voice of Legends", ab:"CHA", ending:"Lark's ballad of your journey is still sung in every tavern in the realm, and it gets longer every year." },
  oren:{ title:"The Lost Relic", place:{type:"temple", name:"The Sunken Reliquary"}, theme:"undead", boss:"The Fallen Commander",
    intro:"Oren has found the reliquary where his order's lost relic, the Dawnblade, was last seen a century ago.",
    dilemma:{ text:"The Dawnblade is recovered. A dying village nearby could be saved by its light today, but using it would break its century-long consecration.",
      choices:[{label:"Return it to the order unused", tags:["piety"], text:"Oren carries the relic home. The order sings for a week."},
               {label:"Use its light to save the village", tags:["mercy","bravery"], text:"The Dawnblade blazes and the fever breaks. Oren says the order will understand. He's mostly sure."}]},
    item:{name:"The Dawnblade", type:"weapon", base:"Longsword", bonus:1, extra_damage:"1d6", extra_damage_type:"radiant", rarity:"rare", magic:true, description:"A holy longsword that glows at dawn."},
    perk:"Oath Fulfilled", ab:"STR", ending:"Oren Brightshield became the youngest Lord-Commander his order has ever had, and its first to tell a joke. It was not a good joke." },
  moss:{ title:"The Poisoned Spring", place:{type:"cave", name:"The Poisoned Spring"}, theme:"swamp", boss:"The Bog Witch",
    intro:"Old Moss has found what's poisoning the old places: a witch fouling the spring that feeds every river in the region.",
    dilemma:{ text:"The Bog Witch, beaten, offers a bargain: she'll cleanse the spring herself in exchange for her life and her hut.",
      choices:[{label:"Accept her bargain", tags:["caution","mercy"], text:"She keeps her word, surprisingly. The water runs clear by morning."},
               {label:"End her and cleanse it yourselves", tags:["violence","bravery"], text:"It takes a week of hard work, but the spring runs clear."}]},
    item:{name:"Acorn of the First Tree", type:"amulet", ability_bonus:{WIS:2}, rarity:"rare", magic:true, description:"A tiny acorn that never stops sprouting."},
    perk:"Root and Stone", ab:"WIS", ending:"Old Moss went back to his hermitage, grumbling. Every spring, the land around it blooms like nowhere else." },
  vesper:{ title:"Breaking the Pact", place:{type:"temple", name:"The Brimstone Chapel"}, theme:"cult", boss:"The Patron's Herald",
    intro:"Vesper has found a way out of her infernal contract, but it means confronting her patron's herald in person.",
    dilemma:{ text:"The Herald offers terms: Vesper goes free if she signs one last clause. It's written in very small print.",
      choices:[{label:"Tear up the contract by force", tags:["bravery","violence"], text:"Vesper rips the contract in half. Hellfire gutters out. She's free, and furious, and laughing."},
               {label:"Find the loophole and trick the Herald", tags:["deceit","curiosity"], text:"Vesper spots the loophole in clause 47 and turns it against the Herald. It shrieks in outrage."}]},
    item:{name:"Broken Pact Ring", type:"ring", save_bonus:1, ac_bonus:1, rarity:"rare", magic:true, description:"The contract's seal, cracked in two and worn as a trophy."},
    perk:"Her Own Master", ab:"CHA", ending:"Vesper Ashgrave now runs a very exclusive business breaking other people's infernal contracts. Her rates are ruinous." },
  ember:{ title:"Blood of the Dragon", place:{type:"cave", name:"The Old Roost"}, theme:"dragon", boss:"The Keeper of Bones",
    intro:"Ember has found the roost of the dragon in her bloodline, abandoned now, and guarded by its kobold worshippers.",
    dilemma:{ text:"In the heart of the roost lies a shard of her ancestor's egg, pulsing with fire. Ember could absorb its power, or let it rest.",
      choices:[{label:"Let Ember claim the power", tags:["curiosity","bravery"], text:"Fire rushes into Ember. Her scales shine brighter; her eyes, briefly, are gold."},
               {label:"Leave the shard to rest", tags:["caution","piety"], text:"Ember touches it once, says goodbye, and leaves it in peace."}]},
    item:{name:"Scale of the Ancestor", type:"amulet", ability_bonus:{CHA:2}, save_bonus:1, rarity:"rare", magic:true, description:"A single copper scale, warm as a coal."},
    perk:"Draconic Awakening", ab:"CHA", ending:"Ember learned to control her fire, mostly. She's the only sorcerer in history to be both knighted and fined for arson in the same week." },
  fen:{ title:"The Still Water", place:{type:"ruins", name:"The Monastery of Still Water"}, theme:"undead", boss:"The Abbot's Shade",
    intro:"Brother Fen has found the ruined monastery where his order fell. Its monks do not rest easily.",
    dilemma:{ text:"The Abbot's shade offers to teach Fen the forbidden technique that doomed the order, in exchange for being allowed to linger.",
      choices:[{label:"Lay the monks to rest", tags:["piety","mercy"], text:"Fen performs the old rites. The shades bow and fade. The bells ring once."},
               {label:"Learn the forbidden technique", tags:["curiosity"], text:"Fen learns. He is quiet for a long time afterwards."}]},
    item:{name:"Bracers of the Fallen Order", type:"wondrous", ac_bonus:1, ability_bonus:{WIS:2}, rarity:"rare", magic:true, description:"Plain wooden bracers worn smooth by generations of monks."},
    perk:"The Still Mind", ab:"WIS", ending:"Brother Fen rebuilt the monastery of Still Water. It takes students now, and they answer questions with questions." }
};
const TRAITOR_BASE = { Barbarian:"Veteran", Fighter:"Veteran", Paladin:"Veteran", Rogue:"Bandit Captain", Ranger:"Bandit Captain", Monk:"Bandit Captain", Cleric:"Cult Fanatic", Druid:"Cult Fanatic", Bard:"Mage", Sorcerer:"Mage", Warlock:"Mage", Wizard:"Mage" };
function cqOf(ch){ return ch?.companion ? CQUESTS[ch.companion.tpl] : null; }
function checkCompanionQuests(c, notes){
  if (!c.world?.map) return;
  for (const ch of companionsOf(c)){
    const cp = ch.companion; const q = cqOf(ch); if (!q || cp.cq || cp.approval < 30) continue;
    if (c.time.day - (cp.joined ?? c.time.day) < 2) continue;
    if (Object.values(c.quests).some(x => x.status === "active" && x.auto?.kind === "cquest")) continue;   // one personal quest at a time
    const near = topLoc(c, c.currentLocationId) || topLevelLocs(c)[0];
    const place = createPlace(c, q.place.type, near, { name: q.place.name, hostile: true, theme: q.theme, discovered: true, description: q.intro });
    if (!place) continue;
    place.lvl = Math.max(2, partyLevel(c)); place.small = true; place.cquest = cp.tpl; place.bossName = q.boss;
    const quest = { id: "cq-" + cp.tpl, title: q.title, kind: "side", personal: cp.tpl, status: "active", giver: ch.name, summary: q.intro, createdAt: Date.now(),
      reward: `${firstName(ch.name)}'s loyalty`, objectives: [{id:"go", text:`Go with ${firstName(ch.name)} to ${place.name}`, done:false}, {id:"end", text:`Defeat ${q.boss}`, done:false}],
      auto: { kind:"cquest", loc: place.id, companion: ch.id } };
    c.quests[quest.id] = quest; cp.cq = "active";
    notes?.push({kind:"quest", text:`Personal quest: ${q.title} (${firstName(ch.name)})`});
    queueNews(c, `${ch.name} takes the main character aside and opens up: ${q.intro} Their personal goal: ${cp.hook} They ask for help at ${place.name}, now marked on the map. Voice this as a heartfelt, in-character conversation.`, `${ch.name} pulls you aside. "${q.intro}" ${place.name} is marked on your map.`);
  }
}
function companionDilemma(c, tplId){
  const q = CQUESTS[tplId]; const ch = companionsOf(c).find(m => m.companion.tpl === tplId); if (!q || !ch) return;
  const d = q.dilemma;
  c.event = { id: "cqd-" + tplId, context: `${q.title}: ${firstName(ch.name)}'s personal quest.`, data: { id: "cqd-" + tplId, dynamic: true, title: q.title, text: d.text,
    choices: d.choices.map(x => ({ label: x.label, tags: x.tags, cost: x.cost ? {gold: x.cost} : undefined, ok: { text: x.text, cqComplete: tplId } })) } };
}
function completeCompanionQuest(c, tplId, notes){
  const q = CQUESTS[tplId]; const ch = partyMembers(c).find(m => m.companion?.tpl === tplId); const quest = c.quests["cq-" + tplId];
  if (quest && quest.status === "active") completeQuest(c, quest, notes);
  if (!ch) return;
  const cp = ch.companion; cp.cq = "done"; cp.loyal = true; cp.approval = clamp(cp.approval + 25, -100, 100);
  ch.abilities[q.ab] = Math.min(22, (ch.abilities[q.ab] || 10) + 2); ch.feats = [...(ch.feats||[]), q.perk].filter((v,i,a) => a.indexOf(v) === i);
  if (!FEATS[q.perk]) FEATS[q.perk] = `Loyalty perk: +2 ${ABIL_NAME[q.ab]}.`;
  const it = addItem(ch, makeItem(q.item)); try { equipItem(ch, it.id); } catch {}
  if (q.recipe) c.recipesKnown = [...new Set([...(c.recipesKnown||[]), q.recipe])];
  notes.push({kind:"xp", text:`${firstName(ch.name)} is now loyal: ${q.perk} (+2 ${ABIL_NAME[q.ab]})`}, {kind:"loot", text:`${firstName(ch.name)} gains ${q.item.name}`});
  c.chronicle.push({t: Date.now(), day: c.time.day, text: `Completed ${ch.name}'s personal quest, "${q.title}". ${ch.name} is fiercely loyal now.`});
}
function betrayalCheck(c, notes){
  for (const ch of companionsOf(c)){
    const cp = ch.companion; if (cp.approval > -60 || cp.loyal || cp.player || seatInfo(ch.id)) continue;
    if (Math.random() > 0.35) continue;
    const main = c.characters[c.activeCharId]; const stolen = Math.floor(main.gold * 0.25); main.gold -= stolen;
    removeFromParty(c, ch.id, "betrayed the party"); cp.traitor = true;
    c.traitors = [...(c.traitors||[]), { id: ch.id, name: ch.name, cls: ch.cls }];
    const lair = c.villain?.lair && c.locations[c.villain.lair];
    const br = lair?.dungeon?.rooms.find(r => r.type === "boss" && r.state !== "cleared");
    if (br) br.enemies = [...br.enemies, { name: TRAITOR_BASE[ch.cls] || "Veteran", count: 1, displayName: `${ch.name} the Traitor` }];
    notes?.push({kind:"hurt", text:`${ch.name} vanished in the night${stolen ? ` with ${stolen} gold` : ""}`});
    queueNews(c, `During the night, ${ch.name} (a companion who had grown to despise the main character's choices) slipped away${stolen ? `, taking ${stolen} gold from the party's purse` : ""}. Word later reaches the party that they have joined ${c.villain?.name || "the enemy"}. Describe the discovery of the betrayal and the other companions' reactions.`,
      `${ch.name} is gone when you wake${stolen ? `, and so are ${stolen} gold` : ""}. Days later, rumor says they now serve ${c.villain?.name || "your enemy"}.`);
  }
}

// ---------- 2. The villain's clock ----------
const THREAT_INTERVAL = { story: 12, standard: 9, deadly: 7 };
const LT_TITLES = ["the Butcher","the Grey Hand","the Whisperer","the Iron Warden","the Red Knife","the Hollow Crown"];
const LT_FIRST = ["Varga","Oskar","Mael","Thessaly","Grimwald","Sabeth","Corvin","Hesk"];
function threatOf(c){ if (!c.threat) c.threat = { stage: 0, next: c.time.day + Math.ceil((THREAT_INTERVAL[c.premise?.difficulty] ?? 9) * 0.8) }; return c.threat; }
function threatLabel(stage){ return ["Stirring","Rising","Spreading","Dominant","Overwhelming"][Math.min(4, stage)]; }
function queueNews(c, dm, offline){ c.news = [...(c.news||[]), { id: uid("n"), dm, offline }].slice(-6); }
function worldTick(c){
  if (!c.world?.map || c.sandbox) return; const notes = [];
  const lastDay = c.lastTickDay ?? (c.time.day - 1); c.lastTickDay = c.time.day;
  if (c.time.day > lastDay){ betrayalCheck(c, notes); checkCompanionQuests(c, notes); standingRewards(c, notes); }
  if (c.villain && !c.villainDefeated && !isQuick(c)){
    const th = threatOf(c); let guard = 0;
    while (c.time.day >= th.next && guard++ < 3){ th.stage++; th.next += THREAT_INTERVAL[c.premise?.difficulty] ?? 9; advanceThreat(c, th.stage, notes); }
  }
  if (notes.length) pushLog(c, {kind:"sys", notes});
}
function advanceThreat(c, stage, notes){
  const v = c.villain; const lair = v.lair && c.locations[v.lair];
  const towns = topLevelLocs(c).filter(l => ["town","village","port","city"].includes(l.type) && !l.fallen && l.id !== topLoc(c, c.currentLocationId)?.id);
  if (stage === 1 || stage === 3){
    const near = pick(towns) || topLevelLocs(c)[0];
    const name = `${pick(LT_FIRST)} ${pick(LT_TITLES)}`;
    const place = createPlace(c, pick(["castle","tower","ruins"]), near, { name: `${name.split(" ")[0]}'s Stronghold`, hostile: true, theme: v.theme || themeForLoc(near), discovered: true, description: `A stronghold of ${v.name}'s lieutenant, ${name}.` });
    if (place){ place.lvl = Math.max(2, partyLevel(c) + 1); place.small = true; place.lieutenant = name; place.bossName = name;
      const q = { id: "lt-" + place.id, title: `Break ${v.name}'s grip`, kind: "side", status: "active", giver: "the people of the region", createdAt: Date.now(), summary: `${name}, a lieutenant of ${v.name}, has seized ${place.name}. Defeating them will slow ${v.name}'s plans.`, reward: "Slows the enemy; reputation", objectives: [{id:"lt", text:`Defeat ${name} at ${place.name}`, done:false}], auto: { kind:"clear", loc: place.id, gold: 80 + 40 * partyLevel(c), xp: 90 * partyLevel(c) } };
      c.quests[q.id] = q; notes.push({kind:"quest", text:`New threat: ${name} holds ${place.name}`});
      queueNews(c, `NEWS OF THE VILLAIN: ${v.name}'s power grows. A lieutenant, ${name}, has seized ${place.name} (now on the map). Describe how the party hears (a wounded messenger, refugees, smoke on the horizon).`, `Refugees on the road bring grim news: ${name}, a lieutenant of ${v.name}, has seized ${place.name}.`); }
  } else if (stage === 2 || stage >= 5){
    if (topLevelLocs(c).filter(l => l.fallen).length >= 2) { stage = 4; }
    else { const cands = towns.length > 1 ? towns.filter(l => l.id !== c.homeTown) : towns; const target = cands.sort((a,b) => lair ? Math.hypot(a.gx-lair.gx,a.gy-lair.gy) - Math.hypot(b.gx-lair.gx,b.gy-lair.gy) : 0)[0];
      if (target){ target.fallen = true; target.hostile = true; target.theme = v.theme || "bandit"; target.dungeon = null; target.lvl = Math.max(2, partyLevel(c) + 1); target.small = true; target.bossName = `${pick(LT_FIRST)}, Warden of ${target.name}`;
        const q = { id: "lib-" + target.id, title: `Liberate ${target.name}`, kind: "side", status: "active", giver: "the survivors", createdAt: Date.now(), summary: `${v.name}'s forces have taken ${target.name}. Its people are prisoners in their own homes.`, reward: "Freedom for the town; great renown", objectives: [{id:"lib", text:`Drive ${v.name}'s forces out of ${target.name}`, done:false}], auto: { kind:"clear", loc: target.id, gold: 60 + 30 * partyLevel(c), xp: 110 * partyLevel(c) } };
        c.quests[q.id] = q; notes.push({kind:"hurt", text:`${target.name} has fallen to ${v.name}!`});
        c.chronicle.push({t: Date.now(), day: c.time.day, text: `${target.name} fell to ${v.name}'s forces.`});
        queueNews(c, `DARK NEWS: ${target.name} has fallen to ${v.name}'s forces. Its shops and inn are closed; its people are prisoners. Describe the news arriving and a companion's reaction.`, `Terrible news: ${target.name} has fallen to ${v.name}. Its gates are shut and its people enslaved.`); return; } }
  }
  if (stage === 4){
    if (lair) lair.lvl = (lair.lvl || 5) + 1; c.threat.roads = true;
    notes.push({kind:"hurt", text:`${v.name}'s power peaks: the roads grow deadly`});
    queueNews(c, `${v.name}'s power reaches its height: the sky darkens over ${lair?.name || "the lair"}, monsters roam the roads, and people whisper that time is running out. Describe the ominous signs.`, `The sky darkens over ${lair?.name || "the lair"}. Monsters roam the roads. Whatever ${v.name} is planning, it's almost ready.`);
  }
}
function threatSetback(c, notes, days, why){
  if (!c.threat || c.villainDefeated) return; c.threat.next += days;
  notes.push({kind:"quest", text:`${c.villain?.name || "The enemy"}'s plans are delayed (${why})`});
}
function liberate(c, loc, notes){
  tallyOf(c).liberated++;
  if (c.explore?.loc === loc.id) c.explore = null;
  loc.fallen = false; loc.hostile = false; loc.dungeon = null; loc.cleared = false; loc.bossName = null;
  addRep(c, loc.name, 35, notes); threatSetback(c, notes, 6, `${loc.name} liberated`);
  if (c.threat && c.threat.stage > 0) c.threat.stage = Math.max(1, c.threat.stage - 1);
  c.chronicle.push({t: Date.now(), day: c.time.day, text: `The party liberated ${loc.name} from ${c.villain?.name || "the enemy"}.`});
}

// ---------- 3. Reputation ----------
function standing(c, town){ return town ? (c.reputation?.[town.name] || 0) : 0; }
function standingLabel(v){ return v >= 50 ? "Honored" : v >= 20 ? "Liked" : v <= -50 ? "Hated" : v <= -20 ? "Distrusted" : "Neutral"; }
function priceMult(c, town){ return priceMultBase(c, town) * factionPriceMult(c); }
function priceMultBase(c, town){ const v = standing(c, town); return v >= 50 ? 0.8 : v >= 20 ? 0.9 : v <= -50 ? 1.5 : v <= -20 ? 1.25 : 1; }
function addRep(c, name, d, notes){ if (!name || !d) return; c.reputation = {...(c.reputation||{})}; c.reputation[name] = clamp((c.reputation[name]||0) + d, -100, 100); notes?.push({kind: d > 0 ? "loot" : "hurt", text:`Reputation with ${name} ${d > 0 ? "+" : ""}${d}`}); }
function standingRewards(c, notes){
  for (const l of topLevelLocs(c).filter(l => isSettlement(l))){
    if (standing(c, l) >= 50 && !(c.flags||{})["honored_" + l.id]){
      c.flags = {...(c.flags||{}), ["honored_" + l.id]: true}; giveLoot(c, rollLoot(partyLevel(c) + 1, "chest"), notes);
      notes.push({kind:"quest", text:`${l.name} names you honored friends of the town`});
      queueNews(c, `The people of ${l.name} honor the party as heroes: a ceremony, a gift from the council, and free drinks for life. Describe it briefly.`, `${l.name} holds a small ceremony in your honor and presents a gift from the council.`);
    }
  }
}
function guardEvent(town){
  return { id: "guards-" + town.id, dynamic: true, title: "The watch is waiting", text: `Your reputation in ${town.name} is dire. A squad of town guards blocks the gate, crossbows raised. 'You're not welcome here. Pay your fines or turn around.'`,
    choices: [ { label: "Pay the fines (50 gp)", cost: {gold: 50}, tags: ["honesty","caution"], ok: { rep: {[town.name]: 25}, text: "The captain pockets the coin. 'Behave yourselves.'" } },
               { label: "Talk them down", check: {skill: "Persuasion", dc: 15}, tags: ["honesty"], ok: { rep: {[town.name]: 10}, text: "You make your case. Grudgingly, they lower their crossbows." }, fail: { rep: {[town.name]: -5}, text: "They're not convinced. You're marched back out of the gate." } },
               { label: "Force your way in", tags: ["violence","bravery"], ok: { combat: "bandit", rep: {[town.name]: -15}, text: "Steel is drawn at the gate." } } ] };
}

// ---------- 4. Endings ----------
function deedsTitle(c){
  const d = c.deeds || {}; const good = (d.mercy||0) + (d.honesty||0) + (d.piety||0), dark = (d.cruelty||0) + (d.deceit||0) + (d.greed||0) + (d.violence||0) * 0.5;
  if (good >= dark * 2 && good >= 4) return ["the Merciful", "You won without losing yourself. People will remember your kindness longer than your victories."];
  if (dark >= good * 2 && dark >= 4) return ["the Ruthless", "You won, and nobody who crossed you lived to complain. People lower their voices when they speak your name."];
  if ((d.deceit||0) + (d.curiosity||0) > good) return ["the Cunning", "You won by being cleverer than everyone else in the room. Half the realm admires you; the other half checks their purses."];
  if ((d.bravery||0) >= 4) return ["the Bold", "You charged at every danger headfirst, and somehow it worked. Bards love you."];
  return ["the Wanderer", "You did what the road asked of you, no more and no less. Your story will be told in many versions."];
}
function computeEnding(c){
  const main = c.characters[c.activeCharId]; const [title, legend] = deedsTitle(c);
  const fallen = topLevelLocs(c).filter(l => l.fallen);
  const repPos = Object.values(c.reputation||{}).filter(v => v > 0).reduce((a,b) => a + b, 0);
  const realm = fallen.length ? `${c.villain?.name || "The enemy"} is gone, but ${fallen.map(l => l.name).join(" and ")} still suffer${fallen.length === 1 ? "s" : ""} under the remnants of their forces. The realm will take years to heal.`
    : (c.threat?.stage || 0) >= 4 ? `You stopped ${c.villain?.name || "the enemy"} at the last possible moment. The darkened sky clears for the first time in weeks, and people dance in the streets.`
    : `${c.villain?.name || "The enemy"} fell before their plans could ripen. Most people will never know how close it came.`;
  const comps = [...companionsOf(c).map(m => { const q = cqOf(m); const cp = m.companion;
      if (cp.player) return { name: m.name, text: `${firstName(m.name)} fought beside you to the very end. What they did next is their own story to tell.` };
      return { name: m.name, text: cp.loyal && q ? q.ending : cp.approval >= 25 ? `${firstName(m.name)} stayed by your side long after the adventure ended, and never said why. You know why.` : cp.approval > -25 ? `${firstName(m.name)} shook your hand, took their share of the gold and went their own way.` : `${firstName(m.name)} left without a goodbye. Some bridges don't get rebuilt.` }; }),
    ...(c.fallen||[]).map(f => ({ name: f.name, text: `${firstName(f.name)} did not live to see the end. Their name is carved on a stone by the road.` })),
    ...(c.traitors||[]).map(t => ({ name: t.name, text: `${firstName(t.name)} chose the wrong side. Whatever became of them, no one mourns.` }))];
  return { title: `${main.name} ${title}`, realm, legend, comps, renown: repPos, days: c.time.day, level: main.level, kills: main.stats?.kills || 0 };
}

// ---------- 5. Checkpoints ----------
async function saveCheckpoint(label){
  const c = C(); if (!c || c.sandbox) return;
  const p = packCampaign(c); delete p.checkpoint; p.checkpointLabel = label;
  store.camp(cc => { cc.checkpoint = { label, day: cc.time.day, at: Date.now() }; });
  Persist.lsSet("ur:cp:" + c.id, p);
  if (Persist.db) Persist.cloudSet("cp-" + c.id, p);
  toast(`Checkpoint saved: ${label}`);
}
async function loadCheckpoint(){
  const c0 = C(); if (!c0) return;
  let local = Persist.lsGet("ur:cp:" + c0.id, null), cloud = null;
  if (Persist.db) cloud = await Persist.cloudGet("cp-" + c0.id);
  const p = cloud && (!local || (cloud.updatedAt||0) >= (local.updatedAt||0)) ? cloud : local;
  if (!p){ toast("No checkpoint found.", "bad"); return; }
  const c = migrate(structuredClone(p)); c.checkpoint = c0.checkpoint; c.combat = null; c.news = []; c.event = null;
  pushLog(c, {kind:"sys", notes:[{kind:"xp", text:`Restored checkpoint: ${p.checkpointLabel || "saved point"}`}]});
  store.set({ campaign: c, tab: "adventure", modal: null, dmError: null }); saveNow(); toast("Checkpoint restored. Try again!");
}

// ---------- 6. Crafting ----------
const MATERIALS = {
  "Healing Herb":{v:5, d:"A common medicinal plant."}, "Glowcap Mushroom":{v:12, d:"A faintly luminous fungus with potent sap."}, "Bog Moss":{v:6, d:"Spongy moss that draws out poison."},
  "Frostleaf":{v:10, d:"Cold to the touch even in summer."}, "Sunpetal":{v:10, d:"A golden flower said to bloom where saints walked."},
  "Beast Hide":{v:6, d:"Tough, cured hide."}, "Sharp Fangs":{v:5, d:"Fangs and claws, good for edges and points."}, "Venom Sac":{v:15, d:"Handle with care."},
  "Bone Dust":{v:8, d:"Ground bone from restless dead."}, "Ectoplasm":{v:20, d:"Cold, shimmering residue of a spirit."}, "Scrap Iron":{v:4, d:"Salvaged blades and buckles."},
  "Monster Ichor":{v:18, d:"Thick blood of an unnatural creature."}, "Dragon Scale":{v:80, d:"Nearly indestructible; prized by smiths."}, "Faerie Dust":{v:25, d:"Glittering, giggling dust."}, "Star-metal":{v:120, d:"Metal from a fallen star."}
};
const FORAGE = { g:["Healing Herb","Healing Herb","Sunpetal"], f:["Healing Herb","Glowcap Mushroom","Glowcap Mushroom"], h:["Healing Herb","Sunpetal"], m:["Frostleaf","Frostleaf"], s:["Bog Moss","Bog Moss","Glowcap Mushroom"], a:["Sunpetal"], t:["Frostleaf"], w:["Bog Moss"] };
const RECIPES = [
  { id:"heal", name:"Potion of Healing", kind:"brew", needs:{"Healing Herb":2}, skill:"Medicine", dc:10, out:{name:"Potion of Healing", type:"potion"} },
  { id:"gheal", name:"Potion of Greater Healing", kind:"brew", needs:{"Healing Herb":2, "Glowcap Mushroom":1}, skill:"Medicine", dc:13, out:{name:"Potion of Greater Healing", type:"potion"} },
  { id:"antitox", name:"Antitoxin", kind:"brew", needs:{"Bog Moss":1, "Venom Sac":1}, skill:"Medicine", dc:11, out:{name:"Antitoxin"} },
  { id:"panacea", name:"Panacea", kind:"brew", needs:{"Sunpetal":1, "Healing Herb":1}, skill:"Medicine", dc:12, secret:true, out:{name:"Panacea", type:"potion", heal:"4d4+4", cures:"poisoned", value:120, description:"Mireille's abbey cure: heals and ends poison."} },
  { id:"frost", name:"Frost Tonic", kind:"brew", needs:{"Frostleaf":2}, skill:"Nature", dc:12, out:{name:"Frost Tonic", type:"potion", heal:"2d4+2", cures:"exhausted", value:60, description:"Bracing cold draught: heals a little and cures exhaustion."} },
  { id:"scure", name:"Scroll of Cure Wounds", kind:"scribe", needs:{"Sunpetal":1, "Ectoplasm":1}, skill:"Religion", dc:12, out:{name:"Scroll of Cure Wounds", type:"scroll", spell:"Cure Wounds"} },
  { id:"smm", name:"Scroll of Magic Missile", kind:"scribe", needs:{"Faerie Dust":1, "Bone Dust":1}, skill:"Arcana", dc:12, out:{name:"Scroll of Magic Missile", type:"scroll", spell:"Magic Missile"} },
  { id:"sshield", name:"Scroll of Shield of Faith", kind:"scribe", needs:{"Sunpetal":1, "Scrap Iron":1}, skill:"Religion", dc:11, out:{name:"Scroll of Shield of Faith", type:"scroll", spell:"Shield of Faith"} },
  { id:"weapon1", name:"Hone a weapon (+1)", kind:"improve", target:"weapon", from:0, to:1, needs:{"Sharp Fangs":2, "Scrap Iron":2, "Monster Ichor":1}, skill:"Sleight of Hand", dc:13 },
  { id:"armor1", name:"Reinforce armor (+1)", kind:"improve", target:"armor", from:0, to:1, needs:{"Beast Hide":3, "Scrap Iron":2}, skill:"Athletics", dc:13 },
  { id:"master", name:"Masterwork (+1 → +2)", kind:"improve", target:"any", from:1, to:2, needs:{"Scrap Iron":2, "Dragon Scale":1}, alt:{"Scrap Iron":2, "Star-metal":1}, skill:"Athletics", dc:15 }
];
function matCount(c, name){ return partyMembers(c).reduce((a,m) => a + m.inventory.filter(i => i.name === name).reduce((x,i) => x + i.qty, 0), 0); }
function recipeNeeds(c, r){ if (!r.alt) return r.needs; return Object.entries(r.needs).every(([n,q]) => matCount(c, n) >= q) ? r.needs : r.alt; }
function canCraft(c, r){ return Object.entries(recipeNeeds(c, r)).every(([n,q]) => matCount(c, n) >= q); }
function takeMats(c, needs, frac=1){ for (const [n,q0] of Object.entries(needs)){ let q = Math.max(frac < 1 ? 0 : 1, Math.floor(q0 * frac)); for (const m of partyMembers(c)){ for (const it of m.inventory.filter(i => i.name === n)){ const t = Math.min(q, it.qty); it.qty -= t; q -= t; } m.inventory = m.inventory.filter(i => i.qty > 0); } } }
function improvable(c, r){
  const out = []; for (const m of partyMembers(c)) for (const it of m.inventory){
    if (it.quest) continue; const isW = !!it.weapon, isA = !!it.armor || it.type === "shield"; if (!(isW || isA)) continue;
    if (r.target === "weapon" && !isW) continue; if (r.target === "armor" && !isA) continue;
    const b = isW ? (it.weapon.bonus||0) : (it.bonus || (it.armor ? 0 : Math.max(0, (it.acBonus||2) - 2))); if (b !== r.from) continue;
    out.push({ owner: m, it });
  } return out;
}
async function craft(recipeId, itemId){
  const c0 = C(); const r = RECIPES.find(x => x.id === recipeId); if (!r || !canCraft(c0, r) || S().busy || c0.combat) return;
  const needs = recipeNeeds(c0, r); const chk = await partyCheck(r.skill, r.dc - (hasUp(c0, "forge") ? 2 : 0)); const notes = [];
  store.camp(c => {
    if (!chk.success){ takeMats(c, needs, 0.5); notes.push({kind:"hurt", text:`${r.name}: botched (${chk.who ? firstName(chk.who.name) : "the party"} wasted some materials)`}); }
    else { takeMats(c, needs, 1);
      if (r.kind === "improve"){ const holder = partyMembers(c).find(m => invItem(m, itemId)); const it = holder && invItem(holder, itemId);
        if (it){ const base = it.name.replace(/\s*\+\d+$/,""); if (it.weapon) it.weapon.bonus = r.to; else if (it.armor){ it.armor.base += (r.to - r.from); it.bonus = r.to; } else if (it.type === "shield"){ it.acBonus = 2 + r.to; it.bonus = r.to; }
          it.name = `${base} +${r.to}`; it.rarity = r.to >= 2 ? "rare" : "uncommon"; it.magic = true; it.value = (it.value||10) + (r.to >= 2 ? 1500 : 400); notes.push({kind:"loot", text:`${firstName(holder.name)}'s gear is now ${it.name}`}); } }
      else { const it = addItem(c.characters[c.activeCharId], makeItem(r.out)); notes.push({kind:"loot", text:`Crafted: ${it.name}`}); }
      advanceTime(c, 1/6); }
    pushLog(c, {kind:"sys", notes}); c.deeds = c.deeds || {};
  });
  Sfx.play(chk.success ? "coin" : "fail");
}
async function forage(){
  const c0 = C(); const here = topLoc(c0, c0.currentLocationId); if (!here || isSettlement(here) || c0.explore || S().busy || c0.combat) return;
  if ((here.foragedDay ?? -1) === c0.time.day){ coopNotify("You've already searched this area today.", "bad"); return; }
  const chk = await partyCheck("Survival", 12 - (factionTier(C(), "wild") >= 1 ? 2 : 0)); const notes = [];
  store.camp(c => { const l = c.locations[here.id]; l.foragedDay = c.time.day; advanceTime(c, 1/6);
    if (chk.success){ const pool = FORAGE[l.biome || "g"] || FORAGE.g; const n = 1 + (chk.total >= 17 ? 2 : chk.total >= 14 ? 1 : 0);
      for (let i=0;i<n;i++){ const nm = pick(pool); addItem(c.characters[c.activeCharId], matItem(nm)); notes.push({kind:"loot", text:`Foraged: ${nm}`}); }
      if (chk.total >= 20){ addItem(c.characters[c.activeCharId], matItem("Faerie Dust")); notes.push({kind:"loot", text:"A rare find: Faerie Dust"}); } }
    else notes.push({kind:"hurt", text:"Foraging turned up nothing useful"});
    pushLog(c, {kind:"player", text:"We search the area for useful herbs."}); pushLog(c, {kind:"sys", notes}); });
  Sfx.play(chk.success ? "coin" : "fail");
}
function matItem(name, qty=1){ const m = MATERIALS[name] || {v:5, d:""}; return makeItem({ name, type:"material", value: m.v, qty, description: m.d }); }
function harvest(c, cm, notes){
  const got = {};
  for (const e of enemies(c).filter(e => e.dead && !e.summoned)){
    const n = (e.base || e.name).toLowerCase(); const t = e.type; const roll = Math.random();
    const add = (k, p) => { if (Math.random() < p) got[k] = (got[k]||0) + 1; };
    if (/dragon|drake|wyrm/.test(n)) add("Dragon Scale", 0.8);
    else if (t === "beast"){ add("Beast Hide", 0.5); add("Sharp Fangs", 0.35); if (/spider|snake|scorpion|stirge/.test(n)) add("Venom Sac", 0.6); }
    else if (t === "undead"){ add("Bone Dust", 0.45); if (/shadow|ghost|wight|specter|wraith|spawn/.test(n)) add("Ectoplasm", 0.6); }
    else if (t === "monstrosity"){ add("Monster Ichor", 0.6); add("Sharp Fangs", 0.3); }
    else if (t === "fey"){ add("Faerie Dust", 0.6); }
    else if (t === "humanoid" || t === "giant"){ add("Scrap Iron", 0.35); }
    else add("Monster Ichor", 0.25);
    if (roll < 0.03) add("Star-metal", 1);
  }
  const main = c.characters[c.activeCharId];
  for (const [k, q] of Object.entries(got)){ addItem(main, matItem(k, q)); notes.push({kind:"loot", text:`Harvested: ${q > 1 ? q + "× " : ""}${k}`}); }
}
</script>
