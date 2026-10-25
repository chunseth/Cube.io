const { test } = require("node:test");
const assert = require("node:assert/strict");
const { bestAverageRecord } = require("../scripts/load-domain.cjs")("progress");
const solve = (seconds, index, penalty = "none") => ({
  id: String(index),
  timeMs: seconds * 1000,
  createdAt: index,
  penalty,
  source: "timer",
  scramble: `R U${index % 2 ? "2" : ""} R'`,
});

test("best Mo3 details contain the actual consecutive window in chronological order", () => {
  const input = [20, 4, 5, 6, 30, 2].map((time, i) => solve(time, i)).reverse();
  const original = [...input];
  const record = bestAverageRecord(input, 3);
  assert.equal(record.value, 5000);
  assert.deepEqual(
    record.entries.map((e) => e.solve.id),
    ["1", "2", "3"],
  );
  assert.deepEqual(
    record.entries.map((e) => e.solveNumber),
    [2, 3, 4],
  );
  assert.ok(record.entries.every((e) => !e.excluded));
  assert.equal(record.entries[0].solve, input[4]);
  assert.deepEqual(input, original);
});

test("best Ao5 details retain excluded extremes and select the newest tied window", () => {
  const record = bestAverageRecord(
    [20, 4, 5, 6, 7, 8, 40].map((time, i) => solve(time, i)),
    5,
  );
  assert.equal(record.value, 6000);
  assert.deepEqual(
    record.entries.map((e) => e.solve.id),
    ["1", "2", "3", "4", "5"],
  );
  assert.deepEqual(
    record.entries.filter((e) => e.excluded).map((e) => e.solve.id),
    ["1", "5"],
  );
});

test("average detail exclusions account for +2 and DNF penalties", () => {
  const input = [1, 2, 3, 4, 5].map((time, i) => solve(time, i));
  input[0].penalty = "+2";
  input[4].penalty = "DNF";
  const record = bestAverageRecord(input, 5);
  assert.equal(record.value, 10000 / 3);
  assert.deepEqual(
    record.entries.filter((e) => e.excluded).map((e) => e.solve.id),
    ["1", "4"],
  );
  assert.equal(record.entries[0].solve.penalty, "+2");
  assert.equal(record.entries.at(-1).solve.penalty, "DNF");
});

test("Ao12 and Ao100 details use the same trimming as their displayed records", () => {
  for (const [window, trim] of [
    [12, 1],
    [100, 5],
  ]) {
    const input = Array.from({ length: window + 1 }, (_, i) => solve(i + 1, i));
    const record = bestAverageRecord(input, window);
    assert.equal(record.value, ((window + 1) / 2) * 1000);
    assert.equal(record.entries.length, window);
    assert.equal(record.entries.filter((e) => e.excluded).length, trim * 2);
    assert.ok(record.entries.slice(0, trim).every((e) => e.excluded));
    assert.ok(record.entries.slice(-trim).every((e) => e.excluded));
    assert.equal(bestAverageRecord(input.slice(0, window - 1), window), null);
  }
  assert.equal(bestAverageRecord([], 3), null);
  assert.equal(
    bestAverageRecord(
      [1, 2, 3].map((time, i) => solve(time, i, "DNF")),
      3,
    ).value,
    Infinity,
  );
});
