import { Penalty } from "../models";
export const HOLD_MS = 550;
export const inspectionPenalty = (elapsed: number): Penalty =>
  elapsed >= 17000 ? "DNF" : elapsed >= 15000 ? "+2" : "none";
export type TimerPhase =
  "idle" | "holding" | "ready" | "inspection" | "running" | "result";
