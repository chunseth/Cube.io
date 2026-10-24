import Cube from "cubejs";
import type { Case } from "./models";

const AUFS = ["", "U", "U2", "U'"];
const TOP = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const RING = [47, 46, 45, 36, 37, 38, 11, 10, 9, 18, 19, 20];
const VISIBLE = [...TOP, 18, 19, 20, 9, 10, 11];
type EdgeShape = "dot" | "line" | "L" | "cross";
export type OllFeatures = {
  orientedCorners: number;
  orientedEdges: number;
  edgeShape: EdgeShape;
};
type PatternView = { auf: string; top: string; visible: string; full: string };
export type OllDistractor = {
  caseId: string;
  role: "same-structure" | "near-structure" | "corner-contrast";
  matchedAuf: string;
  topDifferences: number;
  visibleDifferences: number;
  reason: string;
};
export type OllQuiz = {
  caseId: string;
  features: OllFeatures;
  policyNote: string;
  views: {
    auf: string;
    setup: string;
    visibleMask: string;
    answerIds: string[];
    distractors: OllDistractor[];
  }[];
};

const mask = (state: string, indices: number[]) =>
  indices.map((i) => (state[i] === "U" ? "1" : "0")).join("");
const difference = (a: string, b: string) =>
  [...a].reduce((n, value, i) => n + Number(value !== b[i]), 0);
function cubeFromSetup(setup: string) {
  const cube = new Cube().move(setup);
  return cube.move(cube.upright());
}
export function ollVisibleMask(setup: string): string {
  return mask(cubeFromSetup(setup).asString(), VISIBLE);
}
export function ollFeatures(setup: string): OllFeatures {
  const cube = cubeFromSetup(setup),
    state = cube.asString();
  const edges = [1, 3, 5, 7].filter((i) => state[i] === "U");
  const edgeShape =
    edges.length === 0
      ? "dot"
      : edges.length === 4
        ? "cross"
        : edges[0] + edges[1] === 8
          ? "line"
          : "L";
  return {
    orientedCorners: cube.co.slice(0, 4).filter((o) => o === 0).length,
    orientedEdges: edges.length,
    edgeShape,
  };
}

export function buildOllQuizzes(
  cases: Pick<Case, "id" | "number" | "type" | "family" | "setup">[],
): OllQuiz[] {
  const patterns = cases
    .filter((c) => c.type === "OLL")
    .map((c) => ({
      ...c,
      features: ollFeatures(c.setup),
      views: AUFS.map((auf) => {
        const state = cubeFromSetup(c.setup).move(auf).asString();
        return {
          auf,
          top: mask(state, TOP),
          visible: mask(state, VISIBLE),
          full: mask(state, [...TOP, ...RING]),
        };
      }),
    }));
  return patterns.map((correct) => {
    const sameCount = patterns.filter(
      (c) =>
        c.id !== correct.id &&
        c.features.edgeShape === correct.features.edgeShape &&
        c.features.orientedCorners === correct.features.orientedCorners,
    ).length;
    return {
      caseId: correct.id,
      features: correct.features,
      policyNote:
        sameCount >= 2
          ? "Two distractors share the edge pattern and oriented-corner count; the third contrasts the nearest available corner count."
          : `Only ${sameCount} other ${correct.features.edgeShape} case${sameCount === 1 ? " shares" : "s share"} this oriented-corner count; fill the remaining slots with the nearest corner-count patterns of the same edge shape.`,
      views: correct.views.map((view) => {
        const ranked = patterns
          .filter((c) => c.id !== correct.id)
          .map((candidate) => {
            const aligned = candidate.views
              .map((other) => ({
                other,
                topDifferences: difference(view.top, other.top),
                visibleDifferences: difference(view.visible, other.visible),
                score:
                  4 * difference(view.top, other.top) +
                  2 *
                    difference(view.visible.slice(9), other.visible.slice(9)) +
                  difference(view.full, other.full),
              }))
              .sort(
                (a, b) =>
                  a.score - b.score ||
                  AUFS.indexOf(a.other.auf) - AUFS.indexOf(b.other.auf),
              )[0];
            return {
              candidate,
              ...aligned,
              sameEdge:
                candidate.features.edgeShape === correct.features.edgeShape,
              cornerGap: Math.abs(
                candidate.features.orientedCorners -
                  correct.features.orientedCorners,
              ),
              score:
                aligned.score + (candidate.family === correct.family ? 0 : 3),
            };
          });
        const sortNearest = (
          a: (typeof ranked)[number],
          b: (typeof ranked)[number],
        ) =>
          Number(b.sameEdge) - Number(a.sameEdge) ||
          a.cornerGap - b.cornerGap ||
          a.score - b.score ||
          a.candidate.number - b.candidate.number;
        ranked.sort(sortNearest);
        const selected: {
          match: (typeof ranked)[number];
          role: OllDistractor["role"];
        }[] = [];
        const same = ranked.filter((c) => c.sameEdge && c.cornerGap === 0);
        for (const match of same.slice(0, 2))
          selected.push({ match, role: "same-structure" });
        while (selected.length < 2) {
          const match = ranked.find(
            (c) =>
              !selected.some((s) => s.match.candidate.id === c.candidate.id),
          )!;
          selected.push({ match, role: "near-structure" });
        }
        const third =
          ranked.find(
            (c) =>
              c.sameEdge &&
              c.cornerGap > 0 &&
              !selected.some((s) => s.match.candidate.id === c.candidate.id),
          ) ??
          ranked.find(
            (c) =>
              !selected.some((s) => s.match.candidate.id === c.candidate.id),
          )!;
        selected.push({ match: third, role: "corner-contrast" });
        const distractors = selected.map(({ match: m, role }) => ({
          caseId: m.candidate.id,
          role,
          matchedAuf: m.other.auf,
          topDifferences: m.topDifferences,
          visibleDifferences: m.visibleDifferences,
          reason: `${m.sameEdge ? "Same" : "Different"} ${m.candidate.features.edgeShape} edge pattern; ${m.candidate.features.orientedCorners} oriented corner${m.candidate.features.orientedCorners === 1 ? "" : "s"} versus ${correct.features.orientedCorners}; closest U alignment differs at ${m.topDifferences} U sticker${m.topDifferences === 1 ? "" : "s"} and ${m.visibleDifferences} total visible UFR sticker${m.visibleDifferences === 1 ? "" : "s"}.`,
        }));
        return {
          auf: view.auf,
          setup: [correct.setup, view.auf].filter(Boolean).join(" "),
          visibleMask: view.visible,
          answerIds: [correct.id, ...distractors.map((d) => d.caseId)],
          distractors,
        };
      }),
    };
  });
}
