import Cube from "../../vendor/cubejs";

const faces = ["U", "R", "F", "D", "L", "B"];
const turns = ["", "'", "2"];
const axis: Record<string, string> = {
  U: "y",
  D: "y",
  R: "x",
  L: "x",
  F: "z",
  B: "z",
};

function randomScramble(): string {
  const moves: string[] = [];
  let previousFace = "";
  let previousAxis = "";
  while (moves.length < 20) {
    const choices = faces.filter(
      (face) => face !== previousFace && axis[face] !== previousAxis,
    );
    const face = choices[Math.floor(Math.random() * choices.length)];
    moves.push(face + turns[Math.floor(Math.random() * turns.length)]);
    previousFace = face;
    previousAxis = axis[face];
  }
  return moves.join(" ");
}

export function getInitial3x3Scramble(): string {
  return randomScramble();
}

/** Cooperatively prepares the solver once, yielding to rendering and touches. */
export function prepareScrambleService(): Promise<void> {
  return Cube.initSolverAsync();
}

/**
 * Produces a fresh legal 3×3 scramble without relying on a bundled bank.
 */
export function generate3x3Scramble(): string {
  return randomScramble();
}
