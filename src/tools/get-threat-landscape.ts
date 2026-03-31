/**
 * get_threat_landscape
 *
 * Deterministic threat resolution for a given application context using the
 * published SbD-ToE runtime bundle.
 *
 * Resolution order:
 *   1. Resolve consult-mode requirements and controls
 *   2. Scope threats by active requirement bundle/chapter context
 *   3. Resolve mitigated_by with direct > derived > heuristic confidence
 *   4. Enrich threats with related antipatterns and violated requirements
 */

import type {
  AntiPattern,
  AntiPatternRequirementLink,
  AntiPatternThreatLink,
  Threat
} from "./ontology-loader.js";
import {
  getOntologyData,
  resolveRequirementBundle,
  resolveThreatChapterNumber
} from "./ontology-loader.js";
import { _resolveConsultResult } from "./consult-security-requirements.js";

export interface MitigatingControl {
  control_id: string;
  name: string;
  domain: string;
}

export interface RelatedAntiPattern {
  antipattern_id: string;
  label: string;
  violated_requirement_ids: string[];
}

export interface ThreatWithConfidence extends Threat {
  id: string;
  name: string;
  mitigation_confidence: "direct" | "derived" | "heuristic";
  mitigated_by: MitigatingControl[];
  related_antipatterns: RelatedAntiPattern[];
}

export interface McpProvenance {
  content_type: "canonical" | "derived" | "inferred";
  produced_by: string;
  source_data: string;
  note: string;
}

export interface GetThreatLandscapeResult {
  provenance: McpProvenance;
  risk_level: string;
  threats: ThreatWithConfidence[];
  meta: {
    threatCount: number;
    activeChapters: string[];
    activeBundles: string[];
    concernsApplied: string[] | null;
    note: string;
  };
}

function chapterNumber(chapterId: string): number {
  const match = /^(\d+)/.exec(chapterId);
  return match?.[1] !== undefined ? Number.parseInt(match[1], 10) : NaN;
}

function buildAntipatternIndexes(
  antipatterns: AntiPattern[],
  antipatternRequirementLinks: AntiPatternRequirementLink[],
  antipatternThreatLinks: AntiPatternThreatLink[]
): {
  antipatternById: Map<string, AntiPattern>;
  requirementIdsByAntipattern: Map<string, string[]>;
  antipatternIdsByThreat: Map<string, string[]>;
} {
  const antipatternById = new Map(
    antipatterns.map((antipattern) => [antipattern.antipattern_id, antipattern])
  );

  const requirementIdsByAntipattern = new Map<string, string[]>();
  for (const link of antipatternRequirementLinks) {
    const existing = requirementIdsByAntipattern.get(link.source_id) ?? [];
    existing.push(link.target_id);
    requirementIdsByAntipattern.set(link.source_id, existing);
  }

  const antipatternIdsByThreat = new Map<string, string[]>();
  for (const link of antipatternThreatLinks) {
    const existing = antipatternIdsByThreat.get(link.target_id) ?? [];
    existing.push(link.source_id);
    antipatternIdsByThreat.set(link.target_id, existing);
  }

  return { antipatternById, requirementIdsByAntipattern, antipatternIdsByThreat };
}

export function _resolveThreatLandscape(
  args: Record<string, unknown>,
  ontologyData: ReturnType<typeof getOntologyData>
): Omit<GetThreatLandscapeResult, "provenance"> {
  const {
    threats: allThreats,
    antipatterns = [],
    antipatternRequirementLinks = [],
    antipatternThreatLinks = [],
  } = ontologyData;

  const consult = _resolveConsultResult(args, ontologyData);
  const activeRequirementIds = new Set(
    consult.requirements.map((requirement) => requirement.requirement_id)
  );
  const activeBundles = new Set(
    consult.requirements
      .map((requirement) => resolveRequirementBundle(requirement))
      .filter((bundle): bundle is string => typeof bundle === "string" && bundle.length > 0)
  );
  const activeChapterNumbers = new Set<number>(
    consult.requirements
      .map((requirement) => requirement.source_chapter)
      .filter((chapter) => !Number.isNaN(chapter))
  );
  const activeDomains = new Set(consult.active_domains);
  const activeControls = consult.controls.map((control) => ({
    control_id: control.control_id,
    name: control.name,
    domain: control.domain,
    chapter_ids: control.chapter_ids ?? [],
  }));
  const activeControlIds = new Set(activeControls.map((control) => control.control_id));

  const controlsByChapter = new Map<string, MitigatingControl[]>();
  for (const control of activeControls) {
    for (const chapterId of control.chapter_ids) {
      const existing = controlsByChapter.get(chapterId) ?? [];
      existing.push({
        control_id: control.control_id,
        name: control.name,
        domain: control.domain,
      });
      controlsByChapter.set(chapterId, existing);
    }
  }

  const {
    antipatternById,
    requirementIdsByAntipattern,
    antipatternIdsByThreat,
  } = buildAntipatternIndexes(antipatterns, antipatternRequirementLinks, antipatternThreatLinks);

  const threats: ThreatWithConfidence[] = [];

  for (const threat of allThreats) {
    const threatId = threat.id ?? threat.mitigated_threat_id ?? "";
    const threatName = threat.title ?? threat.threat_label_raw ?? "";
    const threatChapterId = threat.chapter_id ?? "";
    const threatChapterNumber = resolveThreatChapterNumber(threat);
    const directControlIds = (threat.canonical_control_ids ?? []).filter((controlId) =>
      activeControlIds.has(controlId)
    );
    const derivedControls = controlsByChapter.get(threatChapterId) ?? [];

    const relatedAntipatternIds = antipatternIdsByThreat.get(threatId) ?? [];
    const related_antipatterns: RelatedAntiPattern[] = relatedAntipatternIds
      .map((antipatternId) => {
        const antipattern = antipatternById.get(antipatternId);
        if (!antipattern) return undefined;
        const violatedRequirementIds = [
          ...new Set(requirementIdsByAntipattern.get(antipatternId) ?? []),
        ];
        return {
          antipattern_id: antipattern.antipattern_id,
          label: antipattern.label,
          violated_requirement_ids: violatedRequirementIds,
        };
      })
      .filter((item): item is RelatedAntiPattern => item !== undefined);

    const hasActiveRequirementLink = related_antipatterns.some((antipattern) =>
      antipattern.violated_requirement_ids.some((requirementId) =>
        activeRequirementIds.has(requirementId)
      )
    );

    const directMatch = directControlIds.length > 0;
    const bundleMatch = threatChapterId.length > 0 && activeBundles.has(threatChapterId);
    const chapterMatch =
      !Number.isNaN(threatChapterNumber) && activeChapterNumbers.has(threatChapterNumber);
    const derivedMatch = bundleMatch || chapterMatch || hasActiveRequirementLink;

    const lowerThreatChapter = threatChapterId.toLowerCase();
    const heuristicMatch = [...activeDomains].some((domain) =>
      lowerThreatChapter.includes(domain.replace(/_/g, "-"))
    );

    if (!directMatch && !derivedMatch && !heuristicMatch) {
      continue;
    }

    let mitigation_confidence: ThreatWithConfidence["mitigation_confidence"];
    let mitigated_by: MitigatingControl[];

    if (directMatch) {
      mitigation_confidence = "direct";
      mitigated_by = activeControls
        .filter((control) => directControlIds.includes(control.control_id))
        .map(({ chapter_ids: _chapterIds, ...control }) => control);
    } else if (derivedControls.length > 0) {
      mitigation_confidence = "derived";
      mitigated_by = derivedControls;
    } else if (derivedMatch) {
      mitigation_confidence = "derived";
      mitigated_by = [];
    } else {
      mitigation_confidence = "heuristic";
      mitigated_by = [];
    }

    threats.push({
      ...threat,
      id: threatId,
      name: threatName,
      mitigation_confidence,
      mitigated_by,
      related_antipatterns,
    });
  }

  threats.sort((left, right) => {
    const rank = { direct: 0, derived: 1, heuristic: 2 } as const;
    const confidenceOrder = rank[left.mitigation_confidence] - rank[right.mitigation_confidence];
    if (confidenceOrder !== 0) return confidenceOrder;
    return (left.chapter_id ?? "").localeCompare(right.chapter_id ?? "");
  });

  return {
    risk_level: consult.risk_level,
    threats,
    meta: {
      threatCount: threats.length,
      activeChapters: [...activeChapterNumbers].sort((a, b) => a - b).map(String),
      activeBundles: [...activeBundles].sort(),
      concernsApplied: consult.meta.concernsApplied,
      note:
        "Threat applicability resolves from consult-mode requirement scope. mitigation_confidence uses direct control references first, then chapter/bundle or antipattern-derived alignment, then heuristic domain fallback.",
    },
  };
}

export function handleGetThreatLandscape(
  args: Record<string, unknown>
): GetThreatLandscapeResult {
  const full = _resolveThreatLandscape(args, getOntologyData());
  return {
    ...full,
    provenance: {
      content_type: "derived",
      produced_by: "threat_resolution_pipeline",
      source_data:
        "runtime/threats.json + runtime/requirement_control_links.json + runtime/antipatterns.json + runtime/antipattern_requirement_links.json + runtime/antipattern_threat_links.json",
      note:
        "Threat entries are canonical runtime entities. Mitigation and antipattern enrichment are derived structurally from the published deterministic runtime bundle.",
    },
    threats: full.threats.map((threat) => ({
      id: threat.id,
      name: threat.name,
      mitigation_confidence: threat.mitigation_confidence,
      mitigated_by: threat.mitigated_by,
      related_antipatterns: threat.related_antipatterns,
      associated_controls: [],
      ...(threat.mitigated_threat_id ? { mitigated_threat_id: threat.mitigated_threat_id } : {}),
      ...(threat.chapter_id ? { chapter_id: threat.chapter_id } : {}),
      ...(threat.mitigation_summary ? { mitigation_summary: threat.mitigation_summary } : {}),
      ...(threat.how_it_arises ? { how_it_arises: threat.how_it_arises } : {}),
      ...(threat.methodology ? { methodology: threat.methodology } : {}),
      ...(threat.essence ? { essence: threat.essence } : {}),
    })),
  };
}
