"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/logic.js");

test("explains digit quantifier and anchors in plain English", () => {
  const segs = L.explainRegex("^\\d{3}$");
  const text = segs.map((s) => s.explanation).join(" | ");
  assert.match(text, /start of the line/);
  assert.match(text, /digit/);
  assert.match(text, /exactly 3 times/);
  assert.match(text, /end of the line/);
});

test("explains character class and alternation and group", () => {
  const segs = L.explainRegex("(cat|dog)[A-Z]+");
  const text = segs.map((s) => s.token + "=" + s.explanation).join(" | ");
  assert.match(text, /capturing group/);
  assert.match(text, /OR/);
  assert.match(text, /character in the set/);
  assert.match(text, /one or more times/);
});

test("explains escapes, optional and named groups", () => {
  const segs = L.explainRegex("(?<year>\\d{4})-\\w+\\.?");
  const text = segs.map((s) => s.explanation).join(" | ");
  assert.match(text, /named group called year/);
  assert.match(text, /word character/);
  assert.match(text, /literal dot/);
});

test("bulk per-line matching with pass and fail split", () => {
  const out = L.testLines("^\\d+$", "", "123\nabc\n456");
  assert.equal(out.error, null);
  assert.deepEqual(out.results.map((r) => r.matched), [true, false, true]);
  const split = L.splitMatchedUnmatched(out.results);
  assert.equal(split.matched.length, 2);
  assert.equal(split.unmatched.length, 1);
});

test("invalid pattern reports an error instead of throwing", () => {
  const out = L.testLines("(", "", "anything");
  assert.ok(out.error);
  assert.equal(out.results.length, 0);
});

test("flags are honoured and captures are returned", () => {
  const out = L.testLines("error", "i", "All good\nAn ERROR happened");
  assert.equal(out.results[1].matched, true);
  const caps = L.testLines("(\\d+)-(\\d+)", "", "range 10-20 end");
  assert.deepEqual(caps.results[0].matches[0].captures, ["10", "20"]);
});

test("named group extraction builds rows", () => {
  const out = L.extractNamedGroups("(?<user>\\w+)@(?<domain>[\\w.]+)", "", "mail ana@example.com now");
  assert.equal(out.rows.length, 1);
  assert.equal(out.rows[0].user, "ana");
  assert.equal(out.rows[0].domain, "example.com");
  const csv = L.namedGroupsToCSV(out.rows);
  assert.match(csv, /user/);
});

test("pattern library entries all compile and match their example", () => {
  assert.ok(L.PATTERN_LIBRARY.length >= 5);
  for (const entry of L.PATTERN_LIBRARY) {
    const out = L.testLines(entry.pattern, "", entry.example);
    assert.equal(out.error, null, entry.name);
    assert.equal(out.results[0].matched, true, entry.name);
  }
});

test("line limit truncates long input", () => {
  const many = Array.from({ length: L.MAX_LINES + 10 }, () => "x").join("\n");
  const out = L.testLines("x", "", many);
  assert.equal(out.truncated, true);
  assert.equal(out.results.length, L.MAX_LINES);
});

test("results CSV export shape", () => {
  const out = L.testLines("a+", "", "aaa\nbbb");
  const csv = L.resultsToCSV(out.results);
  assert.match(csv, /lineNumber,matched,firstMatch,line/);
  assert.match(csv, /1,yes,aaa/);
});
