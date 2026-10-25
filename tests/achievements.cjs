const { test } = require("node:test");
const assert = require("node:assert/strict");
const { achievementReducer, createAchievementState } =
  require("../scripts/load-domain.cjs")("achievements");
const cases = require("../content/cases.json");
const solve = (id, timeMs, penalty = "none") => ({
  id,
  timeMs,
  penalty,
  source: "timer",
  scramble: "R U R'",
  createdAt: Number(id) || 1,
});
const session = (id = "main", solves = []) => ({
  id,
  name: id,
  event: "333",
  solves,
});
const initial = (overrides = {}) =>
  createAchievementState({
    sessions: [session()],
    activeSessionId: "main",
    achievements: {},
    learned: [],
    attempts: [],
    cases,
    preferences: {},
    custom: {},
    selected: {},
    prompts: [],
    daily: {},
    ...overrides,
  });
let now = 100;
const update = (state, fn, context) =>
  achievementReducer(state, { type: "update", fn, context, now: ++now });
const add = (state, result, id = "main") =>
  update(state, (s) => ({
    ...s,
    sessions: s.sessions.map((v) =>
      v.id === id ? { ...v, solves: [result, ...v.solves] } : v,
    ),
  }));
const penalty = (state, id, p) =>
  update(state, (s) => ({
    ...s,
    sessions: s.sessions.map((v) => ({
      ...v,
      solves: v.solves.map((r) => (r.id === id ? { ...r, penalty: p } : r)),
    })),
  }));
const dismiss = (state) => ({ ...state, banners: [], record: null });
const learn = (state, ids, origin = "learn") =>
  update(
    state,
    (s) => ({ ...s, learned: [...new Set([...s.learned, ...ids])] }),
    { learning: origin },
  );
const speedKey = (kind, n) => `global:333:${kind}:sub-${n}`;

test("a fast first solve shows only its strongest milestone and session record", () => {
  const state = add(initial(), solve("1", 9800));
  assert.deepEqual(
    state.banners.map((b) => b.text),
    ["First sub-10 solve"],
  );
  assert.deepEqual(state.record.records, [{ window: 1, timeMs: 9800 }]);
  for (const n of [30, 25, 20, 15, 12, 10])
    assert.ok(state.store.achievements[speedKey("single", n)]);
  assert.equal(add(dismiss(state), solve("2", 11000)).banners.length, 0);
});

test("every new sub-X statistic shows its banner alongside its record scroll", () => {
  for (const [window, label] of [
    [1, "solve"],
    [3, "mo3"],
    [5, "ao5"],
    [12, "ao12"],
    [100, "ao100"],
  ]) {
    const prior = Array.from({ length: window - 1 }, (_, i) =>
      solve(String(i + 1), 19000),
    );
    const state = add(
      initial({ sessions: [session("main", prior)] }),
      solve("new", 19000),
    );
    assert.deepEqual(
      state.banners.map((b) => b.text),
      [`First sub-20 ${label}`],
    );
    assert.ok(state.record.records.some((r) => r.window === window));

    const afterScroll = achievementReducer(state, {
      type: "dismiss-record",
      id: state.record.id,
    });
    assert.equal(afterScroll.record, null);
    assert.deepEqual(afterScroll.banners, state.banners);

    const afterBanner = achievementReducer(state, {
      type: "dismiss-banner",
      id: state.banners[0].id,
    });
    assert.equal(afterBanner.banners.length, 0);
    assert.deepEqual(afterBanner.record, state.record);
  }
});

test("new sessions celebrate easy records without repeating lifetime banners", () => {
  let state = dismiss(add(initial(), solve("1", 19000)));
  state = update(state, (s) => ({
    ...s,
    sessions: [...s.sessions, session("other")],
  }));
  state = add(state, solve("2", 24000), "other");
  assert.equal(state.record.sessionId, "other");
  assert.equal(state.record.records[0].timeMs, 24000);
  assert.equal(state.banners.length, 0);
});

test("record scrolls replay every improvement and ignore tied displayed times", () => {
  let state = add(initial(), solve("1", 41000));
  const firstId = state.record.id;
  state = add(state, solve("2", 40009));
  assert.notEqual(state.record.id, firstId);
  assert.equal(state.record.records[0].timeMs, 40000);
  state = dismiss(state);
  state = add(state, solve("3", 40001));
  assert.deepEqual(
    state.record.records.map((r) => r.window),
    [3],
  );
});

test("first full windows unlock mo3, ao5, ao12, ao100 session records", () => {
  for (const n of [3, 5, 12, 100]) {
    const old = Array.from({ length: n - 1 }, (_, i) =>
      solve(String(i + 1), 40000),
    );
    const state = add(
      initial({ sessions: [session("main", old)] }),
      solve("new", 40000),
    );
    assert.ok(
      state.record.records.some((r) => r.window === n),
      String(n),
    );
    assert.deepEqual(
      state.banners.map((b) => b.text),
      n === 100 ? ["100 solves completed"] : [],
    );
  }
});

test("+2 retracts a speed milestone immediately and it can be earned again", () => {
  let state = add(initial(), solve("1", 19000));
  assert.equal(state.banners[0].text, "First sub-20 solve");
  state = penalty(state, "1", "+2");
  assert.equal(state.store.achievements[speedKey("single", 20)], undefined);
  assert.equal(state.banners.length, 0);
  assert.equal(state.record.records[0].timeMs, 21000);
  state = add(state, solve("2", 18500));
  assert.equal(state.banners[0].text, "First sub-20 solve");
  state = penalty(state, "2", "DNF");
  assert.equal(state.store.achievements[speedKey("single", 20)], undefined);
  assert.equal(state.record, null);
  assert.equal(state.banners.length, 0);
});

test("+2 keeps a still-qualifying milestone and older valid results preserve it", () => {
  let state = penalty(add(initial(), solve("1", 17000)), "1", "+2");
  assert.ok(state.store.achievements[speedKey("single", 20)]);
  state = add(dismiss(state), solve("2", 18000));
  state = penalty(state, "2", "DNF");
  assert.ok(state.store.achievements[speedKey("single", 20)]);
  assert.equal(state.banners.length, 0);
});

test("editing an earlier solve recalculates windows and trims invalid pending records", () => {
  const old = [solve("3", 19000), solve("2", 19000), solve("1", 19000)];
  let state = initial({ sessions: [session("main", old)] });
  state = add(state, solve("4", 19000));
  state = add(state, solve("5", 19000));
  assert.equal(state.banners.at(-1).text, "First sub-20 ao5");
  state = penalty(state, "2", "+2");
  // This becomes the discarded worst solve; the average is still 19 seconds.
  assert.ok(state.store.achievements[speedKey("ao5", 20)]);
  state = penalty(state, "3", "DNF");
  state = penalty(state, "4", "DNF");
  assert.equal(state.store.achievements[speedKey("ao5", 20)], undefined);
  assert.equal(state.banners.length, 0);
  assert.equal(state.record, null);
});

test("averages compare their rounded centiseconds at the sub-X boundary", () => {
  const old = [solve("2", 20000), solve("1", 20000)];
  const state = add(
    initial({ sessions: [session("main", old)] }),
    solve("3", 19990),
  );
  assert.equal(state.store.achievements[speedKey("mo3", 20)], undefined);
  assert.equal(state.record.records.find((r) => r.window === 3).timeMs, 20000);
});

test("trainers and moved trainer attempts never earn full-solve speed milestones", () => {
  const result = solve("1", 1000);
  for (const id of ["oll-practice", "pll-practice"]) {
    const state = add(initial({ sessions: [session(id)] }), result, id);
    assert.equal(state.banners.length, 0);
    assert.ok(state.record);
    assert.equal(Object.keys(state.store.achievements).length, 0);
  }
  const state = add(
    initial({ attempts: [{ ...result, caseId: "oll-01", mode: "execution" }] }),
    result,
  );
  assert.equal(state.banners.length, 0);
  const otherEvent = initial({
    sessions: [{ ...session("other", [result]), event: "222" }],
  });
  assert.equal(Object.keys(otherEvent.store.achievements).length, 0);
});

test("lifetime averages do not combine solves across session boundaries", () => {
  const state = initial({
    sessions: [
      session("a", [solve("1", 10000), solve("2", 10000)]),
      session("b", [solve("3", 10000), solve("4", 10000)]),
    ],
  });
  assert.equal(state.store.achievements[speedKey("mo3", 15)], undefined);
});

test("loading old progress is quiet and replaces legacy trainer/per-session awards", () => {
  const state = initial({
    sessions: [
      session("main", [solve("1", 19000)]),
      session("oll-practice", [solve("2", 1000)]),
    ],
    learned: cases.filter((c) => c.type === "OLL").map((c) => c.id),
    achievements: { "oll-practice:sub-10": 1, "main:sub-20": 1 },
  });
  assert.equal(state.banners.length, 0);
  assert.equal(state.record, null);
  assert.equal(state.store.achievements["oll-practice:sub-10"], undefined);
  assert.ok(state.store.achievements[speedKey("single", 20)]);
  assert.equal(state.store.achievements[speedKey("single", 10)], undefined);
  assert.equal(learn(state, []).banners.length, 0);
});

test("learning milestones come only from explicit learning actions", () => {
  for (const type of ["OLL", "PLL"]) {
    const ids = cases.filter((c) => c.type === type).map((c) => c.id);
    assert.equal(
      learn(initial(), [ids[0]]).banners[0].text,
      `Learned 1 ${type}`,
    );
    const quiet = update(initial(), (s) => ({ ...s, learned: [ids[0]] }));
    assert.equal(quiet.banners.length, 0);
  }
});

test("setup suppresses intermediate milestones but allows one full-set banner", () => {
  for (const type of ["OLL", "PLL"]) {
    const ids = cases.filter((c) => c.type === type).map((c) => c.id);
    const partial = learn(initial(), ids.slice(0, 5), "setup");
    assert.equal(partial.banners.length, 0);
    const full = learn(partial, ids, "setup");
    assert.deepEqual(
      full.banners.map((b) => b.text),
      [`Learned ${ids.length} ${type}`],
    );
    assert.ok(full.store.achievements[`global:2-look-${type}`]);
    let reset = dismiss(full);
    reset = update(reset, (s) => ({ ...s, learned: [] }));
    assert.equal(learn(reset, ids, "setup").banners.length, 0);
  }
});

test("two-look completion requires the specific set and takes precedence over counts", () => {
  for (const type of ["OLL", "PLL"]) {
    const two = cases
      .filter((c) => c.type === type && c.twoLook)
      .map((c) => c.id);
    let state = initial({ learned: two.slice(0, -1) });
    state = learn(state, [two.at(-1)]);
    assert.deepEqual(
      state.banners.map((b) => b.text),
      [`Learned 2 Look ${type}`],
    );
    const others = cases
      .filter((c) => c.type === type && !c.twoLook)
      .slice(0, two.length)
      .map((c) => c.id);
    assert.equal(
      learn(initial(), others).store.achievements[`global:2-look-${type}`],
      undefined,
    );
  }
});

test("every requested OLL and PLL count can unlock without a notification cascade", () => {
  for (const [type, counts] of [
    ["OLL", [1, 5, 20, 29, 50, 57]],
    ["PLL", [1, 10, 21]],
  ]) {
    const ordered = cases
      .filter((c) => c.type === type)
      .sort((a, b) => Number(a.twoLook) - Number(b.twoLook));
    for (const count of counts) {
      const state = learn(
        initial({ learned: ordered.slice(0, count - 1).map((c) => c.id) }),
        [ordered[count - 1].id],
      );
      assert.deepEqual(
        state.banners.map((b) => b.text),
        [`Learned ${count} ${type}`],
      );
    }
  }
});

test("solve counts span regular sessions and exclude trainer solves", () => {
  const results = Array.from({ length: 99 }, (_, i) => solve(String(i), 60000));
  const state = add(
    initial({
      sessions: [
        session("main", results.slice(0, 50)),
        session("other", results.slice(50)),
        session("oll-practice", [solve("practice", 1000)]),
      ],
    }),
    solve("last", 60000),
  );
  assert.deepEqual(
    state.banners.map((b) => b.text),
    ["100 solves completed"],
  );
});

test("dismissed messages never replay on unrelated changes or reload", () => {
  let state = dismiss(add(initial(), solve("1", 24000)));
  state = update(state, (s) => ({ ...s, activeSessionId: "main" }));
  assert.equal(state.banners.length, 0);
  assert.equal(state.record, null);
  state = achievementReducer(state, {
    type: "load",
    store: JSON.parse(JSON.stringify(state.store)),
  });
  assert.equal(state.banners.length, 0);
  assert.equal(state.record, null);
  state = add(state, solve("2", 23000));
  assert.equal(state.banners.length, 0);
  assert.equal(state.record.records[0].timeMs, 23000);
});
