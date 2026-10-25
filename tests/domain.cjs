const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  average,
  best,
  bestPossibleAo5,
  ao5Summary,
  formatTime,
  formatAverage,
  parseTime,
  resultMs,
} = require("../.test-build/domain/statistics");
const {
  inspectionPenalty,
  HOLD_MS,
} = require("../.test-build/domain/timer/engine");
const {
  evaluateAchievements,
  selectDailies,
  localDate,
} = require("../.test-build/domain/progress");
const cases = require("../content/cases.json");
const s = (n, penalty = "none") => ({
  id: String(n),
  timeMs: n * 1000,
  penalty,
  source: "timer",
  scramble: "R",
  createdAt: 0,
});
const store = () => ({
  sessions: [{ id: "main", name: "Main", solves: [] }],
  activeSessionId: "main",
  learned: [],
  attempts: [],
  achievements: {},
  daily: {},
  cases,
});
test("averages trim DNFs, account for +2, and require a full window", () => {
  assert.equal(average([s(10), s(11), s(12), s(13), s(50)], 5), 12000);
  assert.equal(average([s(10), s(11), s(12), s(13), s(1, "DNF")], 5), 12000);
  assert.equal(
    average([s(10), s(11), s(12), s(1, "DNF"), s(2, "DNF")], 5),
    Infinity,
  );
  assert.equal(
    average([s(10), s(11), s(12, "+2"), s(13), s(50)], 5),
    12666.666666666666,
  );
  assert.equal(average([s(10)], 5), null);
  assert.equal(average([s(10), s(11), s(12)], 3), 11000);
  assert.equal(average([s(10), s(11), s(12, "DNF")], 3), Infinity);
  assert.equal(
    average(
      Array.from({ length: 100 }, (_, i) => s(i + 1)),
      100,
    ),
    50500,
  );
  assert.equal(
    average(
      Array.from({ length: 12 }, (_, i) => s(i + 1)),
      12,
    ),
    6500,
  );
});
test("manual time parser and display handle minutes and reject malformed input", () => {
  assert.equal(parseTime("1:02.51"), 62510);
  assert.equal(parseTime("12.34"), 12340);
  for (const x of ["", "0", "-1", "1:60", "1.2.3", "12x", "1:2:3"])
    assert.equal(parseTime(x), null);
  assert.equal(formatTime(62510), "1:02.51");
  assert.equal(formatTime(12999), "12.99");
  assert.equal(formatAverage(12666.6666666), "12.67");
  assert.equal(formatAverage(12999), "13.00");
  assert.equal(resultMs({ ...s(1), timeMs: 12999 }), 12990);
  assert.equal(formatTime(null), "—");
  assert.equal(formatTime(Infinity), "DNF");
});
test("inspection boundaries and hold requirement", () => {
  assert.equal(HOLD_MS, 500);
  assert.equal(inspectionPenalty(14999.9), "none");
  assert.equal(inspectionPenalty(15000), "+2");
  assert.equal(inspectionPenalty(16999.9), "+2");
  assert.equal(inspectionPenalty(17000), "DNF");
});
test("best possible average and best single handle DNFs", () => {
  assert.equal(bestPossibleAo5([]), null);
  assert.equal(bestPossibleAo5([s(10), s(11), s(12), s(13)]), 11000);
  assert.equal(best([s(1, "DNF"), s(12, "+2")]), 14000);
  assert.equal(best([s(1, "DNF")]), null);
});
test("speed achievements use official times, span sessions, and retract invalid results", () => {
  let data = store();
  data.sessions[0].solves = [s(29, "+2"), s(1, "DNF")];
  data = evaluateAchievements(data);
  assert.equal(data.achievements["global:333:single:sub-30"], undefined);
  data.sessions[0].solves = [s(19)];
  data = evaluateAchievements(data);
  assert.ok(data.achievements["global:333:single:sub-20"]);
  assert.equal(data.achievements["other:sub-20"], undefined);
  data.sessions[0].solves = [];
  assert.equal(
    evaluateAchievements(data).achievements["global:333:single:sub-20"],
    undefined,
  );
});
test("daily selection is deterministic, stays fixed, and suppresses 20/8 prior cases", () => {
  let a = store();
  let b = store();
  const seen = { OLL: [], PLL: [] };
  for (let n = 1; n <= 25; n++) {
    const date = `2026-10-${String(n).padStart(2, "0")}`;
    a = selectDailies(a, date);
    b = selectDailies(b, date);
    assert.deepEqual(a.daily, b.daily);
    for (const type of ["OLL", "PLL"]) {
      const chosen = a.daily[`${date}:${type}`];
      const window = type === "OLL" ? 20 : 8;
      assert.ok(!seen[type].slice(-window).includes(chosen));
      seen[type].push(chosen);
    }
    assert.deepEqual(
      selectDailies({ ...a, learned: cases.map((c) => c.id) }, date).daily,
      a.daily,
    );
  }
});
test("daily all-learned selection prioritizes slower practice", () => {
  const data = store();
  data.learned = cases.map((c) => c.id);
  data.attempts = cases.map((c, i) => ({
    ...s(i + 1),
    caseId: c.id,
    mode: "execution",
  }));
  const chosen = selectDailies(data, "2026-10-24");
  assert.equal(chosen.daily["2026-10-24:OLL"], "oll-57");
  assert.equal(chosen.daily["2026-10-24:PLL"], "pll-z");
});

test("3D projection exposes only visible faces and keeps sticker positions finite", () => {
  const { projectCube } = require("../.test-build/domain/cubeProjection");
  const state = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
  const front = projectCube(state, 45);
  assert.equal(front.length, 27);
  assert.deepEqual([...new Set(front.map((x) => x.face))].sort(), [0, 1, 2]);
  const back = projectCube(state, 225);
  assert.deepEqual([...new Set(back.map((x) => x.face))].sort(), [0, 4, 5]);
  for (const angle of [0, 45, 90, 179, 270, 360, -30, 721])
    for (const s of projectCube(state, angle)) {
      assert.ok(!s.points.includes("NaN"));
      assert.equal(s.color, state[s.id]);
      assert.equal(s.points.split(" ").length, 4);
    }
});

test("SQLite schema protects solve ownership, penalty values, and cascade deletion", () => {
  const { DatabaseSync } = require("node:sqlite");
  const { CREATE_SCHEMA } = require("../.test-build/database/schema");
  const db = new DatabaseSync(":memory:");
  db.exec(CREATE_SCHEMA);
  db.prepare("INSERT INTO sessions(id,name) VALUES(?,?)").run("one", "First");
  db.prepare("INSERT INTO sessions(id,name) VALUES(?,?)").run("two", "Second");
  const insert = db.prepare("INSERT INTO solves VALUES(?,?,?,?,?,?,?)");
  insert.run("a", "one", 12000, "R U", "none", "timer", 100);
  insert.run("b", "two", 13000, "F U", "+2", "manual", 200);
  assert.throws(() =>
    insert.run("c", "missing", 1000, "R", "none", "timer", 300),
  );
  assert.throws(() => insert.run("d", "one", -1, "R", "none", "timer", 300));
  assert.throws(() =>
    insert.run("e", "one", 1000, "R", "invalid", "timer", 300),
  );
  db.prepare("DELETE FROM sessions WHERE id=?").run("one");
  assert.equal(db.prepare("SELECT COUNT(*) as n FROM solves").get().n, 1);
  assert.equal(
    db.prepare("SELECT session_id FROM solves").get().session_id,
    "two",
  );
  db.close();
});

test("BPAo5 first appears at four solves, drops only the slowest, and gives way to Ao5", () => {
  for (let n = 0; n < 4; n++) {
    const solves = Array.from({ length: n }, (_, i) => s(10 + i));
    assert.equal(bestPossibleAo5(solves), null);
    assert.deepEqual(ao5Summary(solves), { label: "Ao5", value: null });
  }
  const four = [s(9), s(12), s(15), s(60)];
  assert.equal(bestPossibleAo5(four), 12000);
  assert.deepEqual(ao5Summary(four), { label: "BPAo5", value: 12000 });
  assert.deepEqual(ao5Summary([s(18), ...four]), {
    label: "Ao5",
    value: 15000,
  });
  assert.deepEqual(ao5Summary(four, true), { label: "Ao5", value: null });
  assert.equal(bestPossibleAo5([s(9), s(10, "+2"), s(15), s(1, "DNF")]), 12000);
  assert.equal(
    bestPossibleAo5([s(9), s(12), s(1, "DNF"), s(2, "DNF")]),
    Infinity,
  );
});
test("Ao5/Ao12 drop exactly one at each end; Ao100 drops exactly five", () => {
  assert.equal(average([s(1), s(10), s(20), s(30), s(999)], 5), 20000);
  assert.equal(
    average([s(1), ...Array.from({ length: 10 }, () => s(20)), s(999)], 12),
    20000,
  );
  assert.equal(
    average(
      [
        ...Array.from({ length: 5 }, () => s(1)),
        ...Array.from({ length: 90 }, () => s(20)),
        ...Array.from({ length: 5 }, () => s(999)),
      ],
      100,
    ),
    20000,
  );
  assert.equal(
    average(
      [
        ...Array.from({ length: 95 }, () => s(20)),
        ...Array.from({ length: 5 }, () => s(1, "DNF")),
      ],
      100,
    ),
    20000,
  );
  assert.equal(
    average(
      [
        ...Array.from({ length: 94 }, () => s(20)),
        ...Array.from({ length: 6 }, () => s(1, "DNF")),
      ],
      100,
    ),
    Infinity,
  );
});
