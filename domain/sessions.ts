import { Session } from "./models";
export const DEFAULT_SESSION_NAME = "Default Session";
export function normalizeDefaultSession(session: Session): Session {
  return session.id === "main" && ["Main", "Default 3×3"].includes(session.name)
    ? { ...session, name: DEFAULT_SESSION_NAME }
    : session;
}
