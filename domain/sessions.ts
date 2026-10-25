import { Session } from "./models";
export const DEFAULT_SESSION_NAME = "Default Session";
export const PRACTICE_SESSIONS = [
  { id: "oll-practice", name: "OLL Practice" },
  { id: "pll-practice", name: "PLL Practice" },
] as const;
export function normalizeDefaultSession(session: Session): Session {
  return session.id === "main" && ["Main", "Default 3×3"].includes(session.name)
    ? { ...session, name: DEFAULT_SESSION_NAME }
    : session;
}
export function ensurePracticeSessions(sessions: Session[]): Session[] {
  const normalized = sessions.map(normalizeDefaultSession).map((s) => ({
    ...s,
    event: s.event ?? "333",
    createdAt:
      s.createdAt ??
      (s.solves.length
        ? Math.min(...s.solves.map((x) => x.createdAt))
        : Date.now()),
  }));
  return PRACTICE_SESSIONS.reduce(
    (all, session) =>
      all.some((s) => s.id === session.id)
        ? all
        : [
            ...all,
            { ...session, solves: [], event: "333", createdAt: Date.now() },
          ],
    normalized,
  );
}
