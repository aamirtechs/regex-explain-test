"use strict";
// Regex Explain Test core logic: pure functions, no DOM, no fetch.
const MAX_LINES = 5000;

const PATTERN_LIBRARY = [
  { name: "Email address", pattern: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", description: "A practical email matcher for log and CSV cleanup.", example: "user@example.com" },
  { name: "SKU code", pattern: "[A-Z]{2,4}-\\d{3,6}", description: "Two to four capital letters, a hyphen, then 3 to 6 digits.", example: "AB-12345" },
  { name: "Invoice number", pattern: "INV-?\\d{4,}", description: "INV, an optional hyphen, then at least 4 digits.", example: "INV-100234" },
  { name: "Log timestamp", pattern: "\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}", description: "ISO style date and time at the start of a log line.", example: "2026-10-23 09:15:00" },
  { name: "USD amount", pattern: "\\$\\d{1,3}(,\\d{3})*(\\.\\d{2})?", description: "A dollar amount with optional thousands commas and cents.", example: "$1,250.00" },
  { name: "IPv4 address", pattern: "\\b\\d{1,3}(\\.\\d{1,3}){3}\\b", description: "Four 1 to 3 digit groups separated by dots.", example: "192.168.0.1" }
];

const ESCAPES = { d: "any digit (0 to 9)", D: "any non-digit", w: "any word character (letter, digit or underscore)", W: "any non-word character", s: "any whitespace character", S: "any non-whitespace character", b: "a word boundary", B: "a non-word boundary", n: "a newline", t: "a tab", ".": "a literal dot", "\\": "a literal backslash", "/": "a forward slash", "(": "a literal open bracket", ")": "a literal close bracket", "[": "a literal open square bracket", "]": "a literal close square bracket", "{": "a literal open brace", "}": "a literal close brace", "*": "a literal star", "+": "a literal plus", "?": "a literal question mark", "|": "a literal pipe", "^": "a literal caret", "$": "a literal dollar sign", "-": "a literal hyphen" };

function quantifierText(q) {
  if (q === "*") return "zero or more times";
  if (q === "+") return "one or more times";
  if (q === "?") return "zero or one time (optional)";
  const m = q.match(/^\{(\d*)(?:,(\d*))?\}$/);
  if (m) {
    if (m[0].includes(",")) {
      if (m[1] && m[2]) return "between " + m[1] + " and " + m[2] + " times";
      if (m[1]) return "at least " + m[1] + " times";
      return "up to " + m[2] + " times";
    }
    return "exactly " + m[1] + " times";
  }
  return q;
}

function explainRegex(pattern) {
  const p = String(pattern || "");
  const segments = [];
  let i = 0;
  function readQuantifier() {
    if (i >= p.length) return null;
    const c = p[i];
    if (c === "*" || c === "+" || c === "?") { i++; let q = c; if (p[i] === "?") { i++; } return q; }
    if (c === "{") { const end = p.indexOf("}", i); if (end > i) { const q = p.slice(i, end + 1); if (/^\{\d*(,\d*)?\}$/.test(q)) { i = end + 1; if (p[i] === "?") i++; return q; } } }
    return null;
  }
  function pushWithQuant(token, explanation) {
    const q = readQuantifier();
    if (q) explanation += ", repeated " + quantifierText(q);
    segments.push({ token, explanation });
  }
  while (i < p.length) {
    const c = p[i];
    if (c === "\\") {
      const n = p[i + 1];
      if (n == null) { segments.push({ token: "\\", explanation: "a trailing backslash (incomplete escape)" }); i++; continue; }
      if (/[1-9]/.test(n)) { const tok = "\\" + n; i += 2; pushWithQuant(tok, "a backreference to group " + n); continue; }
      const tok = "\\" + n; i += 2;
      pushWithQuant(tok, ESCAPES[n] ? ESCAPES[n] : "the literal character " + n);
      continue;
    }
    if (c === "[") {
      let j = i + 1; let neg = false;
      if (p[j] === "^") { neg = true; j++; }
      if (p[j] === "]") j++;
      while (j < p.length && p[j] !== "]") { if (p[j] === "\\") j++; j++; }
      const tok = p.slice(i, Math.min(j + 1, p.length));
      const inner = tok.replace(/^\[\^?/, "").replace(/\]$/, "");
      i = Math.min(j + 1, p.length);
      pushWithQuant(tok, (neg ? "any character NOT in the set [" : "any one character in the set [") + inner + "]");
      continue;
    }
    if (c === "(") {
      let tok = "(", expl = "start of a capturing group";
      if (p.startsWith("(?:", i)) { tok = "(?:"; expl = "start of a non-capturing group"; i += 3; }
      else if (p.startsWith("(?=", i)) { tok = "(?="; expl = "start of a positive lookahead (must follow, not consumed)"; i += 3; }
      else if (p.startsWith("(?!", i)) { tok = "(?!"; expl = "start of a negative lookahead (must not follow)"; i += 3; }
      else if (p.startsWith("(?<=", i)) { tok = "(?<="; expl = "start of a positive lookbehind"; i += 4; }
      else if (p.startsWith("(?<!", i)) { tok = "(?<!"; expl = "start of a negative lookbehind"; i += 4; }
      else if (p.startsWith("(?<", i)) { const end = p.indexOf(">", i); if (end > i) { tok = p.slice(i, end + 1); expl = "start of a named group called " + p.slice(i + 3, end); i = end + 1; } else i++; }
      else i++;
      segments.push({ token: tok, explanation: expl });
      continue;
    }
    if (c === ")") { i++; segments.push({ token: ")", explanation: "end of the group" }); continue; }
    if (c === "|") { i++; segments.push({ token: "|", explanation: "OR: match the left side or the right side" }); continue; }
    if (c === "^") { i++; segments.push({ token: "^", explanation: "the start of the line or string (anchor)" }); continue; }
    if (c === "$") { i++; segments.push({ token: "$", explanation: "the end of the line or string (anchor)" }); continue; }
    if (c === ".") { i++; pushWithQuant(".", "any single character except a newline"); continue; }
    if (c === "*" || c === "+" || c === "?") { i++; segments.push({ token: c, explanation: "quantifier: " + quantifierText(c) + " (no preceding token in this position)" }); continue; }
    i++; pushWithQuant(c, "the literal character " + (c === " " ? "space" : c));
  }
  return segments;
}

function compileRegex(pattern, flags) {
  try { return { regex: new RegExp(pattern, flags || ""), error: null }; }
  catch (e) { return { regex: null, error: String(e.message || e) }; }
}

function testLines(pattern, flags, text) {
  const compiled = compileRegex(pattern, flags);
  if (!compiled.regex) return { error: compiled.error, results: [], truncated: false };
  const all = String(text || "").split(/\r?\n/);
  const truncated = all.length > MAX_LINES;
  const lines = all.slice(0, MAX_LINES);
  const results = lines.map((line, idx) => {
    const re = new RegExp(compiled.regex.source, compiled.regex.flags.includes("g") ? compiled.regex.flags : compiled.regex.flags + "g");
    const matches = [];
    let m; let guard = 0;
    try {
      while ((m = re.exec(line)) !== null && guard < 100) {
        matches.push({ match: m[0], index: m.index, groups: m.groups ? Object.assign({}, m.groups) : {}, captures: m.slice(1) });
        if (m[0] === "") re.lastIndex++;
        guard++;
      }
    } catch (e) { /* guarded per line */ }
    return { lineNumber: idx + 1, line, matched: matches.length > 0, matches };
  });
  return { error: null, results, truncated };
}

function extractNamedGroups(pattern, flags, text) {
  const out = testLines(pattern, flags, text);
  if (out.error) return { error: out.error, rows: [] };
  const rows = [];
  out.results.forEach((r) => { r.matches.forEach((mm) => { if (Object.keys(mm.groups).length) rows.push(Object.assign({ lineNumber: r.lineNumber, match: mm.match }, mm.groups)); }); });
  return { error: null, rows };
}

function splitMatchedUnmatched(results) {
  const matched = [], unmatched = [];
  (results || []).forEach((r) => { (r.matched ? matched : unmatched).push(r); });
  return { matched, unmatched };
}

function resultsToCSV(results) {
  const esc = (v) => { const t = String(v == null ? "" : v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const lines = ["lineNumber,matched,firstMatch,line"];
  (results || []).forEach((r) => { lines.push([r.lineNumber, r.matched ? "yes" : "no", esc(r.matches && r.matches[0] ? r.matches[0].match : ""), esc(r.line)].join(",")); });
  return lines.join("\n") + "\n";
}

function namedGroupsToCSV(rows) {
  if (!rows || !rows.length) return "lineNumber,match\n";
  const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set(["lineNumber", "match"])));
  const esc = (v) => { const t = String(v == null ? "" : v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  return [cols.join(",")].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(","))).join("\n") + "\n";
}

const api = { MAX_LINES, PATTERN_LIBRARY, explainRegex, compileRegex, testLines, extractNamedGroups, splitMatchedUnmatched, resultsToCSV, namedGroupsToCSV };
if (typeof module !== "undefined" && module.exports) { module.exports = api; }
if (typeof window !== "undefined") { window.RegexExplainTest = api; }
