import quizzes from "../content/oll-recognition.json";
import pllBank from "../content/pll-recognition.json";
import { recognitionReady } from "./content";
import type { Case } from "./models";
import { ollVisibleMask, OllQuiz } from "./ollRecognition";
import { pllVisiblePattern } from "./pllRecognition";

export const ollQuizzes = quizzes.cases as OllQuiz[];
export const pllQuizzes = pllBank.cases;
export type RecognitionScope = "single" | "family" | "similar" | "type";

// Each case's lookalike group includes its verified choices from every U angle.
// A peer must also be a possible question, rather than only a wrong answer.
const similarCaseIds = new Map(
  [...ollQuizzes, ...pllQuizzes].map((quiz) => [
    quiz.caseId,
    new Set([quiz.caseId, ...quiz.views.flatMap((view) => view.answerIds)]),
  ]),
);

/** Scope question cases separately from the verified distractors for each view. */
export function recognitionCases(
  cases: Case[],
  learned: string[],
  item: Case,
  scope: RecognitionScope,
): Case[] {
  return cases.filter(
    (c) =>
      c.type === item.type &&
      recognitionReady(c, cases) &&
      (scope === "type"
        ? learned.includes(c.id)
        : scope === "similar"
          ? (similarCaseIds.get(item.id)?.has(c.id) ?? c.id === item.id)
          : scope === "family"
            ? c.family === item.family
            : c.id === item.id),
  );
}

export function recognitionAnswers(
  item: Case,
  scramble: string,
  mode: "full" | "two-sided",
): string[] {
  if (mode !== "two-sided") return item.answers;
  if (item.type === "PLL") {
    const pattern = pllVisiblePattern(scramble);
    const view = pllQuizzes
      .find((q) => q.caseId === item.id)
      ?.views.find((v) => v.visiblePattern === pattern);
    if (!view) throw new Error("No verified PLL quiz matches this view.");
    return view.answerIds;
  }
  const visible = ollVisibleMask(scramble);
  const view = ollQuizzes
    .find((q) => q.caseId === item.id)
    ?.views.find((v) => v.visibleMask === visible);
  if (!view) throw new Error("No verified OLL quiz matches this view.");
  return view.answerIds;
}
