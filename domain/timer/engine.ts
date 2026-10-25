import { Penalty } from "../models";
export const HOLD_MS = 500;
export const GESTURE_LOCK_MS = 150;
export type TimerTouchIntent = "pending" | "hold" | "swipe";
// Once a swipe starts or a hold locks, that contact cannot change its intent.
export function timerTouchIntent(
  current: TimerTouchIntent,
  heldMs: number,
  distance: number,
): TimerTouchIntent {
  if (current !== "pending") return current;
  if (heldMs >= GESTURE_LOCK_MS) return "hold";
  return distance > 28 ? "swipe" : "pending";
}
export const inspectionPenalty = (elapsed: number): Penalty =>
  elapsed >= 17000 ? "DNF" : elapsed >= 15000 ? "+2" : "none";
export type TimerPhase =
  "idle" | "holding" | "ready" | "inspection" | "running" | "result";
