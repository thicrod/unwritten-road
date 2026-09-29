// Minimal JSON diff/patch used to sync game state between the host and other players.
// ops: {p:[path], v:value} set · {p, d:1} delete · {p, a:[items]} append to array
export function diff(a, b, p = [], ops = []) {
  if (a === b) return ops;
  const ta = kind(a), tb = kind(b);
  if (ta !== tb || ta === "prim") { if (!same(a, b)) ops.push({ p, v: b }); return ops; }
  if (ta === "arr") {
    if (b.length >= a.length && a.every((x, i) => same(x, b[i]))) { if (b.length > a.length) ops.push({ p, a: b.slice(a.length) }); return ops; }
    if (b.length === a.length) { for (let i = 0; i < b.length; i++) diff(a[i], b[i], p.concat(i), ops); return ops; }
    ops.push({ p, v: b }); return ops;
  }
  for (const k of Object.keys(a)) if (!(k in b) || b[k] === undefined) { if (a[k] !== undefined) ops.push({ p: p.concat(k), d: 1 }); }
  for (const k of Object.keys(b)) { if (b[k] === undefined) continue; if (!(k in a)) ops.push({ p: p.concat(k), v: b[k] }); else diff(a[k], b[k], p.concat(k), ops); }
  return ops;
}
export function apply(obj, ops) {
  let root = obj;
  for (const op of ops) {
    if (!op.p.length) { if ("v" in op) root = clone(op.v); continue; }
    let t = root; for (let i = 0; i < op.p.length - 1; i++) { const k = op.p[i]; if (t[k] == null || typeof t[k] !== "object") t[k] = typeof op.p[i + 1] === "number" ? [] : {}; t = t[k]; }
    const last = op.p[op.p.length - 1];
    if (op.d) { if (Array.isArray(t)) t.splice(last, 1); else delete t[last]; }
    else if (op.a) { if (!Array.isArray(t[last])) t[last] = []; t[last].push(...clone(op.a)); }
    else t[last] = clone(op.v);
  }
  return root;
}
const kind = x => Array.isArray(x) ? "arr" : x && typeof x === "object" ? "obj" : "prim";
function same(a, b) { if (a === b) return true; const ta = kind(a), tb = kind(b); if (ta !== tb || ta === "prim") return a === b || (Number.isNaN(a) && Number.isNaN(b));
  if (ta === "arr") return a.length === b.length && a.every((x, i) => same(x, b[i]));
  const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
  return ka.length === kb.length && ka.every(k => same(a[k], b[k])); }
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
