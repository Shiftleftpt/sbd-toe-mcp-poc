/**
 * get_threat_landscape
 *
 * Deterministic threat resolution for a given application context using the
 * SbD-ToE ontology threats pipeline.
 *
 * Algorithm (from mcp_ontology_integration.md §4 — threats pipeline):
 *   1. Run consult pipeline to get active requirements (risk_level + optional concerns)
 *   2. Collect active source chapters from filtered requirements
 *   3. For each threat: derive relevance by matching threat.chapter_id chapter number
 *      against active source chapters → confidence "derived"
 *
 * NOTE (§10, constraint 3): threat.associated_controls are file paths, not IDs.
 * Relevance is derived via chapter_id and active domains — not control ID matching.
 *
 * All data is read from data/publish/ — nothing is invented.
 */

import type { Threat } from "./ontology-loader.js";
import { getOntologyData } from "./ontology-loader.js";
import { _resolveConsultResult } from "./consult-security-requirements.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThreatWithConfidence extends Threat {
  _confidence: "derived" | "heuristic";
  _active_chapter: string;
}

export interface GetThreatLandscapeResult {
  risk_level: string;
  threats: ThreatWithConfidence[];
  meta: {
    threatCount: number;
    activeChapters: string[];
    concernsApplied: string[] | null;
    note: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract chapter number prefix from a chapter_id like "02-requisitos-seguranca" → "02" → 2.
 * Returns NaN if the format is not recognized.
 */
function chapterNumber(chapterId: string): number {
  const match = /^(\d+)/.exec(chapterId);
  return match?.[1] !== undefined ? parseInt(match[1], 10) : NaN;
}

// ---------------------------------------------------------------------------
// Internal (exported for testability)
// ---------------------------------------------------------------------------

export function _resolveThreatLandscape(
  args: Record<string, unknown>,
  ontologyData: ReturnType<typeof getOntologyData>
): GetThreatLandscapeResult {
  const { threats: allThreats } = ontologyData;

  // Run consult pipeline to get filtered requirements
  const consult = _resolveConsultResult(args, ontologyData);

  // Collect active source chapter numbers from requirements
  const activeChapterNumbers = new Set<number>(
    consult.requirements.map((r) => r.source_chapter).filter((n) => !isNaN(n))
  );

  // Collect chapter_ids (string slugs) for display
  const activeChapterIds = [...new Set(
    consult.requirements
      .map((r) => r.source_file?.split("/").pop()?.replace(".md", "") ?? "")
      .filter(Boolean)
  )];

  // Collect active domains for heuristic fallback
  const activeDomains = new Set(consult.activeDomains);

  // Filter threats
  const threats: ThreatWithConfidence[] = [];
  for (const threat of allThreats) {
    const chId = threat.chapter_id ?? "";
    const chNum = chapterNumber(chId);

    if (!isNaN(chNum) && activeChapterNumbers.has(chNum)) {
      threats.push({
        ...threat,
        _confidence: "derived",
        _active_chapter: chId
      });
      continue;
    }

    // Heuristic fallback: threat chapter_id contains a domain keyword
    const lowerChId = chId.toLowerCase();
    let heuristicMatch = false;
    for (const domain of activeDomains) {
      if (lowerChId.includes(domain.replace(/_/g, "-"))) {
        heuristicMatch = true;
        break;
      }
    }
    if (heuristicMatch) {
      threats.push({
        ...threat,
        _confidence: "heuristic",
        _active_chapter: chId
      });
    }
  }

  // Sort: derived first, then heuristic; within group by chapter_id
  threats.sort((a, b) => {
    if (a._confidence !== b._confidence) {
      return a._confidence === "derived" ? -1 : 1;
    }
    return (a.chapter_id ?? "").localeCompare(b.chapter_id ?? "");
  });

  return {
    risk_level: consult.risk_level,
    threats,
    meta: {
      threatCount: threats.length,
      activeChapters: [...activeChapterNumbers].sort((a, b) => a - b).map(String),
      concernsApplied: consult.meta.concernsApplied,
      note:
        "Threats resolved deterministically from the SbD-ToE ontology via chapter matching. " +
        "associated_controls are file paths — relevance derived via chapter_id (§10 constraint 3). " +
        "confidence: 'derived' = chapter number match; 'heuristic' = domain keyword match."
    }
  };
}

// ---------------------------------------------------------------------------
// Public handler
// ---------------------------------------------------------------------------

export function handleGetThreatLandscape(
  args: Record<string, unknown>
): GetThreatLandscapeResult {
  return _resolveThreatLandscape(args, getOntologyData());
}
