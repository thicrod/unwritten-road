<script>
"use strict";
// ======================= AMBIENT MUSIC (synthesized, follows the scene) =======================
const MOODS = {
  menu:    { root: 146.83, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], bars: 2, tempo: 64, density: 0.3, lead: "flute", pad: 0.5 },
  town:    { root: 196.00, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], bars: 2, tempo: 78, density: 0.55, lead: "lute", pad: 0.45 },
  wild:    { root: 146.83, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 3, 7], [-2, 2, 5], [0, 3, 7], [7, 10, 14]], bars: 2, tempo: 62, density: 0.32, lead: "flute", pad: 0.55, drone: true },
  dungeon: { root: 110.00, scale: [0, 1, 3, 5, 7, 8], chords: [[0, 3, 7], [1, 5, 8]], bars: 4, tempo: 50, density: 0.18, lead: "bell", pad: 0.6, drone: true, drip: true },
  combat:  { root: 82.41, scale: [0, 1, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [8, 12, 15], [10, 14, 17], [0, 3, 7]], bars: 1, tempo: 104, density: 0.5, lead: "pluck", pad: 0.4, drums: true },
  boss:    { root: 73.42, scale: [0, 1, 3, 6, 7, 8], chords: [[0, 3, 7], [1, 4, 8], [0, 3, 7], [6, 9, 12]], bars: 1, tempo: 92, density: 0.42, lead: "pluck", pad: 0.5, drums: true, drone: true, heavy: true },
};
const hz = (root, semi) => root * Math.pow(2, semi / 12);
const Music = {
  mood: null, bus: null, rev: null, dry: null, beat: 0, nextT: 0, pads: [], droneNodes: [], melody: 0, chordIdx: 0,
  vol(){ const v = S().settings.music; return v == null ? 0 : v; },
  ensure(){
    const ctx = Sfx.init(); if (!ctx) return null;
    if (!this.bus){
      this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.connect(ctx.destination);
      this.dry = ctx.createGain(); this.dry.gain.value = 0.7; this.dry.connect(this.bus);
      // a soft generated reverb: exponentially decaying noise
      const len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++){ const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      this.rev = ctx.createConvolver(); this.rev.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.55; this.rev.connect(wet); wet.connect(this.bus);
    }
    return ctx;
  },
  set(mood){ if (mood === this.mood) return; this.mood = mood; this.releaseAll(2.5); this.beat = 0; this.chordIdx = 0; this.melody = 0; },
  releaseAll(sec){ const ctx = this.ctx0(); if (!ctx) return; const t = ctx.currentTime; for (const v of [...this.pads, ...this.droneNodes]){ try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0.0001, t, sec / 4); v.o.forEach(o => o.stop(t + sec + 0.5)); } catch {} } this.pads = []; this.droneNodes = []; },
  ctx0(){ return Sfx.ctx; },
  out(ctx, node, wet = 0.6){ node.connect(this.dry); const s = ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(this.rev); },
  tick(){
    const v = this.vol(); if (!v && !this.bus) return;
    const ctx = this.ensure(); if (!ctx) return;
    this.bus.gain.setTargetAtTime(v ? v * 2.2 : 0, ctx.currentTime, 0.6);
    if (!v || !this.mood || ctx.state !== "running") return;
    const M = MOODS[this.mood], spb = 60 / M.tempo;
    if (this.nextT < ctx.currentTime) this.nextT = ctx.currentTime + 0.05;
    if (M.drone && !this.droneNodes.length) this.drone(ctx, M);
    while (this.nextT < ctx.currentTime + 0.3){ this.onBeat(ctx, M, this.nextT, spb); this.nextT += spb; this.beat++; }
  },
  onBeat(ctx, M, t, spb){
    const inBar = this.beat % 4, bar = Math.floor(this.beat / 4);
    if (inBar === 0 && bar % M.bars === 0){ const ch = M.chords[this.chordIdx % M.chords.length]; this.chordIdx++; this.padChord(ctx, M, ch, t, spb * 4 * M.bars); }
    if (Math.random() < M.density) this.note(ctx, M, t + (Math.random() < 0.25 ? spb / 2 : 0), spb);
    if (M.drums){ if (inBar === 0 || (inBar === 2 && !M.heavy) || (M.heavy && inBar === 3)) this.drum(ctx, t, inBar === 0 ? 1 : 0.55, M.heavy); if (!M.heavy) this.hat(ctx, t + spb / 2); }
    if (M.drip && Math.random() < 0.1) this.drip(ctx, t + Math.random() * spb);
  },
  padChord(ctx, M, chord, t, dur){
    const old = this.pads; this.pads = [];
    for (const v of old){ try { v.g.gain.setTargetAtTime(0.0001, t, 0.9); v.o.forEach(o => o.stop(t + 4)); } catch {} }
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = M.drums ? 900 : 1300; f.Q.value = 0.3; this.out(ctx, f, 0.8);
    for (const semi of chord){
      const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(f);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = "triangle"; o2.type = "sine";
      o1.frequency.value = hz(M.root, semi); o2.frequency.value = hz(M.root, semi + 12); o2.detune.value = 6;
      o1.connect(g); o2.connect(g); o1.start(t); o2.start(t);
      g.gain.setTargetAtTime(0.028 * M.pad, t, 0.9);
      this.pads.push({ g, o: [o1, o2] });
    }
  },
  drone(ctx, M){
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 400; this.out(ctx, f, 0.4);
    for (const [semi, lvl] of [[-12, 0.05], [-5, 0.022]]){ const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(f); const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(M.root, semi); o.connect(g); o.start(); g.gain.setTargetAtTime(lvl, ctx.currentTime, 2); this.droneNodes.push({ g, o: [o] }); }
  },
  note(ctx, M, t, spb){
    const sc = M.scale; this.melody = Math.max(0, Math.min(sc.length * 2 - 1, this.melody + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    const semi = sc[this.melody % sc.length] + 12 * (Math.floor(this.melody / sc.length) + 1), freq = hz(M.root, semi);
    const g = ctx.createGain(); g.gain.value = 0.0001; const f = ctx.createBiquadFilter(); f.type = "lowpass";
    const o = ctx.createOscillator(); let dur = spb * 0.9, peak = 0.05;
    if (M.lead === "lute"){ o.type = "triangle"; f.frequency.value = 2400; dur = spb * 1.2; }
    else if (M.lead === "flute"){ o.type = "sine"; f.frequency.value = 2000; dur = spb * 1.8; peak = 0.04; const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = freq * 0.006; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 1); }
    else if (M.lead === "bell"){ o.type = "sine"; f.frequency.value = 3000; dur = spb * 2.5; peak = 0.035; }
    else { o.type = "sawtooth"; f.frequency.value = 1100; dur = spb * 0.6; peak = 0.03; }
    o.frequency.value = freq; o.connect(f); f.connect(g); this.out(ctx, g, M.lead === "bell" ? 0.9 : 0.6);
    const atk = M.lead === "flute" ? 0.08 : 0.005;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.1);
  },
  drum(ctx, t, lvl, heavy){
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(heavy ? 90 : 120, t); o.frequency.exponentialRampToValueAtTime(heavy ? 38 : 50, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * lvl, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g); this.out(ctx, g, 0.25); o.start(t); o.stop(t + 0.45);
  },
  hat(ctx, t){ const n = sfxNoise(ctx, 0.06), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "highpass"; f.frequency.value = 7000; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); n.connect(f); f.connect(g); this.out(ctx, g, 0.2); n.start(t); n.stop(t + 0.07); },
  drip(ctx, t){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(1500 + Math.random() * 900, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.08); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); this.out(ctx, g, 1); o.start(t); o.stop(t + 0.2); },
};
// which music fits the moment
function musicMood(){
  const s = S(), c = s.campaign; if (s.view !== "game" || !c) return "menu";
  if (c.combat && c.combat.status === "active") return enemies(c).some(e => e.boss) ? "boss" : "combat";
  if (c.explore) return "dungeon";
  return townOf(c) ? "town" : "wild";
}
store.subs.add(() => { try { Music.set(musicMood()); } catch {} });
setInterval(() => { try { Music.tick(); } catch (e) { console.warn(e); } }, 120);
window.addEventListener("pointerdown", () => { if (Music.vol()) Sfx.init()?.resume?.(); });
</script>
