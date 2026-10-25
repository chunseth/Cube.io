import Cube from "cubejs";
import { normalizeMoves } from "./lastLayer";
export type Vec = [number, number, number];
type Axis = 0 | 1 | 2;
export type Turn = {
  token: string;
  axis: Axis;
  layers: number[];
  angle: number;
};
export type Sticker = {
  id: number;
  color: string;
  muted: boolean;
  center: Vec;
  corners: Vec[];
};
const point = (f: number, u: number, v: number): Vec => {
  switch (f) {
    case 0:
      return [u, 1, v];
    case 1:
      return [1, -v, -u];
    case 2:
      return [u, -v, 1];
    case 3:
      return [u, -1, -v];
    case 4:
      return [-1, -v, u];
    default:
      return [-u, -v, -1];
  }
};
export function rotate(p: Vec, axis: Axis, angle: number): Vec {
  const q: Vec = [...p];
  const a = (axis + 1) % 3,
    b = (axis + 2) % 3;
  q[a] = p[a] * Math.cos(angle) - p[b] * Math.sin(angle);
  q[b] = p[a] * Math.sin(angle) + p[b] * Math.cos(angle);
  return q;
}
export function parseTurns(algorithm: string): Turn[] {
  const normalized = normalizeMoves(algorithm);
  if (!normalized) throw new Error("Enter an algorithm to preview.");
  return normalized.split(" ").map((token) => {
    const face = token[0],
      upper = face.toUpperCase();
    const axis: Axis =
      "Mx".includes(face) || "RL".includes(upper)
        ? 0
        : "Ey".includes(face) || "UD".includes(upper)
          ? 1
          : 2;
    const sign = "RUFxyz".includes(face) || "RUF".includes(upper) ? -1 : 1;
    const layer = "RUF".includes(upper) ? 1 : -1;
    const layers = "xyz".includes(face)
      ? [-1, 0, 1]
      : "MES".includes(face)
        ? [0]
        : face === face.toLowerCase()
          ? [0, layer]
          : [layer];
    // E and M turn like D and L; S turns like F.
    const direction = face === "S" ? -1 : sign;
    return {
      token,
      axis,
      layers,
      angle:
        direction *
        (token.includes("2") ? Math.PI : Math.PI / 2) *
        (token.includes("'") ? -1 : 1),
    };
  });
}
export function turnStickers(
  stickers: Sticker[],
  turn: Turn,
  fraction = 1,
): Sticker[] {
  return stickers.map((s) =>
    turn.layers.includes(Math.round(s.center[turn.axis]))
      ? {
          ...s,
          center: rotate(s.center, turn.axis, turn.angle * fraction),
          corners: s.corners.map((p) =>
            rotate(p, turn.axis, turn.angle * fraction),
          ),
        }
      : s,
  );
}
export function solvedStickers(type: "OLL" | "PLL"): Sticker[] {
  return Array.from({ length: 54 }, (_, id) => {
    const face = Math.floor(id / 9),
      row = Math.floor((id % 9) / 3),
      col = id % 3;
    const center = point(face, col - 1, row - 1);
    const muted = type === "OLL" ? face !== 0 : center[1] !== 1;
    const u = ((col - 1) * 2) / 3,
      v = ((row - 1) * 2) / 3,
      half = 0.235;
    return {
      id,
      color: "URFDLB"[face],
      muted,
      center,
      corners: [
        point(face, u - half, v - half),
        point(face, u + half, v - half),
        point(face, u + half, v + half),
        point(face, u - half, v + half),
      ],
    };
  });
}
export function animationRig(algorithm: string, type: "OLL" | "PLL") {
  const turns = parseTurns(algorithm);
  // A solution can finish with rotated centers (x/z, wide moves, slices).
  // Orient the solved target to those final centers before reversing moves,
  // so the initial case has yellow up and green front. Keep the original
  // move axes unchanged throughout playback.
  const finalOrientation = Cube.inverse(
    new Cube().move(normalizeMoves(algorithm)).upright(),
  );
  let target = solvedStickers(type);
  if (finalOrientation)
    for (const turn of parseTurns(finalOrientation))
      target = turnStickers(target, turn);
  let start = target;
  for (const turn of [...turns].reverse())
    start = turnStickers(start, { ...turn, angle: -turn.angle });
  const frames = [start];
  for (const turn of turns)
    frames.push(turnStickers(frames[frames.length - 1], turn));
  // Presentation-only return: undo explicit x rotations after the solution.
  // Keep these turns separate from the algorithm and its move counter.
  const xQuarters = turns
    .filter((turn) => turn.token[0] === "x")
    .reduce((sum, turn) => sum + Math.round(turn.angle / (Math.PI / 2)), 0);
  const netX = ((xQuarters % 4) + 4) % 4;
  const returnTurns: Turn[] =
    netX === 0
      ? []
      : [
          {
            token: "",
            axis: 0,
            layers: [-1, 0, 1],
            angle: (-(netX === 3 ? -1 : netX) * Math.PI) / 2,
          },
        ];
  const returnFrames = [frames[frames.length - 1]];
  for (const turn of returnTurns)
    returnFrames.push(
      turnStickers(returnFrames[returnFrames.length - 1], turn),
    );
  return { turns, frames, returnTurns, returnFrames };
}
export function projectStickers(stickers: Sticker[]) {
  // Slightly off front, elevated: rear stickers remain visible through the hollow rig.
  const yaw = (-18 * Math.PI) / 180,
    pitch = (28 * Math.PI) / 180;
  const view = (p: Vec) => {
    const x = p[0] * Math.cos(yaw) - p[2] * Math.sin(yaw);
    const z = p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
    return [
      x * 78,
      -(p[1] * Math.cos(pitch) - z * Math.sin(pitch)) * 78,
      p[1] * Math.sin(pitch) + z * Math.cos(pitch),
    ];
  };
  return stickers
    .map((s) => ({
      ...s,
      // The sticker plane lies outside its cubie center; their difference
      // gives the outward normal, including during partial turns.
      backFacing:
        s.corners.reduce((n, p) => n + view(p)[2], 0) / 4 -
          view(s.center)[2] * (2 / 3) <
        0,
      depth: s.corners.reduce((n, p) => n + view(p)[2], 0) / 4,
      points: s.corners.map((p) => view(p).slice(0, 2).join(",")).join(" "),
    }))
    .sort((a, b) => a.depth - b.depth);
}
