import Cube from "cubejs";
import type { Case } from "./models";

const AUFS = ["", "U", "U2", "U'"];
const COLOR_CYCLE = "FRBL";
const VISIBLE = [18, 19, 20, 9, 10, 11];
// User-specified confusion families guide one slot when the visible geometry fits.
export const PLL_CONFUSION_ANCHORS: Record<string, string[]> = {
  "pll-ra": ["pll-f"],
  "pll-f": ["pll-ra"],
  "pll-aa": ["pll-ga", "pll-gd"],
  "pll-ab": ["pll-ga", "pll-gd"],
  "pll-ga": ["pll-aa", "pll-ab"],
  "pll-gd": ["pll-aa", "pll-ab"],
  "pll-gb": ["pll-h"],
  "pll-gc": ["pll-h"],
  "pll-h": ["pll-gb", "pll-gc"],
  "pll-ua": ["pll-z"],
  "pll-ub": ["pll-z"],
  "pll-z": ["pll-ua", "pll-ub"],
};
export type PllVisibleFeatures = {
  colors: string;
  pattern: string;
  equalityPattern: string;
  sameColorPairs: boolean[];
  oppositeColorPairs: boolean[];
  directedRelations: number[];
  headlights: boolean[];
  bars: boolean[];
  blocks: boolean[];
  description: string;
};
export type PllComparison = {
  caseId: string;
  matchedAuf: string;
  score: number;
  knownConfusion: boolean;
  equalPairDifferences: number;
  oppositePairDifferences: number;
  headlightDifferences: number;
  barDifferences: number;
  blockDifferences: number;
  colorDifferences: number;
  relationDifferences: number;
  matchedPattern: string;
  matchedDescription: string;
};
export type PllDistractor = PllComparison & {
  role: "visual-neighbor" | "confusion-anchor";
  reason: string;
};
export type PllQuiz = {
  caseId: string;
  views: {
    auf: string;
    setup: string;
    visiblePattern: string;
    features: PllVisibleFeatures;
    answerIds: string[];
    distractors: PllDistractor[];
    rankedCandidates: PllComparison[];
  }[];
};
function cubeFromSetup(setup: string) {
  const cube = new Cube().move(setup);
  cube.move(cube.upright());
  if (
    cube.co.some((o) => o !== 0) ||
    cube.eo.some((o) => o !== 0) ||
    cube.cp.slice(4).some((p, i) => p !== i + 4) ||
    cube.ep.slice(4).some((p, i) => p !== i + 4)
  )
    throw new Error(
      "PLL recognition requires oriented last-layer pieces and solved F2L.",
    );
  return cube;
}
export function pllFeaturesFromState(state: string): PllVisibleFeatures {
  const colors = VISIBLE.map((i) => state[i]).join("");
  const values = [...colors].map((c) => COLOR_CYCLE.indexOf(c));
  if (values.some((v) => v < 0))
    throw new Error("PLL side rows must contain side colors.");
  // Ignore a global cyclic recoloring, retaining clockwise order and opposites.
  const pattern = values.map((v) => (v - values[0] + 4) % 4).join("");
  const encountered: string[] = [];
  const equalityPattern = [...colors]
    .map((c) => {
      if (!encountered.includes(c)) encountered.push(c);
      return encountered.indexOf(c);
    })
    .join("");
  const directedRelations: number[] = [];
  for (let a = 0; a < 6; a++)
    for (let b = a + 1; b < 6; b++)
      directedRelations.push((values[b] - values[a] + 4) % 4);
  const headlights = [colors[0] === colors[2], colors[3] === colors[5]];
  const bars = [
    colors[0] === colors[1] && colors[1] === colors[2],
    colors[3] === colors[4] && colors[4] === colors[5],
  ];
  const blocks = [
    colors[0] === colors[1],
    colors[1] === colors[2],
    colors[3] === colors[4],
    colors[4] === colors[5],
  ];
  const description = [0, 1]
    .map((face) => {
      const label = face === 0 ? "F" : "R",
        offset = face * 3;
      if (bars[face]) return `${label}: full bar`;
      if (headlights[face])
        return `${label}: headlights with ${(values[offset + 1] - values[offset] + 4) % 4 === 2 ? "opposite" : "adjacent"}-color edge`;
      if (blocks[face * 2]) return `${label}: left two-sticker block`;
      if (blocks[face * 2 + 1]) return `${label}: right two-sticker block`;
      return `${label}: three different colors`;
    })
    .join("; ");
  return {
    colors,
    pattern,
    equalityPattern,
    directedRelations,
    sameColorPairs: directedRelations.map((v) => v === 0),
    oppositeColorPairs: directedRelations.map((v) => v === 2),
    headlights,
    bars,
    blocks,
    description,
  };
}
export function pllVisiblePattern(setup: string): string {
  return pllFeaturesFromState(cubeFromSetup(setup).asString()).pattern;
}
const difference = <T>(a: T[], b: T[]) =>
  a.reduce((n, v, i) => n + Number(v !== b[i]), 0);
function compare(a: PllVisibleFeatures, b: PllVisibleFeatures) {
  const equalPairDifferences = difference(a.sameColorPairs, b.sameColorPairs);
  const oppositePairDifferences = difference(
    a.oppositeColorPairs,
    b.oppositeColorPairs,
  );
  const headlightDifferences = difference(a.headlights, b.headlights);
  const barDifferences = difference(a.bars, b.bars);
  const blockDifferences = difference(a.blocks, b.blocks);
  const colorDifferences = difference([...a.pattern], [...b.pattern]);
  const relationDifferences = difference(
    a.directedRelations,
    b.directedRelations,
  );
  // Recognition starts with visible geometry; color relationships separate lookalikes.
  const geometry =
    3 * equalPairDifferences +
    4 * headlightDifferences +
    5 * barDifferences +
    3 * blockDifferences;
  const score =
    3 * geometry +
    2 * oppositePairDifferences +
    colorDifferences +
    relationDifferences;
  return {
    score,
    equalPairDifferences,
    oppositePairDifferences,
    headlightDifferences,
    barDifferences,
    blockDifferences,
    colorDifferences,
    relationDifferences,
  };
}
function closeGeometry(m: ReturnType<typeof compare>) {
  return (
    m.equalPairDifferences <= 2 &&
    m.headlightDifferences <= 1 &&
    m.barDifferences === 0 &&
    m.blockDifferences <= 1
  );
}
export function buildPllQuizzes(
  cases: Pick<Case, "id" | "number" | "type" | "setup">[],
): PllQuiz[] {
  const patterns = cases
    .filter((c) => c.type === "PLL")
    .map((c) => ({
      ...c,
      views: AUFS.map((auf) => ({
        auf,
        features: pllFeaturesFromState(
          cubeFromSetup(c.setup).move(auf).asString(),
        ),
      })),
    }));
  return patterns.map((correct) => ({
    caseId: correct.id,
    views: correct.views.map((view) => {
      const candidates = patterns
        .filter((c) => c.id !== correct.id)
        .map((candidate) => {
          const matches = candidate.views
            .map((other) => ({
              caseId: candidate.id,
              matchedAuf: other.auf,
              knownConfusion: !!PLL_CONFUSION_ANCHORS[correct.id]?.includes(
                candidate.id,
              ),
              ...compare(view.features, other.features),
              matchedPattern: other.features.pattern,
              matchedDescription: other.features.description,
            }))
            .sort(
              (a, b) =>
                a.score - b.score ||
                AUFS.indexOf(a.matchedAuf) - AUFS.indexOf(b.matchedAuf),
            );
          return {
            best: matches[0],
            anchor: matches.find(closeGeometry),
            number: candidate.number,
          };
        })
        .sort((a, b) => a.best.score - b.best.score || a.number - b.number);
      const chosen: { match: PllComparison; role: PllDistractor["role"] }[] =
        candidates
          .slice(0, 2)
          .map((c) => ({ match: c.best, role: "visual-neighbor" }));
      const represented = chosen.some((c) => c.match.knownConfusion);
      const anchor = !represented
        ? candidates
            .filter(
              (c) =>
                c.best.knownConfusion &&
                c.anchor &&
                !chosen.some((s) => s.match.caseId === c.best.caseId),
            )
            .sort(
              (a, b) =>
                a.anchor!.score - b.anchor!.score || a.number - b.number,
            )[0]?.anchor
        : undefined;
      const third =
        anchor ??
        candidates.find(
          (c) => !chosen.some((s) => s.match.caseId === c.best.caseId),
        )!.best;
      chosen.push({
        match: third,
        role: anchor ? "confusion-anchor" : "visual-neighbor",
      });
      const distractors = chosen.map(({ match: m, role }) => ({
        ...m,
        role,
        reason: `${role === "confusion-anchor" ? "Known confusion family with close visible geometry" : "Nearest measured visible configuration"}. ${m.matchedDescription}. Compared with the question: ${m.headlightDifferences} headlight, ${m.barDifferences} full-bar, ${m.blockDifferences} adjacent-block and ${m.oppositePairDifferences} opposite-color-pair differences.`,
      }));
      return {
        auf: view.auf,
        setup: [correct.setup, view.auf].filter(Boolean).join(" "),
        visiblePattern: view.features.pattern,
        features: view.features,
        answerIds: [correct.id, ...distractors.map((d) => d.caseId)],
        distractors,
        rankedCandidates: candidates.map((c) => c.best),
      };
    }),
  }));
}
