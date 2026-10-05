<script>
"use strict";
// =====================================================================
//  INTERFACE LANGUAGE: Brazilian Portuguese
//  A translation layer over the rendered page: interface text is swapped for Portuguese,
//  while story text (the DM's narration, chat, anything typed) is left alone.
// =====================================================================
const PT_CLASS = { Barbarian: "Bárbaro", Bard: "Bardo", Cleric: "Clérigo", Druid: "Druida", Fighter: "Guerreiro", Monk: "Monge", Paladin: "Paladino", Ranger: "Patrulheiro", Rogue: "Ladino", Sorcerer: "Feiticeiro", Warlock: "Bruxo", Wizard: "Mago" };
const PT_RACE = { Human: "Humano", Elf: "Elfo", Dwarf: "Anão", Halfling: "Halfling", Gnome: "Gnomo", "Half-Orc": "Meio-Orc", "Half-Elf": "Meio-Elfo", Tiefling: "Tiefling", Dragonborn: "Draconato" };
const PT_PHASE = { morning: "manhã", afternoon: "tarde", evening: "noite", night: "madrugada", dawn: "alvorada", dusk: "anoitecer" };
const PT = {
  // navigation & shell
  "Adventure": "Aventura", "Party": "Grupo", "Sheets": "Fichas", "Map": "Mapa", "Quests": "Missões", "Journal": "Diário", "More": "Mais", "Save": "Salvar", "Settings": "Configurações", "Home": "Início", "Combat": "Combate", "Room": "Sala",
  // home
  "Continue": "Continuar", "New adventure": "Nova aventura", "Build a character and begin a fresh campaign.": "Crie um personagem e comece uma nova campanha.",
  "Quick adventure": "Aventura rápida", "A one-evening story (about 90 minutes). Heroes start at level 3.": "Uma história de uma noite (cerca de 90 minutos). Os heróis começam no nível 3.",
  "Play online": "Jogar online", "Host your campaign for friends, or join a room with a code.": "Hospede sua campanha para amigos ou entre em uma sala com um código.",
  "Achievements & Hall of Fame": "Conquistas e Hall da Fama", "Your trophies, and the heroes who finished their stories.": "Seus troféus e os heróis que concluíram suas histórias.",
  "How to play": "Como jogar", "Campaigns": "Campanhas", "Practice ring": "Arena de treino",
  // creator
  "Origin": "Origem", "Class": "Classe", "Abilities": "Atributos", "Background": "Antecedente", "Skills": "Perícias", "Equipment": "Equipamento", "Spells": "Magias", "Story": "História", "Campaign": "Campanha",
  "Back": "Voltar", "Next": "Próximo", "Cancel": "Cancelar", "Surprise me": "Me surpreenda", "Begin the adventure": "Começar a aventura", "I'm ready": "Estou pronto", "Join the party": "Entrar no grupo",
  "Portrait": "Retrato", "Skin": "Pele", "Scales": "Escamas", "Hair": "Cabelo", "Beard": "Barba", "Eyes": "Olhos", "Random look": "Visual aleatório", "Show class gear (hat, hood, helm…)": "Mostrar equipamento da classe (chapéu, capuz, elmo…)",
  "Short": "Curto", "Long": "Longo", "Ponytail": "Rabo de cavalo", "Bun": "Coque", "Braids": "Tranças", "Mohawk": "Moicano", "Wild": "Rebelde", "Curly": "Cacheado", "Bald": "Careca", "None": "Nenhuma", "Stubble": "Por fazer", "Braided": "Trançada",
  "Set the table": "Prepare a mesa", "Tone": "Tom", "Setting": "Cenário", "Difficulty": "Dificuldade", "Length": "Duração", "Full campaign": "Campanha completa", "Quick adventure (one evening)": "Aventura rápida (uma noite)",
  "Heroic": "Heroico", "Grim & dark": "Sombrio", "Mystery": "Mistério", "Horror": "Terror", "Whimsical": "Fantasioso", "Classic kingdoms": "Reinos clássicos", "Frontier wilds": "Fronteira selvagem", "Haunted realm": "Reino assombrado", "Desert empire": "Império do deserto", "Northern isles": "Ilhas do norte",
  "Story": "História", "Standard": "Padrão", "Deadly": "Mortal", "Party size": "Tamanho do grupo", "Just me": "Só eu", "2 heroes": "2 heróis", "3 heroes": "3 heróis", "4 heroes": "4 heróis", "Your fellowship": "Sua comitiva",
  "Appearance (optional)": "Aparência (opcional)", "Backstory hooks (optional)": "Ganchos de história (opcional)", "Campaign name (optional)": "Nome da campanha (opcional)", "Anything else? (optional)": "Mais alguma coisa? (opcional)",
  // adventure
  "Look around": "Olhar ao redor", "Talk to the party": "Falar com o grupo", "Cast a spell…": "Lançar uma magia…", "Use an item…": "Usar um item…", "Craft…": "Criar…", "Forage": "Coletar", "Short rest": "Descanso curto", "Make camp": "Acampar",
  "Do": "Fazer", "Say": "Dizer", "Roll": "Rolar", "Roll d20": "Rolar d20", "Clear": "Limpar", "Dice": "Dados", "Normal": "Normal", "Adv": "Vant.", "Dis": "Desv.", "Mod": "Mod",
  "Tavern": "Taverna", "Market": "Mercado", "Temple": "Templo", "Smithy": "Ferraria", "Notice board": "Quadro de avisos", "Travel": "Viajar", "Neutral": "Neutro", "Buy a base": "Comprar uma base",
  "Roll the dice first…": "Role os dados primeiro…", "Waiting for the host to roll…": "Aguardando o anfitrião rolar…",
  // combat
  "Enemies": "Inimigos", "Your party": "Seu grupo", "Front": "Frente", "Back line": "Retaguarda", "Front line": "Linha de frente", "BACK": "TRÁS", "FRONT": "FRENTE",
  "Attack": "Ataque", "Items": "Itens", "Move & act": "Mover e agir", "Custom": "Livre", "End turn": "Encerrar turno", "Action": "Ação", "Bonus": "Bônus", "Move": "Mover",
  "Dodge": "Esquivar", "Dash": "Disparada", "Disengage": "Desengajar", "Hide": "Esconder", "Help": "Ajudar", "Death save": "Teste contra a morte", "Retreat": "Recuar",
  "Tap to roll": "Toque para rolar", "🎲 Tap to roll": "🎲 Toque para rolar", "or press Space": "ou aperte Espaço", "Success": "Sucesso", "Failure": "Falha", "Critical!": "Crítico!", "Fumble!": "Desastre!",
  "Victory!": "Vitória!", "Defeat": "Derrota", "Show battle map": "Mostrar mapa de batalha", "🗺 Show battle map": "🗺 Mostrar mapa de batalha", "AI": "IA",
  "Your turn": "Sua vez", "You hear more footsteps approaching…": "Você ouve mais passos se aproximando…",
  // party, sheet, map, quests, journal
  "Battle formation": "Formação de batalha", "Role": "Função", "Tactics": "Táticas", "In combat": "Em combate", "Sheet & gear": "Ficha e equipamento", "Talk": "Conversar", "Dismiss": "Dispensar", "Manage": "Gerenciar",
  "Level up": "Subir de nível", "Approval": "Aprovação", "Inventory": "Inventário", "Equip": "Equipar", "Unequip": "Desequipar", "Give": "Dar", "Drop": "Largar", "Use": "Usar", "Remove": "Remover",
  "Strength": "Força", "Dexterity": "Destreza", "Constitution": "Constituição", "Intelligence": "Inteligência", "Wisdom": "Sabedoria", "Charisma": "Carisma", "Speed": "Desloc.", "Gold": "Ouro", "Init": "Inic.", "Prof.": "Prof.",
  "Features & traits": "Características", "Spellcasting": "Conjuração", "Resources": "Recursos", "Attacks": "Ataques",
  "Travel here": "Viajar para cá", "World": "Mundo", "Dungeon": "Masmorra", "Places within": "Lugares aqui", "People": "Pessoas", "Known places": "Lugares conhecidos",
  "Active": "Ativas", "Done": "Concluídas", "Failed": "Falhas", "Track": "Acompanhar", "Tracked": "Acompanhando", "Main quest": "Missão principal",
  "Main story": "História principal", "Investigate": "Investigar", "Confront the lieutenant": "Enfrentar o tenente", "Storm the lair": "Invadir o covil", "Not yet revealed": "Ainda não revelado", "Your legend so far": "Sua lenda até agora", "Reputation": "Reputação",
  // modals & common buttons
  "Close": "Fechar", "Confirm": "Confirmar", "OK": "OK", "Leave": "Sair", "Later": "Depois", "Got it": "Entendi", "Buy": "Comprar", "Sell": "Vender", "Rest": "Descansar", "Accept": "Aceitar", "Recruit": "Recrutar", "Heal": "Curar", "Cure": "Purificar", "Raise": "Ressuscitar",
  "Continue the story": "Continuar a história", "🎙 Ask the DM for a recap": "🎙 Pedir um resumo ao Mestre", "The story so far": "A história até agora", "Where you left off": "Onde vocês pararam",
  "Session recap": "Resumo da sessão", "End session": "Encerrar sessão", "📋 Copy summary": "📋 Copiar resumo", "🖼 Save image": "🖼 Salvar imagem", "fights": "lutas", "foes defeated": "inimigos derrotados", "critical hits": "acertos críticos", "gold": "ouro", "items found": "itens encontrados", "quests done": "missões concluídas", "clues": "pistas", "rare encounters": "encontros raros",
  "Upgrades": "Melhorias", "Built ✓": "Construído ✓", "🛏 Rest here (free)": "🛏 Descansar aqui (grátis)", "📚 Research (1 day)": "📚 Pesquisar (1 dia)", "🎯 Train (1 day)": "🎯 Treinar (1 dia)",
  "Epilogue": "Epílogo", "Main menu": "Menu principal", "Keep adventuring": "Continuar aventurando", "Got it!": "Entendi!",
  // settings
  "Dungeon Master": "Mestre", "Storyteller depth": "Profundidade do narrador", "Fast": "Rápido", "Balanced": "Equilibrado", "Deep": "Profundo", "Narration length": "Tamanho da narração", "Medium": "Médio", "Story language": "Idioma da história",
  "Roll dice yourself": "Role os dados você mesmo", "Auto-roll checks": "Rolar testes automaticamente", "Battle map": "Mapa de batalha", "Smart enemy tactics": "Táticas inimigas inteligentes", "Show hints": "Mostrar dicas", "Tips for new players": "Dicas para novos jogadores", "Show tips again": "Mostrar dicas de novo",
  "Display": "Exibição", "Theme": "Tema", "Text size": "Tamanho do texto", "Animations": "Animações", "Sound effects": "Efeitos sonoros", "Music": "Música", "Off": "Desligado", "Low": "Baixo", "High": "Alto", "Full": "Completo", "Quick": "Rápido",
  "Session recap ": "Resumo da sessão", "Show recap": "Ver resumo", "Interface language": "Idioma da interface", "Your own AI key (optional)": "Sua própria chave de IA (opcional)", "Remove": "Remover",
  // online
  "Online room": "Sala online", "Host a room": "Hospedar sala", "Join a room": "Entrar em sala", "Your name": "Seu nome", "Room code": "Código da sala", "Join": "Entrar", "Copy invite link": "Copiar link de convite", "Players": "Jogadores", "Heroes": "Heróis",
  "Leave room": "Sair da sala", "Take control": "Assumir controle", "Release": "Liberar", "Co-op lobby": "Saguão cooperativo", "Start the adventure": "Começar a aventura", "Create your hero": "Criar seu herói", "Edit hero": "Editar herói", "Leave seat": "Sair do lugar", "Take this seat": "Pegar este lugar",
  "Human": "Humano", "Party chat": "Chat do grupo", "Send": "Enviar", "Open lobby": "Abrir saguão", "Host it": "Hospedar",
  // achievements & hall of fame
  "Achievements": "Conquistas", "Hall of Fame": "Hall da Fama",
  // fragments of text built from pieces ("Round " + 2)
  "Round": "Rodada", "Level": "Nível", "Party (": "Grupo (", "Day": "Dia", "You": "Você", "Spell slots": "Espaços de magia", "Saved to your account": "Salvo na sua conta", "Saved in this browser": "Salvo neste navegador",
  "Humanoid": "Humanoide", "Beast": "Fera", "Undead": "Morto-vivo", "Dragon": "Dragão", "Giant": "Gigante", "Fiend": "Ínfero", "unhurt": "ileso", "bloodied": "ferido", "Out Of Reach": "Fora de alcance", "Character": "Personagem",
  "Your story waits…": "Sua história espera…", "The Dungeon Master considers…": "O Mestre está pensando…",
};
// words whose translation depends on where they appear
const PT_CTX = { Abilities: (el) => el.closest(".act-tabs") ? "Habilidades" : "Atributos", Back: (el) => el.closest("button") ? "Voltar" : "Retaguarda", BACK: (el) => el.closest("button") ? "VOLTAR" : "RETAGUARDA" };
const PT_RX = [
  [/^Level (\d+) ([A-Za-z-]+) ([A-Za-z]+)( · .*)?$/, (m, l, r, c, rest) => `Nível ${l} ${PT_RACE[r] || r} ${PT_CLASS[c] || c}${rest || ""}`],
  [/^Level (\d+)$/, "Nível $1"], [/^L(\d+) ([A-Za-z]+)$/, (m, l, c) => `N${l} ${PT_CLASS[c] || c}`],
  [/^Level up to (\d+)$/, "Subir para o nível $1"], [/^Level up ([^ ]+) to (\d+)$/, "Subir $1 para o nível $2"], [/^★ Level up to (\d+)$/, "★ Subir para o nível $1"],
  [/^Round (\d+)\.?$/, "Rodada $1"], [/^Day (\d+), (\w+)$/, (m, d, p) => `Dia ${d}, ${PT_PHASE[p] || p}`], [/^Day (\d+)$/, "Dia $1"],
  [/^Your turn: (.+)$/, "Sua vez: $1"], [/^(.+)'s turn$/, "Turno de $1"], [/^(\d+) gold$/, "$1 de ouro"], [/^\+(\d+) gold$/, "+$1 de ouro"], [/^\+(\d+) XP$/, "+$1 XP"],
  [/^Clues (\d+)\/(\d+)$/, "Pistas $1/$2"], [/^Clue about (.+)$/, "Pista sobre $1"], [/^Party vote: (.+)$/, "Votação do grupo: $1"],
  [/^(\d+) minutes of play$/, "$1 minutos de jogo"], [/^Build · (\d+) gp$/, "Construir · $1 po"], [/^Fast travel · (\d+)d(?: · (\d+) gp)?$/, (m, d, g) => `Viagem rápida · ${d}d${g ? ` · ${g} po` : ""}`],
  [/^Achievements \((\d+)\/(\d+)\)$/, "Conquistas ($1/$2)"], [/^Hall of Fame \((\d+)\)$/, "Hall da Fama ($1)"], [/^Unlocked (.+)$/, "Desbloqueado $1"],
  [/^Previously on (.+)…$/, "Anteriormente em $1…"], [/^(.+) is deciding what to do…$/, "$1 está decidindo o que fazer…"], [/^(.+) is choosing (.+)'s move…$/, "$1 está escolhendo a jogada de $2…"],
  [/^([A-Z][a-z]+) (\d+)$/, (m, c, l) => PT_CLASS[c] ? `${PT_CLASS[c]} ${l}` : m], [/^Party \((\d+)\/(\d+)\)$/, "Grupo ($1/$2)"], [/^Rare encounters found: (\d+) of (\d+)$/, "Encontros raros: $1 de $2"],
];
const PT_SKIP = ".entry, .md, .chat-msgs, .recap-last, .log, .stream, textarea, input, .bt-name, .portrait, svg, [data-notr]";
let i18nObs = null, i18nBusy = false;
const uiLang = () => S()?.settings?.uiLang || "en";
function trText(s, el){
  const t = s.trim(); if (!t || t.length > 160) return null;
  if (PT_CTX[t] && el) return s.replace(t, PT_CTX[t](el));
  if (PT[t]) return s.replace(t, PT[t]); if (PT_CLASS[t]) return s.replace(t, PT_CLASS[t]); if (PT_RACE[t]) return s.replace(t, PT_RACE[t]);
  for (const [rx, rep] of PT_RX){ if (rx.test(t)) return s.replace(t, t.replace(rx, rep)); }
  return null;
}
function trNode(n){
  if (n.nodeType === 3){ const p = n.parentElement; if (!p || p.closest(PT_SKIP)) return; const v = trText(n.nodeValue, p); if (v != null && v !== n.nodeValue) n.nodeValue = v; return; }
  if (n.nodeType !== 1 || n.closest?.(PT_SKIP)) return;
  for (const a of ["placeholder", "title", "aria-label"]){ const v = n.getAttribute?.(a); if (v){ const t = trText(v); if (t != null && t !== v) n.setAttribute(a, t); } }
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let x; while ((x = w.nextNode())){ if (x.nodeType === 1){ if (x.closest(PT_SKIP)) continue; for (const a of ["placeholder", "title", "aria-label"]){ const v = x.getAttribute(a); if (v){ const t = trText(v); if (t != null && t !== v) x.setAttribute(a, t); } } } else { const p = x.parentElement; if (!p || p.closest(PT_SKIP)) continue; const v = trText(x.nodeValue, p); if (v != null && v !== x.nodeValue) x.nodeValue = v; } }
}
function applyUiLang(){
  if (uiLang() !== "pt"){ if (i18nObs){ i18nObs.disconnect(); i18nObs = null; } document.documentElement.lang = "en"; return; }
  document.documentElement.lang = "pt-BR";
  if (!i18nObs){
    i18nObs = new MutationObserver(muts => { if (i18nBusy) return; i18nBusy = true; try { for (const m of muts){ if (m.type === "characterData") trNode(m.target); else m.addedNodes.forEach(trNode); } } finally { i18nBusy = false; } });
    i18nObs.observe(document.body, { subtree: true, childList: true, characterData: true });
  }
  trNode(document.body);
}
store.subs.add(() => { const l = uiLang(); if (l !== applyUiLang.last){ const was = applyUiLang.last; applyUiLang.last = l; applyUiLang(); if (was === "pt" && l === "en") location.reload(); } });
setTimeout(applyUiLang, 50);
</script>
