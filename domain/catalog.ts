import bundled from "../content/cases.json";
import { Case } from "./models";

export const bundledCases = bundled as Case[];
export const bundledById = new Map(bundledCases.map((c) => [c.id, c]));

// Fill old placeholders while preserving authored content and user progress.
export function mergeBundledCases(saved?: Case[]): Case[] {
  return bundledCases.map((base) => {
    const old = saved?.find((c) => c.id === base.id);
    if (!old) return base;
    return {
      ...base,
      ...old,
      family:
        !old.family || old.family === "Unassigned" || old.family === "PLL"
          ? base.family
          : old.family,
      setup: old.setup?.trim() || base.setup,
      algorithms: [...new Set([...base.algorithms, ...(old.algorithms ?? [])])],
      answers: old.answers?.length >= 2 ? old.answers : base.answers,
      imageId: base.imageId,
      signature: base.signature,
      sources: base.sources,
      algorithmSources: base.algorithmSources,
      setups: [
        ...(base.setups ?? []),
        ...(old.setups ?? []).filter(
          (s) => !base.setups?.some((b) => b.id === s.id),
        ),
      ],
    };
  });
}
