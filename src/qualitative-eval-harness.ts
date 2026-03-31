import { searchManualQuestion } from "./orchestrator/ask-manual.js";
import type { ManualToolResult } from "./types.js";
import { handleConsultSecurityRequirements } from "./tools/consult-security-requirements.js";
import { handleGetGuideByRole } from "./tools/get-guide-by-role.js";
import { handleGetThreatLandscape } from "./tools/get-threat-landscape.js";
import { handleResolveEntities } from "./tools/resolve-entities.js";
import { handleGetSbdToeChapterBrief } from "./tools/structured-tools.js";

export type EvalProfile = "consult" | "guide" | "review" | "threats";
export type EvalOutcome = "pass" | "warn" | "fail";
export type FailureTaxonomy =
  | "loader_contract"
  | "deterministic_resolution"
  | "chapter_scope"
  | "grounding"
  | "citation"
  | "profile_routing"
  | "review_semantics"
  | "threat_reasoning"
  | "vector_overreach";
export type TriageOwner = "mcp" | "graph" | "mixed" | "unclear";

export interface QualitativeManualEvaluation {
  outcome: EvalOutcome;
  deterministicFirst?: boolean;
  provenanceUseful?: boolean;
  issueType?: FailureTaxonomy;
  note?: string;
}

export interface QualitativeEvalCaseDefinition {
  id: string;
  profile: EvalProfile;
  prompt: string;
  expected: string[];
  toolPath: string[];
  manualHeavy: boolean;
}

export interface QualitativeEvalObservation {
  autoOutcome: EvalOutcome;
  deterministicFirst: boolean | null;
  provenanceUseful: boolean | null;
  likelyOwner: TriageOwner;
  summary: string[];
  citations: string[];
  chapters: string[];
  consultedIndices: string[];
  failureHints: FailureTaxonomy[];
  excerpt: string;
  backendSnapshot: ManualToolResult["debug"]["backendSnapshot"] | null;
  data: Record<string, unknown>;
}

export interface QualitativeEvalCaseResult extends QualitativeEvalCaseDefinition {
  observed: QualitativeEvalObservation;
  manual?: QualitativeManualEvaluation;
}

export interface QualitativeEvalReport {
  generatedAt: string;
  profiles: EvalProfile[];
  caseIds: string[];
  cases: QualitativeEvalCaseResult[];
  autoSummary: Record<EvalOutcome, number>;
  manualSummary: Partial<Record<EvalOutcome, number>>;
}

interface InternalCaseDefinition extends QualitativeEvalCaseDefinition {
  run: () => Promise<QualitativeEvalObservation>;
}

interface SearchProbe {
  text: string;
  excerpt: string;
  citations: string[];
  chapters: string[];
  consultedIndices: string[];
  backendSnapshot: ManualToolResult["debug"]["backendSnapshot"];
  retrievedPreview: string[];
}

function truncate(value: string, maxLength = 700): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function unique(values: Iterable<string | undefined>): string[] {
  const bucket = new Set<string>();
  for (const value of values) {
    if (value) {
      bucket.add(value);
    }
  }
  return [...bucket];
}

function previewUnknownList(
  items: unknown[],
  keyCandidates: string[],
  limit = 5
): string[] {
  const preview: string[] = [];
  for (const item of items.slice(0, limit)) {
    if (typeof item !== "object" || item === null) {
      preview.push(truncate(String(item), 120));
      continue;
    }
    const record = item as Record<string, unknown>;
    const keyParts = keyCandidates
      .map((key) => asString(record[key]))
      .filter((value): value is string => typeof value === "string");
    preview.push(truncate(keyParts.join(" | ") || JSON.stringify(record), 160));
  }
  return preview;
}

function phasePreview(assignments: unknown[]): string[] {
  return unique(
    assignments.map((item) => {
      if (typeof item !== "object" || item === null) return undefined;
      return asString((item as Record<string, unknown>)["phase"]);
    })
  ).sort();
}

function defaultOwner(failureHints: FailureTaxonomy[], autoOutcome: EvalOutcome): TriageOwner {
  if (autoOutcome === "pass") {
    return "unclear";
  }
  if (
    failureHints.includes("loader_contract") ||
    failureHints.includes("deterministic_resolution") ||
    failureHints.includes("profile_routing")
  ) {
    return "mcp";
  }
  if (
    failureHints.includes("grounding") ||
    failureHints.includes("citation") ||
    failureHints.includes("vector_overreach")
  ) {
    return "graph";
  }
  if (failureHints.includes("chapter_scope") || failureHints.includes("threat_reasoning")) {
    return "mixed";
  }
  return "unclear";
}

async function runSearchProbe(prompt: string): Promise<SearchProbe> {
  const result = await searchManualQuestion(prompt, false, 4);
  const excerpt = truncate(result.text, 900);
  const retrievedPreview = result.debug.retrieved
    .slice(0, 4)
    .map((record) =>
      truncate(
        [record.citationId, record.chapter ?? "n/d", record.title, record.traceability?.sourcePath]
          .filter(Boolean)
          .join(" | "),
        180
      )
    );

  return {
    text: result.text,
    excerpt,
    citations: result.debug.selectedCitationIds,
    chapters: result.debug.chapters,
    consultedIndices: result.debug.consultedIndices,
    backendSnapshot: result.debug.backendSnapshot,
    retrievedPreview,
  };
}

function makeObservation(args: {
  autoOutcome: EvalOutcome;
  deterministicFirst: boolean | null;
  provenanceUseful: boolean | null;
  failureHints: FailureTaxonomy[];
  summary: string[];
  citations?: string[];
  chapters?: string[];
  consultedIndices?: string[];
  excerpt: string;
  backendSnapshot?: ManualToolResult["debug"]["backendSnapshot"] | null;
  data?: Record<string, unknown>;
}): QualitativeEvalObservation {
  const failureHints = unique(args.failureHints);
  return {
    autoOutcome: args.autoOutcome,
    deterministicFirst: args.deterministicFirst,
    provenanceUseful: args.provenanceUseful,
    likelyOwner: defaultOwner(failureHints as FailureTaxonomy[], args.autoOutcome),
    summary: args.summary,
    citations: args.citations ?? [],
    chapters: args.chapters ?? [],
    consultedIndices: args.consultedIndices ?? [],
    failureHints: failureHints as FailureTaxonomy[],
    excerpt: args.excerpt,
    backendSnapshot: args.backendSnapshot ?? null,
    data: args.data ?? {},
  };
}

async function runConsultL1(): Promise<QualitativeEvalObservation> {
  const l1 = handleConsultSecurityRequirements({ risk_level: "L1" });
  const l2 = handleConsultSecurityRequirements({ risk_level: "L2" });
  const search = await runSearchProbe(
    "Para uma aplicacao L1 interna com dados low, o que se aplica genericamente?"
  );
  const autoOutcome: EvalOutcome =
    l1.meta.requirementCount > 0 &&
    l1.meta.requirementCount < l2.meta.requirementCount &&
    search.citations.length > 0
      ? "pass"
      : "fail";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["deterministic_resolution", "grounding", "citation"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `L1 requirements=${l1.meta.requirementCount}, controls=${l1.meta.controlCount}, artifacts=${l1.meta.artifactCount}`,
      `L1 active_categories=${l1.active_categories.join(", ") || "n/d"}`,
      `L2 baseline requirements=${l2.meta.requirementCount}`,
      `retrieval citations=${search.citations.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `consult_security_requirements(L1) -> ${JSON.stringify({
          requirementCount: l1.meta.requirementCount,
          controlCount: l1.meta.controlCount,
          artifactCount: l1.meta.artifactCount,
          active_categories: l1.active_categories,
          active_domains: l1.active_domains,
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1200
    ),
    data: {
      consult: l1,
      l2BaselineRequirementCount: l2.meta.requirementCount,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runConsultL2(): Promise<QualitativeEvalObservation> {
  const l1 = handleConsultSecurityRequirements({ risk_level: "L1" });
  const l2 = handleConsultSecurityRequirements({ risk_level: "L2" });
  const search = await runSearchProbe(
    "Para uma aplicacao L2 publica com dados regulated, que requisitos e controlos se aplicam?"
  );
  const expectedCategories = ["AUT", "ACC", "API", "INT", "SES"];
  const matchingCategories = expectedCategories.filter((category) =>
    l2.active_categories.includes(category)
  );
  const autoOutcome: EvalOutcome =
    l2.meta.requirementCount > l1.meta.requirementCount &&
    matchingCategories.length >= 3 &&
    search.citations.length > 0
      ? "pass"
      : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["deterministic_resolution", "grounding", "profile_routing"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `L2 requirements=${l2.meta.requirementCount} vs L1 baseline=${l1.meta.requirementCount}`,
      `matched expected categories=${matchingCategories.join(", ") || "none"}`,
      `L2 active_domains=${l2.active_domains.join(", ") || "n/d"}`,
      `retrieval citations=${search.citations.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `consult_security_requirements(L2) -> ${JSON.stringify({
          requirementCount: l2.meta.requirementCount,
          controlCount: l2.meta.controlCount,
          artifactCount: l2.meta.artifactCount,
          active_categories: l2.active_categories,
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1200
    ),
    data: {
      consult: l2,
      l1BaselineRequirementCount: l1.meta.requirementCount,
      matchingCategories,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runConsultChapterScoped(): Promise<QualitativeEvalObservation> {
  const chapterId = "07-cicd-seguro";
  const brief = handleGetSbdToeChapterBrief({ chapterId }) as Record<string, unknown>;
  const search = await runSearchProbe("No capitulo 07-cicd-seguro, para L2, o que se aplica?");
  const chapterMatched = search.chapters.includes(chapterId);
  const autoOutcome: EvalOutcome = chapterMatched && search.citations.length > 0 ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: false,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["chapter_scope", "grounding", "citation"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
      `chapter brief title=${String(brief["title"] ?? "n/d")}`,
      `chapter brief artifacts=${asStringArray(brief["artifacts"]).slice(0, 5).join(", ") || "n/d"}`,
      `retrieval citations=${search.citations.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `get_sbd_toe_chapter_brief(${chapterId}) -> ${JSON.stringify({
          title: brief["title"],
          objective: brief["objective"],
          phases: brief["phases"],
          artifacts: asStringArray(brief["artifacts"]).slice(0, 5),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1200
    ),
    data: {
      chapterBrief: brief,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runConsultAuth(): Promise<QualitativeEvalObservation> {
  const l2 = handleConsultSecurityRequirements({ risk_level: "L2" });
  const auth = handleConsultSecurityRequirements({
    risk_level: "L2",
    concerns: ["auth"],
  });
  const search = await runSearchProbe("Quais os requisitos de autenticacao para uma app L2 publica?");
  const focusCategories = ["AUT", "ACC", "SES"];
  const matching = focusCategories.filter((category) => auth.active_categories.includes(category));
  const autoOutcome: EvalOutcome =
    auth.meta.requirementCount > 0 &&
    auth.meta.requirementCount < l2.meta.requirementCount &&
    matching.length >= 2
      ? "pass"
      : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["deterministic_resolution", "profile_routing", "grounding"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `auth requirements=${auth.meta.requirementCount} vs generic L2=${l2.meta.requirementCount}`,
      `auth active_categories=${auth.active_categories.join(", ") || "n/d"}`,
      `matched auth categories=${matching.join(", ") || "none"}`,
      `rule trace includes concerns filter=${String(auth.rule_trace.some((entry) => entry.includes("CONCERNS_FILTER_REQUIREMENTS")))}`,
    ],
    excerpt: truncate(
      [
        `consult_security_requirements(L2, concerns=auth) -> ${JSON.stringify({
          requirementCount: auth.meta.requirementCount,
          controlCount: auth.meta.controlCount,
          active_categories: auth.active_categories,
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1200
    ),
    data: {
      consult: auth,
      l2BaselineRequirementCount: l2.meta.requirementCount,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runGuideArchitecture(): Promise<QualitativeEvalObservation> {
  const chapterId = "04-arquitetura-segura";
  const practices = handleResolveEntities({
    record_type: "practice",
    filters: { chapter_id: chapterId },
    limit: 8,
  });
  const assignments = handleResolveEntities({
    record_type: "assignment",
    filters: { chapter_id: chapterId, risk_level: "L2" },
    limit: 8,
  });
  const stories = handleResolveEntities({
    record_type: "user_story",
    filters: { chapter_id: chapterId },
    limit: 8,
  });
  const search = await runSearchProbe(
    "Como implementar os requisitos aplicaveis no capitulo 04-arquitetura-segura?"
  );
  const chapterMatched = search.chapters.includes(chapterId);
  const autoOutcome: EvalOutcome =
    practices.total > 0 && assignments.total > 0 && stories.total > 0 && chapterMatched
      ? "pass"
      : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["profile_routing", "chapter_scope", "grounding"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `practices=${practices.total}, assignments(L2)=${assignments.total}, user_stories=${stories.total}`,
      `practice preview=${previewUnknownList(practices.entities, ["id", "label", "chapter_id"]).join(" ; ") || "n/d"}`,
      `assignment preview=${previewUnknownList(assignments.entities, ["id", "practice_id", "role", "phase"]).join(" ; ") || "n/d"}`,
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `resolve_entities(practice, chapter=${chapterId}) -> ${JSON.stringify({
          total: practices.total,
          preview: previewUnknownList(practices.entities, ["id", "label", "chapter_id"]),
        })}`,
        `resolve_entities(assignment, chapter=${chapterId}, risk=L2) -> ${JSON.stringify({
          total: assignments.total,
          preview: previewUnknownList(assignments.entities, ["id", "role", "phase", "practice_id"]),
        })}`,
        `resolve_entities(user_story, chapter=${chapterId}) -> ${JSON.stringify({
          total: stories.total,
          preview: previewUnknownList(stories.entities, ["id", "us_id", "title"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1500
    ),
    data: {
      practices,
      assignments,
      stories,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runGuideDeveloperCicd(): Promise<QualitativeEvalObservation> {
  const guide = handleGetGuideByRole({ risk_level: "L2", role: "developer" });
  const search = await runSearchProbe(
    "O que e esperado do developer em 07-cicd-seguro para L2?"
  );
  const chapterMatched = search.chapters.includes("07-cicd-seguro");
  const autoOutcome: EvalOutcome =
    guide.canonicalRole === "developer" && guide.assignments.length > 0 && chapterMatched
      ? "pass"
      : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["profile_routing", "chapter_scope", "grounding"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `canonicalRole=${guide.canonicalRole ?? "n/d"} assignments=${guide.assignments.length}`,
      `role summary developer=${String(guide.role_summary["developer"] ?? 0)}`,
      `assignment preview=${previewUnknownList(guide.assignments, ["id", "practice_label", "phase", "action"]).join(" ; ") || "n/d"}`,
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `get_guide_by_role(L2, role=developer) -> ${JSON.stringify({
          canonicalRole: guide.canonicalRole,
          assignmentCount: guide.assignments.length,
          phase_summary: guide.phase_summary,
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1300
    ),
    data: {
      guide,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runGuidePhasesMonitoring(): Promise<QualitativeEvalObservation> {
  const chapterId = "12-monitorizacao-operacoes";
  const assignments = handleResolveEntities({
    record_type: "assignment",
    filters: { chapter_id: chapterId, risk_level: "L2" },
    limit: 12,
  });
  const phases = phasePreview(assignments.entities);
  const search = await runSearchProbe(
    "Em que fases do SDLC entram as praticas de 12-monitorizacao-operacoes?"
  );
  const autoOutcome: EvalOutcome =
    phases.length > 0 && search.chapters.includes(chapterId) ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["profile_routing", "chapter_scope", "grounding"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `assignment total=${assignments.total}`,
      `unique phases=${phases.join(", ") || "none"}`,
      `assignment preview=${previewUnknownList(assignments.entities, ["id", "phase", "role", "practice_id"]).join(" ; ") || "n/d"}`,
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `resolve_entities(assignment, chapter=${chapterId}, risk=L2) -> ${JSON.stringify({
          total: assignments.total,
          phases,
          preview: previewUnknownList(assignments.entities, ["id", "phase", "role", "practice_id"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1300
    ),
    data: {
      assignments,
      phases,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runGuideUserStories(): Promise<QualitativeEvalObservation> {
  const chapterId = "13-formacao-onboarding";
  const stories = handleResolveEntities({
    record_type: "user_story",
    filters: { chapter_id: chapterId },
    limit: 10,
  });
  const search = await runSearchProbe("Mostra user stories relevantes para 13-formacao-onboarding.");
  const autoOutcome: EvalOutcome =
    stories.total > 0 && search.chapters.includes(chapterId) ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["profile_routing", "chapter_scope", "grounding"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `user_story total=${stories.total}`,
      `story preview=${previewUnknownList(stories.entities, ["id", "us_id", "title"]).join(" ; ") || "n/d"}`,
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
      `retrieval citations=${search.citations.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `resolve_entities(user_story, chapter=${chapterId}) -> ${JSON.stringify({
          total: stories.total,
          preview: previewUnknownList(stories.entities, ["id", "us_id", "title"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1300
    ),
    data: {
      stories,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runReviewRequirementsEvidence(): Promise<QualitativeEvalObservation> {
  const search = await runSearchProbe("Para 02-requisitos-seguranca, que evidencia e esperada?");
  const signals = handleResolveEntities({
    record_type: "signal",
    filters: { bundle_ids: "02-requisitos-seguranca" },
    limit: 8,
  });
  const evidencePatterns = handleResolveEntities({
    record_type: "evidence_pattern",
    limit: 8,
  });
  const autoOutcome: EvalOutcome =
    search.citations.length > 0 && (signals.total > 0 || evidencePatterns.total > 0) ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: false,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["review_semantics", "grounding", "citation"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `chapter 02 signals=${signals.total}`,
      `global evidence patterns=${evidencePatterns.total}`,
      `signal preview=${previewUnknownList(signals.entities, ["signal_id", "label"]).join(" ; ") || "n/d"}`,
      "Automatic layer only checks prerequisites here. Final usefulness still needs human review.",
    ],
    excerpt: truncate(
      [
        `resolve_entities(signal, bundle=02-requisitos-seguranca) -> ${JSON.stringify({
          total: signals.total,
          preview: previewUnknownList(signals.entities, ["signal_id", "label"]),
        })}`,
        `resolve_entities(evidence_pattern) -> ${JSON.stringify({
          total: evidencePatterns.total,
          preview: previewUnknownList(evidencePatterns.entities, ["id", "maps_to_requirement_id", "evidence_expectation"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1500
    ),
    data: {
      signals,
      evidencePatterns,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runReviewThreatModelGap(): Promise<QualitativeEvalObservation> {
  const search = await runSearchProbe(
    "Tenho apenas threat-model.md e policy.md observados. O que falta para cumprir 03-threat-modeling?"
  );
  const brief = handleGetSbdToeChapterBrief({
    chapterId: "03-threat-modeling",
  }) as Record<string, unknown>;
  const autoOutcome: EvalOutcome = search.citations.length > 0 ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: false,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["review_semantics", "grounding", "citation"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
      `chapter 03 artifacts=${asStringArray(brief["artifacts"]).slice(0, 6).join(", ") || "n/d"}`,
      "Automatic layer does not decide whether policy.md was over-credited. That remains a human semantic check.",
    ],
    excerpt: truncate(
      [
        `get_sbd_toe_chapter_brief(03-threat-modeling) -> ${JSON.stringify({
          title: brief["title"],
          objective: brief["objective"],
          artifacts: asStringArray(brief["artifacts"]).slice(0, 6),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1300
    ),
    data: {
      chapterBrief: brief,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runReviewMonitoringGap(): Promise<QualitativeEvalObservation> {
  const search = await runSearchProbe(
    "Em 12-monitorizacao-operacoes, com logs e alertas observados, o que continua em falta?"
  );
  const signals = handleResolveEntities({
    record_type: "signal",
    filters: { bundle_ids: "12-monitorizacao-operacoes" },
    limit: 8,
  });
  const autoOutcome: EvalOutcome =
    search.citations.length > 0 && signals.total > 0 ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: false,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["review_semantics", "grounding", "chapter_scope"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `monitoring signals=${signals.total}`,
      `signal preview=${previewUnknownList(signals.entities, ["signal_id", "label"]).join(" ; ") || "n/d"}`,
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
      "Automatic layer only checks that the review primitives exist and retrieval is grounded.",
    ],
    excerpt: truncate(
      [
        `resolve_entities(signal, bundle=12-monitorizacao-operacoes) -> ${JSON.stringify({
          total: signals.total,
          preview: previewUnknownList(signals.entities, ["signal_id", "label"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1300
    ),
    data: {
      signals,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runReviewSignals(): Promise<QualitativeEvalObservation> {
  const search = await runSearchProbe(
    "Que sinais seriam esperados para validar monitorizacao e operacoes?"
  );
  const signals = handleResolveEntities({
    record_type: "signal",
    filters: { bundle_ids: "12-monitorizacao-operacoes" },
    limit: 8,
  });
  const autoOutcome: EvalOutcome =
    search.citations.length > 0 && signals.total > 0 ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: false,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["review_semantics", "grounding", "citation"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `signals=${signals.total}`,
      `signal preview=${previewUnknownList(signals.entities, ["signal_id", "label"]).join(" ; ") || "n/d"}`,
      `retrieval citations=${search.citations.join(", ") || "none"}`,
      "Human review should still confirm that signals were not sold as final compliance decisions.",
    ],
    excerpt: truncate(
      [
        `resolve_entities(signal, bundle=12-monitorizacao-operacoes) -> ${JSON.stringify({
          total: signals.total,
          preview: previewUnknownList(signals.entities, ["signal_id", "label"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1300
    ),
    data: {
      signals,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runThreatsCicd(): Promise<QualitativeEvalObservation> {
  const chapterId = "07-cicd-seguro";
  const threats = handleResolveEntities({
    record_type: "threat",
    filters: { chapter_id: chapterId },
    limit: 10,
  });
  const search = await runSearchProbe("Que ameacas se aplicam a 07-cicd-seguro e o que as mitiga?");
  const autoOutcome: EvalOutcome =
    threats.total > 0 && search.chapters.includes(chapterId) ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["threat_reasoning", "chapter_scope", "grounding"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `chapter threats=${threats.total}`,
      `threat preview=${previewUnknownList(threats.entities, ["id", "chapter_id", "title", "threat_label_raw"]).join(" ; ") || "n/d"}`,
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `resolve_entities(threat, chapter=${chapterId}) -> ${JSON.stringify({
          total: threats.total,
          preview: previewUnknownList(threats.entities, ["id", "chapter_id", "title", "threat_label_raw"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1400
    ),
    data: {
      threats,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runThreatAntipatterns(): Promise<QualitativeEvalObservation> {
  const chapterId = "12-monitorizacao-operacoes";
  const antipatterns = handleResolveEntities({
    record_type: "antipattern",
    filters: { bundle_ids: chapterId },
    limit: 10,
  });
  const search = await runSearchProbe(
    "Que antipatterns relevantes aparecem em 12-monitorizacao-operacoes?"
  );
  const autoOutcome: EvalOutcome =
    antipatterns.total > 0 && search.chapters.includes(chapterId) ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["threat_reasoning", "chapter_scope", "grounding"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `chapter antipatterns=${antipatterns.total}`,
      `antipattern preview=${previewUnknownList(antipatterns.entities, ["antipattern_id", "label", "risk"]).join(" ; ") || "n/d"}`,
      `prompt chapters=${search.chapters.join(", ") || "none"}`,
    ],
    excerpt: truncate(
      [
        `resolve_entities(antipattern, bundle=${chapterId}) -> ${JSON.stringify({
          total: antipatterns.total,
          preview: previewUnknownList(antipatterns.entities, ["antipattern_id", "label", "risk"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1400
    ),
    data: {
      antipatterns,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runThreatStaticSecrets(): Promise<QualitativeEvalObservation> {
  const search = await runSearchProbe(
    "Se eu usar segredos estaticos, que ameaca e que controlo ficam implicados?"
  );
  const genericThreats = handleGetThreatLandscape({ risk_level: "L2" });
  const autoOutcome: EvalOutcome =
    search.citations.length > 0 && genericThreats.threats.length > 0 ? "pass" : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["threat_reasoning", "grounding", "citation"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `generic L2 threat count=${genericThreats.threats.length}`,
      `first threat preview=${previewUnknownList(genericThreats.threats, ["id", "name", "chapter_id"]).join(" ; ") || "n/d"}`,
      `retrieval citations=${search.citations.join(", ") || "none"}`,
      "Human review should still confirm the causal chain from static secrets to threat/control.",
    ],
    excerpt: truncate(
      [
        `get_threat_landscape(L2) -> ${JSON.stringify({
          threatCount: genericThreats.meta.threatCount,
          activeBundles: genericThreats.meta.activeBundles,
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1300
    ),
    data: {
      genericThreats,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

async function runThreatNoMonitoringSignals(): Promise<QualitativeEvalObservation> {
  const threats = handleGetThreatLandscape({ risk_level: "L3" });
  const monitoringSignals = handleResolveEntities({
    record_type: "signal",
    filters: { bundle_ids: "12-monitorizacao-operacoes" },
    limit: 8,
  });
  const search = await runSearchProbe(
    "Que ameacas ficam menos mitigadas numa app publica L3 sem sinais de monitorizacao?"
  );
  const autoOutcome: EvalOutcome =
    threats.threats.length > 0 && monitoringSignals.total > 0 && search.citations.length > 0
      ? "pass"
      : "warn";

  return makeObservation({
    autoOutcome,
    deterministicFirst: true,
    provenanceUseful: search.citations.length > 0,
    failureHints: ["threat_reasoning", "review_semantics", "grounding"],
    citations: search.citations,
    chapters: search.chapters,
    consultedIndices: search.consultedIndices,
    backendSnapshot: search.backendSnapshot,
    summary: [
      `L3 threats=${threats.threats.length}`,
      `monitoring signals=${monitoringSignals.total}`,
      `active bundles=${threats.meta.activeBundles.slice(0, 8).join(", ") || "n/d"}`,
      "Human review should still confirm whether the answer correctly combines threats + missing monitoring signals.",
    ],
    excerpt: truncate(
      [
        `get_threat_landscape(L3) -> ${JSON.stringify({
          threatCount: threats.meta.threatCount,
          activeBundles: threats.meta.activeBundles.slice(0, 8),
        })}`,
        `resolve_entities(signal, bundle=12-monitorizacao-operacoes) -> ${JSON.stringify({
          total: monitoringSignals.total,
          preview: previewUnknownList(monitoringSignals.entities, ["signal_id", "label"]),
        })}`,
        "",
        "search_sbd_toe_manual preview:",
        search.excerpt,
      ].join("\n"),
      1500
    ),
    data: {
      threats,
      monitoringSignals,
      retrievedPreview: search.retrievedPreview,
    },
  });
}

const INTERNAL_CASES: InternalCaseDefinition[] = [
  {
    id: "C1",
    profile: "consult",
    prompt: "Para uma aplicação L1 interna com dados low, o que se aplica genericamente?",
    expected: [
      "Poucos requisitos.",
      "Controlos coerentes com L1.",
      "Sem alargar demasiado.",
      "Provenance clara.",
    ],
    toolPath: ["consult_security_requirements", "search_sbd_toe_manual"],
    manualHeavy: false,
    run: runConsultL1,
  },
  {
    id: "C2",
    profile: "consult",
    prompt: "Para uma aplicação L2 pública com dados regulated, que requisitos e controlos se aplicam?",
    expected: [
      "Aumento claro face a L1.",
      "AUT, ACC, API, INT, SES ou equivalentes entram.",
      "Explicação determinística coerente.",
    ],
    toolPath: ["consult_security_requirements", "search_sbd_toe_manual"],
    manualHeavy: false,
    run: runConsultL2,
  },
  {
    id: "C3",
    profile: "consult",
    prompt: "No capítulo 07-cicd-seguro, para L2, o que se aplica?",
    expected: [
      "Scoping real por chapter_context.",
      "Não devolver o manual todo.",
      "Controlos e artefactos do bundle.",
    ],
    toolPath: ["get_sbd_toe_chapter_brief", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runConsultChapterScoped,
  },
  {
    id: "C4",
    profile: "consult",
    prompt: "Quais os requisitos de autenticação para uma app L2 pública?",
    expected: [
      "Foco em AUT/ACC/SES.",
      "Não misturar demasiado com domínios irrelevantes.",
    ],
    toolPath: ["consult_security_requirements", "search_sbd_toe_manual"],
    manualHeavy: false,
    run: runConsultAuth,
  },
  {
    id: "G1",
    profile: "guide",
    prompt: "Como implementar os requisitos aplicáveis no capítulo 04-arquitetura-segura?",
    expected: [
      "Práticas.",
      "Assignments.",
      "User stories.",
      "Fases/roles coerentes.",
    ],
    toolPath: ["resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runGuideArchitecture,
  },
  {
    id: "G2",
    profile: "guide",
    prompt: "O que é esperado do developer em 07-cicd-seguro para L2?",
    expected: [
      "Agrupamento por role.",
      "Ações específicas.",
      "Não apenas narrativa geral.",
    ],
    toolPath: ["get_guide_by_role", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runGuideDeveloperCicd,
  },
  {
    id: "G3",
    profile: "guide",
    prompt: "Em que fases do SDLC entram as práticas de 12-monitorizacao-operacoes?",
    expected: [
      "Agrupamento por fase.",
      "Mapeamento canónico de phase aliases.",
    ],
    toolPath: ["resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runGuidePhasesMonitoring,
  },
  {
    id: "G4",
    profile: "guide",
    prompt: "Mostra user stories relevantes para 13-formacao-onboarding.",
    expected: [
      "Stories certas.",
      "Não confundir com texto genérico de bundle.",
    ],
    toolPath: ["resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runGuideUserStories,
  },
  {
    id: "R1",
    profile: "review",
    prompt: "Para 02-requisitos-seguranca, que evidência é esperada?",
    expected: [
      "Uso de EvidencePattern quando houver coverage.",
      "Artefactos esperados claros.",
      "Sinais esperados quando existirem.",
    ],
    toolPath: ["resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runReviewRequirementsEvidence,
  },
  {
    id: "R2",
    profile: "review",
    prompt: "Tenho apenas threat-model.md e policy.md observados. O que falta para cumprir 03-threat-modeling?",
    expected: [
      "Gaps úteis.",
      "Distinção entre artefacto e evidência.",
      "Não considerar policy como prova de implementação por si só.",
    ],
    toolPath: ["get_sbd_toe_chapter_brief", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runReviewThreatModelGap,
  },
  {
    id: "R3",
    profile: "review",
    prompt: "Em 12-monitorizacao-operacoes, com logs e alertas observados, o que continua em falta?",
    expected: [
      "Gaps mais estreitos.",
      "Não devolver gaps absurdamente largos.",
    ],
    toolPath: ["resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runReviewMonitoringGap,
  },
  {
    id: "R4",
    profile: "review",
    prompt: "Que sinais seriam esperados para validar monitorização e operações?",
    expected: [
      "Sinais observáveis.",
      "Menção clara se vierem de fallback.",
      "Sem vender sinal como decisão final.",
    ],
    toolPath: ["resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runReviewSignals,
  },
  {
    id: "T1",
    profile: "threats",
    prompt: "Que ameaças se aplicam a 07-cicd-seguro e o que as mitiga?",
    expected: [
      "Ameaças do capítulo.",
      "Controlos mitigadores.",
      "Confiança direct/derived/heuristic coerente.",
    ],
    toolPath: ["resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runThreatsCicd,
  },
  {
    id: "T2",
    profile: "threats",
    prompt: "Que antipatterns relevantes aparecem em 12-monitorizacao-operacoes?",
    expected: [
      "Antipatterns ligados às threats.",
      "Violated requirements quando existirem.",
    ],
    toolPath: ["resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runThreatAntipatterns,
  },
  {
    id: "T3",
    profile: "threats",
    prompt: "Se eu usar segredos estáticos, que ameaça e que controlo ficam implicados?",
    expected: [
      "Eixo causal bom.",
      "Uso de antipattern_threat_links.",
    ],
    toolPath: ["get_threat_landscape", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runThreatStaticSecrets,
  },
  {
    id: "T4",
    profile: "threats",
    prompt: "Que ameaças ficam menos mitigadas numa app pública L3 sem sinais de monitorização?",
    expected: [
      "Combinação útil entre consult/review/threats.",
      "Boa explicação.",
    ],
    toolPath: ["get_threat_landscape", "resolve_entities", "search_sbd_toe_manual"],
    manualHeavy: true,
    run: runThreatNoMonitoringSignals,
  },
];

export function listQualitativeChecklistCases(): QualitativeEvalCaseDefinition[] {
  return INTERNAL_CASES.map(({ run: _run, ...definition }) => ({ ...definition }));
}

export async function runQualitativeEval(options?: {
  profiles?: EvalProfile[];
  caseIds?: string[];
  manualEvaluations?: Record<string, QualitativeManualEvaluation>;
}): Promise<QualitativeEvalReport> {
  const requestedProfiles = new Set(options?.profiles ?? INTERNAL_CASES.map((item) => item.profile));
  const requestedCaseIds = new Set(options?.caseIds ?? INTERNAL_CASES.map((item) => item.id));
  const selectedCases = INTERNAL_CASES.filter(
    (item) => requestedProfiles.has(item.profile) && requestedCaseIds.has(item.id)
  );

  const results: QualitativeEvalCaseResult[] = [];
  for (const item of selectedCases) {
    const observed = await item.run();
    results.push({
      ...listQualitativeChecklistCases().find((definition) => definition.id === item.id)!,
      observed,
      ...(options?.manualEvaluations?.[item.id]
        ? { manual: options.manualEvaluations[item.id] }
        : {}),
    });
  }

  const autoSummary: Record<EvalOutcome, number> = { pass: 0, warn: 0, fail: 0 };
  const manualSummary: Partial<Record<EvalOutcome, number>> = {};
  for (const result of results) {
    autoSummary[result.observed.autoOutcome] += 1;
    if (result.manual) {
      manualSummary[result.manual.outcome] = (manualSummary[result.manual.outcome] ?? 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    profiles: [...requestedProfiles].sort() as EvalProfile[],
    caseIds: selectedCases.map((item) => item.id),
    cases: results,
    autoSummary,
    manualSummary,
  };
}

function renderSummaryLines(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

export function renderQualitativeEvalMarkdown(report: QualitativeEvalReport): string {
  const sections = [
    "# MCP Qualitative Eval Harness Report",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Profiles: ${report.profiles.join(", ")}`,
    `- Cases: ${report.caseIds.join(", ")}`,
    `- Auto summary: pass=${report.autoSummary.pass}, warn=${report.autoSummary.warn}, fail=${report.autoSummary.fail}`,
    ...(Object.keys(report.manualSummary).length > 0
      ? [
          `- Manual summary: pass=${report.manualSummary.pass ?? 0}, warn=${report.manualSummary.warn ?? 0}, fail=${report.manualSummary.fail ?? 0}`,
        ]
      : []),
  ];

  for (const result of report.cases) {
    sections.push(
      "",
      `## ${result.id} (${result.profile})`,
      `- Prompt: ${result.prompt}`,
      `- Expected: ${result.expected.join(" | ")}`,
      `- Tool path: ${result.toolPath.join(" -> ")}`,
      `- Manual-heavy: ${result.manualHeavy ? "yes" : "no"}`,
      `- Auto result: ${result.observed.autoOutcome}`,
      `- Auto deterministic first: ${
        result.observed.deterministicFirst === null
          ? "n/a"
          : result.observed.deterministicFirst
            ? "yes"
            : "no"
      }`,
      `- Auto provenance useful: ${
        result.observed.provenanceUseful === null
          ? "n/a"
          : result.observed.provenanceUseful
            ? "yes"
            : "no"
      }`,
      `- Likely owner if problematic: ${result.observed.likelyOwner}`,
      `- Failure hints: ${result.observed.failureHints.join(", ") || "none"}`,
      `- Chapters: ${result.observed.chapters.join(", ") || "none"}`,
      `- Citations: ${result.observed.citations.join(", ") || "none"}`,
      `- Consulted indices: ${result.observed.consultedIndices.join(", ") || "none"}`,
      ...(result.manual
        ? [
            `- Manual result: ${result.manual.outcome}`,
            `- Manual deterministic first: ${
              result.manual.deterministicFirst === undefined
                ? "n/a"
                : result.manual.deterministicFirst
                  ? "yes"
                  : "no"
            }`,
            `- Manual provenance useful: ${
              result.manual.provenanceUseful === undefined
                ? "n/a"
                : result.manual.provenanceUseful
                  ? "yes"
                  : "no"
            }`,
            `- Manual issue type: ${result.manual.issueType ?? "n/a"}`,
            `- Manual note: ${result.manual.note ?? "n/a"}`,
          ]
        : []),
      renderSummaryLines(result.observed.summary),
      "",
      "```text",
      result.observed.excerpt,
      "```"
    );
  }

  return sections.join("\n");
}

export function buildQualitativeEvalTriagePrompt(report: QualitativeEvalReport): string {
  const problematicCases = report.cases.filter((result) => {
    if (result.manual && result.manual.outcome !== "pass") {
      return true;
    }
    return result.observed.autoOutcome !== "pass";
  });

  const selectedCases = problematicCases.length > 0 ? problematicCases : report.cases;
  const backendSnapshots = unique(
    selectedCases.map((result) => result.observed.backendSnapshot?.substrateVersion)
  );

  const sections = [
    "# Qualitative Eval Triage Prompt",
    "",
    "You are triaging issues from an SbD-ToE MCP qualitative evaluation run.",
    "",
    "Decide for each case whether the primary problem is more likely in:",
    "- `mcp`: loader, deterministic engine, routing, chapter extraction, provenance formatting or answer composition",
    "- `graph`: ontology/runtime bundle contents, missing entities/links, mcp_chunks quality, mentions/relation hints quality",
    "- `mixed`: both sides plausibly contribute",
    "- `unclear`: insufficient evidence",
    "",
    "Failure taxonomy to use as evidence:",
    "- loader_contract",
    "- deterministic_resolution",
    "- chapter_scope",
    "- grounding",
    "- citation",
    "- profile_routing",
    "- review_semantics",
    "- threat_reasoning",
    "- vector_overreach",
    "",
    "Return a JSON array. Each item must contain:",
    "- `case_id`",
    "- `owner`",
    "- `confidence`",
    "- `rationale`",
    "- `next_inspection_steps`",
    "",
    "Run context:",
    `- generated_at: ${report.generatedAt}`,
    `- profiles: ${report.profiles.join(", ")}`,
    `- substrate_versions_seen: ${backendSnapshots.join(", ") || "n/d"}`,
    "",
    "Cases:",
  ];

  for (const result of selectedCases) {
    sections.push(
      "",
      `## ${result.id}`,
      `prompt: ${result.prompt}`,
      `profile: ${result.profile}`,
      `expected: ${result.expected.join(" | ")}`,
      `tool_path: ${result.toolPath.join(" -> ")}`,
      `manual_heavy: ${result.manualHeavy ? "yes" : "no"}`,
      `auto_result: ${result.observed.autoOutcome}`,
      `auto_failure_hints: ${result.observed.failureHints.join(", ") || "none"}`,
      `chapters: ${result.observed.chapters.join(", ") || "none"}`,
      `citations: ${result.observed.citations.join(", ") || "none"}`,
      `consulted_indices: ${result.observed.consultedIndices.join(", ") || "none"}`,
      `auto_summary: ${result.observed.summary.join(" | ")}`,
      ...(result.manual
        ? [
            `manual_result: ${result.manual.outcome}`,
            `manual_issue_type: ${result.manual.issueType ?? "n/a"}`,
            `manual_note: ${result.manual.note ?? "n/a"}`,
          ]
        : []),
      "excerpt:",
      "```text",
      result.observed.excerpt,
      "```"
    );
  }

  return sections.join("\n");
}
