import { Solve, Store } from "./models";
import { formatTime, resultMs } from "./statistics";
export const solveTitle = (solve: Solve) =>
  `${formatTime(resultMs(solve))}${solve.penalty === "+2" ? " +2" : ""}`;
export function selectSolves(
  solves: Solve[],
  options: {
    query: string;
    sort: "date" | "time";
    direction: "ascending" | "descending";
    hasPenalty: boolean;
    hasComment: boolean;
  },
) {
  const query = options.query.trim().toLowerCase();
  return solves
    .filter(
      (s) =>
        (!options.hasPenalty || s.penalty !== "none") &&
        (!options.hasComment || !!s.comment?.trim()) &&
        (!query ||
          [
            solveTitle(s),
            s.scramble,
            s.comment ?? "",
            new Date(s.createdAt).toLocaleString(),
          ].some((v) => v.toLowerCase().includes(query))),
    )
    .sort((a, b) => {
      const av = options.sort === "date" ? a.createdAt : resultMs(a);
      const bv = options.sort === "date" ? b.createdAt : resultMs(b);
      const difference =
        av === bv ? b.createdAt - a.createdAt : av < bv ? -1 : 1;
      return (options.direction === "ascending" ? 1 : -1) * difference;
    });
}
export function moveSolve(
  store: Store,
  solveId: string,
  targetId: string,
): Store {
  const source = store.sessions.find((s) =>
    s.solves.some((x) => x.id === solveId),
  );
  const solve = source?.solves.find((x) => x.id === solveId);
  if (
    !source ||
    !solve ||
    source.id === targetId ||
    !store.sessions.some((s) => s.id === targetId)
  )
    return store;
  return {
    ...store,
    sessions: store.sessions.map((s) => {
      if (s.id === source.id)
        return { ...s, solves: s.solves.filter((x) => x.id !== solveId) };
      if (s.id === targetId)
        return {
          ...s,
          hasAo5: s.hasAo5 || s.solves.length + 1 >= 5,
          solves: [...s.solves, solve].sort(
            (a, b) => b.createdAt - a.createdAt,
          ),
        };
      return s;
    }),
  };
}
