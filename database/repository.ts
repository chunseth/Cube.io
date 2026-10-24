import {
  DEFAULT_SESSION_NAME,
  normalizeDefaultSession,
} from "../domain/sessions";
import { CREATE_SCHEMA } from "./schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { Store, Solve } from "../domain/models";
import cases from "../content/cases.json";
import { mergeBundledCases } from "../domain/catalog";
export function defaultStore(): Store {
  return {
    sessions: [{ id: "main", name: DEFAULT_SESSION_NAME, solves: [] }],
    activeSessionId: "main",
    preferences: {
      inspection: false,
      haptics: true,
      sound: false,
      onboarding: false,
    },
    learned: [],
    custom: {},
    selected: {},
    attempts: [],
    prompts: [],
    daily: {},
    achievements: {},
    cases: cases as Store["cases"],
  };
}
let db: SQLite.SQLiteDatabase;
let persisted: Store | null = null;
export async function loadStore(): Promise<Store> {
  db = await SQLite.openDatabaseAsync("cubeio.db");
  await db.execAsync(CREATE_SCHEMA);
  const row = await db.getFirstAsync<{ json: string }>(
    "SELECT json FROM app_state WHERE id=1",
  );
  const base = defaultStore();
  if (row) {
    const saved = JSON.parse(row.json);
    const sessions = await db.getAllAsync<{
      id: string;
      name: string;
      has_ao5: number;
    }>("SELECT * FROM sessions ORDER BY rowid");
    const solves = await db.getAllAsync<{
      id: string;
      session_id: string;
      raw_time_ms: number;
      scramble: string;
      penalty: Solve["penalty"];
      entry_type: Solve["source"];
      created_at: number;
    }>("SELECT * FROM solves ORDER BY created_at DESC");
    const restored: Store = {
      ...base,
      ...saved,
      sessions: sessions.map((s) => ({
        id: s.id,
        name: s.name,
        hasAo5: !!s.has_ao5,
        solves: solves
          .filter((x) => x.session_id === s.id)
          .map((x) => ({
            id: x.id,
            timeMs: x.raw_time_ms,
            scramble: x.scramble,
            penalty: x.penalty,
            source: x.entry_type,
            createdAt: x.created_at,
          })),
      })),
    };
    if (!restored.sessions.length)
      throw new Error("Stored sessions are missing");
    if (!restored.sessions.some((s) => s.id === restored.activeSessionId))
      restored.activeSessionId = restored.sessions[0].id;
    persisted = restored;
    return {
      ...restored,
      cases: mergeBundledCases(restored.cases),
      sessions: restored.sessions.map(normalizeDefaultSession),
    };
  }
  const legacy = await AsyncStorage.getItem("cubeio.timer.v1");
  if (legacy) {
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed.sessions) && parsed.sessions.length) {
      base.sessions = parsed.sessions.map((s: any) => ({
        ...s,
        hasAo5: s.solves.length >= 5,
        solves: s.solves.map((x: any) => ({
          ...x,
          penalty: x.penalty || "none",
          source: x.source || "timer",
        })),
      }));
      base.activeSessionId = parsed.activeSessionId;
    }
  }
  base.sessions = base.sessions.map(normalizeDefaultSession);
  await persistStore(base);
  return base;
}
async function persistStore(store: Store) {
  const oldSessions = new Map(
    (persisted?.sessions ?? []).map((s) => [s.id, s]),
  );
  await db.withTransactionAsync(async () => {
    for (const old of oldSessions.values())
      if (!store.sessions.some((s) => s.id === old.id))
        await db.runAsync("DELETE FROM sessions WHERE id=?", old.id);
    for (const session of store.sessions) {
      const old = oldSessions.get(session.id);
      if (old === session) continue;
      await db.runAsync(
        "INSERT INTO sessions(id,name,has_ao5) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,has_ao5=excluded.has_ao5",
        session.id,
        session.name,
        session.hasAo5 ? 1 : 0,
      );
      const currentIds = new Set(session.solves.map((s) => s.id));
      const oldSolves = new Map((old?.solves ?? []).map((s) => [s.id, s]));
      for (const previous of oldSolves.values())
        if (!currentIds.has(previous.id))
          await db.runAsync("DELETE FROM solves WHERE id=?", previous.id);
      for (const s of session.solves)
        if (oldSolves.get(s.id) !== s)
          await db.runAsync(
            "INSERT INTO solves VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET raw_time_ms=excluded.raw_time_ms,penalty=excluded.penalty",
            s.id,
            session.id,
            s.timeMs,
            s.scramble,
            s.penalty,
            s.source,
            s.createdAt,
          );
    }
    const { sessions, ...rest } = store;
    await db.runAsync(
      "INSERT OR REPLACE INTO app_state VALUES(1,?)",
      JSON.stringify({ schemaVersion: 1, ...rest }),
    );
  });
  persisted = store;
}
let queue: Promise<void> = Promise.resolve();
export function saveStore(store: Store) {
  const pending = queue.then(() => persistStore(store));
  queue = pending.catch(() => {});
  return pending;
}
