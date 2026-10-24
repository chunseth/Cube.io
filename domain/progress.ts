import { Store } from "./models";
import { best } from "./statistics";
export function evaluateAchievements(store: Store): Store {
  const unlocked = { ...store.achievements };
  let changed = false;
  const add = (key: string) => {
    if (!unlocked[key]) {
      unlocked[key] = Date.now();
      changed = true;
    }
  };
  for (const s of store.sessions) {
    const pb = best(s.solves);
    for (const n of [30, 20, 15, 12, 10])
      if (pb !== null && pb < n * 1000) add(`${s.id}:sub-${n}`);
    for (const n of [100, 200, 500, 1000, 2000, 5000, 10000])
      if (s.solves.length >= n) add(`${s.id}:solves-${n}`);
  }
  for (const type of ["OLL", "PLL"]) {
    const all = store.cases.filter((c) => c.type === type);
    if (all.every((c) => store.learned.includes(c.id)))
      add(`global:full-${type}`);
    const two = all.filter((c) => c.twoLook);
    if (two.length && two.every((c) => store.learned.includes(c.id)))
      add(`global:2-look-${type}`);
  }
  return changed ? { ...store, achievements: unlocked } : store;
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
