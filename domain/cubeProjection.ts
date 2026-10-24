// Orthographic 3D projection. Cube facelet order is cubejs URFDLB.
type Vec3 = [number, number, number];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const facePoint = (face: number, u: number, v: number): Vec3 => {
  switch (face) {
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
export function projectCube(state: string, yawDegrees: number) {
  const yaw = (yawDegrees * Math.PI) / 180,
    pitch = (30 * Math.PI) / 180;
  const camera: Vec3 = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
  const right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up: Vec3 = [
    -Math.sin(yaw) * Math.sin(pitch),
    Math.cos(pitch),
    -Math.cos(yaw) * Math.sin(pitch),
  ];
  const normals: Vec3[] = [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
    [-1, 0, 0],
    [0, 0, -1],
  ];
  const stickers: {
    id: number;
    face: number;
    color: string;
    points: string;
    depth: number;
  }[] = [];
  normals.forEach((normal, face) => {
    if (dot(normal, camera) <= 0.001) return;
    for (let i = 0; i < 9; i++) {
      const col = i % 3,
        row = Math.floor(i / 3),
        gap = 0.018;
      const x0 = -1 + (col * 2) / 3 + gap,
        x1 = -1 + ((col + 1) * 2) / 3 - gap,
        y0 = -1 + (row * 2) / 3 + gap,
        y1 = -1 + ((row + 1) * 2) / 3 - gap;
      const coords = [
        facePoint(face, x0, y0),
        facePoint(face, x1, y0),
        facePoint(face, x1, y1),
        facePoint(face, x0, y1),
      ];
      stickers.push({
        id: face * 9 + i,
        face,
        color: state[face * 9 + i],
        points: coords
          .map(
            (p) =>
              `${(dot(p, right) * 78).toFixed(3)},${(-dot(p, up) * 78).toFixed(3)}`,
          )
          .join(" "),
        depth: dot(facePoint(face, (x0 + x1) / 2, (y0 + y1) / 2), camera),
      });
    }
  });
  return stickers.sort((a, b) => a.depth - b.depth);
}

// Fixed UFR quiz: F2L is an unsegmented, null surface with no sticker colors.
function projectLastLayerQuestion(state: string, orientationOnly: boolean) {
  const palette: Record<string, string> = {
    U: "#ffda67",
    R: "#f3a45c",
    F: "#5bd3aa",
    D: "#f4f5ef",
    L: "#f27c8b",
    B: "#74b5ff",
  };
  const projected = projectCube(state, 45);
  const surfaces = [1, 2].map((face) => {
    const point = (index: number, corner: number) =>
      projected.find((s) => s.id === face * 9 + index)!.points.split(" ")[
        corner
      ];
    return {
      face,
      points: [point(0, 0), point(2, 1), point(8, 2), point(6, 3)].join(" "),
    };
  });
  const stickers = projected
    .filter((s) => s.face === 0 || s.id % 9 < 3)
    .map((s) => ({
      ...s,
      color: orientationOnly
        ? s.color === "U"
          ? "#ffda67"
          : "#344458"
        : palette[s.color],
    }));
  return { surfaces, stickers };
}

export function projectOllQuestion(state: string) {
  return projectLastLayerQuestion(state, true);
}
export function projectPllQuestion(state: string) {
  return projectLastLayerQuestion(state, false);
}
function lastLayerQuestionSVG(state: string, orientationOnly: boolean): string {
  const { surfaces, stickers } = projectLastLayerQuestion(
    state,
    orientationOnly,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="290" height="250" viewBox="-145 -120 290 250">
${surfaces.map((s) => `<polygon data-null-f2l="${s.face}" points="${s.points}" fill="#152131" stroke="#293c51" stroke-width="2.5" stroke-linejoin="round"/>`).join("\n")}
${stickers.map((s) => `<polygon data-facelet="${s.id}" points="${s.points}" fill="${s.color}" stroke="#0c1420" stroke-width="2.5" stroke-linejoin="round"/>`).join("\n")}
</svg>`;
}
export function ollQuestionSVG(state: string): string {
  return lastLayerQuestionSVG(state, true);
}
export function pllQuestionSVG(state: string): string {
  return lastLayerQuestionSVG(state, false);
}
