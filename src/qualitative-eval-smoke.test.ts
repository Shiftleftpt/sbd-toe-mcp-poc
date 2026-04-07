import { describe, expect, it } from "vitest";

import { retrievePublishedContext } from "./backend/semantic-index-gateway.js";
import { handleConsultSecurityRequirements } from "./tools/consult-security-requirements.js";
import { handleGetGuideByRole } from "./tools/get-guide-by-role.js";
import { handleGetThreatLandscape } from "./tools/get-threat-landscape.js";
import { handleMapSbdToeReviewScope } from "./tools/map-review-scope.js";
import { handleResolveEntities } from "./tools/resolve-entities.js";
import {
  handleGetSbdToeChapterBrief,
  handleListSbdToeChapters,
  handleMapSbdToeApplicability
} from "./tools/structured-tools.js";

describe("qualitative eval smoke", () => {
  it("keeps chapter discovery and chapter brief coherent", () => {
    const chapters = handleListSbdToeChapters({}) as {
      chapters: Array<{ id: string; readableTitle: string }>;
    };
    const brief = handleGetSbdToeChapterBrief({ chapterId: "07-cicd-seguro" }) as {
      found: boolean;
      title: string;
      objective?: string;
      artifacts?: string[];
    };

    expect(chapters.chapters).toHaveLength(15);
    expect(chapters.chapters.some((chapter) => chapter.id === "07-cicd-seguro")).toBe(true);
    expect(brief.found).toBe(true);
    expect(brief.title).toContain("CI/CD");
    expect(brief.objective).toBeTruthy();
    expect((brief.artifacts ?? []).length).toBeGreaterThan(0);
  });

  it("keeps applicability routing coherent for an L2 CI/CD + containers + IaC profile", () => {
    const applicability = handleMapSbdToeApplicability({
      riskLevel: "L2",
      technologies: ["ci-cd", "containers", "iac"]
    }) as {
      active: string[];
      excluded: string[];
      activatedBundles: {
        domainBundles: Array<{ chapterId: string }>;
        operationalBundles: Array<{ chapterId: string }>;
      };
    };

    expect(applicability.active).toContain("07-cicd-seguro");
    expect(applicability.active).toContain("08-iac-infraestrutura");
    expect(applicability.active).toContain("09-containers-imagens");
    expect(applicability.active).toContain("11-deploy-seguro");
    expect(applicability.excluded).toContain("13-formacao-onboarding");
    expect(applicability.activatedBundles.domainBundles.map((item) => item.chapterId)).toEqual(
      expect.arrayContaining(["08-iac-infraestrutura", "09-containers-imagens"])
    );
    expect(
      applicability.activatedBundles.operationalBundles.map((item) => item.chapterId)
    ).toEqual(expect.arrayContaining(["07-cicd-seguro", "11-deploy-seguro"]));
  });

  it("retrieves grounded V2 context with traceability and without legacy Algolia fallback", async () => {
    const result = await retrievePublishedContext(
      "How should I secure a CI/CD pipeline for an L2 project?",
      3
    );

    expect(result.selected.length).toBe(3);
    expect(result.consultedIndices).toEqual(
      expect.arrayContaining([
        "ontology/sbdtoe-ontology.yaml",
        "publication_manifest.json",
        "mcp_chunks.jsonl",
        "chunk_entity_mentions.jsonl",
        "chunk_relation_hints.jsonl"
      ])
    );
    expect(result.selected.every((record) => record.citationId.startsWith("M"))).toBe(true);
    expect(result.selected.every((record) => record.traceability?.sourcePath)).toBe(true);
    expect(result.consultedIndices.some((entry) => /algolia/i.test(entry))).toBe(false);
    expect(result.consultedIndices).not.toContain("vector_chunks.jsonl");
    expect(JSON.stringify(result.backendSnapshot)).not.toContain("algolia");
  });

  it("keeps consult mode deterministic and narrower for auth-specific questions", () => {
    const l1 = handleConsultSecurityRequirements({ risk_level: "L1" });
    const l2 = handleConsultSecurityRequirements({ risk_level: "L2" });
    const auth = handleConsultSecurityRequirements({
      risk_level: "L2",
      concerns: ["auth"]
    });

    expect(l2.meta.requirementCount).toBeGreaterThan(l1.meta.requirementCount);
    expect(l1.meta.controlCount).toBeGreaterThan(0);
    expect(l1.meta.artifactCount).toBeGreaterThan(0);

    expect(auth.active_categories).toEqual(expect.arrayContaining(["AUT", "ACC", "SES"]));
    expect(auth.meta.requirementCount).toBeLessThan(l2.meta.requirementCount);
    expect(auth.meta.concernsApplied).toEqual(["auth"]);
    expect(auth.rule_trace.some((entry) => entry.includes("CONCERNS_FILTER_REQUIREMENTS"))).toBe(
      true
    );
  });

  it("keeps guide mode structured by canonical role and phase", () => {
    const byRole = handleGetGuideByRole({ risk_level: "L2", role: "developer" });
    const byPhase = handleGetGuideByRole({ risk_level: "L2", phase: "design" });

    expect(byRole.canonicalRole).toBe("developer");
    expect(byRole.assignments.length).toBeGreaterThan(0);
    expect(byRole.assignments.every((assignment) => assignment.canonical_role === "developer")).toBe(
      true
    );

    expect(byPhase.canonicalPhase).toBe("design");
    expect(byPhase.assignments.length).toBeGreaterThan(0);
    expect(byPhase.assignments.every((assignment) => assignment.canonical_phase === "design")).toBe(
      true
    );
  });

  it("keeps developer guidance spanning governance and training, not only coding chapters", () => {
    const byRole = handleGetGuideByRole({ risk_level: "L2", role: "developer" });
    const chapterIds = [...new Set(byRole.assignments.map((assignment) => assignment.chapter_id))];

    expect(chapterIds).toEqual(
      expect.arrayContaining([
        "05-dependencias-sbom-sca",
        "06-desenvolvimento-seguro",
        "07-cicd-seguro",
        "09-containers-imagens",
        "12-monitorizacao-operacoes",
        "13-formacao-onboarding",
        "14-governanca-contratacao"
      ])
    );
  });

  it("keeps governance and training chapter briefs exposing the expected evidence artifacts", () => {
    const governance = handleGetSbdToeChapterBrief({
      chapterId: "14-governanca-contratacao"
    }) as { found: boolean; artifacts?: string[] };
    const training = handleGetSbdToeChapterBrief({
      chapterId: "13-formacao-onboarding"
    }) as { found: boolean; artifacts?: string[] };
    const governanceArtifacts = governance.artifacts ?? [];
    const trainingArtifacts = training.artifacts ?? [];

    expect(governance.found).toBe(true);
    expect(training.found).toBe(true);
    expect(governanceArtifacts.some((artifact) => artifact.startsWith("ART-supplier-assessment-"))).toBe(true);
    expect(governanceArtifacts.some((artifact) => artifact.startsWith("ART-approval-record-"))).toBe(true);
    expect(governanceArtifacts.some((artifact) => artifact.startsWith("ART-exception-record-"))).toBe(true);
    expect(governanceArtifacts.some((artifact) => artifact.startsWith("ART-access-review-"))).toBe(true);
    expect(governanceArtifacts.some((artifact) => artifact.startsWith("ART-sbom-"))).toBe(true);
    expect(governanceArtifacts.some((artifact) => artifact.startsWith("ART-artifact-provenance-"))).toBe(true);
    expect(governanceArtifacts.some((artifact) => artifact.startsWith("ART-pipeline-config-"))).toBe(true);

    expect(trainingArtifacts.some((artifact) => artifact.startsWith("ART-onboarding-checklist-"))).toBe(true);
    expect(trainingArtifacts.some((artifact) => artifact.startsWith("ART-quiz-result-"))).toBe(true);
    expect(trainingArtifacts.some((artifact) => artifact.startsWith("ART-training-plan-"))).toBe(true);
  });

  it("keeps threat mode scoped to active bundles with explicit confidence", () => {
    const threats = handleGetThreatLandscape({
      risk_level: "L2",
      concerns: ["auth"]
    });

    expect(threats.meta.activeBundles).toContain("02-requisitos-seguranca");
    expect(threats.meta.concernsApplied).toEqual(["auth"]);
    expect(threats.threats.length).toBeGreaterThan(0);
    expect(
      threats.threats.every((threat) =>
        ["direct", "derived", "heuristic"].includes(threat.mitigation_confidence)
      )
    ).toBe(true);
    expect(threats.threats.some((threat) => threat.mitigated_by.length > 0)).toBe(true);
  });

  it("keeps review-scope heuristics coherent for workflow and dependency changes", () => {
    const reviewScope = handleMapSbdToeReviewScope({
      riskLevel: "L2",
      changedFiles: [".github/workflows/release.yml", "package.json"],
      diffSummary: "update release workflow and dependency metadata"
    });

    expect(reviewScope.bundlesToReview.map((bundle) => bundle.chapterId)).toEqual(
      expect.arrayContaining([
        "05-dependencias-sbom-sca",
        "07-cicd-seguro",
        "10-testes-seguranca",
        "11-deploy-seguro"
      ])
    );
    expect(reviewScope.nextSteps.length).toBeGreaterThan(0);
  });

  it("keeps review primitives published in the runtime bundle", () => {
    const evidencePatterns = handleResolveEntities({
      record_type: "evidence_pattern",
      limit: 3
    });
    const signals = handleResolveEntities({
      record_type: "signal",
      limit: 3
    });

    expect(evidencePatterns.total).toBeGreaterThan(0);
    expect(signals.total).toBeGreaterThan(0);
    expect(evidencePatterns.entities[0]).toHaveProperty("maps_to_requirement_id");
    expect(signals.entities[0]).toHaveProperty("signal_id");
  });

  it("can use vector recall as explicit secondary grounding for vague provenance queries", async () => {
    const query = "Procura passagens relacionadas com provenance e supply chain.";
    const withoutVector = await retrievePublishedContext(query, 1);
    const withVector = await retrievePublishedContext(query, 1, {
      vectorMode: "prefer"
    });

    expect(withoutVector.consultedIndices).not.toContain("vector_chunks.jsonl");
    expect(withVector.consultedIndices).toContain("vector_chunks.jsonl");
    expect(withVector.selected[0]?.source).toBe("vector");
    expect(withVector.selected[0]?.citationId.startsWith("V")).toBe(true);
    expect(withVector.selected[0]?.title).toBe(withoutVector.selected[0]?.title);
    expect((withVector.selected[0]?.excerpt.length ?? 0)).toBeGreaterThanOrEqual(
      withoutVector.selected[0]?.excerpt.length ?? 0
    );
    expect(withVector.selected[0]?.excerpt.startsWith(withVector.selected[0]?.title ?? "")).toBe(true);
  });
});
