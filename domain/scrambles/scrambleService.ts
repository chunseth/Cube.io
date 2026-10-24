import Cube from "../../vendor/cubejs";

let initialized = false;

// Keep the first screen from waiting on cubejs's synchronous pruning-table setup.
// These are random-state scrambles generated with cubejs; pick one per app launch.
const INITIAL_SCRAMBLES = [
  "U B2 U' L2 U B2 R2 U2 B2 R2 D2 F' R' B D' F D' R' D' L F' U'",
  "B2 R2 B2 D2 U F2 R2 U' R2 D' R2 U' F' U' R D' L U2 F' U B' U'",
  "D2 L2 D2 U L2 U2 F2 R2 F2 U' B2 R' D B L U' F L' D F' L2 U",
  "U F2 R2 D L2 F2 D' L2 U' F2 D2 B L F2 D' R' D U B' D L F'",
  "U' F2 U' L2 D' B2 U B2 L2 U' B2 D2 B' U2 R F D' R2 B U2 F' D2",
  "F2 R2 B2 U F2 U' F2 U L2 B2 R2 B' L R U L' F D' L' U2 B' D2",
  "B2 D F2 L2 F2 D R2 U' F2 R2 D2 L2 U' R' B U' B' D2 B F2 U'",
  "D L2 B2 L2 D' L2 B2 U2 R2 B2 U L2 U' B' R' B F2 U' R B2 R' D'",
  "B2 D2 R2 B2 L2 U F2 D U F2 U2 L' F' R B' F' D R D' U2 R2",
  "R2 B2 U R2 U' L2 U' B2 F2 U2 B2 L2 R' U' R' B' D' F2 R' U B' R'",
  "D B2 F2 D' L2 U R2 F2 U' R2 D F' R U2 B' D' R' U F' R' B' U",
  "R2 U F2 R2 F2 L2 R2 D2 B2 R2 D U' L' R' B' D' L2 F D R U'",
  "D' R2 U L2 B2 D' U' L2 F2 D F2 D2 L' F' R' U' B U2 F2 L2 U2 L'",
  "U F2 D2 U' L2 R2 B2 U' L2 U L2 R2 F2 L D' B' D L2 U L' U R",
  "L2 U' B2 U' R2 U' L2 U' L2 U' B2 U' R' B' F R' B' L2 B2 L2 F' U'",
  "L2 D B2 R2 F2 U2 B2 R2 D R2 F2 U' R' B2 L B U' L' F U B' F2",
];

export function getInitial3x3Scramble(): string {
  return INITIAL_SCRAMBLES[
    Math.floor(Math.random() * INITIAL_SCRAMBLES.length)
  ];
}

/** Initializes cubejs's random-state solver tables once for this app process. */
export function prepareScrambleService(): void {
  if (initialized) return;
  Cube.initSolver();
  initialized = true;
}

/** Generates a uniformly random legal 3×3 state and returns its solving algorithm inverted. */
export function generate3x3Scramble(): string {
  prepareScrambleService();
  let scramble = Cube.scramble();
  // WCA Regulation 4b3 excludes solved and one-move states. Rejection sampling
  // preserves equal probability across the remaining states.
  while (scramble.trim().split(/\s+/).filter(Boolean).length < 2) {
    scramble = Cube.scramble();
  }
  return scramble;
}
