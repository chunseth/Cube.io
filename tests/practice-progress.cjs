const { test } = require("node:test");
const assert = require("node:assert/strict");
const { practiceSingleRecords } = require("../scripts/load-domain.cjs")(
  "progress",
);
const solve = (id, timeMs, penalty = "none") => ({
  id,
  timeMs,
  penalty,
  scramble: `R U${id === "a" ? "" : "2"} R'`,
  createdAt: 1,
  source: "timer",
});

test("practice records retain each extreme's original solve and scramble", () => {
  const slow = solve("a", 9000);
  const fast = solve("b", 3000);
  const middle = solve("c", 6000);
  const solves = [middle, slow, fast];
  assert.deepEqual(practiceSingleRecords(solves), {
    bestSingle: fast,
    worstSingle: slow,
  });
  assert.deepEqual(solves, [middle, slow, fast]);
});

test("practice records rank adjusted times and treat DNF as worst", () => {
  const plusTwo = solve("a", 3000, "+2");
  const clean = solve("b", 4000);
  assert.deepEqual(practiceSingleRecords([plusTwo, clean]), {
    bestSingle: clean,
    worstSingle: plusTwo,
  });
  const dnf = solve("c", 1000, "DNF");
  assert.deepEqual(practiceSingleRecords([plusTwo, clean, dnf]), {
    bestSingle: clean,
    worstSingle: dnf,
  });
  assert.deepEqual(practiceSingleRecords([dnf]), {
    bestSingle: null,
    worstSingle: dnf,
  });
});

test("practice records handle empty sessions, one solve, and tied display times", () => {
  assert.deepEqual(practiceSingleRecords([]), {
    bestSingle: null,
    worstSingle: null,
  });
  const first = solve("a", 3019);
  assert.deepEqual(practiceSingleRecords([first]), {
    bestSingle: first,
    worstSingle: first,
  });
  const tied = solve("b", 3011);
  assert.deepEqual(practiceSingleRecords([first, tied]), {
    bestSingle: first,
    worstSingle: first,
  });
});
