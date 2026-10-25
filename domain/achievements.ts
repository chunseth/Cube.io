import { Session, Solve, Store } from "./models";
import { average, resultMs } from "./statistics";

export type AchievementContext = { learning?: "learn" | "setup" };
export type UpdateStore = (
  fn: (store: Store) => Store,
  context?: AchievementContext,
) => void;
export const RECORD_WINDOWS = [1, 3, 5, 12, 100] as const;
export type RecordWindow = (typeof RECORD_WINDOWS)[number];
export type RecordResult = { window: RecordWindow; timeMs: number };
export type RecordScroll = {
  id: string;
  sessionId: string;
  solveId: string;
  records: RecordResult[];
};
export type AchievementBanner = {
  id: string;
  text: string;
  keys: string[];
};
const thresholds = [30, 25, 20, 15, 12, 10];
const solveCounts = [100, 500, 1000, 2000, 5000, 10000];
const learningCounts = { OLL: [1, 5, 20, 29, 50, 57], PLL: [1, 10, 21] };
const practiceIds = new Set(["oll-practice", "pll-practice"]);
const speedPrefix = "global:333:";
const valueFor = (solves: Solve[], window: RecordWindow) =>
  window === 1
    ? solves[0]
      ? resultMs(solves[0])
      : null
    : average(solves, window);
const displayValue = (value: number, window: RecordWindow) =>
  window === 1 ? value : Math.round(value / 10) * 10;
export const recordLabel = (window: RecordWindow) =>
  window === 1 ? "single" : window === 3 ? "mo3" : `ao${window}`;

type Bests = Map<RecordWindow, number>;
const recordsCache = new WeakMap<Solve[], Bests>();
// Normal solves only add a new rolling window. Edits rebuild the affected session.
function sessionBests(solves: Solve[], previous?: Solve[]): Bests {
  const cached = recordsCache.get(solves);
  if (cached) return cached;
  const appended =
    previous &&
    solves.length === previous.length + 1 &&
    previous.every((solve, i) => solve === solves[i + 1]);
  const bests: Bests = appended ? new Map(sessionBests(previous)) : new Map();
  for (const window of RECORD_WINDOWS) {
    const count = appended ? 1 : Math.max(0, solves.length - window + 1);
    for (let i = 0; i < count; i++) {
      const value = valueFor(solves.slice(i, i + window), window);
      if (value !== null && Number.isFinite(value))
        bests.set(
          window,
          Math.min(bests.get(window) ?? Infinity, displayValue(value, window)),
        );
    }
  }
  recordsCache.set(solves, bests);
  return bests;
}

function learningMilestones(store: Store) {
  const known = new Set(store.learned);
  const milestones: {
    key: string;
    text: string;
    priority: number;
    full: boolean;
  }[] = [];
  for (const type of ["OLL", "PLL"] as const) {
    const cases = store.cases.filter((c) => c.type === type);
    const count = cases.filter((c) => known.has(c.id)).length;
    for (const n of learningCounts[type]) {
      if (count >= n)
        milestones.push({
          key: `global:learned-${type}-${n}`,
          text: `Learned ${n} ${type}`,
          priority: n,
          full: false,
        });
    }
    const twoLook = cases.filter((c) => c.twoLook);
    if (twoLook.length && twoLook.every((c) => known.has(c.id)))
      milestones.push({
        key: `global:2-look-${type}`,
        text: `Learned 2 Look ${type}`,
        priority: 100,
        full: false,
      });
    if (cases.length && cases.every((c) => known.has(c.id)))
      milestones.push({
        key: `global:full-${type}`,
        text: `Learned ${type === "OLL" ? 57 : 21} ${type}`,
        priority: 200,
        full: true,
      });
  }
  return milestones;
}

type Candidate = { key: string; text: string; priority: number };
function evaluate(store: Store, previous?: Store, now = Date.now()) {
  const achievements = { ...store.achievements };
  // Replace the old per-session speed awards, including accidental trainer awards.
  for (const key of Object.keys(achievements))
    if (key.startsWith(speedPrefix) || /^[^:]+:(sub-\d+|solves-\d+)$/.test(key))
      delete achievements[key];
  const candidates: Candidate[] = [];
  const attemptIds = new Set(store.attempts.map((a) => a.id));
  let total = 0;
  const bests: Bests = new Map();
  for (const session of store.sessions) {
    if (
      practiceIds.has(session.id) ||
      (session.event && session.event !== "333")
    )
      continue;
    const solves = session.solves.some((s) => attemptIds.has(s.id))
      ? session.solves.filter((s) => !attemptIds.has(s.id))
      : session.solves;
    total += solves.length;
    const old = previous?.sessions.find((s) => s.id === session.id)?.solves;
    for (const [window, value] of sessionBests(solves, old))
      bests.set(window, Math.min(bests.get(window) ?? Infinity, value));
  }
  const add = (key: string, text: string, priority: number) => {
    achievements[key] = store.achievements[key] ?? now;
    candidates.push({ key, text, priority });
  };
  for (const [window, value] of bests) {
    for (const threshold of thresholds) {
      if (value < threshold * 1000)
        add(
          `${speedPrefix}${recordLabel(window)}:sub-${threshold}`,
          `First sub-${threshold} ${window === 1 ? "solve" : recordLabel(window)}`,
          1000 + (30 - threshold) * 100 + window,
        );
    }
  }
  for (const n of solveCounts)
    if (total >= n)
      add(
        `global:333:solves-${n}`,
        `${n.toLocaleString("en-US")} solves completed`,
        n / 100000,
      );
  const learning = learningMilestones(store);
  for (const milestone of learning)
    achievements[milestone.key] = achievements[milestone.key] ?? now;
  return { store: { ...store, achievements }, candidates, learning };
}

// Loading existing progress establishes a quiet baseline, never a notification burst.
export function evaluateAchievements(store: Store): Store {
  return evaluate(store).store;
}

function scrollFor(
  session: Session,
  solveId: string,
  id: string,
  previous?: Session,
): RecordScroll | null {
  const index = session.solves.findIndex((s) => s.id === solveId);
  if (index < 0) return null;
  const appended =
    index === 0 &&
    previous &&
    previous.solves.length + 1 === session.solves.length &&
    previous.solves.every((solve, i) => solve === session.solves[i + 1]);
  const older = sessionBests(
    appended ? previous.solves : session.solves.slice(index + 1),
  );
  const current = sessionBests(session.solves);
  const records: RecordResult[] = [];
  for (const window of RECORD_WINDOWS) {
    const raw = valueFor(session.solves.slice(index, index + window), window);
    if (raw === null || !Number.isFinite(raw)) continue;
    const value = displayValue(raw, window);
    if (
      value < (older.get(window) ?? Infinity) &&
      value <= (current.get(window) ?? Infinity)
    )
      records.push({ window, timeMs: value });
  }
  return records.length
    ? { id, sessionId: session.id, solveId, records }
    : null;
}

export type AchievementState = {
  store: Store;
  banners: AchievementBanner[];
  record: RecordScroll | null;
};
export const createAchievementState = (store: Store): AchievementState => ({
  store: evaluateAchievements(store),
  banners: [],
  record: null,
});
export type AchievementAction =
  | { type: "load"; store: Store }
  | {
      type: "update";
      fn: (s: Store) => Store;
      context?: AchievementContext;
      now: number;
    }
  | { type: "dismiss-banner"; id: string }
  | { type: "dismiss-record"; id: string };

export function achievementReducer(
  state: AchievementState,
  action: AchievementAction,
): AchievementState {
  if (action.type === "load") return createAchievementState(action.store);
  if (action.type === "dismiss-banner")
    return {
      ...state,
      banners: state.banners.filter((b) => b.id !== action.id),
    };
  if (action.type === "dismiss-record")
    return state.record?.id === action.id ? { ...state, record: null } : state;
  const previous = state.store;
  const result = evaluate(action.fn(previous), previous, action.now);
  const store = result.store;
  const isNew = (key: string) => !previous.achievements[key];
  const newLearning = result.learning.filter((m) => isNew(m.key));
  let candidates: Candidate[] = [];
  if (action.context?.learning === "setup") {
    // Full-set acknowledgments are the only banners for initial/bulk knowledge entry.
    candidates = newLearning.filter((m) => m.full);
  } else if (action.context?.learning === "learn") {
    candidates = newLearning
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 1);
  }
  // Only newly added solves or actual result corrections can celebrate speed milestones.
  let record = state.record;
  let resultsChanged = false;
  const previousSolves = new Map(
    previous.sessions.flatMap((s) => s.solves.map((v) => [v.id, v] as const)),
  );
  for (const session of store.sessions) {
    const oldSession = previous.sessions.find((s) => s.id === session.id);
    if (oldSession?.solves === session.solves) continue;
    for (const solve of session.solves) {
      const old = previousSolves.get(solve.id);
      if (!old || old.timeMs !== solve.timeMs || old.penalty !== solve.penalty)
        resultsChanged = true;
    }
    const added = session.solves.find((s) => !previousSolves.has(s.id));
    if (added)
      record = scrollFor(
        session,
        added.id,
        `${session.id}:${added.id}:${action.now}`,
        oldSession,
      );
  }
  if (record && record === state.record) {
    const session = store.sessions.find((s) => s.id === record!.sessionId);
    const oldSession = previous.sessions.find(
      (s) => s.id === record!.sessionId,
    );
    if (!session) record = null;
    else if (oldSession?.solves !== session.solves)
      record = scrollFor(session, record.solveId, record.id);
  }
  if (resultsChanged && !candidates.length)
    candidates = result.candidates
      .filter((m) => isNew(m.key))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 1);
  const banners = state.banners.filter((b) =>
    b.keys.every((key) => !!store.achievements[key]),
  );
  for (const candidate of candidates)
    banners.push({
      id: `${candidate.key}:${action.now}`,
      text: candidate.text,
      keys: [candidate.key],
    });
  return { store, banners, record };
}
