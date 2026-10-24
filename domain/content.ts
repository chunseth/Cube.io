import { Case } from "./models";
import { bundledById } from "./catalog";
import {
  AUFS,
  algorithmWorks,
  canonicalCube,
  caseSignature,
  normalizeMoves,
  normalizeSetup,
  verifySetup,
} from "./lastLayer";
export function identifyCase(
  scramble: string,
  type: Case["type"],
): Case | null {
  try {
    const signature = caseSignature(canonicalCube(scramble), type);
    return (
      [...bundledById.values()].find(
        (c) => c.type === type && c.signature === signature,
      ) ?? null
    );
  } catch {
    return null;
  }
}
export function executionSetup(item: Case, previous = "") {
  const signature = bundledById.get(item.id)?.signature;
  const bases = [
    ...new Set([item.setup, ...(item.setups ?? []).map((s) => s.moves)]),
  ].filter(
    (s) => !!s.trim() && !!signature && verifySetup(s, item.type, signature),
  );
  if (!bases.length)
    throw new Error("This case needs a verified setup scramble.");
  const withAuf = (base: string, auf: string) => {
    const tokens = base.trim().split(/\s+/);
    const last = tokens[tokens.length - 1];
    if (!auf || !/^U[2']?$/.test(last)) return `${base} ${auf}`.trim();
    const power =
      (AUFS.indexOf(last as (typeof AUFS)[number]) +
        AUFS.indexOf(auf as (typeof AUFS)[number])) %
      4;
    tokens.pop();
    return [...tokens, AUFS[power]].filter(Boolean).join(" ");
  };
  const options = [
    ...new Set(bases.flatMap((base) => AUFS.map((auf) => withAuf(base, auf)))),
  ].filter((s) => s !== previous);
  return options[Math.floor(Math.random() * options.length)];
}
export function validateContent(value: unknown, existing: Case[]): Case[] {
  if (!value || typeof value !== "object")
    throw new Error("Expected a versioned content document.");
  const doc = value as { version: number; cases: Case[] };
  if (doc.version !== 1 || !Array.isArray(doc.cases) || doc.cases.length !== 78)
    throw new Error("Expected version 1 with 78 cases.");
  const ids = new Set<string>();
  for (const c of doc.cases) {
    if (!c || typeof c !== "object")
      throw new Error("Every case must be an object.");
    const original = existing.find((x) => x.id === c.id);
    if (
      !original ||
      ids.has(c.id) ||
      c.type !== original.type ||
      c.number !== original.number ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      typeof c.family !== "string" ||
      typeof c.setup !== "string" ||
      typeof c.twoLook !== "boolean" ||
      !Array.isArray(c.algorithms) ||
      c.algorithms.some((a) => typeof a !== "string") ||
      !Array.isArray(c.answers) ||
      c.answers.some(
        (id) => !existing.some((x) => x.id === id && x.type === c.type),
      ) ||
      new Set(c.answers).size !== c.answers.length
    )
      throw new Error(`Invalid content for ${c.id || "unknown case"}.`);
    const reference = bundledById.get(c.id);
    if (!reference?.signature) throw new Error(`Unknown case: ${c.id}`);
    if (c.setup.trim() && !verifySetup(c.setup, c.type, reference.signature))
      throw new Error(
        `${c.name}: setup must preserve F2L and produce this ${c.type} case.`,
      );
    for (const algorithm of c.algorithms)
      if (!algorithmWorks(reference.setup, algorithm, c.type))
        throw new Error(
          `${c.name}: algorithm does not solve this ${c.type} case.`,
        );
    if (c.setups !== undefined) {
      if (!Array.isArray(c.setups))
        throw new Error(`${c.name}: invalid setup list.`);
      const setupIds = new Set<string>();
      for (const setup of c.setups) {
        if (
          !setup ||
          typeof setup.id !== "string" ||
          setupIds.has(setup.id) ||
          typeof setup.moves !== "string" ||
          typeof setup.source !== "string" ||
          typeof setup.url !== "string" ||
          !/^https:\/\//.test(setup.url) ||
          !["trainer", "published", "inverse"].includes(setup.kind) ||
          !verifySetup(setup.moves, c.type, reference.signature)
        )
          throw new Error(
            `${c.name}: invalid or mislabeled alternative setup.`,
          );
        setupIds.add(setup.id);
      }
    }
    if (
      c.algorithmSources !== undefined &&
      (!Array.isArray(c.algorithmSources) ||
        c.algorithmSources.some(
          (s) =>
            !s ||
            typeof s.moves !== "string" ||
            !c.algorithms.includes(s.moves) ||
            typeof s.original !== "string" ||
            typeof s.source !== "string" ||
            typeof s.url !== "string" ||
            !/^https:\/\//.test(s.url),
        ))
    )
      throw new Error(`${c.name}: invalid algorithm attribution.`);
    if (
      c.sources !== undefined &&
      (!Array.isArray(c.sources) ||
        c.sources.some(
          (s) =>
            !s ||
            typeof s.name !== "string" ||
            typeof s.url !== "string" ||
            !/^https:\/\//.test(s.url),
        ))
    )
      throw new Error(`${c.name}: invalid reference links.`);
    if (c.answers.length && (!c.answers.includes(c.id) || c.answers.length < 2))
      throw new Error(
        `${c.name}: answer choices must include the correct case and at least one distractor.`,
      );
    ids.add(c.id);
  }
  return doc.cases.map((c) => ({
    ...c,
    name: c.name.trim(),
    family: c.family.trim() || "Unassigned",
    setup: c.setup.trim() ? normalizeSetup(c.setup) : "",
    algorithms: [...new Set(c.algorithms.map(normalizeMoves))],
    imageId: bundledById.get(c.id)!.imageId,
    signature: bundledById.get(c.id)!.signature,
    setups: c.setups?.map((s) => ({
      ...s,
      moves: normalizeSetup(s.moves),
      verification: {
        f2l: true,
        caseId: c.id,
        signature: bundledById.get(c.id)!.signature!,
      },
    })),
  }));
}

export function recognitionReady(item: Case, cases: Case[]): boolean {
  return (
    !!item.setup.trim() &&
    item.answers.length >= 2 &&
    item.answers.includes(item.id) &&
    item.answers.every((id) =>
      cases.some(
        (c) =>
          c.id === id &&
          c.type === item.type &&
          (item.type === "PLL" || !!c.setup),
      ),
    )
  );
}
