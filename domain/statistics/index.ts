import { Solve } from "../models";
export const resultMs = (s: Pick<Solve, "timeMs" | "penalty">) =>
  s.penalty === "DNF"
    ? Infinity
    : Math.floor(s.timeMs / 10) * 10 + (s.penalty === "+2" ? 2000 : 0);
export function formatTime(ms: number | null): string {
  if (ms === null) return "—";
  if (!Number.isFinite(ms)) return "DNF";
  const cs = Math.floor((ms + 0.000001) / 10);
  const seconds = Math.floor(cs / 100);
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`
    : `${seconds}.${String(cs % 100).padStart(2, "0")}`;
}
// Stopwatch readings truncate; averages round to the nearest centisecond.
export function formatAverage(ms: number | null): string {
  return formatTime(
    ms === null || !Number.isFinite(ms) ? ms : Math.round(ms / 10) * 10,
  );
}
export function parseTime(value: string): number | null {
  if (!/^(?:\d+:)?\d{1,6}(?:\.\d{1,3})?$/.test(value.trim())) return null;
  const parts = value.trim().split(":");
  const seconds = Number(parts.pop());
  if (parts.length && seconds >= 60) return null;
  const ms = Math.round((Number(parts[0] || 0) * 60 + seconds) * 1000);
  return ms > 0 && ms < 86400000 ? ms : null;
}
export function average(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null;
  const values = solves
    .slice(0, n)
    .map(resultMs)
    .sort((a, b) => a - b);
  const trim = n === 3 ? 0 : Math.ceil(n * 0.05);
  const middle = trim ? values.slice(trim, -trim) : values;
  return middle.some((x) => !Number.isFinite(x))
    ? Infinity
    : middle.reduce((a, b) => a + b, 0) / middle.length;
}
export const best = (solves: Solve[]) =>
  solves.some((s) => Number.isFinite(resultMs(s)))
    ? Math.min(...solves.map(resultMs))
    : null;
// Four completed solves: drop the slowest and average the other three.
export function bestPossibleAo5(solves: Solve[]): number | null {
  if (solves.length < 4) return null;
  const fastestThree = solves
    .slice(0, 4)
    .map(resultMs)
    .sort((a, b) => a - b)
    .slice(0, 3);
  return fastestThree.some((x) => !Number.isFinite(x))
    ? Infinity
    : fastestThree.reduce((a, b) => a + b, 0) / 3;
}
export function ao5Summary(solves: Solve[], hasAo5 = false) {
  const showBpa = solves.length === 4 && !hasAo5;
  return {
    label: showBpa ? "BPAo5" : "Ao5",
    value: showBpa ? bestPossibleAo5(solves) : average(solves, 5),
  };
}
