/**
 * plan_sbd_toe_repo_governance
 *
 * Returns the list of artefacts/documents identified in the SbD-ToE manual,
 * grouped by chapter, with their risk level applicability.
 * Optionally filtered by riskLevel (L1/L2/L3).
 *
 * All data comes from the entities index — nothing is invented.
 * Document templates are not provided by the manual; the LLM may generate
 * them if asked, using the artefact list as a guide.
 */

import type { SnapshotCache } from "../backend/semantic-index-gateway.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(value);
}

export interface ManualArtefact {
  artefactId: string;
  chapterId: string;
  riskLevels: string[];
}

export interface ArtefactsByChapter {
  chapterId: string;
  artefacts: ManualArtefact[];
}

export interface PlanRepoGovernanceResult {
  riskLevel: string | null;
  totalArtefacts: number;
  byChapter: ArtefactsByChapter[];
  note: string;
}

export function handlePlanRepoGovernance(
  args: Record<string, unknown>,
  cache: SnapshotCache
): PlanRepoGovernanceResult {
  // riskLevel is optional — if provided, filter to artefacts applicable at that level
  const riskLevelArg = args["riskLevel"];
  let riskLevel: RiskLevel | null = null;
  if (riskLevelArg !== undefined && riskLevelArg !== null && riskLevelArg !== "") {
    if (!isValidRiskLevel(riskLevelArg)) {
      throw Object.assign(
        new Error(`riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`),
        { rpcError: { code: -32602, message: `Invalid riskLevel: "${String(riskLevelArg)}"` } }
      );
    }
    riskLevel = riskLevelArg;
  }

  // Extract artefacts from entities index
  const items: unknown[] = Array.isArray(cache.entities.items)
    ? cache.entities.items
    : [];

  const artMap = new Map<string, { chapterId: string; riskLevels: Set<string> }>();

  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const artifactIds = Array.isArray(rec["artifact_ids"]) ? rec["artifact_ids"] : [];
    if (artifactIds.length === 0) continue;

    const chapterId = typeof rec["chapter_id"] === "string" ? rec["chapter_id"] : "";
    const recRiskLevels = Array.isArray(rec["risk_levels"])
      ? (rec["risk_levels"] as unknown[]).filter((r): r is string => typeof r === "string")
      : [];

    for (const artId of artifactIds) {
      if (typeof artId !== "string") continue;
      if (!artMap.has(artId)) {
        artMap.set(artId, { chapterId, riskLevels: new Set(recRiskLevels) });
      } else {
        const existing = artMap.get(artId)!;
        for (const rl of recRiskLevels) existing.riskLevels.add(rl);
      }
    }
  }

  // Build flat list, filter by riskLevel if provided
  const artefacts: ManualArtefact[] = [];
  for (const [artId, meta] of artMap) {
    const rls = [...meta.riskLevels].sort();
    if (riskLevel !== null && !rls.includes(riskLevel)) continue;
    artefacts.push({ artefactId: artId, chapterId: meta.chapterId, riskLevels: rls });
  }

  // Group by chapter, sorted by chapterId
  const chapterMap = new Map<string, ManualArtefact[]>();
  for (const art of artefacts) {
    const list = chapterMap.get(art.chapterId) ?? [];
    list.push(art);
    chapterMap.set(art.chapterId, list);
  }

  const byChapter: ArtefactsByChapter[] = [...chapterMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chapterId, arts]) => ({ chapterId, artefacts: arts }));

  return {
    riskLevel,
    totalArtefacts: artefacts.length,
    byChapter,
    note:
      "Artefacts sourced from the SbD-ToE manual indices. " +
      "The manual does not provide document templates — if a template is needed, " +
      "ask the LLM to generate one based on the artefact description."
  };
}
