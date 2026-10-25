const { test } = require("node:test");
const assert = require("node:assert/strict");
const { selectSolves, moveSolve, solveTitle } =
  require("../scripts/load-domain.cjs")("solveList");
const solve = (id, timeMs, createdAt, penalty = "none", comment = "") => ({
  id,
  timeMs,
  createdAt,
  penalty,
  comment,
  scramble: "R U R'",
  source: "timer",
});
const a = solve("a", 10000, 1, "+2", "Good cross");
const b = solve("b", 11000, 3);
const c = solve("c", 9000, 2, "DNF");
const options = {
  query: "",
  sort: "date",
  direction: "descending",
  hasPenalty: false,
  hasComment: false,
};
test("session defaults to newest first and supports date ascending", () => {
  assert.deepEqual(
    selectSolves([a, b, c], options).map((s) => s.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    selectSolves([a, b, c], { ...options, direction: "ascending" }).map(
      (s) => s.id,
    ),
    ["a", "c", "b"],
  );
});
test("solve-time sorting includes penalties and DNF in both directions", () => {
  assert.deepEqual(
    selectSolves([a, b, c], {
      ...options,
      sort: "time",
      direction: "ascending",
    }).map((s) => s.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    selectSolves([a, b, c], { ...options, sort: "time" }).map((s) => s.id),
    ["c", "a", "b"],
  );
  assert.equal(solveTitle(a), "12.00 +2");
  assert.equal(solveTitle({ ...a, penalty: "DNF" }), "DNF");
  assert.equal(solveTitle({ ...a, penalty: "none" }), "10.00");
});
test("search and independent penalty/comment filters combine", () => {
  assert.deepEqual(
    selectSolves([a, b, c], { ...options, hasPenalty: true }).map((s) => s.id),
    ["c", "a"],
  );
  assert.deepEqual(
    selectSolves([a, b, c], {
      ...options,
      hasComment: true,
      hasPenalty: true,
      query: "CROSS",
    }).map((s) => s.id),
    ["a"],
  );
  assert.equal(
    selectSolves([a, b, c], { ...options, query: "unmatched" }).length,
    0,
  );
  assert.equal(
    selectSolves([solve("blank", 1, 1, "none", "   ")], {
      ...options,
      hasComment: true,
    }).length,
    0,
  );
});
test("moving preserves solve fields and chronological order without duplication", () => {
  const store = {
    sessions: [
      { id: "source", solves: [a] },
      { id: "target", solves: [b, c] },
    ],
  };
  const moved = moveSolve(store, "a", "target");
  assert.equal(moved.sessions[0].solves.length, 0);
  assert.deepEqual(moved.sessions[1].solves, [b, c, a]);
  assert.equal(moved.sessions[1].solves[2].comment, "Good cross");
  assert.equal(store.sessions[0].solves.length, 1);
  assert.equal(moveSolve(store, "a", "missing"), store);
  assert.equal(moveSolve(store, "a", "source"), store);
});
