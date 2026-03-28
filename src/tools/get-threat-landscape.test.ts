import { describe, it, expect } from "vitest";
import { _resolveThreatLandscape } from "./get-threat-landscape.js";
import type { OntologyData } from "./ontology-loader.js";

// ---------------------------------------------------------------------------
// Minimal fixture
// ---------------------------------------------------------------------------

function makeOntologyData(overrides: Partial<OntologyData> = {}): OntologyData {
  return {
    domainMapping: {
      LOG: ["monitoring"],
      AUT: ["identity"],
    },
    concernsMap: {
      logging: ["LOG"],
      auth: ["AUT"],
    },
    requirements: [
      { requirement_id: "LOG-001", type: "base", category: "LOG", name: "Audit log", applicable_levels: { L1: true, L2: true, L3: true }, source_chapter: 12 },
      { requirement_id: "AUT-001", type: "base", category: "AUT", name: "MFA", applicable_levels: { L1: false, L2: true, L3: true }, source_chapter: 2 },
    ],
    controls: [
      { control_id: "CTRL-MON", name: "Monitoring", domain: "monitoring", control_type: "detective", abstraction_level: "operational", applicable_lifecycle_phases: [], source_practice_ids: [], chapter_ids: ["12-monitorizacao-operacoes"] },
      { control_id: "CTRL-AUTH", name: "Identity", domain: "identity", control_type: "preventive", abstraction_level: "technical", applicable_lifecycle_phases: [], source_practice_ids: [], chapter_ids: ["02-requisitos-seguranca"] },
    ],
    roles: [],
    threats: [
      { mitigated_threat_id: "MT-001", threat_label_raw: "Log bypass", chapter_id: "12-monitorizacao-operacoes", associated_controls: [], confidence: 0.9 },
      { mitigated_threat_id: "MT-002", threat_label_raw: "Auth bypass", chapter_id: "02-requisitos-seguranca", associated_controls: [], confidence: 0.8 },
      { mitigated_threat_id: "MT-003", threat_label_raw: "Unrelated threat", chapter_id: "99-nonexistent", associated_controls: [], confidence: 0.5 },
    ],
    assignments: [],
    userStories: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("_resolveThreatLandscape", () => {
  it("throws on invalid risk_level", () => {
    let err: unknown;
    try { _resolveThreatLandscape({ risk_level: "X" }, makeOntologyData()); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("L1 returns threats matching active source chapters", () => {
    const result = _resolveThreatLandscape({ risk_level: "L1" }, makeOntologyData());
    // L1 has LOG-001 (source_chapter=12) → chapter 12 is active
    const ids = result.threats.map((t) => t.mitigated_threat_id);
    expect(ids).toContain("MT-001"); // chapter 12 matches
    // MT-003 (chapter 99) should NOT appear
    expect(ids).not.toContain("MT-003");
  });

  it("L2 includes threats from chapters 12 (LOG) and 2 (AUT)", () => {
    const result = _resolveThreatLandscape({ risk_level: "L2" }, makeOntologyData());
    const ids = result.threats.map((t) => t.mitigated_threat_id);
    expect(ids).toContain("MT-001"); // chapter 12
    expect(ids).toContain("MT-002"); // chapter 2
  });

  it("all threats have _confidence field set", () => {
    const result = _resolveThreatLandscape({ risk_level: "L2" }, makeOntologyData());
    for (const t of result.threats) {
      expect(["derived", "heuristic"]).toContain(t._confidence);
    }
  });

  it("derived threats appear before heuristic in sorted output", () => {
    const result = _resolveThreatLandscape({ risk_level: "L2" }, makeOntologyData());
    const confidences = result.threats.map((t) => t._confidence);
    const firstHeuristicIdx = confidences.indexOf("heuristic");
    const lastDerivedIdx = confidences.lastIndexOf("derived");
    if (firstHeuristicIdx !== -1 && lastDerivedIdx !== -1) {
      expect(lastDerivedIdx).toBeLessThan(firstHeuristicIdx);
    }
  });

  it("meta.activeChapters lists chapter numbers as strings", () => {
    const result = _resolveThreatLandscape({ risk_level: "L1" }, makeOntologyData());
    expect(result.meta.activeChapters).toContain("12");
  });

  it("concerns filter narrows active chapters", () => {
    const result = _resolveThreatLandscape(
      { risk_level: "L2", concerns: ["auth"] },
      makeOntologyData()
    );
    // Only AUT-001 (chapter 2) is in scope
    const ids = result.threats.map((t) => t.mitigated_threat_id);
    expect(ids).toContain("MT-002");
    expect(ids).not.toContain("MT-001"); // chapter 12 not in auth scope
  });

  it("returns risk_level in output", () => {
    const result = _resolveThreatLandscape({ risk_level: "L3" }, makeOntologyData());
    expect(result.risk_level).toBe("L3");
  });

  it("meta.note is non-empty string", () => {
    const result = _resolveThreatLandscape({ risk_level: "L1" }, makeOntologyData());
    expect(typeof result.meta.note).toBe("string");
    expect(result.meta.note.length).toBeGreaterThan(0);
  });

  it("mitigated_by resolved via chapter_ids on controls", () => {
    const result = _resolveThreatLandscape({ risk_level: "L1" }, makeOntologyData());
    // MT-001 is in chapter 12 → CTRL-MON covers chapter 12
    const mt001 = result.threats.find((t) => t.mitigated_threat_id === "MT-001");
    expect(mt001).toBeDefined();
    expect(mt001?.mitigated_by).toHaveLength(1);
    expect(mt001?.mitigated_by[0]?.control_id).toBe("CTRL-MON");
    expect(mt001?.mitigated_by[0]?.domain).toBe("monitoring");
  });

  it("mitigated_by is empty array when no control covers that chapter", () => {
    const result = _resolveThreatLandscape({ risk_level: "L2" }, makeOntologyData());
    // MT-003 is in chapter 99 (no control covers it)
    // MT-003 is not in results (not in active chapters and no heuristic match)
    // Use a chapter with no matching control:
    const ontology = makeOntologyData({
      requirements: [
        { requirement_id: "LOG-001", type: "base", category: "LOG", name: "Audit log", applicable_levels: { L1: true, L2: true, L3: true }, source_chapter: 55 },
      ],
      threats: [
        { mitigated_threat_id: "MT-X", threat_label_raw: "Unknown threat", chapter_id: "55-unknown", associated_controls: [], confidence: 0.5 },
      ],
    });
    const r = _resolveThreatLandscape({ risk_level: "L1" }, ontology);
    const mtX = r.threats.find((t) => t.mitigated_threat_id === "MT-X");
    expect(mtX).toBeDefined();
    expect(mtX?.mitigated_by).toEqual([]);
  });

  it("each threat has mitigated_by as an array", () => {
    const result = _resolveThreatLandscape({ risk_level: "L2" }, makeOntologyData());
    for (const t of result.threats) {
      expect(Array.isArray(t.mitigated_by)).toBe(true);
    }
  });
});
