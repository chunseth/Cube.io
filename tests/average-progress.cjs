const { test } = require("node:test");
const assert = require("node:assert/strict");
const { rollingAverageSeries, solveAxisTicks } =
  require("../scripts/load-domain.cjs")("progress");

test("solve-axis labels use round intervals and adapt to available space", () => {
  assert.deepEqual(solveAxisTicks(5, 250), [5]);
  assert.deepEqual(solveAxisTicks(0, 250), [5]);
  assert.deepEqual(solveAxisTicks(30, 500), [5, 10, 15, 20, 25, 30]);
  assert.deepEqual(solveAxisTicks(503, 250), [5, 100, 200, 300, 400, 503]);
  assert.deepEqual(solveAxisTicks(503, 120), [5, 250, 503]);
  assert.ok(solveAxisTicks(500, 900).length > solveAxisTicks(500, 250).length);
});

test("dense solve-axis labels stay separated and preserve both endpoints", () => {
  for (const count of [6, 49, 51, 140, 503, 1000, 10000]) {
    for (const width of [180, 300, 900]) {
      const ticks = solveAxisTicks(count, width);
      const gap = Math.max(44, String(count).length * 7 + 20);
      assert.equal(ticks[0], 5);
      assert.equal(ticks.at(-1), count);
      for (let i = 1; i < ticks.length; i++) {
        assert.ok(((ticks[i] - ticks[i - 1]) / (count - 5)) * width >= gap);
      }
      assert.ok(ticks.slice(1, -1).every((tick) => tick % 5 === 0));
    }
  }
});
const solves = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i),
    createdAt: i,
    timeMs: (i + 1) * 1000,
    penalty: "none",
    source: "timer",
    scramble: "R U R'",
  })).reverse();

test("rolling averages share chronological solve numbers across window sizes", () => {
  const input = solves(101);
  const original = [...input];
  for (const window of [5, 12, 100]) {
    const series = rollingAverageSeries(input, window);
    assert.equal(series[0].solveNumber, window);
    assert.equal(series.at(-1).solveNumber, 101);
    assert.equal(series[0].timeMs, ((window + 1) / 2) * 1000);
    assert.equal(series.at(-1).timeMs, ((203 - window) / 2) * 1000);
  }
  assert.deepEqual(input, original);
  assert.deepEqual(rollingAverageSeries(solves(4), 5), []);
});

test("DNF windows leave gaps without moving later averages on the solve axis", () => {
  const input = solves(8);
  input.find((s) => s.createdAt === 0).penalty = "DNF";
  input.find((s) => s.createdAt === 1).penalty = "DNF";
  input.find((s) => s.createdAt === 7).penalty = "+2";
  const series = rollingAverageSeries(input, 5);
  assert.deepEqual(
    series.map((p) => p.solveNumber),
    [5, 6, 7, 8],
  );
  assert.equal(series[0].timeMs, null);
  assert.equal(series[1].timeMs, 5000);
  assert.equal(series[3].timeMs, 6000);
});
