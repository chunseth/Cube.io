import { Solve, Store } from "./models";
import { average, best, resultMs } from "./statistics";
export { evaluateAchievements } from "./achievements";

export type AverageRecord = {
  value: number;
  entries: { solve: Solve; solveNumber: number; excluded: boolean }[];
};

export function bestAverageRecord(
  solves: Solve[],
  window: number,
): AverageRecord | null {
  const newestFirst = [...solves].sort((a, b) => b.createdAt - a.createdAt);
  let record: AverageRecord | null = null;
  for (let start = 0; start <= newestFirst.length - window; start++) {
    const group = newestFirst.slice(start, start + window);
    const value = average(group, window)!;
    if (record && value >= record.value) continue;
    const trim = window === 3 ? 0 : Math.ceil(window * 0.05);
    const ranked = group
      .map((solve, index) => ({ solve, index }))
      .sort((a, b) => resultMs(a.solve) - resultMs(b.solve));
    const excluded = new Set(
      trim
        ? [...ranked.slice(0, trim), ...ranked.slice(-trim)].map(
            ({ index }) => index,
          )
        : [],
    );
    record = {
      value,
      entries: group
        .map((solve, index) => ({
          solve,
          solveNumber: solves.length - start - index,
          excluded: excluded.has(index),
        }))
        .reverse(),
    };
  }
  return record;
}

export function solveAxisTicks(
  solveCount: number,
  plotWidth: number,
): number[] {
  const start = 5;
  const end = Math.max(start, solveCount);
  if (end === start) return [start];

  const gap = Math.max(44, String(end).length * 7 + 20);
  const width = Math.max(1, plotWidth);
  const intervals = Math.max(1, Math.floor(width / gap));
  const targetStep = Math.max(5, (end - start) / intervals);
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const step =
    [1, 2.5, 5, 10].find((factor) => factor * magnitude >= targetStep)! *
    magnitude;

  const ticks = [start];
  for (
    let tick = Math.ceil((start + 1) / step) * step;
    tick < end;
    tick += step
  ) {
    const fromPrevious =
      ((tick - ticks[ticks.length - 1]) / (end - start)) * width;
    const fromEnd = ((end - tick) / (end - start)) * width;
    if (fromPrevious >= gap && fromEnd >= gap) ticks.push(tick);
  }
  return [...ticks, end];
}

export function rollingAverageSeries(solves: Solve[], window: number) {
  const chronological = [...solves].sort((a, b) => a.createdAt - b.createdAt);
  return chronological.slice(window - 1).map((_, index) => {
    const time = average(chronological.slice(index, index + window), window);
    return {
      solveNumber: index + window,
      timeMs: time !== null && Number.isFinite(time) ? time : null,
    };
  });
}

export function practiceSingleRecords(solves: Solve[]) {
  let bestSingle: Solve | null = null;
  let worstSingle: Solve | null = null;
  for (const solve of solves) {
    const time = resultMs(solve);
    if (Number.isFinite(time) && (!bestSingle || time < resultMs(bestSingle)))
      bestSingle = solve;
    if (!worstSingle || time > resultMs(worstSingle)) worstSingle = solve;
  }
  return { bestSingle, worstSingle };
}

export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function selectDailies(store: Store, date = localDate()): Store {
  const daily = { ...store.daily };
  let changed = false;
  for (const type of ["OLL", "PLL"] as const) {
    const key = `${date}:${type}`;
    if (daily[key]) continue;
    const pool = store.cases.filter((c) => c.type === type);
    const history = Object.entries(daily)
      .filter(([k]) => k.endsWith(`:${type}`) && k < key)
      .sort(([a], [b]) => b.localeCompare(a));
    const recent = [...new Set(history.map(([, v]) => v))].slice(
      0,
      type === "OLL" ? 20 : 8,
    );
    const available = pool.filter((c) => !recent.includes(c.id));
    const eligible = available.length ? available : pool;
    const metrics = (id: string) => {
      const a = store.attempts.filter(
        (a) => a.caseId === id && a.mode === "execution",
      );
      return {
        pb: best(a),
        last: Math.max(0, ...a.map((a) => a.createdAt)),
        count: a.length,
      };
    };
    const pbs = pool
      .map((c) => metrics(c.id).pb)
      .filter((x): x is number => x !== null)
      .sort((a, b) => a - b);
    const median = pbs.length ? pbs[Math.floor(pbs.length / 2)] : Infinity;
    const allPracticed = pool.every(
      (c) => store.learned.includes(c.id) && metrics(c.id).count > 0,
    );
    const score = (id: string) => {
      const m = metrics(id);
      return (
        (m.count ? 0 : 100) +
        (store.learned.includes(id) ? 0 : 80) +
        (m.pb !== null && m.pb > median ? 40 : 0) +
        Math.min(
          30,
          m.last
            ? Math.max(
                0,
                (new Date(date + "T12:00:00").getTime() - m.last) / 86400000,
              )
            : 30,
        )
      );
    };
    eligible.sort((a, b) => {
      const ma = metrics(a.id),
        mb = metrics(b.id);
      if (allPracticed && ma.pb !== mb.pb) return (mb.pb ?? 0) - (ma.pb ?? 0);
      const scoreDiff = score(b.id) - score(a.id);
      if (scoreDiff) return scoreDiff;
      const la = history.find(([k, v]) => v === a.id)?.[0] ?? "",
        lb = history.find(([k, v]) => v === b.id)?.[0] ?? "";
      return la.localeCompare(lb) || a.id.localeCompare(b.id);
    });
    if (eligible[0]) {
      daily[key] = eligible[0].id;
      changed = true;
    }
  }
  return changed ? { ...store, daily } : store;
}
