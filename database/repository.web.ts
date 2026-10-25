import {
  DEFAULT_SESSION_NAME,
  ensurePracticeSessions,
  normalizeDefaultSession,
} from "../domain/sessions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Store } from "../domain/models";
import cases from "../content/cases.json";
import { mergeBundledCases } from "../domain/catalog";
export function defaultStore(): Store {
  return {
    sessions: [
      {
        id: "main",
        name: DEFAULT_SESSION_NAME,
        solves: [],
        createdAt: Date.now(),
        event: "333",
      },
      {
        id: "oll-practice",
        name: "OLL Practice",
        solves: [],
        createdAt: Date.now(),
        event: "333",
      },
      {
        id: "pll-practice",
        name: "PLL Practice",
        solves: [],
        createdAt: Date.now(),
        event: "333",
      },
    ],
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
export async function loadStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem("cubeio.app.v2");
  if (raw) {
    const saved = { ...defaultStore(), ...JSON.parse(raw) } as Store;
    return {
      ...saved,
      cases: mergeBundledCases(saved.cases),
      sessions: ensurePracticeSessions(saved.sessions),
    };
  }
  const legacy = await AsyncStorage.getItem("cubeio.timer.v1");
  const initial = defaultStore();
  if (legacy) {
    const old = JSON.parse(legacy);
    if (old.sessions?.length) {
      initial.sessions = old.sessions.map((s: any) => ({
        ...s,
        hasAo5: s.solves.length >= 5,
        solves: s.solves.map((x: any) => ({
          ...x,
          penalty: x.penalty || "none",
          source: x.source || "timer",
        })),
      }));
      initial.activeSessionId = old.activeSessionId;
    }
  }
  initial.sessions = ensurePracticeSessions(initial.sessions);
  return initial;
}
let queue: Promise<void> = Promise.resolve();
export function saveStore(store: Store) {
  const p = queue.then(() =>
    AsyncStorage.setItem("cubeio.app.v2", JSON.stringify(store)),
  );
  queue = p.catch(() => {});
  return p;
}
