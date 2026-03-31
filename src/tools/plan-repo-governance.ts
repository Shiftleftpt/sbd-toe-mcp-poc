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
import { getOntologyData } from "./ontology-loader.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

const ACTIVE_CHAPTERS_BY_RISK: Record<RiskLevel, string[]> = {
  L1: [
    "00-fundamentos",
    "01-classificacao-aplicacoes",
    "02-requisitos-seguranca",
    "03-threat-modeling",
    "04-arquitetura-segura",
    "05-dependencias-sbom-sca",
    "07-cicd-seguro",
    "08-iac-infraestrutura",
    "09-containers-imagens",
    "10-testes-seguranca",
    "12-monitorizacao-operacoes",
    "14-governanca-contratacao"
  ],
  L2: [
    "00-fundamentos",
    "01-classificacao-aplicacoes",
    "02-requisitos-seguranca",
    "03-threat-modeling",
    "04-arquitetura-segura",
    "05-dependencias-sbom-sca",
    "06-desenvolvimento-seguro",
    "07-cicd-seguro",
    "08-iac-infraestrutura",
    "09-containers-imagens",
    "10-testes-seguranca",
    "11-deploy-seguro",
    "12-monitorizacao-operacoes",
    "14-governanca-contratacao"
  ],
  L3: [
    "00-fundamentos",
    "01-classificacao-aplicacoes",
    "02-requisitos-seguranca",
    "03-threat-modeling",
    "04-arquitetura-segura",
    "05-dependencias-sbom-sca",
    "06-desenvolvimento-seguro",
    "07-cicd-seguro",
    "08-iac-infraestrutura",
    "09-containers-imagens",
    "10-testes-seguranca",
    "11-deploy-seguro",
    "12-monitorizacao-operacoes",
    "13-formacao-onboarding",
    "14-governanca-contratacao"
  ]
};

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
  cache?: SnapshotCache
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

  const artMap = new Map<string, { artefactId: string; chapterId: string; riskLevels: Set<string> }>();

  if (cache !== undefined) {
    const items: unknown[] = Array.isArray(cache.entities.items) ? cache.entities.items : [];
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const rec = item as Record<string, unknown>;
      const objectId = typeof rec["objectID"] === "string" ? rec["objectID"] : undefined;
      const enriched = objectId ? cache.entitiesEnrichedLookup.get(objectId) : undefined;
      const artifactIds: readonly string[] = enriched?.artifact_ids ?? [];
      if (artifactIds.length === 0) continue;

      const chapterId = typeof rec["chapter_id"] === "string" ? rec["chapter_id"] : "";
      const recRiskLevels = Array.isArray(rec["risk_levels"])
        ? (rec["risk_levels"] as unknown[]).filter((r): r is string => typeof r === "string")
        : [];

      for (const artId of artifactIds) {
        if (typeof artId !== "string") continue;
        const key = `${chapterId}::${artId}`;
        if (!artMap.has(key)) {
          artMap.set(key, { artefactId: artId, chapterId, riskLevels: new Set(recRiskLevels) });
        } else {
          const existing = artMap.get(key)!;
          for (const rl of recRiskLevels) existing.riskLevels.add(rl);
        }
      }
    }
  } else {
    const ontology = getOntologyData();
    for (const artifactRequirement of ontology.artifactRequirements ?? []) {
      for (const chapterId of artifactRequirement.chapter_ids ?? []) {
        const chapterRiskLevels = VALID_RISK_LEVELS.filter((level) =>
          ACTIVE_CHAPTERS_BY_RISK[level].includes(chapterId)
        );
        const key = `${chapterId}::${artifactRequirement.artifact_type_id}`;
        if (!artMap.has(key)) {
          artMap.set(key, {
            artefactId: artifactRequirement.artifact_type_id,
            chapterId,
            riskLevels: new Set(chapterRiskLevels)
          });
        } else {
          const existing = artMap.get(key)!;
          for (const rl of chapterRiskLevels) existing.riskLevels.add(rl);
        }
      }
    }
  }

  // Build flat list, filter by riskLevel if provided
  const artefacts: ManualArtefact[] = [];
  for (const meta of artMap.values()) {
    const rls = [...meta.riskLevels].sort();
    if (riskLevel !== null && !rls.includes(riskLevel)) continue;
    artefacts.push({ artefactId: meta.artefactId, chapterId: meta.chapterId, riskLevels: rls });
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
      "Artefacts sourced from the published SbD-ToE runtime and manual chapter applicability model. " +
      "The manual does not provide document templates — if a template is needed, " +
      "ask the LLM to generate one based on the artefact description."
  };
}
