import quizzes from "../content/oll-recognition.json";
import pllBank from "../content/pll-recognition.json";
import type { Case } from "./models";
import { ollVisibleMask, OllQuiz } from "./ollRecognition";
import { pllVisiblePattern } from "./pllRecognition";

export const ollQuizzes = quizzes.cases as OllQuiz[];
export const pllQuizzes = pllBank.cases;
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
