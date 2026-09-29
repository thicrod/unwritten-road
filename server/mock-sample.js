// Mock of window.claude runtime for testing
(function(){
  const calls = [];
  window.__calls = calls;
  const genesis = `Rain lashes the slate roofs of **Hollowmere** as you push into the Lantern & Thorn. A hooded woman at the bar turns. "You're late," she says, though you've never met her.

The fire gutters. Somewhere below the floorboards, something knocks three times.
<<<STATE>>>
{"world":{"name":"The Veiled March","region":"Hollowmere Vale","overview":"A misty borderland of drowned villages and old oaths."},
"location":{"id":"hollowmere","name":"Hollowmere","type":"town","x":50,"y":50,"description":"A fog-bound market town.","discovered":true},
"locations":[{"id":"lantern-thorn","name":"The Lantern & Thorn","type":"tavern","parent":"hollowmere","description":"A smoky inn."},
{"id":"blackfen","name":"Blackfen","type":"swamp","x":35,"y":62,"description":"Sucking marsh.","discovered":true,"connects":["hollowmere"]},
{"id":"crypt","name":"The Sunless Crypt","type":"dungeon","x":28,"y":72,"description":"Old tomb.","discovered":false,"important":true},
{"id":"greyspire","name":"Greyspire","type":"tower","x":66,"y":34,"description":"A wizard's tower.","discovered":false}],
"npcs":[{"id":"maren","name":"Maren Vale","race":"Human","role":"Smuggler","location":"lantern-thorn","personality":"Wry, guarded","attitude":10,"notes":"Knows about the knocking."}],
"quests":[{"id":"knocking","title":"The Knocking Below","kind":"main","giver":"Maren Vale","summary":"Find what knocks beneath Hollowmere.","objectives":[{"id":"cellar","text":"Search the cellar","done":false},{"id":"bonus","text":"Keep it quiet","optional":true}]}],
"memory":["Maren thinks the player is someone else."],"time":"night","villain":{"name":"The Pale Warden","title":"Keeper of the Sunless Crypt","motive":"Binds the drowned dead to guard a stolen crown.","theme":"undead","lair":"crypt"},"choices":[{"text":"Ask Maren who she thinks I am","skill":null},{"text":"Pretend to be the person she expects","skill":"Deception"}]}`;
  function respond(input){
    if (input.includes("START A NEW CAMPAIGN")) return genesis;
    if (input.includes("ROLL RESULT")) return `You slip past without a sound. Behind a barrel you find a small pouch.
<<<STATE>>>
{"xp":400,"xp_reason":"clever sneaking","items_add":[{"name":"Flame Tongue Dagger","type":"weapon","base":"Dagger","bonus":1,"extra_damage":"1d6","extra_damage_type":"fire","rarity":"rare"},{"name":"Potion of Healing","qty":2}],"gold":15,"quests":[{"id":"knocking","objectives":[{"id":"cellar","text":"Search the cellar","done":true},{"id":"door","text":"Open the iron door"}]}]}`;
    if (input.includes("GAME EVENT")) return `The last goblin falls. Among the bodies: a crude map.
<<<STATE>>>
{"gold":7,"items_add":["Rations x2"],"memory":["Killed the cellar goblins."]}`;
    if (/PLAYER ACTION: .*sneak/i.test(input)) return `You edge toward the cellar stairs while Maren talks with the barkeep. One loose board could give you away.
<<<STATE>>>
{"roll":{"kind":"skill","skill":"Stealth","dc":12,"adv":"none","reason":"sneak down unnoticed"}}`;
    if (/PLAYER ACTION: .*(attack|fight)/i.test(input)) return `Two goblins burst from the dark, blades drawn!
<<<STATE>>>
{"combat":{"enemies":[{"name":"Goblin","count":2}],"surprise":"none","terrain":"a cramped cellar"}}`;
    if (/PLAYER ACTION: .*shop/i.test(input)) return `The peddler unrolls a blanket of wares.
<<<STATE>>>
{"shop":{"name":"Oddments","keeper":"Pim","items":[{"name":"Longsword","type":"weapon","base":"Longsword","price":15},{"name":"Chain Shirt","type":"armor","base":"Chain Shirt","price":50},{"name":"Potion of Healing","price":50}]}}`;
    if (/PLAYER ACTION: .*long rest/i.test(input)) return `You sleep soundly.
<<<STATE>>>
{"rest":"long","time":"dawn","day_advance":1}`;
    if (/PLAYER ACTION: .*travel to/i.test(input)) return `You squelch into Blackfen.
<<<STATE>>>
{"location":{"id":"blackfen"},"locations":[{"id":"sunk-shrine","name":"Sunk Shrine","type":"temple","description":"Half-drowned shrine.","discovered":true}]}`;
    return `The world waits, patient as stone.
<<<STATE>>>
{}`;
  }
  async function sample(input, opts={}){
    calls.push({kind:"sample", input: String(input).slice(-400)});
    const txt = respond(String(input));
    if (opts.onText){ for (let i=40;i<txt.length;i+=60){ opts.onText({text: txt.slice(0,i)}); await new Promise(r=>setTimeout(r,10)); } }
    return { text: txt };
  }
  sample.json = async (input, opts={}) => {
    calls.push({kind:"json", input: String(input).slice(0,200)});
    if (String(input).includes("control the enemies")) return { actions: [] };
    if (String(input).includes("ONE creative action")) return { cost:"action", narration:"You kick the brazier over.", roll:{kind:"skill", skill:"Athletics", dc:5}, success:{text:"Coals spray across the goblins.", effects:[{target:"all_enemies", damage:"1d4", damage_type:"fire"}]}, failure:{text:"You stumble.", effects:[]} };
    return {};
  };
  const mem = {};
  const col = (path) => ({ doc: (id) => ({ get: async () => { const k = path+"/"+id; return { exists: k in mem, data: () => JSON.parse(JSON.stringify(mem[k])) }; }, set: async (d) => { mem[path+"/"+id] = JSON.parse(JSON.stringify(d)); }, delete: async () => { delete mem[path+"/"+id]; } }) });
  window.__mem = mem;
  window.claude = { use: async (name) => name === "sample" ? (window.__noSample ? null : sample) : name === "db" ? { collection: col } : name === "user" ? { id: async () => "u123" } : name === "downloads" ? { save: async () => ({}) } : null };
})();
