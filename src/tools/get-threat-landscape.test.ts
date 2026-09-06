import { describe, it, expect } from "vitest";
import { _resolveThreatLandscape, handleGetThreatLandscape } from "./get-threat-landscape.js";
import type { OntologyData } from "./ontology-loader.js";
import { getOntologyData } from "./ontology-loader.js";

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
      { control_id: "CTRL-MON", name: "Monitoring", domain: "monitoring", control_type: "detective", abstraction_level: "operational", applicable_lifecycle_phases: [], chapter_ids: ["12-monitorizacao-operacoes"] },
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

  it("all threats have mitigation_confidence field set", () => {
    const result = _resolveThreatLandscape({ risk_level: "L2" }, makeOntologyData());
    for (const t of result.threats) {
      expect(["derived", "heuristic"]).toContain(t.mitigation_confidence);
    }
  });

  it("derived threats appear before heuristic in sorted output", () => {
    const result = _resolveThreatLandscape({ risk_level: "L2" }, makeOntologyData());
    const confidences = result.threats.map((t) => t.mitigation_confidence);
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

  it("concern filter routes by the control's domain chapter, not the requirement's source chapter", () => {
    // auth's requirement is catalogued in ch.02 but its control lives in the domain
    // chapter (ch.04). The concern must surface the DOMAIN threat (ch.04), and must NOT
    // collapse onto ch.02's requirements-process meta-threats. Bug fix 2026-06-15.
    const data = makeOntologyData({
      controls: [
        { control_id: "CTRL-MON", name: "Monitoring", domain: "monitoring", control_type: "detective", abstraction_level: "operational", applicable_lifecycle_phases: [], chapter_ids: ["12-monitorizacao-operacoes"] },
        { control_id: "CTRL-AUTH", name: "Identity", domain: "identity", control_type: "preventive", abstraction_level: "technical", applicable_lifecycle_phases: [], source_practice_ids: [], chapter_ids: ["04-arquitetura-segura"] }
      ],
      threats: [
        { mitigated_threat_id: "MT-001", threat_label_raw: "Log bypass", chapter_id: "12-monitorizacao-operacoes", associated_controls: [], confidence: 0.9 },
        { mitigated_threat_id: "MT-002", threat_label_raw: "Requirements-process meta-threat", chapter_id: "02-requisitos-seguranca", associated_controls: [], confidence: 0.8 },
        { mitigated_threat_id: "MT-004", threat_label_raw: "Auth bypass (domain)", chapter_id: "04-arquitetura-segura", associated_controls: [], confidence: 0.85 }
      ]
    });
    const result = _resolveThreatLandscape({ risk_level: "L2", concerns: ["auth"] }, data);
    const ids = result.threats.map((t) => t.mitigated_threat_id);
    expect(ids).toContain("MT-004"); // domain threat (ch.04, where the control lives)
    expect(ids).not.toContain("MT-002"); // ch.02 process meta-threat must NOT collapse in
    expect(ids).not.toContain("MT-001"); // ch.12 not in auth scope
  });

  it("counts the DEFINING chapters of activated controls as in-scope — incl. ch.02 (G-b decision 2, 2026-08-30)", () => {
    // C1-style control: catalogued AND defining in ch.02. Its defining chapter brings the
    // ch.02 threats into scope for the concern, with the control as mitigated_by.
    const data = makeOntologyData({
      controls: [
        { control_id: "CTRL-AUTH-C1", name: "Identidade e sessões", domain: "identity", control_type: "preventive", abstraction_level: "technical", applicable_lifecycle_phases: [], chapter_ids: ["02-requisitos-seguranca"], defining_chapter_ids: ["02-requisitos-seguranca"] }
      ],
      threats: [
        { mitigated_threat_id: "MT-002", threat_label_raw: "Ameaça de auth no catálogo do cap.02", chapter_id: "02-requisitos-seguranca", associated_controls: [], confidence: 0.8 }
      ]
    });
    const result = _resolveThreatLandscape({ risk_level: "L2", concerns: ["auth"] }, data);
    const mt002 = result.threats.find((t) => t.mitigated_threat_id === "MT-002");
    expect(mt002).toBeDefined();
    expect(result.meta.activeBundles).toContain("02-requisitos-seguranca");
    expect(mt002?.mitigated_by.map((c) => c.control_id)).toContain("CTRL-AUTH-C1");
  });

  it("a control merely CATALOGUED in ch.02 (defining elsewhere) still does not bring the meta-threats in", () => {
    const data = makeOntologyData({
      controls: [
        { control_id: "CTRL-AUTH", name: "Identity", domain: "identity", control_type: "preventive", abstraction_level: "technical", applicable_lifecycle_phases: [], chapter_ids: ["02-requisitos-seguranca", "04-arquitetura-segura"], defining_chapter_ids: ["04-arquitetura-segura"] }
      ],
      threats: [
        { mitigated_threat_id: "MT-002", threat_label_raw: "Meta-threat", chapter_id: "02-requisitos-seguranca", associated_controls: [], confidence: 0.8 },
        { mitigated_threat_id: "MT-004", threat_label_raw: "Domain threat", chapter_id: "04-arquitetura-segura", associated_controls: [], confidence: 0.85 }
      ]
    });
    const result = _resolveThreatLandscape({ risk_level: "L2", concerns: ["auth"] }, data);
    const ids = result.threats.map((t) => t.mitigated_threat_id);
    expect(ids).toContain("MT-004");
    expect(ids).not.toContain("MT-002");
    expect(result.meta.activeBundles).not.toContain("02-requisitos-seguranca");
  });

  it("keeps the requirements-process meta-threats for the explicit 'requirements' concern", () => {
    const result = _resolveThreatLandscape(
      { risk_level: "L2", concerns: ["requirements"] },
      makeOntologyData()
    );
    // 'requirements' maps to ch.02 explicitly → its meta-threats are in scope.
    expect(result.meta.activeChapters).toContain("2");
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

// ---------------------------------------------------------------------------
// Surface pass-through (against the published bundle): associated_controls was
// hardcoded to [] in the surface handle even though runtime/threats.json carries
// it. Guard that the serving layer no longer drops the substrate field.
// ---------------------------------------------------------------------------

describe("handleGetThreatLandscape surface", () => {
  it("passes through associated_controls carried by the bundle (not hardcoded [])", () => {
    // 0.15.0: paginado por default — pedir página larga para varrer o conjunto.
    const result = handleGetThreatLandscape({ risk_level: "L2", limit: 500 });
    const withAssoc = result.threats.filter(
      (t) => Array.isArray(t.associated_controls) && t.associated_controls.length > 0
    );
    // The bundle populates associated_controls on its threats; at least some
    // must survive to the surface.
    expect(withAssoc.length).toBeGreaterThan(0);
  });

  it("keeps associated_controls an array on every surfaced threat", () => {
    const result = handleGetThreatLandscape({ risk_level: "L2" });
    for (const t of result.threats) {
      expect(Array.isArray(t.associated_controls)).toBe(true);
    }
  });

  it("surfaces the canonical v1 threat tier with its v1.3 fields (threat_category, mitigation_strength)", () => {
    // Threats are served from the v1 tier (manual_threat_mitigation.jsonl, contract
    // v1.3 §1.8) — legacy threats.json is empty by design. The richer fields must
    // reach the surface, and the tier must not be silently empty.
    const result = handleGetThreatLandscape({ risk_level: "L2" });
    expect(result.threats.length).toBeGreaterThan(0);
    expect(result.threats.some((t) => typeof t.threat_category === "string" && t.threat_category.length > 0)).toBe(true);
    expect(result.threats.some((t) => typeof t.mitigation_strength === "string" && t.mitigation_strength.length > 0)).toBe(true);
  });

  // Real bundle, post G-b (2026-08-30): ch.02 enters a concern's scope exactly when an
  // activated control DEFINES in ch.02 (C1 identity/auth, C2 data_protection, C3 tooling)
  // — not as a side effect of cataloguing. Concerns whose controls define elsewhere
  // (logging → monitoring ch.12, iac → infrastructure ch.08) still exclude ch.02.
  // 0.20.0-beta.29: a ordem passou a ser por PERTENÇA ao âmbito e os caps. 01/02 (meta-ameaças
  // de processo) vão para o FIM — que é o objectivo da correcção. A garantia G-b é sobre o
  // ÂMBITO, não sobre a primeira página: verifica-se no conjunto completo.
  it("brings ch.02 into scope for concerns whose activated controls DEFINE there (auth via C1)", () => {
    const r = handleGetThreatLandscape({ risk_level: "L2", concerns: ["auth"], limit: 500 });
    expect(r.meta.activeBundles).toContain("02-requisitos-seguranca");
    expect(r.threats.some((t) => /^MT-0(2[1-9]|3[0-8])$/.test(t.id ?? ""))).toBe(true);
    // e as meta-ameaças NÃO podem estar à frente das do domínio activado
    const firstMeta = r.threats.findIndex((t) => /^MT-0(2[1-9]|3[0-8])$/.test(t.id ?? ""));
    const lastDomain = r.threats.map((t) => !/^0?[12]-/.test(String(t.chapter_id ?? ""))).lastIndexOf(true);
    expect(firstMeta, "meta-ameaças de processo à frente das do domínio").toBeGreaterThan(lastDomain);
  });

  it("still excludes ch.02 for concerns with no ch.02-defining control (logging, iac)", () => {
    for (const concern of ["logging", "iac"]) {
      const r = handleGetThreatLandscape({ risk_level: "L2", concerns: [concern] });
      expect(r.threats.length, `${concern} should surface domain threats`).toBeGreaterThan(0);
      expect(r.meta.activeBundles, `${concern} must not include ch.02`).not.toContain("02-requisitos-seguranca");
    }
  });

  it("serves associated_control_ids (structural, declared derivation) + associated_controls_text on the v1.7.0 tier", () => {
    const knownControls = new Set(getOntologyData().controls.map((c) => c.control_id));
    const r = handleGetThreatLandscape({ risk_level: "L2" });
    expect(r.threats.length).toBeGreaterThan(0);
    for (const t of r.threats) expect(Array.isArray(t.associated_control_ids), t.id).toBe(true);
    const withIds = r.threats.filter((t) => (t.associated_control_ids ?? []).length > 0);
    expect(withIds.length).toBe(r.threats.length); // 233/233 in v1.7.0 — all derivable
    const badIds = withIds.flatMap((t) => t.associated_control_ids ?? []).filter((id) => !knownControls.has(id));
    expect(badIds).toEqual([]);
  });

  it("still surfaces ch.02 meta-threats for the explicit 'requirements' concern", () => {
    const r = handleGetThreatLandscape({ risk_level: "L2", concerns: ["requirements"] });
    expect(r.meta.activeBundles).toContain("02-requisitos-seguranca");
  });
});
