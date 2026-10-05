<script>
"use strict";
// =====================================================================
//  DM VOICE: plays the narration clip the server generated (shared by everyone in a co-op room),
//  or the browser's built-in voice as a fallback. Each player's on/off choice stays in their browser.
// =====================================================================
const DMVoice = {
  audio: null, lastId: null, lastAt: 0, mode: null,
  serverVoice: () => !!(window.__WEB__ && window.__UR_CONFIG?.voice),
  enabled(){ try { const v = localStorage.getItem("ur:voice"); return v ? v === "on" : this.serverVoice(); } catch { return false; } },
  setEnabled(on){ try { localStorage.setItem("ur:voice", on ? "on" : "off"); } catch {} if (on) this.unlock(); else this.stop(); store.set({ voiceTick: Date.now() }); },
  el(){ if (!this.audio){ this.audio = new Audio(); this.audio.preload = "auto"; this.audio.onended = () => this.idle(); } return this.audio; },
  // phones only allow audio after a tap: play a silent clip on the first one so later narration can start by itself
  unlock(){ if (this.unlocked) return; this.unlocked = true; try { const a = this.el(); a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="; const p = a.play(); if (p) p.then(() => a.pause()).catch(() => {}); } catch {} },
  idle(){ this.mode = null; store.set({ voicePlaying: null }); },
  stop(){ try { if (this.audio){ this.audio.pause(); this.audio.removeAttribute("src"); } } catch {} try { window.speechSynthesis?.cancel(); } catch {} if (this.mode) this.idle(); },
  // from the DM stream: when we're in a room the server already pushed this clip to everyone's socket
  fromServer(v){ if (v?.roomed && window.Net?.isOnline()) return; this.play(v); },
  play(v){
    if (!v || !this.enabled()) return;
    if (v.id && v.id === this.lastId && Date.now() - this.lastAt < 5000) return;   // same clip twice in a row
    this.stop(); this.lastId = v.id || null; this.lastAt = Date.now();
    if (v.id && !v.fallback){
      const a = this.el(); this.mode = "elevenlabs"; store.set({ voicePlaying: "elevenlabs" });
      a.onerror = () => { if (this.mode === "elevenlabs") this.speak(v.text); };
      a.src = "/api/tts/" + encodeURIComponent(v.id);
      const p = a.play(); if (p) p.catch(err => { if (err?.name !== "AbortError" && this.mode === "elevenlabs") this.speak(v.text); });
    } else this.speak(v.text);
  },
  speak(text){
    const ss = window.speechSynthesis; if (!text || !ss || typeof SpeechSynthesisUtterance === "undefined") return this.idle();
    try {
      ss.cancel(); const lang = { pt: "pt-BR", es: "es-ES" }[S().settings.dmLanguage] || "en-US";
      const u = new SpeechSynthesisUtterance(text); u.lang = lang;
      const vs = ss.getVoices(); const m = vs.find(x => x.lang === lang) || vs.find(x => (x.lang || "").startsWith(lang.slice(0, 2))); if (m) u.voice = m;
      u.onend = u.onerror = () => { if (this.mode === "browser") this.idle(); };
      this.mode = "browser"; store.set({ voicePlaying: "browser" }); ss.speak(u);
    } catch (e) { console.warn("browser voice failed", e); this.idle(); }
  },
  // claude.ai version (no server): read narration with the browser voice, stripped of formatting
  local(text){ if (!this.enabled()) return; this.stop(); this.speak(String(text).replace(/\*\*|__|\*|_|`|#+\s?/g, "").replace(/\p{Extended_Pictographic}|\uFE0F/gu, "").replace(/\s+/g, " ").trim()); },
};
window.DMVoice = DMVoice;
document.addEventListener("pointerdown", () => { if (DMVoice.enabled()) DMVoice.unlock(); }, { once: true, capture: true });
store.subs.add(() => { if (S().view !== "game" && DMVoice.mode) DMVoice.stop(); });
function VoiceRow(){
  useStore(); const on = DMVoice.enabled(), server = DMVoice.serverVoice();
  return html`<div className="set-row"><div><div className="sl">DM Voice</div><div className="faint" style=${{fontSize:12.5}}>The Dungeon Master reads the story aloud. ${server ? "Everyone in a co-op room hears the same narration; this switch only affects this device." : "Uses your browser's built-in voice."}${server ? html`<br/><span className="el-credit">Voice by ElevenLabs</span>` : null}</div></div>
    <label className="switch"><input type="checkbox" checked=${on} onChange=${e => DMVoice.setEnabled(e.target.checked)}/><span></span></label></div>`;
}
function VoiceChip(){
  const s = useStore(); if (!s.voicePlaying) return null;
  return html`<div className="voice-chip" role="status">🔊 ${s.voicePlaying === "elevenlabs" ? html`<span>Voice by ElevenLabs</span>` : html`<span>Narrating</span>`}<button onClick=${() => DMVoice.stop()} aria-label="Stop narration">■</button></div>`;
}
</script>
<script>
"use strict";
// ---------- speak your actions: the browser's speech recognition fills the action box ----------
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
function MicButton({ disabled, onText }){
  const [on, setOn] = useState(false); const rec = useRef(null);
  useEffect(() => () => { try { rec.current?.abort(); } catch {} }, []);
  if (!SpeechRec) return null;
  const toggle = () => {
    if (on){ try { rec.current?.stop(); } catch {} return; }
    try {
      DMVoice.stop();                                       // don't let the mic hear the narrator
      const r = new SpeechRec(); r.lang = { pt: "pt-BR", es: "es-ES" }[S().settings.dmLanguage] || "en-US"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      r.onresult = (e) => { let t = ""; for (const res of e.results) t += res[0].transcript; const fin = e.results[e.results.length - 1]?.isFinal; onText(t.trim(), !!fin); };
      r.onerror = (e) => { setOn(false); if (e.error === "not-allowed" || e.error === "service-not-allowed") toast("Microphone blocked: allow it for this site to speak your actions.", "bad"); else if (e.error !== "aborted" && e.error !== "no-speech") toast("Couldn't hear that. Try again?", "bad"); };
      r.onend = () => setOn(false); rec.current = r; r.start(); setOn(true);
    } catch (e) { setOn(false); toast("Voice input isn't available in this browser.", "bad"); }
  };
  return html`<button className=${"btn ghost mic" + (on ? " on" : "")} disabled=${disabled && !on} onClick=${toggle} aria-pressed=${on} aria-label=${on ? "Stop listening" : "Speak your action"} title=${on ? "Listening… tap to stop" : "Speak your action"}>${on ? "●" : "🎤"}</button>`;
}
</script>
