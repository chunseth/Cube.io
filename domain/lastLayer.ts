import Cube from "cubejs";

export const AUFS = ["", "U", "U2", "U'"] as const;

// Normalize common published notation without silently accepting unknown moves.
export function normalizeMoves(input: string): string {
  const flat = input.replace(/[’′`]/g, "'").replace(/[()]/g, " ").trim();
  if (!flat) return "";
  return flat
    .split(/\s+/)
    .map((token) => {
      const match = /^([URFDLBurfdlbMESxyz])([w]?)([23]?)([']?)$/.exec(token);
      if (!match || (match[2] && !/^[URFDLB]$/.test(match[1])))
        throw new Error(`Unsupported move: ${token}`);
      const face = match[2] ? match[1].toLowerCase() : match[1];
      const power =
        match[3] === "2"
          ? "2"
          : match[3] === "3"
            ? match[4]
              ? ""
              : "'"
            : match[4];
      return face + power;
    })
    .join(" ");
}

export function canonicalCube(moves: string): Cube {
  const cube = new Cube().move(normalizeMoves(moves));
  cube.move(cube.upright());
  return cube;
}

export function normalizeSetup(moves: string): string {
  const normalized = normalizeMoves(moves);
  const rotation = new Cube().move(normalized).upright();
  return [normalized, rotation].filter(Boolean).join(" ");
}

export function f2lSolved(cube: Cube): boolean {
  return (
    cube.center.every((p, i) => p === i) &&
    cube.cp.slice(4).every((p, i) => p === i + 4) &&
    cube.ep.slice(4).every((p, i) => p === i + 4) &&
    cube.co.slice(4).every((o) => o === 0) &&
    cube.eo.slice(4).every((o) => o === 0)
  );
}

export function lastLayerOriented(cube: Cube): boolean {
  return cube.co.every((o) => o === 0) && cube.eo.every((o) => o === 0);
}

export function caseSignature(cube: Cube, type: "OLL" | "PLL"): string {
  const state = cube.clone();
  state.move(state.upright());
  if (!f2lSolved(state))
    throw new Error("Setup must leave the first two layers solved.");
  if (type === "PLL" && !lastLayerOriented(state))
    throw new Error("PLL setup must leave the last layer oriented.");
  const keys: string[] = [];
  if (type === "OLL") {
    for (const auf of AUFS) {
      const c = state.clone().move(auf);
      keys.push(c.co.slice(0, 4).join("") + ":" + c.eo.slice(0, 4).join(""));
    }
  } else {
    // Ignore both the starting U alignment and the final U alignment.
    for (const before of AUFS)
      for (const after of AUFS) {
        const c = new Cube().move(before).multiply(state).move(after);
        keys.push(c.cp.slice(0, 4).join("") + ":" + c.ep.slice(0, 4).join(""));
      }
  }
  return type + ":" + keys.sort()[0];
}

export function verifySetup(
  moves: string,
  type: "OLL" | "PLL",
  expected: string,
): boolean {
  try {
    return caseSignature(canonicalCube(moves), type) === expected;
  } catch {
    return false;
  }
}

export function algorithmWorks(
  setup: string,
  algorithm: string,
  type: "OLL" | "PLL",
): boolean {
  try {
    const start = canonicalCube(setup);
    for (const before of AUFS) {
      const c = start.clone().move(before).move(normalizeMoves(algorithm));
      c.move(c.upright());
      if (!f2lSolved(c) || !lastLayerOriented(c)) continue;
      if (type === "OLL") return true;
      if (AUFS.some((after) => c.clone().move(after).isSolved())) return true;
    }
  } catch {
    return false;
  }
  return false;
}
