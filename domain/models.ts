export type Penalty = "none" | "+2" | "DNF";
export type Solve = {
  id: string;
  timeMs: number;
  scramble: string;
  createdAt: number;
  source: "timer" | "manual";
  comment?: string;
  penalty: Penalty;
};
export type Session = {
  id: string;
  name: string;
  solves: Solve[];
  hasAo5?: boolean;
  createdAt?: number;
  event?: string;
};
export type Case = {
  id: string;
  type: "OLL" | "PLL";
  number: number;
  name: string;
  family: string;
  twoLook: boolean;
  algorithms: string[];
  setup: string;
  answers: string[];
  imageId?: string;
  signature?: string;
  sources?: { name: string; url: string }[];
  algorithmSources?: {
    moves: string;
    original: string;
    source: string;
    url: string;
  }[];
  setups?: CaseSetup[];
};
export type CaseSetup = {
  id: string;
  moves: string;
  original?: string;
  source: string;
  url: string;
  kind: "trainer" | "published" | "inverse";
  derivedFrom?: string;
  verification: { f2l: boolean; caseId: string; signature: string };
};
export type Attempt = Solve & {
  caseId: string;
  mode: "execution" | "full" | "two-sided";
  correct?: boolean;
  answerId?: string;
};
export type Preferences = {
  inspection: boolean;
  haptics: boolean;
  sound: boolean;
  onboarding: boolean;
};
export type Store = {
  sessions: Session[];
  activeSessionId: string;
  preferences: Preferences;
  learned: string[];
  custom: Record<string, string[]>;
  selected: Record<string, string[]>;
  attempts: Attempt[];
  prompts: string[];
  daily: Record<string, string>;
  achievements: Record<string, number>;
  cases: Case[];
};
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
