export const caseColors: Record<string, string> = {
  U: "#ffda67",
  R: "#f3a45c",
  F: "#5bd3aa",
  D: "#f4f5ef",
  L: "#f27c8b",
  B: "#74b5ff",
};

// U is seen from above with F at the bottom. Side strips fold outward.
// R and B reverse their top-row order when unfolded around the U face.
export const caseFacelets = [
  ...Array.from({ length: 9 }, (_, i) => ({
    index: i,
    x: 48 + (i % 3) * 33,
    y: 48 + Math.floor(i / 3) * 33,
    width: 30,
    height: 30,
  })),
  ...[47, 46, 45].map((index, i) => ({
    index,
    x: 48 + i * 33,
    y: 26,
    width: 30,
    height: 16,
  })),
  ...[36, 37, 38].map((index, i) => ({
    index,
    x: 26,
    y: 48 + i * 33,
    width: 16,
    height: 30,
  })),
  ...[11, 10, 9].map((index, i) => ({
    index,
    x: 150,
    y: 48 + i * 33,
    width: 16,
    height: 30,
  })),
  ...[18, 19, 20].map((index, i) => ({
    index,
    x: 48 + i * 33,
    y: 150,
    width: 30,
    height: 16,
  })),
];

export function caseDiagramSVG(
  state: string | null,
  oll: boolean,
  imageId = "cubeio-case",
): string {
  const fill = (index: number) =>
    !state
      ? "#344458"
      : oll
        ? state[index] === "U"
          ? caseColors.U
          : "#344458"
        : caseColors[state[index]];
  return `<svg xmlns="http://www.w3.org/2000/svg" id="${imageId.replace(/[^a-zA-Z0-9_-]/g, "")}" width="192" height="192" viewBox="0 0 192 192">
<rect x="1" y="1" width="190" height="190" rx="22" fill="#101b2a" stroke="#304257"/>
${caseFacelets.map((s) => `<rect data-facelet="${s.index}" x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="3" fill="${fill(s.index)}" stroke="#0b1420" stroke-width="1.2"/>`).join("\n")}
</svg>`;
}
