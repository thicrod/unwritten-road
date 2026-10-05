<script>
"use strict";
// =====================================================================
//  REPORT A PROBLEM · DM CHECK-UP (a real test of the AI Dungeon Master)
// =====================================================================
function gameSummary(c){
  if (!c) return null; const main = c.characters?.[c.activeCharId];
  return { campaign: c.name, day: c.time?.day, location: c.locations?.[c.currentLocationId]?.name, act: c.story?.act, combat: !!c.combat, mode: c.premise?.mode,
    party: partyMembers(c).map(m => `${m.name} L${m.level} ${m.cls}${m.companion ? (m.companion.player ? " (player)" : " (AI)") : ""}`),
    hero: main ? `${main.name} L${main.level} ${main.race} ${main.cls}` : null, online: !!window.Net?.isOnline(),
    settings: { tier: S().settings.tier, story: S().settings.dmLanguage, ui: S().settings.uiLang, length: S().settings.narration } };
}
async function sendReport(body){
  if (window.__WEB__){
    const r = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Couldn't send the report."); return j.id;
  }
  await navigator.clipboard.writeText(JSON.stringify(body, null, 2)); return null;      // claude.ai version: no server, so copy it
}
function ReportModal({ m }){
  const [note, setNote] = useState(""); const [inc, setInc] = useState(true); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null);
  const submit = async () => { setBusy(true); try {
      const id = await sendReport({ kind: m.entry ? "dm-reply" : "report", note: note.trim(), summary: inc ? gameSummary(C()) : null, lastDM: inc ? (m.entry ? { ...(window.__lastDM || {}), raw: (window.__lastDM?.raw || m.entry) } : window.__lastDM || null) : null });
      setDone(id == null ? "copied" : id);
    } catch (e) { toast(e.message || "Couldn't send the report.", "bad"); } setBusy(false); };
  return html`<${Modal} title="Report a problem" onClose=${closeModal} foot=${done ? html`<button className="btn primary" onClick=${closeModal}>Done</button>` : html`<button className="btn ghost" onClick=${closeModal}>Cancel</button><button className="btn primary" disabled=${busy || !note.trim()} onClick=${submit}>${window.__WEB__ ? "Send report" : "Copy report"}</button>`}>
    ${done ? html`<p>${done === "copied" ? "The report is copied: paste it into your chat with Claude." : html`Thanks! Report <b>#${done}</b> is saved on the server. Whoever runs the site can read it in the server logs or at <code>/api/reports</code>.`}</p>`
      : html`<p className="faint" style=${{marginTop:0}}>What went wrong? For example: "the DM repeated itself", "the story ignored my action", "a button did nothing".</p>
        <textarea className="input" rows="4" value=${note} onInput=${e => setNote(e.target.value)} placeholder="Describe what happened…" style=${{width:"100%"}}></textarea>
        <label className="row" style=${{gap:6, marginTop:8, fontSize:13.5}}><input type="checkbox" checked=${inc} onChange=${e => setInc(e.target.checked)}/> Include the last DM reply and game details (helps fix it)</label>`}
  <//>`;
}
// ---------- DM check-up: real requests through the real prompt, graded ----------
const TONES = ["accept", "refuse", "ask", "skill", "wild"];
async function runCheckup(onUpdate){
  const c = C(); const out = []; const comps = companionsOf(c).filter(m => !m.companion?.player).length;
  const tests = [
    { name: "Talking to someone", text: "I walk up to the nearest local and ask if they have any work for us.", dialogue: true },
    { name: "Exploring", text: "I look around carefully for anything unusual.", dialogue: false },
  ];
  for (const t of tests){
    const row = { name: t.name, checks: [], ms: 0 }; out.push(row); onUpdate([...out]);
    const t0 = performance.now(); let text = "", err = null;
    try { const r = await askClaude(buildDMPrompt(c, "action", { text: t.text, mode: "do" }), {}); text = r?.text || ""; } catch (e) { err = e; }
    row.ms = Math.round(performance.now() - t0);
    const add = (label, pass, note) => row.checks.push({ label, pass, note });
    if (err){ add("The AI answered", false, err.message || err.code || "request failed"); onUpdate([...out]); continue; }
    const p = parseDM(text); const st = p.state || {};
    add("The AI answered", !!text, `${row.ms} ms`);
    add("Story text", (p.narration || "").length > 60, `${(p.narration || "").length} characters`);
    add("Game state block", !!p.ok, p.ok ? "parsed" : "missing or broken");
    if (t.dialogue){
      const ch = Array.isArray(st.choices) ? st.choices : [];
      add("Dialogue choices", ch.length >= 3, `${ch.length} offered`);
      const tones = new Set(ch.map(x => x?.tone).filter(x => TONES.includes(x)));
      add("Choice variety (accept / refuse / ask / skill / wild)", tones.size >= 3, tones.size ? [...tones].join(", ") : "no tones");
    }
    if (comps) add("Teammates speak (party_talk)", Array.isArray(st.party_talk) && st.party_talk.length > 0, Array.isArray(st.party_talk) ? `${st.party_talk.length} line(s)` : "none");
    add("Response time", row.ms < 25000, row.ms < 8000 ? "fast" : row.ms < 25000 ? "ok" : "slow");
    row.raw = text.slice(0, 6000); onUpdate([...out]);
  }
  return out;
}
function CheckupModal(){
  const [res, setRes] = useState([]); const [running, setRunning] = useState(false); const [sent, setSent] = useState(null);
  const go = async () => { setRunning(true); setSent(null); setRes([]); try { await runCheckup(setRes); } catch (e) { toast(String(e?.message || e), "bad"); } setRunning(false); };
  useEffect(() => { go(); }, []);
  const all = res.flatMap(r => r.checks), fails = all.filter(x => !x.pass).length;
  const send = async () => { try { const id = await sendReport({ kind: "checkup", note: fails ? `DM check-up: ${fails} check(s) failed` : "DM check-up: all passed", summary: gameSummary(C()), checkup: res.map(r => ({ name: r.name, ms: r.ms, checks: r.checks, raw: r.raw })) }); setSent(id ?? "copied"); } catch (e) { toast(e.message, "bad"); } };
  return html`<${Modal} title="DM check-up" onClose=${closeModal} wide=${true} foot=${html`<button className="btn ghost" disabled=${running} onClick=${go}>Run again</button><button className="btn" disabled=${running || !res.length} onClick=${send}>${sent ? (sent === "copied" ? "Copied ✓" : `Sent #${sent} ✓`) : window.__WEB__ ? "Send results" : "Copy results"}</button><button className="btn primary" onClick=${closeModal}>Close</button>`}>
    <p className="faint" style=${{marginTop:0}}>Two real requests to your AI Dungeon Master, using the same instructions as real play, then a check of what came back. Nothing changes in your campaign.</p>
    ${res.map(r => html`<div key=${r.name} className="checkup"><h3 className="panel-title">${r.name}${r.ms ? html` <span className="chip">${(r.ms / 1000).toFixed(1)} s</span>` : ""}</h3>
      ${r.checks.length ? r.checks.map((x, i) => html`<div key=${i} className=${"ck-row " + (x.pass ? "ok" : "bad")}><span>${x.pass ? "✓" : "✗"}</span><b>${x.label}</b><span className="faint">${x.note || ""}</span></div>`) : html`<div className="faint">Waiting for the Dungeon Master…</div>`}</div>`)}
    ${!running && res.length > 0 && html`<p className=${fails ? "recap-act" : "recap-act"}>${fails ? `${fails} check${fails > 1 ? "s" : ""} failed. The game still works (it falls back where it can), but sending these results helps tune the AI's instructions.` : "Everything passed: your Dungeon Master follows the game's format."}</p>`}
  <//>`;
}
</script>
