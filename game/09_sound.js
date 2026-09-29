<script>
"use strict";
// ======================= SOUND (synthesized, no assets) =======================
const Sfx = {
  ctx: null, master: null, last: {},
  vol(){ const v = S().settings.sfx; return v == null ? 0.5 : v; },
  init(){
    if (this.ctx) return this.ctx;
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); } catch { this.ctx = null; }
    return this.ctx;
  },
  play(name, opt={}){
    const v = this.vol(); if (!v) return; const ctx = this.init(); if (!ctx || !SFX[name]) return;
    const now = performance.now(); if (this.last[name] && now - this.last[name] < (opt.gap ?? 45)) return; this.last[name] = now;
    try { if (ctx.state === "suspended") ctx.resume(); this.master.gain.value = v * 0.7; SFX[name](ctx, this.master, opt); } catch {}
  }
};
// unlock audio on the first user gesture (browsers block it until then)
window.addEventListener("pointerdown", () => { if (Sfx.vol()) Sfx.init()?.resume?.(); }, { once: true });
function sfxNoise(ctx, dur){ const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate); const d = b.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1; const s = ctx.createBufferSource(); s.buffer = b; return s; }
function sfxEnv(ctx, out, t, a, peak, dec){ const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); g.connect(out); return g; }
function sfxTone(ctx, out, type, f0, f1, t, dur, peak=0.3){ const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = sfxEnv(ctx, out, t, 0.008, peak, dur); o.connect(g); o.start(t); o.stop(t + dur + 0.05); }
function sfxHiss(ctx, out, t, dur, freq, q, peak=0.3, sweep){ const n = sfxNoise(ctx, dur + 0.05); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur); f.Q.value = q; const g = sfxEnv(ctx, out, t, 0.01, peak, dur); n.connect(f); f.connect(g); n.start(t); n.stop(t + dur + 0.05); }
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const SFX = {
  dice(ctx, out){ const t = ctx.currentTime; for (let i=0;i<7;i++){ const tt = t + i*0.055 + Math.random()*0.03; sfxHiss(ctx, out, tt, 0.035, 2200 + Math.random()*1800, 3, 0.35 - i*0.03); sfxTone(ctx, out, "triangle", 900 + Math.random()*700, 700, tt, 0.03, 0.05); } },
  success(ctx, out){ const t = ctx.currentTime; [72, 76, 79].forEach((n,i) => sfxTone(ctx, out, "triangle", NOTE(n), NOTE(n), t + i*0.07, 0.35, 0.16)); },
  fail(ctx, out){ const t = ctx.currentTime; sfxTone(ctx, out, "sawtooth", 180, 110, t, 0.35, 0.08); sfxTone(ctx, out, "sine", 150, 90, t + 0.05, 0.35, 0.12); },
  hit(ctx, out, o){ const t = ctx.currentTime; sfxTone(ctx, out, "sine", 140, 45, t, 0.18, 0.5); sfxHiss(ctx, out, t, 0.09, 900, 1.2, 0.3); if (o.dt === "fire") sfxHiss(ctx, out, t + 0.02, 0.35, 1600, 0.6, 0.18, 500); if (o.dt === "cold") sfxTone(ctx, out, "triangle", 1800, 2400, t, 0.25, 0.06); if (o.dt === "lightning") sfxHiss(ctx, out, t, 0.2, 4000, 0.5, 0.25, 900); },
  crit(ctx, out){ const t = ctx.currentTime; sfxTone(ctx, out, "sine", 160, 40, t, 0.3, 0.6); sfxHiss(ctx, out, t, 0.15, 700, 1, 0.4); sfxTone(ctx, out, "triangle", 1320, 1250, t + 0.02, 0.4, 0.12); sfxTone(ctx, out, "triangle", 1980, 1900, t + 0.05, 0.35, 0.07); },
  miss(ctx, out){ const t = ctx.currentTime; sfxHiss(ctx, out, t, 0.22, 600, 1.5, 0.22, 2400); },
  swing(ctx, out){ const t = ctx.currentTime; sfxHiss(ctx, out, t, 0.12, 900, 2, 0.12, 2600); },
  bolt(ctx, out){ const t = ctx.currentTime; sfxHiss(ctx, out, t, 0.18, 3000, 4, 0.12, 1200); },
  spell(ctx, out, o){ const t = ctx.currentTime; const base = o.dt === "fire" ? 220 : o.dt === "cold" ? 660 : o.dt === "necrotic" ? 150 : o.dt === "radiant" ? 523 : 392;
    sfxTone(ctx, out, "triangle", base, base*2, t, 0.35, 0.12); sfxTone(ctx, out, "sine", base*1.5, base*3.01, t + 0.03, 0.35, 0.08); sfxHiss(ctx, out, t, 0.3, 2500, 2, 0.08, 6000); },
  heal(ctx, out){ const t = ctx.currentTime; [67, 71, 74, 79].forEach((n,i) => sfxTone(ctx, out, "sine", NOTE(n), NOTE(n), t + i*0.06, 0.45, 0.12)); },
  buff(ctx, out){ const t = ctx.currentTime; sfxTone(ctx, out, "triangle", NOTE(76), NOTE(83), t, 0.3, 0.08); },
  down(ctx, out){ const t = ctx.currentTime; sfxTone(ctx, out, "sawtooth", 260, 60, t, 0.5, 0.1); sfxTone(ctx, out, "sine", 120, 40, t, 0.4, 0.4); },
  victory(ctx, out){ const t = ctx.currentTime; [[60,0],[64,.12],[67,.24],[72,.36],[67,.52],[72,.64]].forEach(([n,d]) => { sfxTone(ctx, out, "square", NOTE(n), NOTE(n), t + d, 0.22, 0.05); sfxTone(ctx, out, "triangle", NOTE(n-12), NOTE(n-12), t + d, 0.25, 0.1); }); },
  defeat(ctx, out){ const t = ctx.currentTime; [[57,0],[53,.35],[50,.7]].forEach(([n,d]) => sfxTone(ctx, out, "triangle", NOTE(n), NOTE(n) * 0.98, t + d, 0.6, 0.14)); },
  levelup(ctx, out){ const t = ctx.currentTime; [60,64,67,72,76,79,84].forEach((n,i) => sfxTone(ctx, out, "triangle", NOTE(n), NOTE(n), t + i*0.07, 0.4, 0.1)); },
  coin(ctx, out){ const t = ctx.currentTime; sfxTone(ctx, out, "square", 1568, 1568, t, 0.08, 0.05); sfxTone(ctx, out, "square", 2093, 2093, t + 0.07, 0.25, 0.05); },
  quest(ctx, out){ const t = ctx.currentTime; [69, 74, 78].forEach((n,i) => sfxTone(ctx, out, "triangle", NOTE(n), NOTE(n), t + i*0.1, 0.5, 0.1)); },
  alert(ctx, out){ const t = ctx.currentTime; sfxTone(ctx, out, "sawtooth", 330, 330, t, 0.12, 0.1); sfxTone(ctx, out, "sawtooth", 311, 311, t + 0.13, 0.25, 0.1); },
  step(ctx, out){ const t = ctx.currentTime; sfxHiss(ctx, out, t, 0.05, 300, 1, 0.12); },
  door(ctx, out){ const t = ctx.currentTime; sfxTone(ctx, out, "sawtooth", 90, 70, t, 0.35, 0.06); sfxHiss(ctx, out, t, 0.3, 400, 3, 0.1); }
};
</script>
