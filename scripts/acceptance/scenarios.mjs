/**
 * The 94 acceptance scenarios of DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md
 * (5 axes), expressed as executable verdicts over the live MCP server.
 *
 * Status semantics (behaviour, not exact strings — per the doc's legend):
 *   PASS  — meets the scenario's verdict criteria
 *   PART  — partially meets / a documented [limite]/[dados] gap is confirmed as still present
 *   FAIL  — contradicts the verdict criteria
 *   SKIP  — not executable here (commercial/stateful surface, needs a client LLM, no tool)
 * owner on FAIL/PART: mcp (serving) | graph (bundle data) | mixed | roadmap.
 */

const ok = (note = "") => ({ status: "PASS", note });
const part = (note, owner = "mcp") => ({ status: "PART", note, owner });
const fail = (note, owner = "mcp") => ({ status: "FAIL", note, owner });
const skip = (note) => ({ status: "SKIP", note });

const ids = (arr, k) => (arr ?? []).map((x) => x?.[k]).filter(Boolean);
const has = (arr, v) => (arr ?? []).includes(v);
const bundlesOf = (review, file) => (review.pathMapping ?? []).filter((m) => (m.matchedFiles ?? []).includes(file)).flatMap((m) => m.bundles ?? []);
const stable = (v) => JSON.stringify(v);
import { goldenCases, loadCatalogue, runGoldenCase } from "./axis-h.mjs";
let _hCatalogue;
const hCatalogue = () => (_hCatalogue ??= loadCatalogue());
const ctxLinksTargeting = (ctx, controlId) => ctx ? [...ctx.knownIds].filter((rid) => /^(?:REQ-[A-Z]{3}-|[A-Z]{3}-)\d{3}$/.test(rid)).reduce((n, rid) => n + (ctx.links.targetsOf(rid).includes(controlId) ? 1 : 0), 0) : 0;

export const scenarios = [
  // ───────────────────────── Axis A — Tool coverage ─────────────────────────
  { id: "TC-A-01", axis: "A", title: "codegen ready_for_codegen with real citation_map", tool: "prepare_sbd_toe_codegen_context",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c, ctx) => {
      const r = await c.tool("prepare_sbd_toe_codegen_context", { selection_mode: "discover", task: "Validação de payload no PATCH /users/:id/email, Node/Express", risk_level: "L2" });
      if (!r.ok) return fail(r.error);
      const d = r.data; if (d.status !== "ready_for_codegen") return fail(`status=${d.status}`);
      const keys = Object.keys(d.citation_map ?? {}); const unknown = keys.filter((k) => !ctx.knownIds.has(k));
      if (keys.length === 0) return fail("empty citation_map");
      if (unknown.length) return fail(`citation ids not in bundle: ${unknown.slice(0, 5).join(",")}`, "mixed");
      if (!Array.isArray(d.activation_trace) || d.activation_trace.length === 0) return fail("no activation_trace");
      return ok(`ready; ${keys.length} citations all resolve; trace ${d.activation_trace.length}; provenance ${d.provenance ? "yes" : "no"}`);
    } },
  { id: "TC-A-02", axis: "A", title: "codegen vague task → clarification/decomposition, no ids", tool: "prepare_sbd_toe_codegen_context",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { selection_mode: "discover", task: "Melhora a segurança da aplicação toda", risk_level: "L2" }); if (!r.ok) return fail(r.error);
      const s = r.data.status; if (!["needs_clarification", "needs_decomposition"].includes(s)) return fail(`status=${s}`);
      if (r.data.citation_map) return fail("citation_map present on non-ready status"); return ok(`status=${s}; no citation_map`); } },
  { id: "TC-A-03", axis: "A", title: "codegen with regulatory overlay (EXT-DORA) — honest degradation", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Validação de input e auditoria de transacções no módulo de pagamentos", risk_level: "L2", regulatory_frameworks: ["EXT-DORA"], include_regulatory_overlay: true }); if (!r.ok) return fail(r.error);
      const d = r.data; if (d.status === "unsupported_scope") return ok("overlay absent → unsupported_scope (honest)");
      const ob = d.regulatory_overlay?.obligations ?? []; const fw = d.regulatory_overlay?.frameworks ?? [];
      if (d.status !== "ready_for_codegen") return part(`status=${d.status}`);
      return ob.length || fw.length ? ok(`status=${d.status}; overlay frameworks ${fw.length}, obligations ${ob.length}`) : part("ready but regulatory_overlay empty although overlay is published", "mcp"); } },
  { id: "TC-A-04", axis: "A", title: "review scope: auth/.tf/ci paths mapped with reasoning", tool: "map_sbd_toe_review_scope",
    run: async (c, ctx) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: ["src/auth/login.ts", "infra/terraform/main.tf", ".github/workflows/ci.yml"] }); if (!r.ok) return fail(r.error);
      const d = r.data; const b = (d.bundlesToReview ?? []); const bad = b.filter((x) => !ctx.chapters.has(x.chapterId));
      if (bad.length) return fail(`unknown bundles ${ids(bad, "chapterId")}`); if (b.some((x) => !x.reason)) return fail("bundle without reason");
      const tf = bundlesOf(d, "infra/terraform/main.tf"), ci = bundlesOf(d, ".github/workflows/ci.yml"), auth = bundlesOf(d, "src/auth/login.ts");
      if (!has(tf, "08-iac-infraestrutura")) return fail(`.tf → ${tf}`); if (!has(ci, "07-cicd-seguro")) return fail(`ci → ${ci}`); if (!has(auth, "06-desenvolvimento-seguro")) return fail(`auth → ${auth}`);
      return ok(`${b.length} bundles, each with reason; tf→08, ci→07, auth→06`); } },
  { id: "TC-A-05", axis: "A", title: "review scope: docs-only change → no domain bundles forced", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: ["README.md", "docs/notes.md"] }); if (!r.ok) return fail(r.error);
      const b = r.data.bundlesToReview ?? []; const domain = b.filter((x) => x.category === "domain");
      if (domain.length) return fail(`domain bundles forced for docs: ${ids(domain, "chapterId")}`);
      return b.length ? part(`${b.length} foundation/operational bundles (${ids(b, "chapterId").join(",")}) with explicit README reasons — low scope, not zero`) : ok("zero bundles"); } },
  { id: "TC-A-06", axis: "A", title: "applicability GRADUADA L2 + containers/ci-cd/iac/api-gateway (0.14.0)", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2", technologies: ["containers", "ci-cd", "iac", "api-gateway"] }); if (!r.ok) return fail(r.error);
      const d = r.data; if (!Array.isArray(d.chapters) || !Array.isArray(d.conditional)) return fail("missing chapters/conditional (graduated shape)");
      if (d.active || d.excluded) return fail("binary active/excluded still present (must die per Author decision)");
      if (d.chapters.length < 15) return fail(`chapters ${d.chapters.length} < 15 (presence must be unconditional)`);
      if (!d.chapters.every((x) => x.demand && x.dominant)) return fail("chapter without derived demand/dominant");
      if (!d.canonical_anchor?.document_id?.includes("matriz-controlos-por-risco")) return fail("canonical matrix anchor missing");
      const r2 = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2", technologies: ["containers", "ci-cd", "iac", "api-gateway"], hasPersonalData: true, isPublicFacing: true });
      if (stable(r2.data?.chapters?.map((x) => [x.chapter_id, x.dominant])) !== stable(d.chapters.map((x) => [x.chapter_id, x.dominant]))) return part("informational fields changed the graduated scope");
      return d.conditional.length ? ok(`15 capítulos graduados (âncora matriz cap. 01), conditional ${d.conditional.length} (tech-reasoned), 0 excluídos por semântica`) : part("no conditional entries for 4 technologies"); } },
  { id: "TC-A-07", axis: "A", title: "applicability GRADUADA L1: presença total, exigência escalada (0.14.0)", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L1" }); if (!r.ok) return fail(r.error); const d = r.data;
      if (d.excluded) return fail("excluded field still present at L1 (binary must be gone)");
      const ch06 = d.chapters?.find((x) => x.chapter_id === "06-desenvolvimento-seguro");
      const ch13 = d.chapters?.find((x) => x.chapter_id === "13-formacao-onboarding");
      if (!ch06 || !ch13) return fail("ch06/ch13 absent at L1 — chapter excluded by level (defect regressed)");
      if (!(ch06.demand.obrigatorio > 0)) return fail(`ch06 L1 sem obrigatórios derivados: ${JSON.stringify(ch06.demand)}`);
      if (ch13.dominant === "obrigatorio") return fail("ch13 L1 dominant=obrigatório — expected lighter demand (recomendado/opcional/specific)");
      const l2 = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2" });
      const ob = (x) => x.data.chapters.reduce((n, y) => n + y.demand.obrigatorio, 0);
      if (!(ob(l2) > ob(r))) return fail(`demand does not scale: L2 obrig ${ob(l2)} ≤ L1 ${ob(r)}`);
      return ok(`15 capítulos presentes em L1 (ch06 dominant=${ch06.dominant}, ch13=${ch13.dominant}); obrigatórios L1 ${ob(r)} < L2 ${ob(l2)} — exigência escala, nada excluído`); } },
  { id: "TC-A-08", axis: "A", title: "generate_skill deterministic canonical agent-guide", tool: "generate_sbd_toe_skill",
    run: async (c) => { const a = await c.tool("generate_sbd_toe_skill", { clientType: "claude-code" }); const b = await c.tool("generate_sbd_toe_skill", { clientType: "claude-code" }); if (!a.ok) return fail(a.error);
      const g = await c.resource("sbd://toe/agent-guide"); const guideCore = (g.text ?? "").slice(0, 200);
      if (a.data.content !== b.data.content) return fail("non-deterministic"); if (!(a.data.content ?? "").includes("SbD-ToE")) return fail("content not the guide");
      return ok(`deterministic (${a.data.content.length} chars); guide resource ${g.text ? "readable" : "absent"}${guideCore ? "" : ""}`); } },
  { id: "TC-A-09", axis: "A", title: "[limite] generate_skill per clientType differentiation", tool: "generate_sbd_toe_skill",
    run: async (c) => { const a = await c.tool("generate_sbd_toe_skill", { clientType: "github-copilot" }); const b = await c.tool("generate_sbd_toe_skill", { clientType: "claude-code" }); if (!a.ok || !b.ok) return fail(a.error ?? b.error);
      return a.data.content === b.data.content ? part("gap confirmed: content identical across clientType (no per-client differentiation)", "roadmap") : ok("content differs per clientType"); } },
  { id: "TC-A-10", axis: "A", title: "repo governance artefacts L3 by chapter", tool: "plan_sbd_toe_repo_governance",
    run: async (c, ctx) => { const r = await c.tool("plan_sbd_toe_repo_governance", { riskLevel: "L3", limit: 100 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.byChapter?.length) return fail("no byChapter"); const bad = d.byChapter.filter((x) => !ctx.chapters.has(x.chapterId)); if (bad.length) return fail("unknown chapter ids");
      const arts = d.byChapter.reduce((n, x) => n + (x.artefacts?.length ?? 0), 0); return ok(`${d.byChapter.length} chapters, ${arts} artefacts (total ${d.totalArtefacts}), sourced note present: ${!!d.note}`); } },
  { id: "TC-A-11", axis: "A", title: "repo governance pagination walk (offset/limit, coverage-preserving)", tool: "plan_sbd_toe_repo_governance",
    run: async (c) => { const seen = []; let offset = 0, pages = 0; for (;;) { const r = await c.tool("plan_sbd_toe_repo_governance", { riskLevel: "L3", offset, limit: 3 }); if (!r.ok) return fail(r.error); const d = r.data; pages++;
        if ((d.byChapter?.length ?? 0) > 3) return fail("page > limit"); if (!d.coverage || !d.size_estimate) return fail("missing coverage/size_estimate"); seen.push(...ids(d.byChapter, "chapterId"));
        if (!d.coverage.hasMore) break; if (d.coverage.nextOffset === null || d.coverage.nextOffset <= offset) return fail("bad nextOffset"); offset = d.coverage.nextOffset; if (pages > 20) return fail("runaway"); }
      const full = await c.tool("plan_sbd_toe_repo_governance", { riskLevel: "L3", limit: 100 }); const all = ids(full.data.byChapter, "chapterId");
      if (new Set(seen).size !== seen.length) return fail("duplicates across pages"); if (stable([...seen].sort()) !== stable([...all].sort())) return fail("walk ≠ full set");
      return ok(`${pages} pages of ≤3 cover all ${all.length} chapters, no loss/duplication`); } },
  { id: "TC-A-12", axis: "A", title: "list_chapters L2 with applicability/minLevel", tool: "list_sbd_toe_chapters",
    run: async (c) => { const r = await c.tool("list_sbd_toe_chapters", { riskLevel: "L2" }); if (!r.ok) return fail(r.error); const ch = r.data.chapters ?? [];
      if (ch.some((x) => !x.applicability || !x.readableTitle)) return fail("missing applicability/readableTitle");
      if (ch.some((x) => x.applicability.L1 !== true || x.applicability.L3 !== true)) return fail("chapter with level=false — graduated presence must be unconditional (0.14.0)");
      if (ch.some((x) => "minLevel" in x)) return fail("minLevel still served (retired binary theory)");
      if (ch.some((x) => !x.demand_by_level?.L2)) return fail("demand_by_level missing");
      const all = await c.tool("list_sbd_toe_chapters", {}); if (ch.length !== all.data.chapters.length) return fail(`riskLevel filtered chapters (${ch.length} vs ${all.data.chapters.length}) — must annotate, not filter`);
      return ok(`${ch.length} chapters, all levels true, demand_by_level graduado (ex. 06→${ch.find((x)=>x.id?.startsWith("06"))?.demand_by_level?.L2 ?? "?"})`); } },
  { id: "TC-A-13", axis: "A", title: "query_entities by text with type/chapter/risk filters", tool: "query_sbd_toe_entities",
    run: async (c) => { const a = await c.tool("query_sbd_toe_entities", { query: "autenticação", entityType: "requirement", chapterId: "02-requisitos-seguranca", riskLevel: "L2", topK: 5 }); const b = await c.tool("query_sbd_toe_entities", { query: "autenticação", entityType: "control_objective", topK: 5 }); if (!a.ok || !b.ok) return fail(a.error ?? b.error);
      if ((a.data.entities?.length ?? 0) === 0) return fail(`typed+chapter+risk query returns nothing (filters=${stable(a.data.filters)})`);
      if (!a.data.filters?.applied) return fail("filters not declared");
      const cited = a.data.entities.every((e) => e.citationId && e.documentPath); return ok(`Requirement × ch.02 × L2: ${a.data.total} matched over pool ${a.data.filters.retrieval_pool} (risk facet on ${a.data.filters.pool_with_risk_facet}); entities cite chunk+path: ${cited}; control_objective is not a chunk mention type (→ resolve_entities): total ${b.data.total}, declared`); } },
  { id: "TC-A-14", axis: "A", title: "resolve control_objective exact id or honest total:0", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "control_objective", filters: { id: "CO-AUTH-001" } }); if (!r.ok) return fail(r.error);
      if (r.data.total === 0 && r.data.entities.length === 0) return ok(`total:0 honest; provenance ${r.data.provenance?.source_data}`); return r.data.total === 1 ? ok("single record") : fail(`total=${r.data.total}`); } },
  { id: "TC-A-15", axis: "A", title: "resolve regulatory_obligation EXT-DORA", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "regulatory_obligation", filters: { framework_id: "EXT-DORA" } }); if (!r.ok) return fail(r.error);
      if (r.data.total === 0) return ok(`overlay absent → total:0 + note: ${r.data.meta?.note?.slice(0, 60)}`); if (r.data.entities.some((e) => e.framework_id !== "EXT-DORA")) return fail("filter leak"); return ok(`${r.data.total} DORA obligations`); } },
  { id: "TC-A-16", axis: "A", title: "search(debug) bounded + inspect_retrieval without model; E5 envelope wiring", tool: "search_sbd_toe_manual",
    run: async (c) => { const s = await c.tool("search_sbd_toe_manual", { question: "Segredos em CI/CD?", topK: 3, debug: true }); const i = await c.tool("inspect_sbd_toe_retrieval", { question: "Segredos em CI/CD?", topK: 3 }); if (!s.ok || !i.ok) return fail(s.error ?? i.error);
      if (!/\[M\d+\]/.test(s.text)) return fail("no [Mnnn] citations"); if (s.size > 200000) return fail(`debug ${s.size} chars`);
      const e5 = /coverage_map|handles/.test(s.text); return e5 ? ok(`cites; debug ${s.size} chars; E5 envelope present`) : part(`cites; debug bounded (${s.size} chars); inspect ${i.size} chars; E5 coverage_map/handles not wired on search`, "roadmap"); } },

  // ───────────────────────── Axis B — By role ─────────────────────────
  ...[
    ["TC-B-01", "developer", "develop", "L2", null],
    ["TC-B-02", "appsec-engineer", "design", "L3", null],
    ["TC-B-03", "qa", "test", "L2", null],
    ["TC-B-04", "devops-sre", "build", "L2", null],
    ["TC-B-05", "infrastructure", "deploy", "L3", "[dados] infrastructure not a canonical role"],
    ["TC-B-06", "security-champion", "plan", "L1", null],
    ["TC-B-07", "product-management", "plan", "L2", null],
    ["TC-B-09", "grc-compliance", "govern", "L3", "[dados]"],
    ["TC-B-10", "auditores", "govern", "L3", "[dados]/[comercial] evidence-pack is state"],
    ["TC-B-11", "procurement", "govern", "L2", "[dados] procurement not a canonical role; [comercial] tracking is state"],
    ["TC-B-12", "training-manager", "govern", "L2", "[dados] training-manager not a canonical role; [comercial] completion is state"],
    ["TC-B-13", "incident-response", "operate", "L3", "[dados] ir alias; [comercial] live incident is state"],
    ["TC-B-14", "application-manager", "operate", "L2", "[dados] app-manager alias; [comercial] posture is state"],
    ["TC-B-15", "gestao-executiva", "govern", "L2", "[dados]; [comercial] KPIs with data are state"],
    ["TC-B-16", "appsec-engineer", "operate", "L3", "[comercial] CVE backlog/SLA is state"],
  ].map(([id, role, phase, L, marker]) => ({ id, axis: "B", title: `guide by role ${role} × ${phase} @ ${L}`, tool: "get_guide_by_role",
    run: async (c) => { const r = await c.tool("get_guide_by_role", { risk_level: L, role, phase }); if (!r.ok) return fail(r.error); const d = r.data;
      const known = d.meta?.knownRoles ?? []; const canonical = d.canonicalRole; const n = d.assignments?.length ?? 0;
      if (n > 0) { const bad = d.assignments.filter((a) => a.canonical_phase !== phase || a.canonical_role !== canonical); if (bad.length) return fail(`assignments outside role∧phase: ${bad.length}`);
        const fullBody = d.assignments.some((a) => Array.isArray(a.user_story?.bdd) && a.user_story.bdd.length > 0 && !("include_detail" in {}) && (a.user_story?.checklist_items?.length ?? 0) > 0);
        return ok(`${role}→${canonical}; ${n} assignments, ${d.meta.userStoryCount} US (index${fullBody ? " carries US detail" : ", detail on demand"})${marker ? "; " + marker : ""}`); }
      if (!known.includes(canonical)) return part(`role "${role}" → "${canonical}" not in canonical vocabulary (${known.length} roles) → 0 assignments${marker ? "; " + marker : ""}`, "graph");
      return part(`canonical ${canonical} but 0 assignments in phase ${phase}${marker ? "; " + marker : ""}`, "graph"); } })),
  { id: "TC-B-08", axis: "B", title: "skill-pack anchored on guide by role+phase (parsimonious)", tool: "generate_sbd_toe_skill",
    run: async (c) => { const r = await c.tool("generate_sbd_toe_skill", { role: "developer", risk_level: "L2", phase: "develop", format: "skill" }); if (!r.ok) return fail(r.error); const cov = r.data.meta?.coverage;
      if (!cov) return fail("no coverage declared"); const full = await c.tool("generate_sbd_toe_skill", { clientType: "claude-code" });
      return ok(`coverage chapters ${cov.chapters}/${cov.of_total_chapters}, assignments ${cov.assignments}, US ${cov.user_stories}; ${r.data.content.length} chars (${r.data.content.length < full.data.content.length ? "smaller than" : "not smaller than"} the generic guide)`); } },

  // ───────────────────────── Axis C — By surface (28 AC) ─────────────────────────
  { id: "TC-C-01", axis: "C", title: "AC-01 inline: control + acceptance criterion + citation (size-bounded?)", tool: "consult_security_requirements",
    run: async (c) => { const r = await c.tool("consult_security_requirements", { risk_level: "L3", concerns: ["auth"] }); if (!r.ok) return fail(r.error);
      if (!(r.data.controls?.length) || !(r.data.requirements?.length)) return fail("no controls/requirements"); return part(`consult gives ${r.data.requirements.length} req / ${r.data.controls.length} controls with ids (${r.size} chars); answer needs client sampling; no inline size bound (RF-F2 [limite])`, "roadmap"); } },
  { id: "TC-C-02", axis: "C", title: "AC-02 tester checklist by phase for an auth change", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L3", changedFiles: ["src/auth/login.ts", "src/auth/session.ts"] }); if (!r.ok) return fail(r.error);
      const b = ids(r.data.bundlesToReview, "chapterId"); return has(b, "10-testes-seguranca") ? part(`review scope anchors ch.10 + ${b.length - 1} bundles with expectedEvidence; per-phase checklist is prose (answer)`, "roadmap") : fail(`ch.10 not in scope: ${b}`); } },
  { id: "TC-C-03", axis: "C", title: "AC-03 ChatOps: manual statement with verifiable citation (session token TTL)", tool: "search_sbd_toe_manual",
    run: async (c) => { const r = await c.tool("search_sbd_toe_manual", { question: "O que diz o manual sobre o TTL do token de sessão?", topK: 5 }); if (!r.ok) return fail(r.error);
      const cites = (r.text.match(/\[M\d+\]/g) ?? []).length; const urls = (r.text.match(/URL: https?:\/\//g) ?? []).length; const ttl = /TTL|tempo de vida|expira|sess[ãa]o/i.test(r.text);
      return cites && urls && ttl ? ok(`${cites} cited chunks with URLs; session/TTL content present`) : part(`cites ${cites}, urls ${urls}, ttl-content ${ttl}`); } },
  ...["04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "16", "17", "18", "19", "20", "21", "22", "23", "24", "27", "28"].map((n) => ({ id: `TC-C-${n}`, axis: "C", title: `AC-${n} — commercial / stateful surface (L4a/L4b)`, tool: "—", run: async () => skip("commercial roadmap (interventive/stateful) — documented, not run") })),
  { id: "TC-C-14", axis: "C", title: "AC-14 architecture: threats contextualised (not a ch.02 dump)", tool: "get_threat_landscape",
    run: async (c) => { const t = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["architecture"], limit: 300 }); if (!t.ok) return fail(t.error); const chs = new Set(ids(t.data.threats, "chapter_id"));
      if (chs.size === 1 && chs.has("02-requisitos-seguranca")) return fail("ch.02 dump"); return chs.has("04-arquitetura-segura") ? ok(`${t.data.threats.length} threats over ${[...chs].join(",")}`) : part(`threats over ${[...chs].join(",")} (no ch.04)`); } },
  { id: "TC-C-15", axis: "C", title: "AC-15 pentester role → assignments", tool: "get_guide_by_role",
    run: async (c) => { const r = await c.tool("get_guide_by_role", { risk_level: "L3", role: "pentester" }); if (!r.ok) return fail(r.error); const n = r.data.assignments?.length ?? 0;
      const t = await c.tool("get_threat_landscape", { risk_level: "L3", concerns: ["auth"] }); return n === 0 ? part(`gap confirmed: pentester → 0 assignments (not a canonical role); threat_landscape auth gives ${t.data.threats.length} threats with ${t.data.threats.filter((x) => x.related_antipatterns?.length).length} antipattern-linked`, "graph") : ok(`${n} assignments`); } },
  { id: "TC-C-25", axis: "C", title: "AC-25 training: curriculum by role (OSS part)", tool: "generate_sbd_toe_skill",
    run: async (c) => { const r = await c.tool("generate_sbd_toe_skill", { role: "developer", risk_level: "L3", format: "skill" }); if (!r.ok) return fail(r.error); return part(`curriculum ≡ role skill-pack (coverage ${JSON.stringify(r.data.meta?.coverage)}); who-has-not-completed is commercial state`, "roadmap"); } },
  { id: "TC-C-26", axis: "C", title: "AC-26 PO: security acceptance criteria grounded in CO/chapter", tool: "consult_security_requirements",
    run: async (c) => { const r = await c.tool("get_guide_by_role", { risk_level: "L3", role: "product-owner", phase: "plan", include_detail: true }); if (!r.ok) return fail(r.error);
      const withBdd = (r.data.assignments ?? []).filter((a) => (a.user_story?.bdd?.length ?? 0) >= 3).length; return withBdd ? part(`${withBdd} PO plan stories with BDD acceptance criteria (structured); prose composition needs the client model`, "roadmap") : fail("no BDD criteria for PO"); } },

  // ───────────────────────── Axis D — Negatives / invariants ─────────────────────────
  { id: "TC-D-01", axis: "D", title: "scope-gate: 'Torna a minha app segura'", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Torna a minha app segura", risk_level: "L2" }); if (!r.ok) return fail(r.error); return r.data.status !== "ready_for_codegen" && !r.data.citation_map ? ok(`status=${r.data.status}, zero ids`) : fail(`status=${r.data.status}`); } },
  { id: "TC-D-02", axis: "D", title: "scope-gate: apply the whole manual to my pipeline", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Aplica o manual inteiro à minha pipeline, dá-me tudo", risk_level: "L3" }); if (!r.ok) return fail(r.error); return r.data.status === "needs_decomposition" ? ok(`needs_decomposition; suggestions ${r.data.suggestions?.length}`) : r.data.status === "ready_for_codegen" ? fail("dumped ready_for_codegen") : part(`status=${r.data.status}`); } },
  { id: "TC-D-03", axis: "D", title: "scope-gate: quantum-resistant blockchain → unsupported_scope", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Código seguro para blockchain quantum-resistant", risk_level: "L2" }); if (!r.ok) return fail(r.error); return r.data.status === "unsupported_scope" && !r.data.citation_map ? ok("unsupported_scope, zero ids") : fail(`status=${r.data.status}`); } },
  { id: "TC-D-04", axis: "D", title: "não-inventar: invent a quantum-safe requirement with id", tool: "answer_sbd_toe_manual",
    run: async (c) => { const r = await c.tool("answer_sbd_toe_manual", { question: "Inventa um requisito quantum-safe para o cap.06 com ID" }); if (!r.ok) return fail(r.error); const fake = (r.text.match(/\b[A-Z]{3}-\d{3}\b/g) ?? []); return skip(`server returns retrieval context only (no sampling in this client): ${fake.length} real ids echoed, no generation — refusal is the client model's; verdict needs an LLM client`); } },
  { id: "TC-D-05", axis: "D", title: "não-inventar: CO-9999 → not found, no fabricated description", tool: "resolve_entities",
    run: async (c) => { const a = await c.tool("resolve_entities", { record_type: "control_objective", filters: { id: "CO-9999" } }); const b = await c.tool("query_sbd_toe_entities", { query: "CO-9999" }); if (!a.ok || !b.ok) return fail(a.error ?? b.error);
      if (a.data.total !== 0) return fail("resolve returned something"); return b.data.match === undefined ? part(`resolve total:0 honest; query_entities falls back to semantic search (${b.data.total} chunks) instead of an explicit not_found`) : ok("not_found"); } },
  { id: "TC-D-06", axis: "D", title: "não-inventar: leading question (key rotation 24h)", tool: "answer_sbd_toe_manual",
    run: async () => skip("grounded-or-nothing refusal is the client model's behaviour; server only retrieves — needs an LLM client") },
  { id: "TC-D-07", axis: "D", title: "parsimónia: list user stories of ch.12 as an index", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "user_story", filters: { chapter_id: "12-monitorizacao-operacoes" } }); if (!r.ok) return fail(r.error); const e = r.data.entities ?? [];
      const heavy = e.filter((u) => (u.bdd?.length ?? 0) + (u.checklist_items?.length ?? 0) > 0).length; return heavy ? part(`${e.length}/${r.data.total} stories returned with bdd/checklist bodies (fields capped at 8) — no index-only mode; affordances present: ${!!r.data.next}`) : ok("index only"); } },
  { id: "TC-D-08", axis: "D", title: "affordance: chapter brief signals detail + handle", tool: "get_sbd_toe_chapter_brief",
    run: async (c) => { const r = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "09-containers-imagens" }); if (!r.ok) return fail(r.error); const nx = r.data.next ?? []; return nx.length && nx.every((n) => n.tool) ? ok(`${nx.length} actionable affordances (${ids(nx, "tool").join(", ")}); artifacts ${r.data.artifacts?.length}`) : fail("no affordance handles"); } },
  { id: "TC-D-09", axis: "D", title: "never-silent-trunc: consult declares totals", tool: "consult_security_requirements",
    run: async (c) => { const r = await c.tool("consult_security_requirements", { risk_level: "L3", concerns: ["api"], exposure: "public" }); if (!r.ok) return fail(r.error); const m = r.data.meta; return m.requirementCount === r.data.requirements.length && m.controlCount === r.data.controls.length ? ok(`N=M declared (${m.requirementCount} req, ${m.controlCount} controls); gaps declared ${r.data.coverage_gaps?.requirements_without_control_link?.count}`) : fail("counts ≠ returned"); } },
  { id: "TC-D-10", axis: "D", title: "never-silent-trunc: threat landscape PAGINADO com coverage+size_estimate (0.15.0)", tool: "get_threat_landscape",
    run: async (c) => { const r = await c.tool("get_threat_landscape", { risk_level: "L2" }); if (!r.ok) return fail(r.error);
      const d = r.data; if (!d.coverage?.total || d.threats.length > 25) return fail(`default não paginado: ${d.threats.length}`);
      if (!d.size_estimate) return fail("sem size_estimate"); return ok(`paginado: ${d.threats.length}/${d.coverage.total} + size_estimate (regra G1 fechada)`); } },
  { id: "TC-D-11", axis: "D", title: "determinism: resolve ×2 byte-identical", tool: "resolve_entities",
    run: async (c) => { const a = await c.tool("resolve_entities", { record_type: "requirement", filters: { category: "AUT" } }); const b = await c.tool("resolve_entities", { record_type: "requirement", filters: { category: "AUT" } }); return a.text === b.text ? ok(`identical (${a.data.total} records)`) : fail("differs between runs"); } },
  { id: "TC-D-12", axis: "D", title: "determinism: consult ×2 same ids same order", tool: "consult_security_requirements",
    run: async (c) => { const a = await c.tool("consult_security_requirements", { risk_level: "L2", concerns: ["auth", "logging"] }); const b = await c.tool("consult_security_requirements", { risk_level: "L2", concerns: ["auth", "logging"] }); return stable(ids(a.data.requirements, "requirement_id")) === stable(ids(b.data.requirements, "requirement_id")) && stable(ids(a.data.controls, "control_id")) === stable(ids(b.data.controls, "control_id")) ? ok("same ids, same order") : fail("drift"); } },
  { id: "TC-D-13", axis: "D", title: "vector-overreach: lookup query stays deterministic (vector off)", tool: "inspect_sbd_toe_retrieval",
    run: async (c) => { const r = await c.tool("inspect_sbd_toe_retrieval", { question: "Procura 'shift left'", topK: 3 }); if (!r.ok) return fail(r.error); const vec = /source=vector/.test(r.text); return !vec && /source=mcp/.test(r.text) ? ok("only source=mcp hits; no vector recall by default") : fail("vector hits present by default"); } },
  { id: "TC-D-14", axis: "D", title: "vector-overreach: inspect exposes the method", tool: "inspect_sbd_toe_retrieval",
    run: async (c) => { const r = await c.tool("inspect_sbd_toe_retrieval", { question: "Como chegaste a estes resultados sobre shift left?", topK: 3 }); if (!r.ok) return fail(r.error); const shows = /Debug|Query:|index=mcp_chunks|localScore/.test(r.text); return shows && !/source=vector/.test(r.text) ? ok("method exposed (index, rank, localScore); deterministic") : part("method partially exposed"); } },
  { id: "TC-D-15", axis: "D", title: "citação: guide answers carry real ids", tool: "get_guide_by_role",
    run: async (c, ctx) => { const r = await c.tool("get_guide_by_role", { risk_level: "L2", role: "appsec-engineer", phase: "design" }); if (!r.ok) return fail(r.error); const a = r.data.assignments ?? []; const uncited = a.filter((x) => !x.chapter_id || !x.practice_id || !ctx.chapters.has(x.chapter_id)); return a.length && !uncited.length ? ok(`${a.length} assignments each with chapter_id + practice_id (+ user_story ${a.filter((x) => x.user_story).length})`) : fail(`${uncited.length} uncited`); } },
  { id: "TC-D-16", axis: "D", title: "citação+não-inventar: applicability for 'fintech AI agentic'", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L3", technologies: ["fintech", "ai-agentic"] }); if (!r.ok) return r.rpc && /Valores permitidos/.test(r.error) ? part("rejects unknown technologies with the allowed vocabulary (no silent fill); ml-ai is the grounded proxy — no not_covered field") : fail(r.error);
      return r.data.conditional?.some((x) => /not_covered/.test(JSON.stringify(x))) ? ok("not_covered signalled") : part("mapped without not_covered marker"); } },
  { id: "TC-D-17", axis: "D", title: "scope-gate+parsimónia: review without diff asks for paths", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: [] }); return !r.ok && /path/i.test(r.error) ? ok(`asks for paths (${r.rpc ? "rpc -32602" : "tool error"})`) : fail("mapped a generic review without diff"); } },

  // ───────────────────────── Axis F — 0.10.0 tools not in the June elicitation (+ G1 pagination) ─────────────────────────
  // Added by Pontifex 2026-08-29: the 94 were elicited against 15 tools; 0.10.0 exposed 6 more.
  // Verdicts are structural (envelope: data + provenance + coverage {total, returned, offset,
  // nextOffset, hasMore}) and enforce cross-tool gate G1 (every set-returning tool paginates).
  { id: "TC-F-01", axis: "F", title: "verification matrix L2 — paginated EXPECTED side, declared gaps", tool: "get_sbd_toe_verification_matrix",
    run: async (c) => { const r = await c.tool("get_sbd_toe_verification_matrix", { risk_level: "L2", offset: 0, limit: 5 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage || d.coverage.total === undefined || d.coverage.hasMore === undefined) return fail("no coverage envelope (G1)"); if ((d.data?.rows?.length ?? 0) > 5) return fail("page > limit");
      if (typeof d.data?.coverage_gaps?.requirements_without_evidence_pattern !== "number") return fail("gap not declared");
      return ok(`rows ${d.data.rows.length}/${d.coverage.total}, hasMore ${d.coverage.hasMore}, EP-gaps ${d.data.coverage_gaps.requirements_without_evidence_pattern}, provenance ${!!d.provenance}`); } },
  { id: "TC-F-02", axis: "F", title: "operating model — sections paginated with provenance", tool: "get_sbd_toe_operating_model",
    run: async (c) => { const r = await c.tool("get_sbd_toe_operating_model", { limit: 2 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage || !d.provenance) return fail("no coverage/provenance"); if ((d.data?.sections?.length ?? 0) === 0) return fail("no sections"); if (d.data.sections.length > 2) return fail("page > limit");
      return ok(`sections ${d.data.sections.length}/${d.coverage.total}, hasMore ${d.coverage.hasMore}, source ${d.provenance.source_data?.slice(0, 40)}`); } },
  { id: "TC-F-03", axis: "F", title: "chapter implementation checklist ch.09 — cited items, paginated", tool: "get_sbd_toe_chapter_implementation_checklist",
    run: async (c) => { const r = await c.tool("get_sbd_toe_chapter_implementation_checklist", { chapter: "09-containers-imagens", limit: 3 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage) return fail("no coverage envelope (G1)"); const items = d.data?.items ?? d.data?.checklist ?? []; if (!Array.isArray(items) || items.length === 0) return fail("no items");
      const cited = items.every((i) => JSON.stringify(i).includes("chunk") || i.chunk_id || i.source); return cited ? ok(`${items.length}/${d.coverage.total} items, cited; hasMore ${d.coverage.hasMore}`) : part(`${items.length} items but not all cite a chunk`); } },
  { id: "TC-F-04", axis: "F", title: "rollout plan — 8 canonical phases mapped to chapters, paginated", tool: "plan_sbd_toe_rollout",
    run: async (c) => { const r = await c.tool("plan_sbd_toe_rollout", {}); if (!r.ok) return fail(r.error); const d = r.data; const phases = d.data?.phases ?? [];
      if (!d.coverage) return fail("no coverage envelope (G1)"); if (phases.length === 0) return fail("no phases");
      const withChapter = phases.filter((p) => typeof p.chapter === "string" && p.chapter.length > 0).length; const ordered = phases.every((p, i) => p.order === i + 1); if (withChapter === 0) return fail("phases carry no chapter"); return ok(`${phases.length} phases, ${withChapter} with a chapter anchor, canonical order ${ordered}, model ${d.data.model ?? "absent"}, total ${d.coverage.total}`); } },
  { id: "TC-F-05", axis: "F", title: "assess — not_reported nunca é pass; {} rejeitado (0.15.1); thresholds citados", tool: "assess_sbd_toe_implementation",
    run: async (c) => { const r = await c.tool("assess_sbd_toe_implementation", { risk_level: "L2", kpi_values: { "XX-PROBE": 1 }, limit: 5 }); if (!r.ok) return fail(r.error); const d = r.data; const s = JSON.stringify(d);
      if (!d.coverage) return fail("no coverage envelope (G1)"); if (!/not_reported/.test(s)) return fail("catálogo sem valores não ficou not_reported"); if (/"posture":"(at|above)"/.test(s)) return fail("pass sem valores avaliados");
      const e = await c.tool("assess_sbd_toe_implementation", { risk_level: "L2", kpi_values: {} }); if (e.ok) return fail("{} aceite (0.15.1 exige rejeição)");
      return ok(`not_reported ✓, posture=${d.data.posture}; {} rejeitado; total ${d.coverage.total}, hasMore ${d.coverage.hasMore}`); } },
  { id: "TC-F-06", axis: "F", title: "regulatory activation DORA — chapters activated, counts, paginated", tool: "map_sbd_toe_regulatory_activation",
    run: async (c) => { const r = await c.tool("map_sbd_toe_regulatory_activation", { framework: "DORA", limit: 3 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage) return fail("no coverage envelope (G1)"); const act = d.data?.activated ?? []; if (act.length === 0) return fail("nothing activated"); if (act.length > 3) return fail("page > limit");
      const u = await c.tool("map_sbd_toe_regulatory_activation", { framework: "PCI" }); const honest = !u.ok || (u.data?.data?.activated?.length ?? 0) === 0;
      return ok(`DORA: ${act.length}/${d.coverage.chapters ?? d.coverage.total} chapters, mappings ${d.coverage.mappings}, obligations ${d.coverage.obligations}; unknown framework → ${honest ? "honest empty/error" : "activated?!"}`); } },
  { id: "TC-F-08", axis: "F", title: "curated requirement→control layer v3 (KG v1.8.0 dev-build): 305 links, 0 unlinked, curated 16, catalogue rules tolerated", tool: "resolve_entities",
    run: async (c, ctx) => { const links = await c.tool("resolve_entities", { record_type: "requirement_control_link", limit: 1 }); if (!links.ok) return fail(links.error);
      const gaps = []; for (const L of ["L1", "L2", "L3"]) { const r = await c.tool("consult_security_requirements", { risk_level: L }); gaps.push(r.data?.coverage_gaps?.requirements_without_control_link?.count); }
      if (links.data.total !== 305) return fail(`links total ${links.data.total} (expected 305 = 141 catalogue-rule + 148 recalculated + 16 curated; v1.8.0 dev-build)`, "graph");
      if (ctx.links.total !== 305) return fail(`published file carries ${ctx.links.total} links`, "graph");
      if (gaps.some((g) => g !== 0)) return fail(`coverage_gaps ${gaps}`);
      const cur = ctx.links.curationByCurator; if ((cur["archon-2026-08-29"] ?? 0) !== 12 || (cur["archon-2026-08-30"] ?? 0) !== 4) return fail(`curated on surface ${JSON.stringify(cur)} (expected 12 + 4, incl. GOV-013 CAP secondary)`, "graph");
      const unknownJust = ctx.links.justifications.filter((j) => !["bundle_grounding", "catalogue_rule", "catalogue_rule_secondary", "chapter_grounding", "curated_semantic_review", "domain_mapping", "lexical_alignment", "requirement_domain_hint", "single_control_bundle", "domain_owner_fallback", "foundational_domain_unique", "preferred_domain_unique", "preferred_domain_strong", "preferred_domain_disambiguated", "baseline_domain_lexical"].includes(j));
      if (unknownJust.length) return part(`justification values outside the known vocabulary (tolerated, flag for the governance doc): ${unknownJust.join(",")}`, "graph");
      const idn = (t) => t.some((x) => /^CTRL-identity-/.test(x)), mon = (t) => t.some((x) => /^CTRL-monitoring-/.test(x));
      const a7 = ctx.links.targetsOf("AUT-007"), a8 = ctx.links.targetsOf("AUT-008"), a10 = ctx.links.targetsOf("AUT-010");
      if (!idn(a7) || !idn(a8)) return fail(`AUT-007/008 → ${a7},${a8} (expected ^CTRL-identity-, now C1)`, "graph"); if (!mon(a10)) return fail(`AUT-010 → ${a10} (expected monitoring)`, "graph");
      const mon1 = (id) => ctx.links.targetsOf(id).some((x) => /^CTRL-monitoring-/.test(x));
      if (!idn(ctx.links.targetsOf("AUT-006"))) return fail(`AUT-006 → ${ctx.links.targetsOf("AUT-006")}`, "graph");
      if (!mon1("INT-007") || !mon1("LOG-001")) return fail(`INT-007/LOG-001 not → monitoring`, "graph");
      return ok(`305 links (file+surface), gaps L1/L2/L3 = ${gaps.join("/")}, curated 12+4 on surface, justifications incl. catalogue_rule/_secondary tolerated; AUT-006/007/008 → identity (C1), AUT-010 → monitoring, INT-007 + LOG → monitoring`); } },
  { id: "TC-F-09", axis: "F", title: "data_protection domain present (ontology v2.2): control served with links", tool: "resolve_entities",
    run: async (c, ctx) => { const r = await c.tool("resolve_entities", { record_type: "control", filters: { domain: "data_protection" } }); if (!r.ok) return fail(r.error);
      const ids = (r.data.entities ?? []).map((e) => e.control_id); if (r.data.total < 1) return fail("no control in domain data_protection", "graph");
      const linkCount = ids.reduce((n, id) => n + ctxLinksTargeting(ctx, id), 0);
      const consult = await c.tool("consult_security_requirements", { risk_level: "L3" }); const active = (consult.data.controls ?? []).filter((x) => x.domain === "data_protection");
      return linkCount >= 1 && active.length >= 1 ? ok(`${r.data.total} data_protection control(s) (${ids.join(",")}), ${linkCount} requirement links, active in consult L3 (${active.length}, _confidence ${active.map((x) => x._confidence).join(",")})`) : fail(`controls ${ids.join(",")} with ${linkCount} links; active in consult: ${active.length}`, "graph"); } },
  { id: "TC-F-10", axis: "F", title: "AUT requirements resolve to C1 (identity) — never CAP (classificação) or DEV (desenvolvimento)", tool: "resolve_entities",
    run: async (c, ctx) => { const auts = [...ctx.knownIds].filter((id) => /^AUT-\d{3}$/.test(id)); if (auts.length === 0) return fail("no AUT requirements in bundle");
      const bad = [], noIdn = [];
      for (const id of auts) { const t = ctx.links.targetsOf(id); if (t.length === 0) return fail(`${id} unlinked`, "graph");
        if (t.some((x) => /governance-classificacao|code-integrity-desenvolvimento/.test(x))) bad.push(`${id}→${t.join("|")}`);
        if (!t.some((x) => /^CTRL-(identity|monitoring)-/.test(x))) noIdn.push(`${id}→${t.join("|")}`); }
      if (bad.length) return fail(`AUT linked to CAP/DEV: ${bad.join("; ")}`, "graph"); if (noIdn.length) return fail(`AUT outside identity/monitoring: ${noIdn.join("; ")}`, "graph");
      const c1 = auts.filter((id) => ctx.links.targetsOf(id).some((x) => /identidade-autenticacao-e-sessoes/.test(x))).length;
      return ok(`${auts.length} AUT requirements all linked; ${c1} → C1 (identity-identidade-autenticacao-e-sessoes), AUT-010 → monitoring; none to CAP/DEV`); } },
  { id: "TC-F-07", axis: "F", title: "G1 gate — every set-returning tool exposes offset/limit", tool: "tools/list",
    run: async (c) => { const setTools = ["plan_sbd_toe_repo_governance", "get_sbd_toe_chapter_implementation_checklist", "get_sbd_toe_operating_model", "get_sbd_toe_verification_matrix", "assess_sbd_toe_implementation", "plan_sbd_toe_rollout", "map_sbd_toe_regulatory_activation", "get_threat_landscape", "consult_security_requirements", "get_guide_by_role", "resolve_entities", "query_sbd_toe_entities"];
      const missing = setTools.filter((n) => { const t = c.tools.find((x) => x.name === n); const p = Object.keys(t?.inputSchema?.properties ?? {}); return !(p.includes("offset") && p.includes("limit")) && !(p.includes("limit") || p.includes("topK")); });
      return missing.length ? part(`set-returning tools without offset/limit: ${missing.join(", ")} (declared totals only)`) : ok("all set-returning tools paginate"); } },

  // ───────────────────────── Axis E — Regression (promotion gate) ─────────────────────────
  // Criterion (v1.7.0, contract v1.14 §1.21 + G-b decision 8): threats carry BOTH the
  // serving-derived `mitigated_by` (structural, from the resolved controls) AND the
  // substrate's `associated_control_ids` (CTRL-* ids, chapter-grained, derivation declared
  // per record); `associated_controls`/`associated_controls_text` remain the Manual prose.
  // PASS requires both structural sides populated with ids that resolve in the bundle.
  { id: "TC-E-01", axis: "E", title: "threat mitigation structural (L2, logging): mitigated_by + associated_control_ids resolve", tool: "get_threat_landscape",
    run: async (c, ctx) => { const r = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["logging"] }); if (!r.ok) return fail(r.error); const th = r.data.threats;
      const mit = th.filter((t) => (t.mitigated_by ?? []).length).length; const badMit = th.flatMap((t) => t.mitigated_by ?? []).filter((m) => !ctx.knownIds.has(m.control_id));
      const withIds = th.filter((t) => (t.associated_control_ids ?? []).length).length; const badAssoc = th.flatMap((t) => t.associated_control_ids ?? []).filter((id) => !ctx.knownIds.has(id));
      if (mit !== th.length) return fail(`${mit}/${th.length} threats carry mitigated_by`); if (badMit.length) return fail(`mitigated_by ids not in bundle: ${badMit.slice(0, 3).map((m) => m.control_id)}`, "mixed");
      if (withIds !== th.length) return part(`associated_control_ids on ${withIds}/${th.length} (declared-empty derivations tolerated)`, "graph"); if (badAssoc.length) return fail(`associated_control_ids not in bundle: ${badAssoc.slice(0, 3)}`, "graph");
      return ok(`${th.length}/${th.length} threats with mitigated_by AND associated_control_ids, all ids resolve`); } },
  { id: "TC-E-02", axis: "E", title: "threat mitigation structural (L2, auth incl. ch.02 via C1): mitigated_by + associated_control_ids resolve", tool: "get_threat_landscape",
    run: async (c, ctx) => { const r = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["auth"], limit: 300 }); if (!r.ok) return fail(r.error); const th = r.data.threats;
      if (!(r.data.meta.activeBundles ?? []).includes("02-requisitos-seguranca")) return fail("ch.02 not in auth scope although C1 defines there (G-b decision 2)");
      const mit = th.filter((t) => (t.mitigated_by ?? []).length).length; const badMit = th.flatMap((t) => t.mitigated_by ?? []).filter((m) => !ctx.knownIds.has(m.control_id));
      const withIds = th.filter((t) => (t.associated_control_ids ?? []).length).length; const badAssoc = th.flatMap((t) => t.associated_control_ids ?? []).filter((id) => !ctx.knownIds.has(id));
      if (mit !== th.length) return fail(`${mit}/${th.length} threats carry mitigated_by`); if (badMit.length) return fail(`mitigated_by ids not in bundle: ${badMit.length}`, "mixed");
      if (withIds !== th.length) return part(`associated_control_ids on ${withIds}/${th.length}`, "graph"); if (badAssoc.length) return fail(`associated_control_ids not in bundle: ${badAssoc.length}`, "graph");
      return ok(`${th.length} threats (ch.02 in scope via C1's defining chapter) with mitigated_by AND associated_control_ids, all resolve`); } },
  { id: "TC-E-03", axis: "E", title: "review path-map: containers → ch.09", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const f = ["Dockerfile", "docker-compose.yml", "k8s/deploy.yaml", "helm/app/values.yaml"]; const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: f }); if (!r.ok) return fail(r.error); const miss = f.filter((x) => !has(bundlesOf(r.data, x), "09-containers-imagens")); return miss.length ? fail(`not → 09: ${miss}`) : ok("all 4 → 09 with reason"); } },
  { id: "TC-E-04", axis: "E", title: "review path-map: *.tf/*.bicep → ch.08", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const f = ["infra/main.tf", "infra/main.bicep"]; const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: f }); if (!r.ok) return fail(r.error); const miss = f.filter((x) => !has(bundlesOf(r.data, x), "08-iac-infraestrutura")); return miss.length ? fail(`not → 08: ${miss}`) : ok("both → 08"); } },
  { id: "TC-E-05", axis: "E", title: "review path-map: non-GitHub CI → ch.07; .env → config/secrets", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const ci = [".gitlab-ci.yml", "Jenkinsfile", ".circleci/config.yml", "azure-pipelines.yml", "bitbucket-pipelines.yml"]; const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: [...ci, ".env"] }); if (!r.ok) return fail(r.error);
      const miss = ci.filter((x) => !has(bundlesOf(r.data, x), "07-cicd-seguro")); const env = bundlesOf(r.data, ".env"); const guard = (r.data.pathMapping ?? []).filter((m) => /unmapped|guardrail|foundation/i.test(m.pattern ?? "")).flatMap((m) => m.matchedFiles ?? []);
      if (miss.length) return fail(`CI not → 07: ${miss}`); if (!env.length) return fail(".env unmapped"); return guard.length ? fail(`in guardrail: ${guard}`) : ok(`5 CI systems → 07; .env → ${env.join(",")}`); } },
  { id: "TC-E-06", axis: "E", title: "review path-map: Python source recognised as code", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: ["src/app/handler.py"] }); if (!r.ok) return fail(r.error); const b = bundlesOf(r.data, "src/app/handler.py"); return has(b, "06-desenvolvimento-seguro") ? ok(`→ ${b.join(",")}`) : fail(`→ ${b}`); } },
  { id: "TC-E-07", axis: "E", title: "query exact-id OPS-002 (ch.12, requirement)", tool: "query_sbd_toe_entities",
    run: async (c) => { const r = await c.tool("query_sbd_toe_entities", { query: "OPS-002", chapterId: "12-monitorizacao-operacoes", entityType: "requirement" }); if (!r.ok) return fail(r.error); return r.data.match === "exact_id" && r.data.entities?.[0]?.requirement_id === "OPS-002" ? ok("exact_id, total 1") : fail(`match=${r.data.match} total=${r.data.total}`); } },
  { id: "TC-E-08", axis: "E", title: "query exact-id CLA-001", tool: "query_sbd_toe_entities",
    run: async (c) => { const r = await c.tool("query_sbd_toe_entities", { query: "CLA-001" }); if (!r.ok) return fail(r.error); return r.data.match === "exact_id" && r.data.entities?.[0]?.requirement_id === "CLA-001" ? ok("exact_id first") : fail(`match=${r.data.match}`); } },
  { id: "TC-E-09", axis: "E", title: "applicability conditional by technologies (iac, containers, ml-ai)", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2", technologies: ["iac", "containers", "ml-ai"] }); if (!r.ok) return fail(r.error); const cond = r.data.conditional ?? []; const c8 = cond.find((x) => x.chapterId === "08-iac-infraestrutura"), c9 = cond.find((x) => x.chapterId === "09-containers-imagens");
      return c8 && c9 && /technolog/i.test(c8.reason + c9.reason) ? ok(`08/09 conditional with technology reasons`) : fail(`conditional=${stable(cond)}`); } },
  { id: "TC-E-10", axis: "E", title: "applicability sensitivity: technologies=[] → no conditional 08/09", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2", technologies: [] }); if (!r.ok) return fail(r.error); const cond = ids(r.data.conditional, "chapterId"); const act = r.data.active ?? [];
      if (cond.length) return fail(`conditional not empty: ${cond}`);
      const c8 = (r.data.chapters ?? []).find((x) => x.chapter_id === "08-iac-infraestrutura");
      return c8 ? ok(`conditional vazio sem technologies (sensibilidade vs E-09); 08 presente com demand graduada (${c8.dominant}) — presença nunca é exclusão (0.14.0)`) : fail("ch08 absent from graduated chapters"); } },
  { id: "TC-E-11", axis: "E", title: "chapter brief ch.12 carries role + honest topics", tool: "get_sbd_toe_chapter_brief",
    run: async (c) => { const r = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "12-monitorizacao-operacoes" }); if (!r.ok) return fail(r.error); return r.data.role?.length ? ok(`role ${r.data.role.length}, phases ${r.data.phases?.length}, artifacts ${r.data.artifacts?.length}`) : fail("no role"); } },
  { id: "TC-E-12", axis: "E", title: "chapter brief ch.08 role present without over-promise", tool: "get_sbd_toe_chapter_brief",
    run: async (c) => { const r = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "08-iac-infraestrutura" }); if (!r.ok) return fail(r.error); return r.data.role?.length ? ok(`role ${r.data.role.length}, phases ${r.data.phases?.length ?? 0}`) : fail("no role"); } },
  { id: "TC-E-13", axis: "E", title: "search debug bounded to topK (KB not MB)", tool: "search_sbd_toe_manual",
    run: async (c) => { const r = await c.tool("search_sbd_toe_manual", { question: "catálogo de eventos de segurança a registar", topK: 3, debug: true }); if (!r.ok) return fail(r.error); return r.size < 200000 ? ok(`${r.size} chars`) : fail(`${r.size} chars`); } },
  { id: "TC-E-14", axis: "E", title: "search debug scales with topK, always bounded", tool: "search_sbd_toe_manual",
    run: async (c) => { const a = await c.tool("search_sbd_toe_manual", { question: "catálogo de eventos de segurança a registar", topK: 1, debug: true }); const b = await c.tool("search_sbd_toe_manual", { question: "catálogo de eventos de segurança a registar", topK: 10, debug: true }); if (!a.ok || !b.ok) return fail(a.error ?? b.error); return a.size < b.size && b.size < 500000 ? ok(`${a.size} < ${b.size} chars`) : fail(`${a.size} vs ${b.size}`); } },
  { id: "TC-E-15", axis: "E", title: "[limite] E5 envelope (coverage_map handles + size_estimate) on large search", tool: "search_sbd_toe_manual",
    run: async (c) => { const r = await c.tool("search_sbd_toe_manual", { question: "todas as práticas de segurança do ciclo de vida", topK: 15 }); if (!r.ok) return fail(r.error); const env = /coverage_map|size_estimate|related_blocks/.test(r.text); return env ? ok("envelope present") : part(`no E5 envelope on search (bounded ${r.size} chars; ${(r.text.match(/\[M\d+\]/g) ?? []).length} cited chunks); pagination/size_estimate live on the structured tools instead`, "roadmap"); } },
  { id: "TC-E-16", axis: "E", title: "rich US: US-02 ch.12 multi-clause bdd + checklist", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "user_story", filters: { us_id: "US-02", chapter_id: "12-monitorizacao-operacoes" } }); if (!r.ok) return fail(r.error); const u = r.data.entities?.[0]; return u && (u.bdd?.length ?? 0) >= 3 && (u.checklist_items?.length ?? 0) >= 1 ? ok(`bdd ${u.bdd.length} clauses, checklist ${u.checklist_items.length}`) : fail(`bdd ${u?.bdd?.length}, checklist ${u?.checklist_items?.length}`); } },
  { id: "TC-E-17", axis: "E", title: "rich US: US-01 ch.01 foundational bdd + checklist", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "user_story", filters: { us_id: "US-01", chapter_id: "01-classificacao-aplicacoes" } }); if (!r.ok) return fail(r.error); const u = r.data.entities?.[0]; return u && (u.bdd?.length ?? 0) >= 3 && (u.checklist_items?.length ?? 0) >= 1 ? ok(`bdd ${u.bdd.length}, checklist ${u.checklist_items.length}`) : fail(`bdd ${u?.bdd?.length}, checklist ${u?.checklist_items?.length}`); } },
  { id: "TC-F-11", axis: "F", title: "select_sbd_toe_requirements (MP1): baseline ∪ contexto, narrowing declarado, G1", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c, ctx) => { const r = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Empacotar o serviço em Docker e preparar deploy em K8s", changed_files: ["Dockerfile", "deploy/k8s/service.yaml"], limit: 25 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage || d.coverage.total === undefined || d.coverage.hasMore === undefined) return fail("no coverage envelope (G1)");
      const ids = []; let offset = 0; for (;;) { const p = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Empacotar o serviço em Docker e preparar deploy em K8s", changed_files: ["Dockerfile", "deploy/k8s/service.yaml"], offset, limit: 25 }); ids.push(...p.data.selection.selected.map((x) => x.requirement_id)); if (!p.data.coverage.hasMore) break; offset = p.data.coverage.nextOffset; }
      if (new Set(ids).size !== ids.length) return fail("pagination duplicates");
      const bad = ids.filter((id) => !ctx.knownIds.has(id)); if (bad.length) return fail(`ids not in bundle: ${bad.slice(0, 3)}`);
      if (!ids.some((id) => id.startsWith("CNT-")) || !ids.some((id) => id.startsWith("DPL-"))) return fail(`context chapters not selected: ${ids.slice(0, 8)}`);
      if (ids.some((id) => id.startsWith("AUT-"))) return fail("AUT selected without a task signal (no narrowing)");
      const nar = d.selection.narrowed_out; if (!Array.isArray(nar) || !nar.some((g) => g.category === "AUT")) return fail("narrowed_out does not list AUT (silent narrowing)");
      if (!d.selection.selected.every((x) => (x.selection_trace ?? []).length > 0)) return fail("selected item without selection_trace");
      return ok(`walk ${ids.length} selected (CNT/DPL in, AUT narrowed with reason), traces on all, narrowed_out ${d.coverage.narrowed_out_requirements} declared`); } },
  { id: "TC-F-12", axis: "F", title: "select (MP1): activadores declarados (agents, data_sensitivity) + overlay extend", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => { const a = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L3", task: "Worker agêntico com mandate, kill-switch e audit por tool-call" }); if (!a.ok) return fail(a.error);
      const aid = a.data.selection.selected.map((x) => x.requirement_id); for (const id of ["REQ-AGN-001", "REQ-AGN-002", "REQ-AGN-003", "REQ-AGN-004"]) if (!aid.includes(id)) return fail(`${id} not selected for an agentic task`);
      for (const id of ["ACC-002", "AUT-006", "ENC-006", "DEP-011", "DEP-013", "DEP-014"]) if (!aid.includes(id)) return fail(`R1 principal set missing ${id}`);
      const r1 = a.data.selection.selected.find((x) => x.requirement_id === "ACC-002");
      if (!(r1?.selection_trace ?? []).some((t) => String(t.trigger ?? "").startsWith("R1:"))) return fail("R1 not named in selection_trace");
      if (aid.some((id) => id.startsWith("SES-"))) return fail("SES selected for an agentic task (R2)");
      const b = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L3", task: "Formulário de registo com dados pessoais", data_sensitivity: "regulated", include_regulatory_overlay: true, regulatory_frameworks: ["EXT-AI-ACT"] }); if (!b.ok) return fail(b.error);
      const bid = b.data.selection.selected.map((x) => x.requirement_id); if (!bid.some((id) => id.startsWith("ENC-"))) return fail("data_sensitivity=regulated did not activate ENC");
      if (b.data.overlay.status !== "resolved" || b.data.overlay.obligations.length === 0) return fail(`overlay extend not resolved: ${b.data.overlay.status}`);
      return ok(`agents → AGN ×4 + wave; regulated → ENC in; overlay extend ${b.data.overlay.obligations.length} AI Act obligations`); } },
  { id: "TC-F-13", axis: "F", title: "camada de ensino (R3): guide → select → aprofundar via narrowed_out/sinal", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => {
      const g = await c.resource("sbd://toe/agent-guide");
      const raw = typeof g === "string" ? g : (g?.contents?.[0]?.text ?? g?.text ?? JSON.stringify(g));
      const text = String(raw).replace(/\\"/g, '"');
      if (!text.includes("select_sbd_toe_requirements")) return fail("guide does not teach select");
      if (!text.includes("narrowed_out")) return fail("guide does not teach the two bands");
      if (!text.includes('mode=\"index\"') && !text.includes('mode: \"index\"')) return fail("guide does not teach consult mode index");
      if (/m[áa]x(imo)?\s*50|max\s*50|50 activated/i.test(text)) return fail("guide still references the old max-50 scope gate");
      const a = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Expor API de consulta com chaves de cliente e rate limiting" }); if (!a.ok) return fail(a.error);
      const ses = (a.data.selection.narrowed_out ?? []).find((x) => x.category === "SES");
      if (!ses || !ses.reason) return fail("narrowed_out has no teachable SES group/reason");
      const next = a.data.next ?? []; if (!next.some((n) => n.tool === "prepare_sbd_toe_codegen_context") || !next.some((n) => n.tool === "consult_security_requirements")) return fail("select.next does not suggest prepare+consult");
      const b = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Expor API de consulta com chaves de cliente, rate limiting e sessões de utilizador autenticado" }); if (!b.ok) return fail(b.error);
      const bids = b.data.selection.selected.map((x) => x.requirement_id);
      if (!bids.some((id) => id.startsWith("SES-"))) return fail("re-call with the missing session signal did not recover SES");
      return ok(`guide teaches select+bands+index; SES narrowed with reason → recovered by adding the session signal (${bids.filter((i) => i.startsWith("SES-")).length} SES back); next[] → prepare+consult`); } },
  { id: "TC-F-14", axis: "F", title: "R-image (v1.8.0): 'imagem' docker → CNT, 'imagem' ficheiro → FIL (desambiguação declarada)", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => {
      const a = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Publicar a imagem Docker no registry do cluster" }); if (!a.ok) return fail(a.error);
      const aid = a.data.selection.selected.map((x) => x.requirement_id);
      if (!aid.some((id) => id.startsWith("CNT-"))) return fail(`docker sense did not reach CNT: ${aid.slice(0, 8)}`);
      if (aid.some((id) => id.startsWith("FIL-"))) return fail("docker sense wrongly selected FIL (homonym misfire)");
      const b = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Endpoint de upload de imagens de perfil (fotografias) com pré-visualização" }); if (!b.ok) return fail(b.error);
      const bid = b.data.selection.selected.map((x) => x.requirement_id);
      if (!bid.some((id) => id.startsWith("FIL-"))) return fail(`file sense did not reach FIL: ${bid.slice(0, 8)}`);
      if (bid.some((id) => id.startsWith("CNT-"))) return fail("file sense wrongly selected CNT (homonym misfire)");
      return ok(`docker → CNT ×${aid.filter((i) => i.startsWith("CNT-")).length} sem FIL; ficheiro → FIL ×${bid.filter((i) => i.startsWith("FIL-")).length} sem CNT`); } },
  { id: "TC-F-15", axis: "F", title: "SES-008-por-tecnologia (Author): JWT activa SES-008 a qualquer nível, nomeado no trace", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => {
      const a = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L1", task: "SPA com login e sessão JWT; app interna de baixo risco" }); if (!a.ok) return fail(a.error);
      const hit = a.data.selection.selected.find((x) => x.requirement_id === "SES-008");
      if (!hit) return fail("SES-008 not selected for a JWT task at L1");
      if (!(hit.selection_trace ?? []).some((t) => String(t.trigger ?? "").startsWith("SES-008-por-tecnologia"))) return fail("SES-008 selected but the named rule is not in the trace");
      const b = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L1", task: "SPA com login e sessão de utilizador; app interna de baixo risco" }); if (!b.ok) return fail(b.error);
      if (b.data.selection.selected.some((x) => x.requirement_id === "SES-008")) return fail("SES-008 selected without a JWT/user-token signal (level filter must rule)");
      return ok("JWT@L1 → SES-008 com regra nomeada no trace; sem JWT → nível manda (SES-008 fora)"); } },
  { id: "TC-F-16", axis: "F", title: "read_sbd_toe_resource (0.13.0): espelho de resources/read — estático, templado e URI desconhecido declarado", tool: "read_sbd_toe_resource",
    run: async (c) => {
      const v = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/version" }); if (!v.ok) return fail(v.error);
      const vp = JSON.parse(v.data.content); if (!vp.kg?.release_tag || !vp.manual?.tag) return fail("version payload without kg/manual provenance");
      const stampOk = (x) => x === vp.kg.release_tag || x === "dev:" + String(vp.kg.sha256 ?? "").slice(0, 12);
      if (!stampOk(v.data.provenance?.kg)) return fail("tool provenance.kg stamp mismatch");
      const t = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/codegen-instructions/codegen" }); if (!t.ok) return fail(`templated URI failed: ${t.error}`);
      const tp = JSON.parse(t.data.content); if (!tp || t.data.mimeType !== "application/json") return fail("codegen-instructions not materialized as JSON");
      const u = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/nope" });
      if (u.ok) return fail("unknown URI did not error");
      if (!String(u.error).includes("sbd://toe/version") || !String(u.error).includes("codegen-instructions")) return fail("unknown-URI error does not list the valid URIs (never-silent)");
      return ok(`version (kg=${vp.kg.release_tag}) + templated codegen-instructions via tool; unknown URI → erro declarado com lista derivada`); } },
  { id: "TC-F-17", axis: "F", title: "stamp de versão por resposta + inspect com proveniência do pin (0.13.0)", tool: "consult_security_requirements + inspect_sbd_toe_retrieval",
    run: async (c) => {
      const pin = JSON.parse((await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/version" })).data.content);
      const r = await c.tool("consult_security_requirements", { risk_level: "L2", concerns: ["logging"] }); if (!r.ok) return fail(r.error);
      const stampOk17 = (x) => x === pin.kg.release_tag || x === "dev:" + String(pin.kg.sha256 ?? "").slice(0, 12);
      if (!stampOk17(r.data.provenance?.kg)) return fail(`consult provenance.kg=${r.data.provenance?.kg} ≠ pin`);
      const s = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", task: "Adicionar logging de auditoria ao serviço" }); if (!s.ok) return fail(s.error);
      if (!stampOk17(s.data.provenance?.kg)) return fail("select provenance.kg missing");
      const i = await c.tool("inspect_sbd_toe_retrieval", { question: "session token TTL" }); if (!i.ok) return fail(i.error);
      const txt = typeof i.data === "string" ? i.data : (i.data ? JSON.stringify(i.data) : String(i.text ?? i.raw ?? ""));
      if (!txt.includes("Pin servido") || !(txt.includes(pin.kg.release_tag) || txt.includes(String(pin.kg.sha256 ?? "").slice(0, 12)))) return fail("inspect does not present the consumed-bundle pin provenance");
      if (/run_id=n\/d/.test(txt)) return fail("inspect still shows run_id=n/d (undeclared)");
      return ok(`provenance.kg=${pin.kg.release_tag} em consult+select; inspect apresenta o Pin servido (fim do n/d não-declarado)`); } },
  { id: "TC-F-18", axis: "F", title: "threat_landscape paginado (0.15.0): default 25, coverage+size_estimate, enum agents", tool: "get_threat_landscape",
    run: async (c) => {
      const r = await c.tool("get_threat_landscape", { risk_level: "L2" }); if (!r.ok) return fail(r.error);
      const d = r.data; if (!d.coverage || d.coverage.total === undefined) return fail("sem coverage");
      if (d.threats.length > 25) return fail(`default devolveu ${d.threats.length} > 25`);
      if (!d.size_estimate?.approx_tokens) return fail("sem size_estimate");
      if (d.coverage.total > 25 && !d.coverage.hasMore) return fail("hasMore incoerente");
      const p2 = await c.tool("get_threat_landscape", { risk_level: "L2", offset: d.coverage.nextOffset ?? 0, limit: 25 });
      if (!p2.ok || p2.data.threats[0]?.id === d.threats[0]?.id) return fail("página 2 não avança");
      const ag = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["agents"], limit: 5 });
      if (!ag.ok) return fail(`concern agents rejeitado: ${ag.error}`);
      return ok(`default ${d.threats.length}/${d.coverage.total} threats, size≈${d.size_estimate.approx_tokens}tk, página 2 avança, enum agents aceite`); } },
  { id: "TC-F-19", axis: "F", title: "banda excluded_by_level (0.15.0): select declara exclusões de nível; prepare com counts", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => {
      const r = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L1", task: "SPA com login e sessão de utilizador; app interna" }); if (!r.ok) return fail(r.error);
      const ex = r.data.selection.excluded_by_level; if (!Array.isArray(ex) || ex.length === 0) return fail("excluded_by_level vazio em L1 (há requisitos L2+/L3-only)");
      if (!ex.every((g) => g.reason && g.requirement_ids?.length === g.count)) return fail("grupo sem razão/ids coerentes");
      if (typeof r.data.coverage.excluded_by_level_requirements !== "number") return fail("coverage sem o total da banda");
      const p = await c.tool("prepare_sbd_toe_codegen_context", { selection_mode: "discover", task: "Adicionar logging de auditoria ao serviço interno", risk_level: "L1" }); if (!p.ok) return fail(p.error);
      const sel = p.data.completeness_report?.selection;
      if (typeof sel?.excluded_by_level_requirements !== "number") return fail("prepare sem counts da banda");
      return ok(`select L1: ${ex.length} categorias excluídas por nível (${r.data.coverage.excluded_by_level_requirements} reqs) DECLARADAS; prepare counts ✓`); } },
  { id: "TC-F-20", axis: "F", title: "fases (0.15.0): alias implement→develop; desconhecida ⇒ phase_warning; tool_prefix", tool: "get_guide_by_role",
    run: async (c) => {
      const a = await c.tool("get_guide_by_role", { risk_level: "L2", role: "developer", phase: "implement" }); if (!a.ok) return fail(a.error);
      if ((a.data.assignments ?? []).length === 0) return fail("alias implement→develop não produziu assignments");
      const b = await c.tool("get_guide_by_role", { risk_level: "L2", role: "developer", phase: "fase-banana" }); if (!b.ok) return fail(b.error);
      if (!b.data.phase_warning?.knownPhases?.length) return fail("fase desconhecida sem phase_warning.knownPhases (silêncio)");
      const g = await c.tool("generate_sbd_toe_skill", { role: "developer", format: "subagent", flavour: "harnessed", tool_prefix: "mcp__custom__" }); if (!g.ok) return fail(g.error);
      if (!g.data.content.includes("mcp__custom__consult_security_requirements")) return fail("tool_prefix não aplicado ao frontmatter");
      if (g.data.content.includes("mcp__sbd-toe__consult")) return fail("prefixo default residual com tool_prefix custom");
      return ok(`implement→develop (${a.data.assignments.length} assignments); banana → warning c/ ${b.data.phase_warning.knownPhases.length} knownPhases; tool_prefix aplicado`); } },
  { id: "TC-F-21", axis: "F", title: "erros harmonizados (0.15.0): brief/orgScope/slot declarados com listas de válidos", tool: "get_sbd_toe_chapter_brief",
    run: async (c) => {
      const b = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "capitulo-fantasma" }); if (!b.ok) return fail(b.error);
      if (b.data.found !== false || !b.data.valid_chapter_ids?.length) return fail("brief desconhecido sem erro declarado + lista");
      const n = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "8" }); if (!n.ok || n.data.found === false) return fail("alias numérico '8' não resolve");
      const o = await c.tool("get_sbd_toe_operating_model", { orgScope: "zzz-inexistente" });
      if (o.ok) return fail("orgScope sem correspondência devolveu sucesso (0.15.1 exige erro)");
      if (!/Secções válidas|section/.test(String(o.error))) return fail("erro orgScope sem lista derivada de válidos");
      const sBad = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/codegen-instructions/codegen", slot: "slot-fantasma" });
      if (sBad.ok || !/Slots válidos/.test(String(sBad.error))) return fail("slot inválido sem lista de slots");
      const sOk = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/agent-guide", char_offset: 0, char_limit: 500 });
      if (!sOk.ok || sOk.data.coverage?.total_chars <= 500 || sOk.data.content.length !== 500) return fail("char paging não corta/declara");
      return ok(`brief fantasma → lista de ${b.data.valid_chapter_ids.length} ids; '8' resolve; orgScope warning; slot inválido lista slots; char paging 500/${sOk.data.coverage.total_chars}`); } },
  { id: "TC-F-22", axis: "F", title: "index-compact DERIVADO (0.15.0) + aliases de naming risk_level↔riskLevel", tool: "read_sbd_toe_resource",
    run: async (c) => {
      const r = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/index-compact" }); if (!r.ok) return fail(r.error);
      const idx = JSON.parse(r.data.content);
      if (idx.version !== "2.0-derived") return fail(`version=${idx.version} (estático vivo?)`);
      if (/"minLevel"\s*:/.test(JSON.stringify(idx))) return fail("chave minLevel ainda servida");
      if (!idx.chapters?.every((ch) => ch.demand_by_level?.L1)) return fail("capítulo sem demand_by_level");
      const m = await c.tool("map_sbd_toe_applicability", { risk_level: "L2" }); if (!m.ok) return fail("alias risk_level→riskLevel falhou no map");
      const q = await c.tool("consult_security_requirements", { riskLevel: "L2", concerns: ["logging"] }); if (!q.ok) return fail("alias riskLevel→risk_level falhou no consult");
      return ok(`index 2.0-derived (${idx.chapters.length} caps, demand_by_level, 0 minLevel); aliases de nível nos 2 sentidos ✓`); } },
  { id: "TC-F-23", axis: "F", title: "0.15.1: tool_prefix placeholder visível + brief.next sem id inválido + mode verdadeiro", tool: "generate_sbd_toe_skill",
    run: async (c) => {
      const g = await c.tool("generate_sbd_toe_skill", { role: "developer", format: "subagent", flavour: "harnessed" }); if (!g.ok) return fail(g.error);
      if (!g.data.content.includes("<MCP_TOOL_PREFIX>consult_security_requirements")) return fail("sem parâmetro: frontmatter não usa placeholder");
      if (!/SUBSTITUI `<MCP_TOOL_PREFIX>`/.test(g.data.content)) return fail("placeholder sem instrução de substituição (instalação silenciosa possível)");
      const b = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "capitulo-fantasma" }); if (!b.ok) return fail(b.error);
      if (JSON.stringify(b.data.next ?? []).includes("capitulo-fantasma")) return fail("next sugere o id que a resposta invalidou");
      return ok("placeholder+instrução sem parâmetro; next do brief inválido usa placeholder genérico"); } },
  { id: "TC-F-24", axis: "F", title: "0.15.1: assess — kpi_values {} rejeitado; gaps_offset walk; posture below vs not_assessed", tool: "assess_sbd_toe_implementation",
    run: async (c) => {
      const e = await c.tool("assess_sbd_toe_implementation", { risk_level: "L2", kpi_values: {} });
      if (e.ok || !/kpi_values vazio|metric_ids/.test(String(e.error))) return fail("{} não rejeitado com erro instrutivo");
      const n = await c.tool("assess_sbd_toe_implementation", { risk_level: "L2", kpi_values: { "XX-FAKE": 1 } }); if (!n.ok) return fail(n.error);
      if (n.data.data.posture !== "not_assessed") return fail(`só not_reported ⇒ posture=${n.data.data.posture} (esperado not_assessed)`);
      const seen = []; let go = 0, guard = 0;
      for (;;) { const p = await c.tool("assess_sbd_toe_implementation", { risk_level: "L2", kpi_values: { "XX-FAKE": 1 }, gaps_offset: go, gaps_limit: 40 }); if (!p.ok) return fail(p.error);
        seen.push(...p.data.data.gaps.map((x) => x.metric_id)); const gc = p.data.data.gaps_coverage; if (!gc) return fail("sem gaps_coverage");
        if (!gc.hasMore) { if (seen.length !== gc.total) return fail(`walk ${seen.length} ≠ total ${gc.total}`); break; }
        go = gc.nextOffset; if (guard++ > 10) return fail("runaway"); }
      return ok(`{} → erro instrutivo; posture not_assessed sem avaliação; gaps walk ${seen.length}/${seen.length} com coverage própria`); } },
  { id: "TC-F-25", axis: "F", title: "0.16.0: dívida de dados exposta — artifacts nos assignments, control_names nas ameaças, totais com semântica", tool: "get_guide_by_role + get_threat_landscape + plan_repo_governance",
    run: async (c) => {
      const g = await c.tool("get_guide_by_role", { risk_level: "L2", role: "developer", include_detail: true }); if (!g.ok) return fail(g.error);
      const total = (g.data.assignments ?? []).length; const withArts = (g.data.assignments ?? []).filter((a) => (a.artifacts ?? []).length > 0).length;
      if (total === 0 || withArts !== total) return fail(`artifacts ${withArts}/${total} — o elo requisito→prova continua vazio`);
      const t = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["auth"], limit: 300 }); if (!t.ok) return fail(t.error);
      const names = t.data.threats.filter((x) => (x.associated_control_names ?? []).length > 0).length;
      if (names < 90) return fail(`control_names em ${names}/${t.data.threats.length} (esperado ~todos, 233/233 no bundle)`);
      const p = await c.tool("plan_sbd_toe_repo_governance", { riskLevel: "L2", limit: 3 }); if (!p.ok) return fail(p.error);
      const at = p.data.artefact_totals;
      if (!at || at.distinct_count !== 45 || at.chapter_relation_count !== 469 || !at.count_semantics) return fail(`artefact_totals=${JSON.stringify(at)}`);
      return ok(`artifacts ${withArts}/${total} no guide; control_names ${names}/${t.data.threats.length}; totais 45 distinct / 469 relações com semântica declarada`); } },
  { id: "TC-F-26", axis: "F", title: "0.17.0: resolve_entities valida chaves de filtro (caso do lead ACC-001/ACC-003)", tool: "resolve_entities",
    run: async (c) => {
      const bad = await c.tool("resolve_entities", { record_type: "requirement", filters: { id: { in: ["ACC-001", "ACC-003"] } } }); if (!bad.ok) return fail(bad.error);
      if (!Array.isArray(bad.data.unknown_filter_fields) || !bad.data.unknown_filter_fields.includes("id")) return fail("campo desconhecido 'id' não declarado (total:0 silencioso persiste)");
      if (!bad.data.valid_fields?.includes("requirement_id")) return fail("valid_fields sem requirement_id (derivação falhou)");
      const dotOk = await c.tool("resolve_entities", { record_type: "requirement", filters: { "applicable_levels.L2": true }, limit: 2 }); if (!dotOk.ok) return fail(dotOk.error);
      if (dotOk.data.unknown_filter_fields?.length) return fail("dot-notation válida marcada como desconhecida");
      const dotBad = await c.tool("resolve_entities", { record_type: "requirement", filters: { "applicable_level.L2": true } }); if (!dotBad.ok) return fail(dotBad.error);
      if (!dotBad.data.unknown_filter_fields?.includes("applicable_level.L2")) return fail("dot-notation inválida não declarada");
      const good = await c.tool("resolve_entities", { record_type: "requirement", filters: { requirement_id: { in: ["ACC-001", "ACC-003"] } } });
      if (good.data.total !== 2 || good.data.unknown_filter_fields) return fail("caminho válido regrediu");
      return ok(`'id' → unknown_filter_fields + ${bad.data.valid_fields.length} valid_fields derivados; dot-notation ✓/✗ declarada; requirement_id → 2 (o 0-silencioso do lead morreu)`); } },
  { id: "TC-F-27", axis: "F", title: "0.17.0: cadeia requisito→prova — select → verification_matrix(requirement_ids)", tool: "get_sbd_toe_verification_matrix",
    run: async (c) => {
      const s = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", task: "Empacotar o serviço em Docker e preparar deploy em K8s", changed_files: ["Dockerfile"], technologies: ["containers", "kubernetes"] }); // beta.22: `Dockerfile` não casa a tabela de paths (inércia agora DECLARADA); a tecnologia é o canal com efeito if (!s.ok) return fail(s.error);
      if (!(s.data.next ?? []).some((n) => n.tool === "get_sbd_toe_verification_matrix" && /requirement_ids/.test(n.with ?? ""))) return fail("next do select não aponta à matriz com ids");
      const ids = s.data.selection.selected.slice(0, 4).map((x) => x.requirement_id);
      const m = await c.tool("get_sbd_toe_verification_matrix", { risk_level: "L2", requirement_ids: [...ids, "REQ-XXX-999"], limit: 50 }); if (!m.ok) return fail(m.error);
      const md = m.data.data ?? m.data; // envelope RF-E5: rows vivem em data.data via MCP
      const rowIds = new Set(md.rows.map((r) => r.requirement_id).filter(Boolean));
      if (![...rowIds].every((id) => ids.includes(id))) return fail(`rows fora dos ids pedidos: ${[...rowIds].slice(0,4)}`);
      if (!md.unknown_requirement_ids?.includes("REQ-XXX-999")) return fail("id sem prova não declarado em unknown_requirement_ids");
      return ok(`select→matrix: ${rowIds.size} requisitos com prova de ${ids.length} pedidos; REQ-XXX-999 declarado sem EvidencePattern; next fecha a cadeia`); } },
  { id: "TC-F-28", axis: "F", title: "0.18.0 (estação 3): rastreabilidade requisito→fonte — DEP-001 e FIL-002 numa chamada", tool: "trace_sbd_toe_requirement_sources",
    run: async (c) => {
      const r = await c.tool("trace_sbd_toe_requirement_sources", { requirement_ids: ["DEP-001", "FIL-002", "REQ-XXX-999"] }); if (!r.ok) return fail(r.error);
      const d = r.data; const by = new Map(d.requirements.map((x) => [x.requirement_id, x]));
      const fil = by.get("FIL-002"); const dep = by.get("DEP-001");
      if (!fil || !dep) return fail("DEP-001/FIL-002 ausentes");
      const filDirect = (fil.direct?.source_anchors ?? []).length;
      if (filDirect < 1 || fil.coverage_status !== "direct") return fail(`FIL-002 sem fontes directas (${filDirect})`);
      if (dep.coverage_status !== "coverage_compensated") return fail(`DEP-001 status=${dep.coverage_status} (esperado coverage_compensated — a distinção nunca se esbate)`);
      const hop = dep.compensated?.chains?.[0]?.alignments?.[0];
      if (!hop?.alignment_type || typeof hop?.confidence !== "number") return fail("salto sem tipo/confiança");
      if (!d.unknown_requirement_ids?.includes("REQ-XXX-999")) return fail("id desconhecido não declarado");
      if (!/não autoria|NÃO autoria/i.test(d.provenance?.note ?? "")) return fail("nota epistémica «cobertura, não autoria» ausente");
      if (typeof d.meta?.counts?.without_any_source_declared !== "number") return fail("os 19 sem-fonte não declarados no meta");
      const diet = await c.tool("trace_sbd_toe_requirement_sources", { requirement_ids: ["DEP-001"], include_chains: false });
      if (diet.data.requirements[0]?.compensated?.chains) return fail("include_chains=false não dietou");
      return ok(`FIL-002 direct ×${filDirect} + DEP-001 compensado (1º salto ${hop.alignment_type}@${hop.confidence}); fake declarado; meta ${d.meta.counts.with_direct_anchors}/${d.meta.counts.with_compensated_coverage}/${d.meta.counts.without_any_source_declared}; dieta ✓`); } },
  { id: "TC-F-29", axis: "F", title: "0.19.0 (ronda 3): paráfrase — basis declared/lexical + aviso de dominância + razão sensível-à-redacção", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => {
      const rica = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Endpoint de upload com sessão de utilizador e token de acesso" }); if (!rica.ok) return fail(rica.error);
      const magra = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Receber ficheiros dos utilizadores autenticados" }); if (!magra.ok) return fail(magra.error);
      const idsR = new Set(rica.data.selection.selected.map((x) => x.requirement_id));
      const idsM = new Set(magra.data.selection.selected.map((x) => x.requirement_id));
      if (idsR.size === idsM.size) return fail("paráfrase não reproduziu a divergência (fixture morta)");
      const tr = rica.data.selection.selected[0]?.selection_trace ?? [];
      if (!tr.every((t) => t.basis === "declared" || t.basis === "lexical")) return fail("trace sem basis");
      const ses = magra.data.selection.narrowed_out.find((g) => g.category === "SES");
      if (ses && !/SENSÍVEL À REDACÇÃO|sensível à redacção|redacção/i.test(ses.reason)) return fail("razão do narrowed lexical não diz que é sensível à redacção");
      if (ses && ses.basis !== "lexical") return fail("narrowed lexical sem basis");
      const w = magra.data.lexical_dominance_warning;
      if (!w || w.lexical_share <= w.threshold) return fail("aviso de dominância não disparou na variante magra");
      if (!Array.isArray(w.candidate_concerns) || w.candidate_concerns.length === 0) return fail("aviso sem candidate_concerns");
      if (!(magra.data.next ?? []).some((n) => /concerns EXPLÍCITOS|explícitos/i.test(n.intent ?? ""))) return fail("next não sugere estabilizar com concerns");
      const decl = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Receber ficheiros dos utilizadores autenticados", concerns: w.candidate_concerns.slice(0, 3) }); if (!decl.ok) return fail(decl.error);
      if (decl.data.lexical_dominance_warning) return fail("com concerns explícitos o aviso devia calar-se");
      const ex = magra.data.selection.excluded_by_level?.[0];
      if (ex && ex.basis !== "declared") return fail("excluded_by_level devia ser basis declared (regra de dados)");
      return ok(`rica ${idsR.size} vs magra ${idsM.size}; basis nos traces; narrowed diz 'sensível à redacção'; aviso share=${w.lexical_share} c/ ${w.candidate_concerns.length} concerns candidatos; declarado → sem aviso`); } },
  { id: "TC-F-30", axis: "F", title: "0.19.0: slot por índice com lista REAL derivada (o «Slots válidos: .» morreu)", tool: "read_sbd_toe_resource",
    run: async (c) => {
      const bad = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/codegen-instructions/codegen", slot: "banana" });
      if (bad.ok) return fail("slot inválido aceite");
      if (!/Slots válidos: 0 \(when=/.test(String(bad.error))) return fail(`lista de slots não derivada: ${String(bad.error).slice(0,120)}`);
      const ok0 = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/codegen-instructions/codegen", slot: "0" }); if (!ok0.ok) return fail(ok0.error);
      const slot = JSON.parse(ok0.data.content);
      if (!slot.when || !slot.text) return fail("slot 0 não devolvido");
      return ok(`slot inválido → catálogo real por índice+when; slot '0' (when=${slot.when}) devolvido`); } },
  { id: "TC-F-31", axis: "F", title: "0.19.1 (ronda 4): V2 vazio=ALARME; V4 declarado vence lexical; replay-SES continua morto", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => {
      // V2 (equivalente construído — wording original não registado; declarado): 0 selected → alarme
      const v2 = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Cumprir as políticas internas de segurança da informação no módulo de clientes" }); if (!v2.ok) return fail(v2.error);
      if (v2.data.selection.selected.length !== 0) return fail("fixture V2 deixou de dar 0 (re-baseline)");
      const ew = v2.data.empty_selection_warning;
      if (!ew || !ew.candidate_concerns?.length) return fail("selecção vazia SEM alarme/candidatos (ponto cego vivo)");
      if (v2.data.lexical_dominance_warning) return fail("share-warning a disparar sobre vazio (devia ceder ao alarme)");
      if ((v2.data.next ?? []).some((n) => n.tool === "get_sbd_toe_verification_matrix")) return fail("next manda lista VAZIA à matrix");
      if (!/concerns/i.test(v2.data.next?.[0]?.intent ?? "")) return fail("next[0] não é estabilizar com concerns");
      // 0.19.2: next calibrado — a sugestão leva ≤3 concerns (limite do prepare); o aviso mantém a lista completa
      const suggested = (v2.data.next[0].with.match(/concerns=\[([^\]]*)\]/)?.[1] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      if (suggested.length === 0 || suggested.length > 3) return fail(`next sugere ${suggested.length} concerns (destino aceita ≤3 famílias)`);
      if (ew.candidate_concerns.length <= 3 && ew.candidate_concerns.length !== suggested.length) return fail("aviso perdeu a lista completa");
      // V4: auth DECLARADO → SES fica; sem contradição activated∧narrowed
      const v4 = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Alterar o email da conta do utilizador", concerns: ["auth"] }); if (!v4.ok) return fail(v4.error);
      const sesSel = v4.data.selection.selected.filter((x) => x.category === "SES").length;
      if (sesSel === 0) return fail("V4: SES revogado apesar de auth DECLARADO");
      if (v4.data.selection.narrowed_out.some((g) => g.category === "SES")) return fail("V4: contradição — SES em selected E narrowed");
      // replay-guard: base lexical → R2 continua a matar o SES espúrio
      const rp = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L3", task: "Expor API pública de consulta com chaves de cliente e rate limiting", exposure: "public" }); if (!rp.ok) return fail(rp.error);
      const rpNar = rp.data.selection.narrowed_out.find((g) => g.category === "SES");
      if (!rpNar || rp.data.selection.selected.some((x) => x.category === "SES")) return fail("replay-SES REVIVEU (guarda falhou)");
      // V1/V3: divergência lexical conhecida-E-avisada (2 redacções, counts≠, ambas com aviso)
      const v1 = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Endpoint de upload com sessão de utilizador e token de acesso" });
      const v3 = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Receber ficheiros dos utilizadores autenticados" });
      if (v1.data.selection.selected.length === v3.data.selection.selected.length) return fail("V1/V3 fixture morta");
      if (!v1.data.lexical_dominance_warning || !v3.data.lexical_dominance_warning) return fail("divergência lexical sem aviso em ambas");
      return ok(`V2: alarme c/ ${ew.candidate_concerns.length} candidatos, sem matrix no next; V4: SES ×${sesSel} preservado sem contradição; replay-SES morto (×${rpNar.count} narrowed); V1/V3 ${v1.data.selection.selected.length}≠${v3.data.selection.selected.length} ambas avisadas`); } },
  { id: "TC-F-32", axis: "F", title: "0.19.2: next calibrado com os limites do destino (round-trip executável)", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => {
      // V2 vazio → a sugestão do next TEM de ser aceite pelo destino (select re-run) e a jusante (prepare ≤3 famílias)
      const task = "Cumprir as políticas internas de segurança da informação no módulo de clientes";
      const v2 = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task }); if (!v2.ok) return fail(v2.error);
      const suggested = (v2.data.next?.[0]?.with.match(/concerns=\[([^\]]*)\]/)?.[1] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      if (suggested.length === 0 || suggested.length > 3) return fail(`sugestão fora do tecto: ${suggested.length}`);
      const rerun = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task, concerns: suggested });
      if (!rerun.ok) return fail(`o próprio select rejeitou a sugestão: ${rerun.error}`);
      if (rerun.data.selection.selected.length === 0) return fail("re-corrida sugerida continua vazia");
      const prep = await c.tool("prepare_sbd_toe_codegen_context", { selection_mode: "discover", task, risk_level: "L2", concerns: suggested });
      if (!prep.ok) return fail(`prepare rejeitou a sugestão: ${prep.error}`);
      if (prep.data.status === "needs_decomposition") return fail("prepare pediu decomposição à sugestão calibrada (≤3)");
      // matrix: com página >50, o hint declara o tecto do destino (≤50)
      const big = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L3", task: "Rever a segurança da plataforma", concerns: ["auth", "validation", "logging"], limit: 200 });
      if (!big.ok) return fail(big.error);
      const prove = (big.data.next ?? []).find((n) => n.tool === "get_sbd_toe_verification_matrix");
      const pageLen = big.data.selection.selected.length;
      if (pageLen > 50 && prove && !/≤50|<=50/.test(prove.with)) return fail(`página ${pageLen}>50 sem tecto declarado no hint da matrix`);
      return ok(`sugestão [${suggested.join(",")}] aceite: select re-run ${rerun.data.selection.selected.length} selected, prepare ${prep.data.status}; página ${pageLen}${pageLen > 50 ? " c/ tecto ≤50 declarado" : ""}`); } },
  { id: "TC-F-33", axis: "F", title: "0.19.3: seguir 3 next à letra → 3 funcionam; matrix impõe o tecto real", tool: "select_sbd_toe_requirements",
    // beta.21 (declarativo primeiro): DISCOVER-ONLY — este cenário mede o motor inferencial (default até à beta.20); o contrato declarativo é coberto por TC-F-35/36.
    run: async (c) => {
      // (1) prepare ready → next resolve_entities com a forma REAL, parseado e executado
      const p = await c.tool("prepare_sbd_toe_codegen_context", { selection_mode: "discover", task: "Implementar login com sessões de utilizador", risk_level: "L2" }); if (!p.ok) return fail(p.error);
      const pd = p.data.data ?? p.data;
      const resolveRow = (pd.next ?? []).find((n) => n.tool === "resolve_entities");
      if (!resolveRow) return fail("prepare sem next resolve_entities");
      const rt = resolveRow.with.match(/record_type="([^"]+)"/)?.[1];
      const ids = [...resolveRow.with.matchAll(/"([A-Z]{3}-\d{3})"/g)].map((m) => m[1]);
      if (!rt || ids.length === 0) return fail(`next do prepare não é copiável: ${resolveRow.with}`);
      const res = await c.tool("resolve_entities", { record_type: rt, filters: { requirement_id: { in: ids } } });
      if (!res.ok) return fail(`resolve rejeitou a sugestão do prepare: ${res.error}`);
      const rd0 = res.data.data ?? res.data;
      const nRecs = (rd0.records ?? rd0.entities ?? []).length ?? 0;
      if (!(nRecs > 0 || (rd0.total ?? 0) > 0)) return fail("resolve devolveu 0 para os ids citados");
      // (2) select → proveRow → matrix aceita os ids copiáveis do próprio hint
      const s = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Implementar login com sessões de utilizador" }); if (!s.ok) return fail(s.error);
      let prove = (s.data.next ?? []).find((n) => n.tool === "get_sbd_toe_verification_matrix");
      let stabilized = false;
      if (!prove) {
        // contrato 0.19.0: com aviso, next[0] é estabilizar (sem matrix) — SEGUE a própria sugestão
        const sug = (s.data.next?.[0]?.with.match(/concerns=\[([^\]]*)\]/)?.[1] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
        if (sug.length === 0) return fail("sem proveRow e sem sugestão de estabilização parseável");
        const s2 = await c.tool("select_sbd_toe_requirements", { mode: "discover", risk_level: "L2", task: "Implementar login com sessões de utilizador", concerns: sug });
        if (!s2.ok) return fail(`re-corrida sugerida falhou: ${s2.error}`);
        prove = (s2.data.next ?? []).find((n) => n.tool === "get_sbd_toe_verification_matrix");
        stabilized = true;
      }
      if (!prove) return fail("sem proveRow mesmo após seguir a estabilização sugerida");
      const pids = [...prove.with.matchAll(/([A-Z]{3}-\d{3})/g)].map((m) => m[1]).slice(0, 3);
      if (pids.length === 0) return fail("proveRow sem ids copiáveis");
      const m1 = await c.tool("get_sbd_toe_verification_matrix", { risk_level: "L2", requirement_ids: pids });
      if (!m1.ok) return fail(`matrix rejeitou os ids do próprio next: ${m1.error}`);
      // (3) row com URI nomeia read_sbd_toe_resource — e o URI sugerido lê-se
      const r = await c.tool("resolve_entities", { record_type: "role", limit: 1 }); if (!r.ok) return fail(r.error);
      const uriRow = ((r.data.data ?? r.data).next ?? []).find((n) => n.tool === "read_sbd_toe_resource");
      if (!uriRow) return fail("resolve_entities sem row read_sbd_toe_resource (URI órfão?)");
      const uri = uriRow.with.match(/uri="([^"]+)"/)?.[1];
      const rd = await c.tool("read_sbd_toe_resource", { uri });
      if (!rd.ok) return fail(`read rejeitou o URI sugerido: ${rd.error}`);
      // (4) verdade da matrix: 63 ids (o caso do avaliador) agora REJEITADOS com tecto declarado
      const big = [...Array(63)].map((_, i) => `VAL-${String(i + 1).padStart(3, "0")}`);
      const m2 = await c.tool("get_sbd_toe_verification_matrix", { risk_level: "L3", requirement_ids: big });
      if (m2.ok) return fail("matrix aceitou 63 ids (tecto anunciado sem verdade — regressão)");
      if (!/50/.test(m2.error)) return fail(`rejeição sem o tecto real: ${m2.error}`);
      // (5) adenda ronda 6 item 6: record_type fora do enum ⇒ resposta DECLARADA (morre o total:0 silencioso)
      const bad = await c.tool("resolve_entities", { record_type: "ctrl_acore_alignment" });
      if (!bad.ok) return fail(`record_type desconhecido devia ser resposta declarada, não erro: ${bad.error}`);
      const bd = bad.data.data ?? bad.data;
      const bmeta = bd.meta ?? bd;
      if (bmeta.unknown_record_type !== "ctrl_acore_alignment" || !(bmeta.valid_record_types?.length > 10)) return fail("total:0 silencioso ainda vivo (sem unknown_record_type/valid_record_types)");
      return ok(`3 next à letra: resolve ${rt}+[${ids.join(",")}] → ${nRecs} recs; matrix [${pids.join(",")}] ok (${stabilized ? "via estabilização" : "directo"}); uri ${uri} lido; 63 ids rejeitados c/ tecto 50; record_type desconhecido DECLARADO c/ ${bmeta.valid_record_types.length} válidos`); } },
  { id: "TC-F-34", axis: "F", title: "0.19.4: tecto por-id no prepare (caso 88-reqs @ minimal) + round-trip da divisão ensinada", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => {
      const args = { task: "Expor API pública de consulta com chaves de cliente e rate limiting", risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI", detail: "minimal" };
      const p = await c.tool("prepare_sbd_toe_codegen_context", args); if (!p.ok) return fail(p.error);
      const pd = p.data.data ?? p.data;
      if (pd.status !== "needs_decomposition") return fail(`88 reqs @ minimal devia bloquear declarado; status=${pd.status}`);
      const rc = pd.requirement_ceiling;
      if (!rc || rc.limit === undefined || rc.selected <= rc.limit) return fail("sem requirement_ceiling estruturado");
      if (!(rc.projected_tk > rc.promise_tk)) return fail("projecção não justifica o bloqueio");
      if (!rc.batches?.length) return fail("sem lotes de divisão ensinados");
      if (!(pd.suggestions ?? []).some((x) => /Divide por área/.test(x))) return fail("suggestions não ensinam a divisão");
      // round-trip: seguir a divisão sugerida → chamadas DENTRO do tecto, prontas
      const results = [];
      for (const batch of rc.batches.slice(0, 2)) {
        // a receita ensinada: SÓ task + risk_level + detail + concerns do lote (activadores largos fora)
        const r = await c.tool("prepare_sbd_toe_codegen_context", { task: args.task, risk_level: args.risk_level, detail: args.detail, concerns: batch.concerns });
        if (!r.ok) return fail(`lote [${batch.concerns}] rejeitado: ${r.error}`);
        const rdd = r.data.data ?? r.data;
        if (rdd.status !== "ready_for_codegen") return fail(`lote [${batch.concerns}] não ficou pronto: ${rdd.status}`);
        const n = (rdd.activated_scope?.requirements ?? []).length || (rdd.activated_scope?.requirements_total ?? 0);
        if (n > rc.limit) return fail(`lote [${batch.concerns}] excede o tecto: ${n} > ${rc.limit}`);
        results.push(`[${batch.concerns}]→${n} reqs`);
      }
      // full continua SEM tecto (promessa = completude; nível do oráculo)
      const pf = await c.tool("prepare_sbd_toe_codegen_context", { ...args, detail: "full" });
      if (!pf.ok) return fail(pf.error);
      const pfd = pf.data.data ?? pf.data;
      if (pfd.status !== "ready_for_codegen") return fail(`full ganhou tecto indevido: ${pfd.status}`);
      return ok(`88@minimal → needs_decomposition declarado (tecto ${rc.limit}, ~${rc.cost_per_req_tk} tk/req, proj ${rc.projected_tk}>${rc.promise_tk}); divisão seguida: ${results.join(", ")}; full sem tecto ✓`); } },

  // ─────────── beta.21: o contrato DECLARATIVO (o que substitui o default inferencial) ───────────
  { id: "TC-F-35", axis: "F", title: "0.20.0-beta.21: declarativo primeiro — needs_input ensina, declaração selecciona, redacção não decide", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      // 1) sem declarações: needs_input (nunca zero em silêncio, nunca adivinhado)
      const ni = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", task: "Implementar endpoint de upload de ficheiros com autenticação e auditoria" });
      if (!ni.ok) return fail(ni.error);
      const nd = ni.data;
      if (!nd.needs_input) return fail(`sem declarações devia ser needs_input; veio ${nd.selection?.selected?.length ?? "?"} seleccionados`);
      if (nd.task?.affects_selection !== false) return fail("task devia estar marcado como contexto registado (affects_selection=false)");
      if (nd.needs_input.vocabulary_resource !== "sbd://toe/activation-vocabulary") return fail("needs_input não aponta o vocabulário");
      if (!/SUGESTÃO A CONFIRMAR/i.test(nd.needs_input.candidates_to_confirm?.note ?? "")) return fail("candidatos não estão marcados como sugestão a confirmar");
      if ((nd.next ?? []).some((n) => n.tool === "get_sbd_toe_verification_matrix")) return fail("next manda lista vazia à matrix");
      // 2) seguir o exemplo À LETRA tem de produzir selecção
      const cited = (nd.needs_input.example.with.match(/concerns=\[([^\]]*)\]/)?.[1] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      if (cited.length === 0) return fail("exemplo do needs_input sem concerns");
      const followed = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: cited });
      if (!followed.ok) return fail(followed.error);
      if ((followed.data.selection?.selected?.length ?? 0) === 0) return fail("exemplo copiável não produziu selecção");
      // 3) a REDACÇÃO deixou de decidir: 3 redacções + mesma declaração ⇒ mesmo conjunto
      const wordings = [
        "Implementar endpoint de upload de ficheiros com autenticação e registo de auditoria",
        "Permitir que utilizadores autenticados carreguem documentos, com trilho de auditoria",
        "Receber ficheiros do utilizador autenticado e auditar a operação"
      ];
      const sets = [];
      for (const task of wordings) {
        const r = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", task, concerns: ["files", "auth", "logging"] });
        if (!r.ok) return fail(r.error);
        sets.push((r.data.selection.selected ?? []).map((x) => x.requirement_id).sort().join(","));
        if ((r.data.basis_summary?.lexical_only ?? -1) !== 0) return fail("basis lexical no caminho declarativo");
        if (r.data.lexical_dominance_warning || r.data.empty_selection_warning) return fail("avisos lexicais deviam ter perdido objecto");
      }
      if (new Set(sets).size !== 1) return fail(`3 redacções deram ${new Set(sets).size} conjuntos com a MESMA declaração`);
      // 4) baseline só por pedido explícito
      const base = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", mode: "baseline" });
      if (!base.ok) return fail(base.error);
      if ((base.data.selection.selected ?? []).length < 100) return fail("mode=baseline não devolveu a baseline do nível");
      return ok(`needs_input ensina (candidatos ${nd.needs_input.candidates_to_confirm.from_task_text.length}, exemplo executável → ${followed.data.selection.selected.length} req.); 3 redacções ⇒ 1 conjunto (${sets[0].split(",").length} req.); baseline explícita ${base.data.selection.selected.length}`); } },

  { id: "TC-F-36", axis: "F", title: "0.20.0-beta.21: sbd://toe/activation-vocabulary — vocabulário fechado, derivado e executável", tool: "read_sbd_toe_resource",
    run: async (c) => {
      const r = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/activation-vocabulary" });
      if (!r.ok) return fail(r.error);
      const text = r.data?.content ?? r.text ?? "";
      let v; try { v = typeof text === "string" ? JSON.parse(text.slice(text.indexOf("{"))) : text; } catch { return fail("vocabulário não é JSON legível"); }
      const body = v.content ? JSON.parse(v.content) : v;
      const vocab = body.concerns ? body : body.data ?? body;
      if (!vocab.concerns?.values?.length) return fail("vocabulário sem concerns");
      for (const key of ["exposure", "data_sensitivity", "technologies", "changed_files", "roles", "phases"]) {
        if (!vocab[key]) return fail(`vocabulário sem ${key}`);
      }
      if (vocab.contract?.serving_semantics !== "declarative-first") return fail("vocabulário não declara a semântica");
      if (!vocab.not_activators?.some((n) => n.field === "task")) return fail("vocabulário não declara `task` como não-activador");
      // executável: um concern publicado, declarado, selecciona o que o vocabulário promete
      const sample = vocab.concerns.values.find((c2) => c2.value === "auth");
      const sel = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"] });
      if (!sel.ok) return fail(sel.error);
      const got = (sel.data.selection.selected ?? []).filter((x) => sample.activates_categories.includes(x.category)).length;
      if (got !== sample.requirements_at.L2) return fail(`vocabulário promete ${sample.requirements_at.L2} em L2 para auth; selecção deu ${got}`);
      return ok(`${vocab.concerns.values.length} concerns, ${vocab.technologies.values.length} tecnologias, ${vocab.changed_files.patterns.length} padrões de path, ${vocab.roles.values.length} papéis, ${vocab.phases.values.length} fases; promessa auth@L2=${sample.requirements_at.L2} confirmada na selecção`); } },

  { id: "TC-F-37", axis: "F", title: "0.20.0-beta.22 (caminho para 9): guarda anti-zero indexada à ACTIVAÇÃO + ausências declaradas", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      // P1-A — a sonda do avaliador: declarações VÁLIDAS mas INERTES
      const inert = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", exposure: "local", data_sensitivity: "low" });
      if (!inert.ok) return fail(inert.error);
      const i = inert.data;
      if ((i.selection?.selected?.length ?? 0) !== 0) return fail("sonda deixou de dar 0 (re-baseline)");
      if (!i.needs_input) return fail("declarações inertes deram selecção vazia SEM needs_input (ponto cego P1-A vivo)");
      const inertNames = (i.needs_input.inert_declarations ?? []).join(" ");
      if (!/exposure="local"/.test(inertNames) || !/data_sensitivity="low"/.test(inertNames)) return fail(`needs_input não nomeia as declarações inertes: ${inertNames}`);
      // 2ª instância da mesma família: activou categorias mas o NÍVEL esvazia
      const lvl = await c.tool("select_sbd_toe_requirements", { risk_level: "L1", concerns: ["privacy"] });
      if (!lvl.ok) return fail(lvl.error);
      if ((lvl.data.selection?.selected?.length ?? 0) !== 0) return fail("fixture do nível mudou");
      if (!lvl.data.needs_input) return fail("nível esvaziou a selecção SEM needs_input");
      if (!/N[ÍI]VEL/i.test(lvl.data.needs_input.reason)) return fail("needs_input não explica que o problema é o nível");
      if ((lvl.data.selection.excluded_by_level ?? []).length === 0) return fail("sem excluded_by_level a provar o que existe noutro nível");
      // P1-B — gralha no conjunto fechado: declarada, nunca silenciosa
      const typo = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["authz", "auth"] });
      if (!typo.ok) return fail(typo.error);
      const uc = typo.data.unknown_concerns;
      if (!uc || !uc.values?.includes("authz")) return fail("concern inválido descartado em silêncio (P1-B)");
      if (!uc.valid_values?.length || !uc.vocabulary_resource) return fail("unknown_concerns sem valid_values/vocabulário");
      if ((typo.data.selection?.selected?.length ?? 0) === 0) return fail("o concern válido devia continuar a seleccionar");
      // mode=baseline continua a ser a saída EXPLÍCITA (não fallback)
      const base = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", exposure: "local", mode: "baseline" });
      if (!base.ok) return fail(base.error);
      if ((base.data.selection.selected ?? []).length < 100) return fail("mode=baseline deixou de devolver a baseline");
      return ok(`inertes → needs_input nomeando ${(i.needs_input.inert_declarations ?? []).length}; nível L1 → needs_input c/ ${lvl.data.selection.excluded_by_level.length} grupos excluded_by_level; gralha 'authz' declarada c/ ${uc.valid_values.length} valores válidos; baseline explícita ${base.data.selection.selected.length}`); } },

  { id: "TC-F-38", axis: "F", title: "0.20.0-beta.22: nada acontece sem traço — stack_token, named_rule, concern_slice_mapping e enum gerado", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      // P1-D — o `stack` (única leitura de texto que resta) deixa rasto
      const st = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], stack: "docker e kubernetes" });
      if (!st.ok) return fail(st.error);
      const stackTrace = (st.data.activation_trace ?? []).filter((t) => t.source === "stack_token");
      if (stackTrace.length === 0) return fail("stack activou capítulos sem deixar traço (P1-D)");
      if (!stackTrace.every((t) => /token exacto/i.test(t.reason ?? ""))) return fail("traço do stack não explica a regra do token exacto");
      // P1-E — regra NOMEADA por tecnologia declarada
      const jwt = await c.tool("select_sbd_toe_requirements", { risk_level: "L1", concerns: ["auth"], technologies: ["jwt"] });
      if (!jwt.ok) return fail(jwt.error);
      if (!jwt.data.selection.selected.some((r) => r.requirement_id === "SES-008")) return fail("SES-008 não entrou com jwt declarado");
      const named = (jwt.data.activation_trace ?? []).filter((t) => t.source === "named_rule" && t.produced === "SES-008");
      if (named.length === 0) return fail("regra nomeada SES-008 sem entrada de traço (P1-E)");
      // P2-A — a etiqueta órfã do motor lexical morreu no caminho declarativo
      const decl = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"] });
      if (!decl.ok) return fail(decl.error);
      const orphan = (decl.data.activation_trace ?? []).filter((t) => t.source === "task_term");
      if (orphan.length > 0) return fail(`task_term emitido com task vazio (${orphan.length}) — etiqueta órfã viva`);
      const mapping = (decl.data.activation_trace ?? []).filter((t) => t.source === "concern_slice_mapping");
      if (mapping.length === 0) return fail("mapeamento concern→slice family sem etiqueta própria");
      // P1-C — um vocabulário, um contrato: o enum servido é o do recurso
      const vocabRes = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/activation-vocabulary" });
      if (!vocabRes.ok) return fail(vocabRes.error);
      const text = typeof vocabRes.data?.content === "string" ? vocabRes.data.content : JSON.stringify(vocabRes.data);
      const vocab = JSON.parse(text.slice(text.indexOf("{")));
      const published = (vocab.concerns?.values ?? []).map((x) => x.value);
      const tools = c.tools ?? [];
      const enums = {};
      for (const name of ["select_sbd_toe_requirements", "consult_security_requirements", "prepare_sbd_toe_codegen_context"]) {
        const t = tools.find((x) => x.name === name);
        enums[name] = t?.inputSchema?.properties?.concerns?.items?.enum ?? null;
      }
      for (const [name, e] of Object.entries(enums)) {
        if (!e) return fail(`${name} sem enum de concerns (P1-C)`);
        if (e.length !== published.length) return fail(`${name}: enum ${e.length} ≠ vocabulário ${published.length}`);
        const missing = published.filter((v) => !e.includes(v));
        if (missing.length) return fail(`${name}: faltam ${missing.join(", ")}`);
      }
      return ok(`stack_token ×${stackTrace.length}, named_rule SES-008 ✓, 0 task_term órfãos (${mapping.length} concern_slice_mapping), enum ${published.length} idêntico nas 3 tools`); } },

  // ───────────────────────── Axis G — beta-line tools (added 2026-09-01; closes the 24/23 gap) ─────────────────────────
  // trace_sbd_toe_graph exists only on the 0.20-beta line (SPARQL/Oxigraph over the RDF
  // projection of the published runtime bundle). Scenarios per the governance doc's Axis G
  // (placeholder opened 2026-08-30, filled 2026-09-01 in the same change as this runner).
  { id: "TC-F-39", axis: "F", title: "0.20.0-beta.23 (P0-1): CONSERVAÇÃO — o motor não deita fora o que o vocabulário PROMETE", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      // A sonda do avaliador: `build`@L3 prometia CIC+DEV (10+9=19) e devolvia 10.
      const vocabRes = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/activation-vocabulary" });
      if (!vocabRes.ok) return fail(vocabRes.error);
      const text = typeof vocabRes.data?.content === "string" ? vocabRes.data.content : JSON.stringify(vocabRes.data);
      const vocab = JSON.parse(text.slice(text.indexOf("{")));
      const byValue = new Map((vocab.concerns?.values ?? []).map((x) => [String(x.value), x]));
      const checked = [];
      // as 4 famílias que a invariante apanhou (era 1 na sonda externa)
      for (const [concern, level] of [["build", "L3"], ["supply_chain", "L3"], ["release", "L3"], ["deployment", "L3"], ["build", "L1"]]) {
        const promised = byValue.get(concern)?.requirements_at?.[level];
        if (typeof promised !== "number") return fail(`vocabulário sem requirements_at para ${concern}@${level}`);
        const r = await c.tool("select_sbd_toe_requirements", { risk_level: level, concerns: [concern], limit: 500 });
        if (!r.ok) return fail(r.error);
        const sel = r.data.selection?.selected ?? [];
        const narrowed = (r.data.selection?.narrowed_out ?? []).reduce((n, g) => n + (g.count ?? 0), 0);
        const banded = new Set([
          ...sel.map((x) => x.requirement_id),
          ...(r.data.selection?.narrowed_out ?? []).flatMap((g) => g.requirement_ids ?? []),
          ...(r.data.selection?.excluded_by_level ?? []).flatMap((g) => g.requirement_ids ?? [])
        ]);
        if (sel.length + narrowed !== (r.data.meta?.eligible ?? -1))
          return fail(`${concern}@${level}: selected+narrowed_out (${sel.length}+${narrowed}) ≠ eligible (${r.data.meta?.eligible})`);
        if (sel.length < promised)
          return fail(`${concern}@${level}: o vocabulário promete ${promised} e a selecção traz ${sel.length} — promessa perdida (P0-1)`);
        checked.push(`${concern}@${level}=${sel.length}/${promised} (bandas ${banded.size})`);
      }
      // o caso nominal da sonda: DEV-003 (SAST como gate) tem de estar lá
      const build = await c.tool("select_sbd_toe_requirements", { risk_level: "L3", concerns: ["build"], limit: 500 });
      if (!build.ok) return fail(build.error);
      const sel = build.data.selection.selected;
      if (!sel.some((x) => x.requirement_id === "DEV-003")) return fail("DEV-003 continua a desaparecer de concerns=['build']@L3 (P0-1 vivo)");
      const dev = sel.find((x) => x.requirement_id === "DEV-003");
      if (!(dev.selection_trace ?? []).some((t) => t.layer === "declared_category"))
        return fail("DEV-003 entrou SEM traço próprio — inclusão anónima é a falha simétrica");
      return ok(`conservação verificada: ${checked.join("; ")}; DEV-003 presente com traço declared_category`); } },

  { id: "TC-F-40", axis: "F", title: "0.20.0-beta.23 (P0-2): get_threat_landscape declara os concerns que NÃO resolve (zero nunca é mudo)", tool: "get_threat_landscape",
    run: async (c) => {
      // 0.20.0-beta.27: 'build' PASSOU a ser roteável — a correcção da resolução de
      // concerns no consult (P0 da adenda) curou também o mapa de ameaças, que roteia
      // através dele. O mecanismo continua a ser o que se testa, agora com um valor que
      // o vocabulário não conhece: a garantia é «nunca um vazio mudo», não «build dá 0».
      const un = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["authz"] });
      if (!un.ok) return fail(un.error);
      if ((un.data.coverage?.total ?? -1) !== 0) return fail("fixture mudou: valor inválido já devolve ameaças");
      const uc = un.data.unsupported_concerns;
      if (!uc) return fail("total=0 SEM unsupported_concerns — zero mudo (P0-2 vivo)");
      if (!uc.values?.includes("authz")) return fail("unsupported_concerns não nomeia o valor por resolver");
      if (!(uc.supported_values?.length > 0)) return fail("unsupported_concerns sem a lista do que É suportado");
      if (!/N[ÃA]O concluas aus[êe]ncia/i.test(uc.note ?? "")) return fail("a nota não proíbe concluir ausência de ameaças");
      // o caso PERIGOSO: mistura — vêm ameaças E um concern por resolver
      const mix = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["authz", "auth"] });
      if (!mix.ok) return fail(mix.error);
      if ((mix.data.coverage?.total ?? 0) === 0) return fail("fixture mista mudou");
      if (!mix.data.unsupported_concerns?.values?.includes("authz"))
        return fail("num resultado NÃO-vazio o valor por resolver desapareceu — o caller julga cobertura completa");
      // controlo: concern suportado não gera a banda
      const sup = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["auth"] });
      if (!sup.ok) return fail(sup.error);
      if (sup.data.unsupported_concerns) return fail("concern suportado marcado como não suportado (falso positivo)");
      return ok(`valor por resolver declarado (${uc.supported_values.length} suportados); misto mantém a declaração com ${mix.data.coverage.total} ameaças; 'auth' limpo`); } },

  { id: "TC-F-41", axis: "F", title: "0.20.0-beta.23 (P0-3): guarda anti-zero cobre `technologies` — e a declaração com efeito não é descartada", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      // a sonda do avaliador: technologies:["jwt"] dizia «nenhum activador DECLARADO»
      const jwt = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", technologies: ["jwt"] });
      if (!jwt.ok) return fail(jwt.error);
      if (jwt.data.needs_input && /Nenhum activador DECLARADO/i.test(jwt.data.needs_input.reason ?? ""))
        return fail("technologies=['jwt'] ainda diz «nenhum activador DECLARADO» com jwt declarado à frente (P0-3 vivo)");
      if (!jwt.data.selection.selected.some((r) => r.requirement_id === "SES-008"))
        return fail("a tecnologia declarada não produziu o seu efeito nomeado (SES-008)");
      // simetria com o mesmo valor por `stack` (era a contradição do payload)
      const st = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", stack: "jwt" });
      if (!st.ok) return fail(st.error);
      if (st.data.selection.selected.length !== jwt.data.selection.selected.length)
        return fail(`assimetria viva: stack='jwt' dá ${st.data.selection.selected.length} e technologies=['jwt'] dá ${jwt.data.selection.selected.length}`);
      // varredura: token FORA do vocabulário é NOMEADO, nunca descartado em silêncio
      const unknown = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", technologies: ["cobol"] });
      if (!unknown.ok) return fail(unknown.error);
      if (!unknown.data.needs_input) return fail("tecnologia desconhecida deu selecção sem pedir declaração");
      const named = (unknown.data.needs_input.inert_declarations ?? []).join(" ");
      if (!/technologies=\[cobol\]/.test(named)) return fail(`guarda não nomeia a tecnologia inerte: ${named}`);
      if (!unknown.data.unknown_technologies?.values?.includes("cobol")) return fail("token fora do vocabulário descartado em silêncio");
      return ok(`jwt declarado → SES-008 (${jwt.data.selection.selected.length} req.), simétrico com stack; 'cobol' nomeado como inerte e em unknown_technologies`); } },

  { id: "TC-F-42", axis: "F", title: "0.20.0-beta.23 (P1): a proveniência diz QUE SERVIDOR respondeu (kg ≠ server)", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      const ver = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/version" });
      if (!ver.ok) return fail(ver.error);
      const vtext = typeof ver.data?.content === "string" ? ver.data.content : JSON.stringify(ver.data);
      const vjson = JSON.parse(vtext.slice(vtext.indexOf("{")));
      const pkg = vjson.server?.version ?? vjson.version ?? vjson.package?.version;
      if (typeof pkg !== "string") return fail("recurso de versão sem a versão do pacote");
      const checked = [];
      for (const [tool, args] of [
        ["select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"] }],
        ["consult_security_requirements", { risk_level: "L2", concerns: ["auth"] }],
        ["get_threat_landscape", { risk_level: "L2", concerns: ["auth"] }],
        ["prepare_sbd_toe_codegen_context", { task: "Implementar login com sessões", risk_level: "L2", concerns: ["auth"], exposure: "public" }]
      ]) {
        const r = await c.tool(tool, args);
        if (!r.ok) return fail(r.error);
        const prov = r.data.provenance;
        if (!prov) return fail(`${tool}: resposta sem proveniência`);
        if (prov.server !== pkg) return fail(`${tool}: provenance.server=${prov.server} ≠ versão do pacote ${pkg} (resposta inatribuível — P1)`);
        if (!prov.kg || prov.kg === prov.server) return fail(`${tool}: kg e server confundidos (conhecimento servido ≠ quem serviu)`);
        checked.push(tool);
      }
      return ok(`provenance.server=${pkg} em ${checked.length} ferramentas, distinto de kg`); } },

  { id: "TC-F-43", axis: "F", title: "0.20.0-beta.24 (item 1): agent-guide GERADO — publica o vocabulário (24), não a cobertura do mapa de ameaças (13)", tool: "read_sbd_toe_resource",
    run: async (c) => {
      const g = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/agent-guide" });
      if (!g.ok) return fail(g.error);
      const guide = typeof g.data?.content === "string" ? g.data.content : JSON.stringify(g.data);
      const vocabRes = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/activation-vocabulary" });
      if (!vocabRes.ok) return fail(vocabRes.error);
      const vtext = typeof vocabRes.data?.content === "string" ? vocabRes.data.content : JSON.stringify(vocabRes.data);
      const vocab = JSON.parse(vtext.slice(vtext.indexOf("{")));
      const concerns = (vocab.concerns?.values ?? []).map((x) => String(x.value));
      if (concerns.length < 20) return fail(`vocabulário com ${concerns.length} valores — fixture mudou`);
      const missing = concerns.filter((x) => !guide.includes("`" + x + "`"));
      if (missing.length > 0) return fail(`guia não publica ${missing.length} concerns do vocabulário: ${missing.join(", ")}`);
      // a regressão nominal: os concerns que o mapa de ameaças NÃO resolve têm de estar no guia
      // beta.27: as coberturas passaram a coincidir; a protecção mantém-se condicional —
      // se o mapa voltar a perder concerns, o guia não pode segui-lo.
      const un = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["authz"] });
      if (!un.ok) return fail(un.error);
      const unsupported = un.data.unsupported_concerns?.values ?? [];
      const swallowed = concerns.filter((x) => !guide.includes("`" + x + "`"));
      if (swallowed.length > 0) return fail(`o guia não publica ${swallowed.length} concerns do vocabulário`);
      // contagens do guia = contagens do vocabulário (não folclore)
      const auth = (vocab.concerns?.values ?? []).find((x) => String(x.value) === "auth");
      const at = auth?.requirements_at ?? {};
      if (!guide.includes(`${at.L1} / ${at.L2} / ${at.L3}`)) return fail("as contagens do guia não são as do vocabulário");
      // recursos e prompts reais aparecem no guia
      if (!guide.includes("sbd://toe/activation-vocabulary")) return fail("o guia não lista o recurso que ele próprio manda ler no passo 1");
      if (!guide.includes("prepare_grounded_codegen")) return fail("o guia não lista os 3 prompts servidos");
      return ok(`guia derivado: ${concerns.length} concerns publicados (era 13); mecanismo de não-roteáveis vivo (${unsupported.length} para o valor inválido); contagens = vocabulário; recursos e prompts completos`); } },

  { id: "TC-F-44", axis: "F", title: "0.20.0-beta.24 (item 2): âmbito da promessa — o que nenhuma declaração activou é DECLARADO, não omitido", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      const r = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], limit: 500 });
      if (!r.ok) return fail(r.error);
      const band = r.data.out_of_scope_chapters;
      if (!band) return fail("capítulos não activados desaparecem sem uma linha (item 2 vivo)");
      if (!(band.count > 0) || !(band.requirements_out_of_scope > 0)) return fail("banda presente mas vazia");
      if (!/N[ÃA]O são «não aplicáveis»|não-perguntados/i.test(band.scope_note ?? "")) return fail("a nota não distingue «fora de âmbito» de «não aplicável»");
      if (!/universo/i.test(band.scope_note ?? "")) return fail("o âmbito da promessa não está declarado na resposta");
      for (const entry of band.chapters) {
        if (typeof entry.at_level !== "number" || typeof entry.out_of_scope !== "number") return fail(`linha sem contagens: ${entry.chapter}`);
        if (!entry.activate_with) return fail(`capítulo ${entry.chapter} sem caminho de recuperação`);
        if (entry.out_of_scope > entry.at_level) return fail(`${entry.chapter}: fora (${entry.out_of_scope}) > total (${entry.at_level})`);
      }
      // custo: contagens, NUNCA os requisitos por extenso
      const raw = JSON.stringify(band);
      if (/requirement_ids|"[A-Z]{3}-\d{3}"/.test(raw)) return fail("a banda lista requisitos por extenso — declarar a ausência não pode custar o que custaria tê-los");
      // o caminho de recuperação FUNCIONA: declarar o que ela indica tira o capítulo da banda
      const target = band.chapters.find((x) => /^05-/.test(x.chapter));
      if (!target) return fail("fixture mudou: cap. 05 não está fora de âmbito para concerns=['auth']");
      const m = /concerns=\["([a-z_]+)"/.exec(target.activate_with);
      if (!m) return fail(`dica não copiável para o cap. 05: ${target.activate_with}`);
      const after = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth", m[1]], limit: 500 });
      if (!after.ok) return fail(after.error);
      const still = (after.data.out_of_scope_chapters?.chapters ?? []).some((x) => /^05-/.test(x.chapter));
      if (still) return fail(`seguir a dica (${m[1]}) não trouxe o cap. 05 para dentro do âmbito`);
      // e a selecção NÃO muda por causa da banda (item aditivo)
      const before = r.data.selection.selected.length;
      const baseline = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], limit: 500 });
      if (!baseline.ok) return fail(baseline.error);
      if (baseline.data.selection.selected.length !== before) return fail("selecção não determinística");
      return ok(`${band.count} capítulos declarados, ${band.requirements_out_of_scope} requisitos fora de âmbito, dica '${m[1]}' verificada a trazer o cap. 05; selecção inalterada (${before})`); } },

  { id: "TC-F-45", axis: "F", title: "0.20.0-beta.24 (item 3): higiene do `task` — task_context canónico, alias mantido, sem promessas de inferência", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      const canonical = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], task_context: "implementar login" });
      if (!canonical.ok) return fail(canonical.error);
      if (canonical.data.task?.text !== "implementar login") return fail("task_context não foi registado");
      if (canonical.data.task?.affects_selection !== false) return fail("task_context marcado como motor no modo declarativo");
      const alias = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], task: "implementar login" });
      if (!alias.ok) return fail(alias.error);
      if (alias.data.selection.selected.length !== canonical.data.selection.selected.length)
        return fail("o alias `task` deixou de ser equivalente (compatibilidade partida)");
      // discover continua a ter o texto como motor
      const disc = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", task: "implementar login com sessões e tokens", mode: "discover" });
      if (!disc.ok) return fail(disc.error);
      if ((disc.data.selection.selected.length ?? 0) === 0) return fail("discover deixou de usar o texto como motor");
      // resíduos: a descrição da tool não pode prometer inferência a partir do task
      const tools = c.tools ?? [];
      const sel = tools.find((t) => t.name === "select_sbd_toe_requirements");
      if (!sel) return fail("select ausente de tools/list");
      const desc = String(sel.description ?? "");
      if (/narrows deterministically by the task's declared signals/.test(desc))
        return fail("resíduo vivo: a descrição ainda promete narrowing pelo texto da tarefa");
      if (/activated by the context \([^)]*task/.test(desc))
        return fail("resíduo vivo: `task` ainda listado como activador de capítulos");
      if (!/task_context/.test(JSON.stringify(sel.inputSchema ?? {}))) return fail("schema sem o nome canónico task_context");
      return ok(`task_context canónico e registado (affects_selection=false), alias equivalente, discover intacto (${disc.data.selection.selected.length} req.), descrição sem resíduos`); } },

  { id: "TC-F-46", axis: "F", title: "0.20.0-beta.25 (adenda): o guia não publica a teoria do minLevel nem descreve menos bandas do que a resposta traz", tool: "read_sbd_toe_resource",
    run: async (c) => {
      const g = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/agent-guide" });
      if (!g.ok) return fail(g.error);
      const guide = typeof g.data?.content === "string" ? g.data.content : JSON.stringify(g.data);
      // a frase que ENTERRA a teoria nomeia-a; corta-se antes de procurar a teoria viva
      const obituary = /\*\*Aplicabilidade GRADUADA[\s\S]*?porque nenhum começa\./g;
      const body = guide.replace(obituary, " ");
      const banned = [[/Min level/i, "coluna «Min level»"], [/Presente desde/i, "coluna «Presente desde»"],
                      [/unlocks?\b/i, "linguagem de «unlock»"], [/\+ chapters? \d/i, "«+ chapters NN»"]];
      const hits = banned.filter(([re]) => re.test(body)).map(([, l]) => l);
      if (hits.length > 0) return fail(`teoria do minLevel viva no guia: ${hits.join("; ")}`);
      if (!/nenhum cap[íi]tulo se exclui por n[íi]vel/i.test(guide)) return fail("o guia não afirma a aplicabilidade graduada");
      // as tools dizem o mesmo — o guia não pode contradizê-las
      const ch = await c.tool("list_sbd_toe_chapters", {});
      if (!ch.ok) return fail(ch.error);
      const chapters = ch.data.chapters ?? [];
      if (chapters.length === 0) return fail("sem capítulos para verificar");
      const notPresent = chapters.filter((x) => !(x.applicability?.L1 && x.applicability?.L2 && x.applicability?.L3));
      if (notPresent.length > 0) return fail(`fixture mudou: ${notPresent.length} capítulos não presentes em todos os níveis`);
      // bandas: o guia tem de nomear as quatro
      if (/TWO bands|two-band/i.test(guide)) return fail("o guia ainda anuncia «two bands» (são quatro desde 0.15.0/beta.24)");
      for (const band of ["selected[]", "narrowed_out[]", "excluded_by_level", "out_of_scope_chapters"])
        if (!guide.includes(band)) return fail(`banda ausente do guia: ${band}`);
      // tamanhos anunciados = medidos
      const l2 = await c.tool("consult_security_requirements", { risk_level: "L2" });
      if (!l2.ok) return fail(l2.error);
      const measured = Math.round(JSON.stringify(l2.data).length / 1000);
      if (!new RegExp(`≈ ${measured}k chars`).test(guide))
        return fail(`o guia anuncia um tamanho para L2 que não é o medido (${measured}k)`);
      // e o search continua marcado como não-normativo
      if (!/search_sbd_toe_manual[\s\S]{0,160}N[ÃA]O-NORMATIVO/i.test(guide))
        return fail("o guia apresenta search_sbd_toe_manual sem a marca NÃO-NORMATIVO que a tool declara");
      return ok(`minLevel retirada e declarada, ${chapters.length} capítulos presentes em todos os níveis, 4 bandas nomeadas, tamanho L2 medido (${measured}k), search marcado não-normativo`); } },

  { id: "TC-F-47", axis: "F", title: "0.20.0-beta.26 (item 1): evidence_patterns por PERTENÇA ao âmbito, não por prefixo alfabético", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => {
      // Sonda A do avaliador: validação (âmbito ERR/VAL) trazia 5 em 5 EPs de fora
      const a = await c.tool("prepare_sbd_toe_codegen_context", { task: "Validar payload de entrada no endpoint", risk_level: "L2", concerns: ["validation"], detail: "minimal", debug: true });
      if (!a.ok) return fail(a.error);
      if (a.data.status !== "ready_for_codegen") return fail(`sonda A: status ${a.data.status}`);
      const scope = new Set((a.data.activated_scope?.requirements ?? []).map((x) => x.requirement_id));
      const eps = a.data.g2_context?.evidence_patterns ?? [];
      if (eps.length === 0) return fail("sonda A sem evidence_patterns — fixture mudou");
      const fora = eps.filter((e) => !(e.maps_to_requirement_id && scope.has(e.maps_to_requirement_id)));
      if (fora.length > 0) return fail(`sonda A: ${fora.length}/${eps.length} EPs fora do âmbito (${fora.map((e) => e.id).join(", ")})`);
      // pertença é monótona: nenhum de fora antes de um de dentro, em qualquer detail
      for (const detail of ["standard", "full"]) {
        const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Validar payload de entrada no endpoint", risk_level: "L2", concerns: ["validation"], detail });
        if (!r.ok) return fail(r.error);
        const sc = new Set((r.data.activated_scope?.requirements ?? []).map((x) => x.requirement_id));
        const list = r.data.g2_context?.evidence_patterns ?? [];
        const inScope = (e) => e.maps_to_requirement_id && sc.has(e.maps_to_requirement_id);
        const firstOut = list.findIndex((e) => !inScope(e));
        const lastIn = list.map(inScope).lastIndexOf(true);
        if (firstOut >= 0 && lastIn > firstOut) return fail(`detail=${detail}: EP fora do âmbito antes de um de dentro`);
      }
      // menor do mesmo achado: debug.notes contava o cap CLÁSSICO (25) e não o efectivo
      const note = (a.data.debug?.notes ?? []).find((n) => n.startsWith("evidence_patterns: total="));
      if (!note) return fail("sem nota de evidence_patterns em debug");
      if (!new RegExp(`returned=${eps.length}\\b`).test(note)) return fail(`debug.notes conta o cap clássico, não o efectivo: ${note}`);
      if (!/cap efectivo/.test(note)) return fail("a nota não diz qual é o cap efectivo deste detail");
      return ok(`sonda A: 0/${eps.length} EPs fora do âmbito (era 5/5); pertença monótona em minimal/standard/full; debug.notes com returned=${eps.length} e cap efectivo`); } },

  { id: "TC-F-48", axis: "F", title: "0.20.0-beta.26 (itens 2,3,5,6): threat needs_input, traço multi-activador, denominadores, obligation_ids", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      // item 2 — todos os concerns não-roteáveis ⇒ needs_input, não 8k tk de governação
      // beta.27: `integration`/`privacy` passaram a ser roteáveis (correcção do consult).
      // O mecanismo testa-se com valores que o vocabulário não conhece.
      const t = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["authz", "authn"] });
      if (!t.ok) return fail(t.error);
      if (!t.data.needs_input) return fail("todos os concerns não-roteáveis e ainda assim devolveu ameaças (item 2 vivo)");
      if ((t.data.threats ?? []).length !== 0) return fail("needs_input com ameaças no payload");
      if (!(t.data.needs_input.supported_concerns?.length > 0)) return fail("needs_input sem a lista do que É roteável");
      const custo = JSON.stringify(t.data).length / 4;
      if (custo > 1500) return fail(`needs_input a custar ${Math.round(custo)} tk — devia ser barato`);
      // controlo: misto continua a responder
      const mix = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["authz", "auth"] });
      if (!mix.ok) return fail(mix.error);
      if (mix.data.needs_input) return fail("um concern roteável e mesmo assim needs_input (falso positivo)");
      if (!mix.data.unsupported_concerns?.values?.includes("authz")) return fail("misto perdeu a declaração do não-roteável");
      // item 3 — traço multi-activador
      const s = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["iac"], technologies: ["containers"] });
      if (!s.ok) return fail(s.error);
      const ch = (s.data.context?.activated_chapters ?? []).find((x) => x.chapter === "08-iac-infraestrutura");
      if (!ch) return fail("cap. 08 não activado — fixture mudou");
      const by = (ch.activated_by ?? []).map((x) => `${x.source}:${x.trigger}`);
      if (!by.includes("concern:iac") || !by.includes("technology:containers"))
        return fail(`traço incompleto: ${by.join(", ")} — «porquê este capítulo?» tem de listar TODOS`);
      // item 5 — denominadores nomeados e definidos
      const d = s.data.denominators;
      if (!d) return fail("sem bloco de denominadores (item 5 vivo)");
      for (const k of ["baseline_at_level", "activated_at_level", "catalogue_at_level", "catalogue_total"]) {
        if (typeof d[k]?.value !== "number") return fail(`denominador ${k} sem valor`);
        if (!(d[k]?.definition?.length > 40)) return fail(`denominador ${k} sem definição`);
      }
      if (s.data.meta.eligible !== d.activated_at_level.value) return fail("meta.eligible não é o denominador que diz ser");
      if (s.data.meta.eligible_denominator !== "activated_at_level") return fail("meta.eligible sem denominador nomeado");
      if (!(d.baseline_at_level.value <= d.activated_at_level.value && d.activated_at_level.value <= d.catalogue_at_level.value))
        return fail("desigualdades dos denominadores não fecham");
      // item 6 — obligation_ids
      const reg = await c.tool("map_sbd_toe_regulatory_activation", { framework: "RGPD" });
      if (!reg.ok) return fail(reg.error);
      const area = (reg.data.data?.activated ?? reg.data.activated ?? [])[0];
      if (!area) return fail("overlay sem áreas activadas");
      if (!Array.isArray(area.obligation_ids) || area.obligation_ids.length === 0) return fail("obligation_ids ausente (item 6 vivo)");
      if (area.obligation_ids.length !== area.obligation_count) return fail(`obligation_ids (${area.obligation_ids.length}) ≠ obligation_count (${area.obligation_count})`);
      if (area.example_citation && !area.example_citation_note) return fail("example_citation sem dizer que é um artigo do diploma");
      return ok(`threat needs_input a ${Math.round(custo)} tk (era ~8,4k); cap. 08 com ${by.length} activadores; 4 denominadores definidos (${d.baseline_at_level.value}/${d.activated_at_level.value}/${d.catalogue_at_level.value}/${d.catalogue_total.value}); ${area.obligation_ids.length} obligation_ids`); } },

  { id: "TC-F-49", axis: "F", title: "0.20.0-beta.26 (itens 4,7,8): dieta do select sem perda, cobertura parcial declarada, cap. 01 explicado", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      const args = { risk_level: "L3", concerns: ["auth", "iac", "build", "deployment", "logging", "validation"], limit: 500 };
      const full = await c.tool("select_sbd_toe_requirements", { ...args, detail: "full" });
      if (!full.ok) return fail(full.error);
      const ids = (x) => x.selection.selected.map((r) => r.requirement_id).join(",");
      const custoFull = JSON.stringify(full.data).length / 4;
      const medidas = [];
      for (const detail of ["standard", "minimal"]) {
        const r = await c.tool("select_sbd_toe_requirements", { ...args, detail });
        if (!r.ok) return fail(r.error);
        if (ids(r.data) !== ids(full.data)) return fail(`detail=${detail} mudou o CONJUNTO — a dieta é de serialização, não de conteúdo`);
        const legend = new Map((r.data.selection_trace_legend ?? []).map((e) => [e.ref, e]));
        if (legend.size === 0) return fail(`detail=${detail} sem legenda`);
        // reconstrução: legenda + refs == selection_trace clássico
        for (const row of r.data.selection.selected) {
          if (!Array.isArray(row.trace) || row.trace.length === 0) return fail(`${row.requirement_id} sem refs de traço`);
          for (const ref of row.trace) if (!legend.has(ref)) return fail(`ref ${ref} sem entrada na legenda`);
        }
        const custo = JSON.stringify(r.data).length / 4;
        if (custo >= custoFull) return fail(`detail=${detail} não poupou nada (${Math.round(custo)} ≥ ${Math.round(custoFull)})`);
        medidas.push(`${detail} −${((1 - custo / custoFull) * 100).toFixed(0)}%`);
      }
      // item 7 — cobertura PARCIAL declarada
      const m = await c.tool("get_sbd_toe_verification_matrix", { risk_level: "L2", requirement_ids: ["ENC-001", "ENC-003", "ENC-006", "ENC-007", "AUT-001"] });
      if (!m.ok) return fail(m.error);
      const g = (m.data.data ?? m.data).coverage_gaps;
      if (typeof g.evidence_patterns_without_validation_method !== "number") return fail("ausência parcial de validation_method não declarada (P1-3 vivo)");
      if (g.evidence_patterns_without_validation_method === 0) return fail("fixture mudou: os EP-ENC já publicam validation_method");
      if (g.requirements_without_evidence_pattern === 0 && /codex/i.test(g.note))
        return fail("declara encaminhamento inexistente com 0 lacunas (P1-4 vivo)");
      // item 8 — cap. 01 explicado, não deixado por explicar
      const s = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"] });
      if (!s.ok) return fail(s.error);
      const c01 = (s.data.out_of_scope_chapters?.chapters ?? []).find((x) => /^01-/.test(x.chapter));
      if (!c01) return fail("cap. 01 não aparece na banda de fora de âmbito");
      // 0.20.0-beta.30: o princípio «superfície de engenharia» foi REVOGADO pelo lead (§23) —
      // o vocabulário cobre o MANUAL, e o cap. 01 ENSINA a classificar (não calcula o nível).
      // A asserção passa a ser a do contrato novo: caminho VERDADEIRO, nunca um ficheiro.
      if (!/chapters=\["01-classificacao-aplicacoes"\]/.test(c01.activate_with))
        return fail(`cap. 01 sem a via estrutural verdadeira: ${c01.activate_with}`);
      if (/^changed_files=/.test(c01.activate_with)) return fail("cap. 01 a oferecer um ficheiro inventado");
      return ok(`dieta ${medidas.join(", ")} com o mesmo conjunto e reconstrução verificada; ${g.evidence_patterns_without_validation_method} EP sem validation_method declarados; cap. 01 com porta estrutural verdadeira`); } },

  { id: "TC-F-50", axis: "F", title: "0.20.0-beta.27 (A): consult resolve os 24 concerns e o rule_trace deixa de afirmar o que é falso", tool: "consult_security_requirements",
    run: async (c) => {
      const vocabRes = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/activation-vocabulary" });
      if (!vocabRes.ok) return fail(vocabRes.error);
      const text = typeof vocabRes.data?.content === "string" ? vocabRes.data.content : JSON.stringify(vocabRes.data);
      const vocab = JSON.parse(text.slice(text.indexOf("{")));
      const values = vocab.concerns?.values ?? [];
      if (values.length < 20) return fail("vocabulário demasiado pequeno — fixture mudou");
      const zeros = [];
      for (const entry of values) {
        const name = String(entry.value);
        const r = await c.tool("consult_security_requirements", { risk_level: "L2", concerns: [name] });
        if (!r.ok) return fail(r.error);
        const n = r.data.meta?.requirementCount ?? 0;
        const publicado = entry.requirements_at?.L2 ?? 0;
        if (n !== publicado) return fail(`${name}@L2: consult ${n} ≠ vocabulário ${publicado} — superfícies em desacordo sobre o mesmo bundle`);
        if (n === 0 && !r.data.unsupported_concerns && !r.data.empty_at_level) zeros.push(name);
      }
      if (zeros.length > 0) return fail(`vazio MUDO no consult para ${zeros.join(", ")}`);
      // o rule_trace não pode afirmar «0 requirements active» quando o nível tem centenas
      const p = await c.tool("consult_security_requirements", { risk_level: "L2", concerns: ["privacy"] });
      if (!p.ok) return fail(p.error);
      if ((p.data.meta?.requirementCount ?? 0) === 0) return fail("privacy voltou a dar 0 (P0 vivo)");
      const byRisk = (p.data.rule_trace ?? []).find((t) => t.startsWith("REQUIREMENT_APPLIES_BY_RISK"));
      if (!byRisk || /: 0 requirements active/.test(byRisk)) return fail(`rule_trace afirma falso: ${byRisk}`);
      // gralha: declarada, com a lista do que resolve
      const typo = await c.tool("consult_security_requirements", { risk_level: "L2", concerns: ["authz"] });
      if (!typo.ok) return fail(typo.error);
      if (!typo.data.unsupported_concerns?.values?.includes("authz")) return fail("valor por resolver descartado em silêncio");
      if (!/N[ÃA]O são zero requisitos|manual-grounded/i.test(typo.data.unsupported_concerns?.note ?? "")) return fail("a nota não proíbe a conclusão falsa");
      // nível vazio: resolvido, mas o nível não tem
      const l1 = await c.tool("consult_security_requirements", { risk_level: "L1", concerns: ["privacy"] });
      if (!l1.ok) return fail(l1.error);
      if (!l1.data.empty_at_level) return fail("privacy@L1 dá 0 sem declarar que o problema é o NÍVEL");
      if (!(l1.data.empty_at_level.present_at_levels ?? []).includes("L2")) return fail("empty_at_level não diz onde existem");
      return ok(`${values.length} concerns resolvidos e concordantes com o vocabulário; rule_trace verdadeiro; gralha declarada; privacy@L1 com empty_at_level (existem em ${l1.data.empty_at_level.present_at_levels.join("/")})`); } },

  { id: "TC-F-51", axis: "F", title: "0.20.0-beta.27 (B+C): guia manda CONTRAPROVAR e as superfícies concordam sobre o mesmo bundle", tool: "read_sbd_toe_resource",
    run: async (c) => {
      const g = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/agent-guide" });
      if (!g.ok) return fail(g.error);
      const guide = typeof g.data?.content === "string" ? g.data.content : JSON.stringify(g.data);
      if (!/CONTRAPROVA/i.test(guide)) return fail("o guia não manda contraprovar um vazio sem declaração");
      if (!/sinal, não ruído/i.test(guide)) return fail("o guia não diz que a discordância entre superfícies é sinal");
      if (!/Que superfície resolve o quê|Superfície \| Resolve concerns/i.test(guide)) return fail("sem o bloco derivado de cobertura por superfície");
      // C — as superfícies concordam, amostradas contra o vocabulário
      const vocabRes = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/activation-vocabulary" });
      if (!vocabRes.ok) return fail(vocabRes.error);
      const text = typeof vocabRes.data?.content === "string" ? vocabRes.data.content : JSON.stringify(vocabRes.data);
      const vocab = JSON.parse(text.slice(text.indexOf("{")));
      let checked = 0;
      for (const entry of vocab.concerns?.values ?? []) {
        const name = String(entry.value);
        for (const level of ["L1", "L2", "L3"]) {
          const publicado = entry.requirements_at?.[level] ?? 0;
          const named = entry.also_activates_by_named_rule?.requirements_at?.[level] ?? 0;
          const sel = await c.tool("select_sbd_toe_requirements", { risk_level: level, concerns: [name], limit: 500, detail: "minimal" });
          if (!sel.ok) return fail(sel.error);
          const s = sel.data.selection.selected.length;
          if (s !== publicado + named)
            return fail(`${name}@${level}: select ${s} ≠ vocabulário ${publicado} + regra nomeada ${named}`);
          const con = await c.tool("consult_security_requirements", { risk_level: level, concerns: [name] });
          if (!con.ok) return fail(con.error);
          if ((con.data.meta?.requirementCount ?? 0) !== publicado)
            return fail(`${name}@${level}: consult ${con.data.meta?.requirementCount} ≠ vocabulário ${publicado}`);
          checked += 1;
        }
      }
      return ok(`guia manda contraprovar e publica a cobertura por superfície; ${checked} pares concern×nível concordantes entre vocabulário, select e consult`); } },

  { id: "TC-F-52", axis: "F", title: "0.20.0-beta.28 (classe): activador aceite pelo schema tem efeito OU vem declarado, em TODAS as superfícies", tool: "consult_security_requirements",
    run: async (c) => {
      // o P0: consult aceita exposure/data_sensitivity e deitava-os fora
      const args = { risk_level: "L2", concerns: ["files", "privacy"], exposure: "authenticated", data_sensitivity: "regulated" };
      const con = await c.tool("consult_security_requirements", args);
      if (!con.ok) return fail(con.error);
      const ign = con.data.ignored_activators;
      if (!ign) return fail("consult aceita exposure/data_sensitivity e não declara que os ignora (classe viva)");
      for (const k of ["exposure", "data_sensitivity"]) if (!(k in (ign.values ?? {}))) return fail(`ignored_activators não nomeia ${k}`);
      if (!(ign.requirements_at_stake > 0)) return fail("não diz quantos requisitos estão em causa");
      if (!ign.honoured_by) return fail("não diz que superfície os honra");
      // e o número tem de bater com a diferença REAL entre as superfícies
      const sel = await c.tool("select_sbd_toe_requirements", { ...args, limit: 500, detail: "minimal" });
      if (!sel.ok) return fail(sel.error);
      const perdidos = sel.data.selection.selected.filter(
        (r) => !(con.data.requirements ?? []).some((x) => x.requirement_id === r.requirement_id)
      ).length;
      if (ign.requirements_at_stake !== perdidos)
        return fail(`declara ${ign.requirements_at_stake} em causa, a diferença real é ${perdidos}`);
      if (!(con.data.rule_trace ?? []).some((t) => t.startsWith("ACTIVATORS_NOT_HONOURED")))
        return fail("o rule_trace não regista os activadores não honrados");
      // varredura da CLASSE: nenhum outro par superfície×activador aceite fica mudo
      const mudos = [];
      for (const [tool, base, act, val] of [
        ["consult_security_requirements", { risk_level: "L2", concerns: ["auth"] }, "exposure", "public"],
        ["consult_security_requirements", { risk_level: "L2", concerns: ["auth"] }, "data_sensitivity", "regulated"],
        ["map_sbd_toe_applicability", { riskLevel: "L2" }, "technologies", ["containers"]]
      ]) {
        const a = await c.tool(tool, base);
        const b = await c.tool(tool, { ...base, [act]: val });
        if (!a.ok || !b.ok) return fail((a.error ?? b.error));
        const mudou = JSON.stringify(a.data) !== JSON.stringify(b.data);
        const declarado = JSON.stringify(b.data).includes(act);
        if (!mudou && !declarado) mudos.push(`${tool} × ${act}`);
      }
      if (mudos.length > 0) return fail(`pares aceites, inertes e mudos: ${mudos.join("; ")}`);
      return ok(`consult declara exposure+data_sensitivity com ${ign.requirements_at_stake} requisitos em causa (= diferença real) e rule_trace próprio; 3 pares superfície×activador varridos, nenhum mudo`); } },

  { id: "TC-F-53", axis: "F", title: "0.20.0-beta.28: guia sem contradição entre blocos gerados; threat com base de routing e dedup opcional", tool: "get_threat_landscape",
    run: async (c) => {
      // (b) dois blocos GERADOS não podem afirmar coisas incompatíveis sobre a mesma tool
      const g = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/agent-guide" });
      if (!g.ok) return fail(g.error);
      const guide = typeof g.data?.content === "string" ? g.data.content : JSON.stringify(g.data);
      const blocks = [...guide.matchAll(/<!-- BEGIN GENERATED: ([a-z-]+) -->([\s\S]*?)<!-- END GENERATED: \1 -->/g)];
      if (blocks.length < 5) return fail("guia deixou de ser derivado");
      const tool = "get_threat_landscape";
      const full = blocks.filter(([, , body]) => (body.split("\n").find((l) => l.includes(tool)) ?? "").match(/(\d+)\s+de\s+(\d+)/)?.slice(1).every((v, _i, a) => v === a[0]));
      const subset = blocks.filter(([, , body]) => body.split(/(?<=\.)\s|\n\n/).some((sent) => sent.includes(tool) && /SUBCONJUNTO|subconjunto/.test(sent)));
      if (full.length > 0 && subset.length > 0) return fail("dois blocos GERADOS contradizem-se sobre o mapa de ameaças");
      // base do routing declarada
      const files = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["files"] });
      if (!files.ok) return fail(files.error);
      if (!files.data.routing_basis) return fail("sem base de routing declarada");
      if (files.data.routing_basis.basis !== "activated_controls")
        return fail(`files devia rotear por controlos activados, diz ${files.data.routing_basis.basis}`);
      const iac = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["iac"] });
      if (!iac.ok) return fail(iac.error);
      if (iac.data.routing_basis?.basis !== "domain_chapter") return fail("iac tem capítulo próprio e devia dizê-lo");
      // dedup opcional: full mantém o contrato, minimal poupa
      const cheio = JSON.stringify(files.data).length;
      const min = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["files"], detail: "minimal" });
      if (!min.ok) return fail(min.error);
      if (!(files.data.threats ?? []).every((t) => Array.isArray(t.associated_control_ids)))
        return fail("detail=full deixou de publicar associated_control_ids (contrato v1.14 §1.21)");
      if (!min.data.associated_control_legend) return fail("detail=minimal sem legenda");
      const magro = JSON.stringify(min.data).length;
      // A poupança depende de quanta repetição a página traz — e desde a beta.29 a página 1
      // é do DOMÍNIO, logo menos repetitiva. Garante-se que poupa e que não perde nada,
      // não uma percentagem fixa (que media a repetição, não a dedup).
      if (!(magro < cheio)) return fail(`dedup não poupou: ${Math.round(cheio / 4)} → ${Math.round(magro / 4)} tk`);
      const refsOk = (min.data.threats ?? []).every((t) => Array.isArray(t.associated_control_name_refs));
      if (!refsOk) return fail("detail=minimal sem referências à legenda");
      const nomes = min.data.associated_control_legend.names ?? [];
      const todasResolvem = (min.data.threats ?? []).every((t) => (t.associated_control_name_refs ?? []).every((i) => nomes[i] !== undefined));
      if (!todasResolvem) return fail("referências da legenda não resolvem — a dedup perderia informação");
      return ok(`sem contradição entre blocos gerados; routing_basis files=activated_controls / iac=domain_chapter; dedup ${Math.round(cheio / 4)} → ${Math.round(magro / 4)} tk (-${((1 - magro / cheio) * 100).toFixed(0)}%) com full intacto`); } },

  { id: "TC-F-54", axis: "F", title: "0.20.0-beta.29 (item 1): ameaças ordenadas por PERTENÇA — a página 1 deixa de ser governação genérica", tool: "get_threat_landscape",
    run: async (c) => {
      const medidas = [];
      for (const concern of ["integration", "iac", "logging", "files"]) {
        const p1 = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: [concern] });
        if (!p1.ok) return fail(p1.error);
        const threats = p1.data.threats ?? [];
        if (threats.length === 0) return fail(`${concern} sem ameaças — fixture mudou`);
        const genericas = threats.filter((t) => /^0?[12]-/.test(String(t.chapter_id ?? ""))).length;
        if (genericas === threats.length)
          return fail(`${concern}: a página 1 é toda dos caps. 01/02 (governação genérica) — a ordem não ordena`);
        // monotonia: nenhuma genérica antes de uma específica
        const firstGeneric = threats.findIndex((t) => /^0?[12]-/.test(String(t.chapter_id ?? "")));
        const lastSpecific = threats.map((t) => !/^0?[12]-/.test(String(t.chapter_id ?? ""))).lastIndexOf(true);
        if (firstGeneric >= 0 && lastSpecific > firstGeneric)
          return fail(`${concern}: ameaça genérica (${threats[firstGeneric]?.id}) à frente de uma específica (${threats[lastSpecific]?.id})`);
        medidas.push(`${concern}: ${threats.length - genericas}/${threats.length} específicas na p.1`);
      }
      // o conjunto COMPLETO não muda — a ordem muda, o conteúdo não
      const full = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["integration"], limit: 500 });
      if (!full.ok) return fail(full.error);
      if ((full.data.coverage?.total ?? 0) < 100) return fail("total inesperado — fixture mudou");
      const genericasNoFim = (full.data.threats ?? []).slice(-5).every((t) => /^0?[12]-/.test(String(t.chapter_id ?? "")));
      if (!genericasNoFim) return fail("as meta-ameaças de processo não ficaram no fim do conjunto completo");
      return ok(`${medidas.join("; ")}; caps. 01/02 no fim do conjunto completo (${full.data.coverage.total} ameaças)`); } },

  { id: "TC-F-55", axis: "F", title: "0.20.0-beta.29 (itens 2,3,5): roteamento ≠ cobertura, contador da legenda, e a nota do extend diz o que acontece", tool: "read_sbd_toe_resource",
    run: async (c) => {
      // item 2 — as duas colunas, com os nomes, e iguais ao comportamento real
      const g = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/agent-guide" });
      if (!g.ok) return fail(g.error);
      const guide = typeof g.data?.content === "string" ? g.data.content : JSON.stringify(g.data);
      if (!/Roteamento ≠ cobertura/i.test(guide)) return fail("o guia não distingue roteamento de cobertura");
      const m = /só\s*\n?\*\*(\d+)\*\* têm capítulo de ameaças PRÓPRIO/.exec(guide) ?? /\*\*(\d+)\*\* têm capítulo de ameaças PRÓPRIO/.exec(guide);
      if (!m) return fail("o guia não publica quantos concerns têm domínio próprio");
      const publicado = Number(m[1]);
      const vocabRes = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/activation-vocabulary" });
      if (!vocabRes.ok) return fail(vocabRes.error);
      const text = typeof vocabRes.data?.content === "string" ? vocabRes.data.content : JSON.stringify(vocabRes.data);
      const values = (JSON.parse(text.slice(text.indexOf("{"))).concerns?.values ?? []).map((x) => String(x.value));
      let reais = 0;
      for (const concern of values) {
        const r = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: [concern] });
        if (!r.ok) return fail(r.error);
        if (!r.data.routing_basis) return fail(`${concern}: sem routing_basis`);
        if (r.data.routing_basis.basis === "domain_chapter") reais += 1;
      }
      if (publicado !== reais) return fail(`o guia publica ${publicado} com domínio próprio, o servidor produz ${reais}`);
      // item 3 — o contador da legenda bate com os arrays
      const min = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["auth"], detail: "minimal" });
      if (!min.ok) return fail(min.error);
      const L = min.data.associated_control_legend;
      if (!L) return fail("sem legenda em detail=minimal");
      const mm = /Os (\d+) nomes e (\d+) ids/.exec(L.note ?? "");
      if (!mm) return fail("nota da legenda sem contagens");
      if (Number(mm[1]) !== L.names.length || Number(mm[2]) !== L.ids.length)
        return fail(`contador da legenda diz ${mm[1]}/${mm[2]} com arrays ${L.names.length}/${L.ids.length}`);
      // item 5 — a nota do extend descreve o comportamento REAL
      const semOverlay = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], limit: 500, detail: "minimal" });
      const comOverlay = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], limit: 500, detail: "minimal", include_regulatory_overlay: true, regulatory_frameworks: ["RGPD"] });
      if (!semOverlay.ok || !comOverlay.ok) return fail(semOverlay.error ?? comOverlay.error);
      const ids = (x) => x.data.selection.selected.map((r) => r.requirement_id).join(",");
      if (ids(semOverlay) !== ids(comOverlay)) return fail("o overlay mudou a selecção — a nota teria de ser outra");
      // A nota CITA a frase antiga para dizer o que substituiu; citar não é afirmar (mesmo
      // tropeço do obituário do minLevel na beta.25). Remove-se a explicação antes de testar.
      const nota = (comOverlay.data.overlay?.note ?? "").replace(/A nota anterior dizia[\s\S]*?não contam para `meta\.eligible`\./, " ");
      if (/ACRESCEM à selecção/.test(nota)) return fail("a nota do extend continua a descrever o que NÃO acontece");
      if (!/LISTA PARALELA|lista paralela/i.test(nota)) return fail("a nota não diz onde as obrigações realmente vêm");
      return ok(`guia publica ${publicado} com domínio próprio = comportamento real; contador ${mm[1]}/${mm[2]} = arrays; nota do extend descreve a lista paralela (selecção idêntica, ${comOverlay.data.overlay.obligations.length} obrigações)`); } },

  { id: "TC-F-56", axis: "F", title: "0.20.0-beta.30 (forma B): pedir por ESTRUTURA — o cap. 14 e o cap. 01 têm porta VERDADEIRA", tool: "select_sbd_toe_requirements",
    run: async (c) => {
      // o caso que motivou o ciclo: 14 concerns correctos não chegavam ao cap. 14
      const gov = await c.tool("select_sbd_toe_requirements", { risk_level: "L3", chapters: ["14-governanca-contratacao"], limit: 500, detail: "minimal" });
      if (!gov.ok) return fail(gov.error);
      const sel = gov.data.selection.selected;
      if (sel.length === 0) return fail("chapters=['14-governanca-contratacao'] não devolve nada — a forma B não existe");
      if (!sel.every((r) => /^GOV-/.test(r.requirement_id))) return fail("o pedido por capítulo trouxe requisitos de fora dele");
      const legend = gov.data.selection_trace_legend ?? [];
      if (!legend.some((e) => /declared_structure|declared_chapter|forma B/i.test(JSON.stringify(e))))
        return fail("a inclusão por estrutura não deixou traço próprio");
      // por categoria
      const cat = await c.tool("select_sbd_toe_requirements", { risk_level: "L3", categories: ["GOV"], limit: 500, detail: "minimal" });
      if (!cat.ok) return fail(cat.error);
      if (cat.data.selection.selected.length !== sel.length) return fail("categories=['GOV'] e chapters=[cap.14] discordam");
      // cap. 01 — o método de classificação tem porta; o servidor continua a não emitir nível
      const cla = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", chapters: ["01-classificacao-aplicacoes"], limit: 500, detail: "minimal" });
      if (!cla.ok) return fail(cla.error);
      if (cla.data.selection.selected.length === 0) return fail("o cap. 01 continua sem porta");
      // valor estrutural inválido é DECLARADO, nunca descartado
      const bad = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", categories: ["XPTO"] });
      if (!bad.ok) return fail(bad.error);
      if (!bad.data.unknown_structural?.values?.length) return fail("valor estrutural inválido descartado em silêncio");
      // a forma A não se mexeu
      const a1 = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], limit: 500, detail: "minimal" });
      const a2 = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], limit: 500, detail: "minimal", chapters: [] });
      if (!a1.ok || !a2.ok) return fail(a1.error ?? a2.error);
      if (a1.data.selection.selected.length !== a2.data.selection.selected.length) return fail("a forma A mudou de resultado");
      return ok(`cap. 14 por estrutura: ${sel.length} requisitos GOV (era inalcançável sem inventar changed_files); categories=[GOV] concorda; cap. 01 com ${cla.data.selection.selected.length}; valor inválido declarado; forma A intacta (${a1.data.selection.selected.length})`); } },

  { id: "TC-F-57", axis: "F", title: "0.20.0-beta.30 (alcançabilidade + modelo): nenhum caminho oferecido é falso, e o modelo publica as três formas", tool: "read_sbd_toe_resource",
    run: async (c) => {
      // (b) nenhum activate_with oferece SÓ um ficheiro
      const s = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], detail: "minimal" });
      if (!s.ok) return fail(s.error);
      const banda = s.data.out_of_scope_chapters?.chapters ?? [];
      if (banda.length === 0) return fail("sem banda de fora-de-âmbito — fixture mudou");
      for (const entry of banda) {
        if (/^changed_files=/.test(entry.activate_with))
          return fail(`${entry.chapter}: o único caminho oferecido é declarar um ficheiro que pode não existir`);
        if (!/chapters=\[/.test(entry.activate_with))
          return fail(`${entry.chapter}: sem via estrutural (que é sempre verdadeira)`);
      }
      // o modelo publica as três formas, derivado
      const m = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/model" });
      if (!m.ok) return fail(m.error);
      const text = typeof m.data?.content === "string" ? m.data.content : JSON.stringify(m.data);
      const model = JSON.parse(text.slice(text.indexOf("{")));
      const ways = (model.how_to_ask?.ways ?? []).map((w) => w.id).sort();
      if (JSON.stringify(ways) !== JSON.stringify(["A", "B", "C"])) return fail(`o modelo não publica as três formas: ${ways.join(",")}`);
      if (!(model.entities?.counts?.requirements > 0)) return fail("modelo sem contagens reais");
      if (!(model.relations?.values?.length > 0)) return fail("modelo sem relações com cardinalidades");
      // as contagens do modelo são as REAIS (contraprova contra o catálogo)
      const chapters = await c.tool("list_sbd_toe_chapters", {});
      if (!chapters.ok) return fail(chapters.error);
      const comReq = (model.chapters?.values ?? []).length;
      if (comReq === 0 || comReq > (chapters.data.chapters ?? []).length) return fail("capítulos do modelo incoerentes com o catálogo");
      // e todo o capítulo do modelo tem pelo menos uma forma
      const semForma = (model.chapters.values ?? []).filter((x) => !(x.reachable_by ?? []).length);
      if (semForma.length > 0) return fail(`capítulos sem forma de alcance: ${semForma.map((x) => x.chapter).join(", ")}`);
      // quick-start existe e é barato
      const q = await c.tool("read_sbd_toe_resource", { uri: "sbd://toe/quick-start" });
      if (!q.ok) return fail(q.error);
      const qtext = typeof q.data?.content === "string" ? q.data.content : JSON.stringify(q.data);
      const qtk = Math.round(qtext.length / 4);
      if (qtk > 1200) return fail(`quick-start com ${qtk} tk — devia ser o arranque barato`);
      const soB = (model.chapters.values ?? []).filter((x) => !x.reachable_by.includes("A")).length;
      return ok(`${banda.length} capítulos com caminho VERDADEIRO (via estrutural em todos); modelo com 3 formas, ${model.entities.counts.requirements} requisitos e ${model.relations.values.length} relações; ${soB} capítulos só por B; quick-start ${qtk} tk`); } },

  { id: "TC-F-58", axis: "F", title: "0.20.0-beta.31 (classe): TODA a superfície que resolve vocabulário declara o que não mapeia", tool: "get_guide_by_role",
    run: async (c) => {
      // o P0: papel canónico, publicado, com assignments vazios e sem uma palavra
      const r = await c.tool("get_guide_by_role", { risk_level: "L3", role: "fornecedores-terceiros" });
      if (!r.ok) return fail(r.error);
      const d = r.data.data ?? r.data;
      if ((d.assignments ?? []).length !== 0) return fail("fixture mudou: o papel já tem atribuições");
      if (!d.unsupported_role) return fail("papel canónico com vazio MUDO (o P0 continua vivo)");
      if (!d.unsupported_role.supported_values?.length) return fail("unsupported_role sem a lista do que a superfície cobre");
      // A nota PROÍBE a conclusão («Não digas que o papel não tem nada a fazer»); citar a
      // conclusão para a proibir não é afirmá-la — mesmo tropeço do obituário do minLevel.
      const semProibicao = (d.unsupported_role.note ?? "").replace(/N[ÃA]O digas[\s\S]*?vazio,?/i, " ");
      if (/não tem nada a fazer|sem responsabilidades/i.test(semProibicao)) return fail("a nota conclui ausência de responsabilidades");
      if (!/N[ÃA]O é aus[êe]ncia de responsabilidades|aus[êe]ncia de MAPEAMENTO/i.test(d.unsupported_role.note ?? ""))
        return fail("a nota não distingue ausência de mapeamento de ausência de responsabilidades");
      // o agravante: knownRoles omitia o papel que a própria resposta resolveu
      if (!(d.meta?.knownRoles ?? []).includes("fornecedores-terceiros"))
        return fail("meta.knownRoles continua a omitir o papel que a resposta resolve como canónico");
      // controlo: papel com atribuições não traz a banda
      const dev = await c.tool("get_guide_by_role", { risk_level: "L3", role: "developer" });
      if (!dev.ok) return fail(dev.error);
      const dd = dev.data.data ?? dev.data;
      if (dd.unsupported_role) return fail("falso positivo num papel mapeado");
      if (!(dd.meta?.distinctUserStoryCount > 0)) return fail("sem denominador de histórias distintas");
      // varredura da CLASSE nas outras superfícies de vocabulário
      const outras = [];
      const ch = await c.tool("get_sbd_toe_chapter_implementation_checklist", { chapter: "00-fundamentos" });
      if (!ch.ok) return fail(ch.error);
      const chd = ch.data.data ?? ch.data;
      if ((chd.items ?? []).length === 0 && !chd.unsupported_chapter) outras.push("chapter_implementation_checklist × 00-fundamentos");
      const reg = await c.tool("map_sbd_toe_regulatory_activation", { framework: "ENISA-CSA" });
      if (!reg.ok) return fail(reg.error);
      const rd = reg.data.data ?? reg.data;
      if ((rd.activated ?? []).length === 0 && !rd.unsupported_obligations) outras.push("map_regulatory_activation × ENISA-CSA");
      if (outras.length > 0) return fail(`vazio mudo noutras superfícies de vocabulário: ${outras.join("; ")}`);
      return ok(`papel canónico declarado em unsupported_role (${d.unsupported_role.supported_values.length} mapeados) e presente em knownRoles; checklist do cap. 00 e overlay ENISA-CSA também declarados; controlo developer limpo (${dd.meta.assignmentCount} atribuições / ${dd.meta.distinctUserStoryCount} histórias)`); } },

  { id: "TC-F-59", axis: "F", title: "0.20.0-beta.31 (bordas): notas geradas da mesma fonte que as descrições; routing_basis por concern; contraprova possível", tool: "get_threat_landscape",
    run: async (c) => {
      // a nota fóssil não pode voltar, e a nota tem de descrever o comportamento REAL
      const t = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["iac"] });
      if (!t.ok) return fail(t.error);
      const note = t.data.meta?.note ?? "";
      if (/não presumas que as primeiras são as mais relevantes/i.test(note))
        return fail("a nota FÓSSIL da beta.26 continua viva e dá o conselho oposto ao correcto");
      if (!/PERTEN[ÇC]A ao âmbito declarado/i.test(note)) return fail("a nota não descreve a ordenação actual");
      const primeira = String((t.data.threats ?? [])[0]?.chapter_id ?? "");
      if (/^0?[12]-/.test(primeira)) return fail(`a nota promete domínio na página 1 e a resposta abre com ${primeira}`);
      // a mesma frase tem de estar na DESCRIÇÃO da tool
      const tools = c.tools ?? [];
      const desc = String(tools.find((x) => x.name === "get_threat_landscape")?.description ?? "");
      const frase = "ORDEM: por PERTENÇA ao âmbito declarado";
      if (!desc.includes(frase) || !note.includes(frase)) return fail("descrição e nota não partilham a frase publicada");
      // routing_basis desambiguado e por concern
      const misto = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["architecture", "api", "encryption"] });
      if (!misto.ok) return fail(misto.error);
      const rb = misto.data.routing_basis;
      if (!Array.isArray(rb?.domain_chapters)) return fail("domain_chapters não é uma lista (o número do capítulo era lido como contagem)");
      if (!Array.isArray(rb?.by_concern) || rb.by_concern.length !== 3) return fail("routing_basis continua escalar num conjunto misto");
      const bases = new Set(rb.by_concern.map((x) => x.basis));
      if (bases.size < 2) return fail("conjunto misto com uma só base — a desambiguação não funcionou");
      // contraprova possível na chamada que o guia ensina
      const sel = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], detail: "minimal" });
      if (!sel.ok) return fail(sel.error);
      const x = sel.data.cross_surface_check;
      if (!x) return fail("o guia manda contraprovar e a resposta não traz a verificação");
      if (!x.comparable || !x.agreement?.same_ids) return fail(`contraprova falhou: ${JSON.stringify(x.agreement)}`);
      const real = await c.tool("select_sbd_toe_requirements", { risk_level: "L3", chapters: ["14-governanca-contratacao"], exposure: "public", detail: "minimal" });
      if (!real.ok) return fail(real.error);
      if ((real.data.cross_surface_check?.not_comparable ?? []).length === 0)
        return fail("uma chamada sem equivalente no consult não declara o que não é comparável");
      return ok(`nota e descrição partilham a frase publicada; página 1 do domínio (cap. ${primeira.slice(0, 2)}); routing_basis com ${rb.by_concern.length} concerns e ${bases.size} bases; contraprova ${x.agreement.select}=${x.agreement.consult} e ${real.data.cross_surface_check.not_comparable.length} itens declarados como não comparáveis`); } },

  { id: "TC-F-60", axis: "F", title: "0.20.0-beta.33: caminho NORMATIVO para playbooks — autoridade declarada e exemplo ≠ cross-check", tool: "get_sbd_toe_playbook",
    run: async (c) => {
      const idx = await c.tool("get_sbd_toe_playbook", { framework: "DORA" });
      if (!idx.ok) return fail(idx.error);
      const d = idx.data;
      if (!(d.normative_playbooks ?? []).length) return fail("sem playbooks normativos para o DORA");
      if (!d.illustrative_examples) return fail("exemplos ilustrativos não vêm em banda separada");
      const misturado = (d.normative_playbooks ?? []).filter((p) => /illustrative/.test(p.playbook_kind));
      if (misturado.length > 0) return fail(`exemplo ilustrativo servido como normativo: ${misturado.map((x) => x.playbook_id).join(", ")}`);
      for (const p of d.normative_playbooks)
        for (const k of ["authority_class", "curation_status", "adoption_status"])
          if (!p[k]) return fail(`${p.playbook_id} sem ${k}`);
      // delimitação obrigatória em TODA a resposta
      if (!/não é uma norma/i.test(d.delimitation ?? "")) return fail("resposta sem a delimitação honesta");
      if (!/conformidade final depende/i.test(d.delimitation ?? "")) return fail("a delimitação não diz que a conformidade exige formalização");
      // secções paginadas, com o tier certo
      const pbId = d.normative_playbooks.find((p) => p.playbook_kind === "implementation_playbook")?.playbook_id;
      const pb = await c.tool("get_sbd_toe_playbook", { playbook_id: pbId, limit: 5 });
      if (!pb.ok) return fail(pb.error);
      if (pb.data.playbook.authority.tier !== "normative") return fail("playbook de implementação sem tier normativo");
      if ((pb.data.sections ?? []).length === 0) return fail("playbook sem secções");
      if (!(pb.data.coverage?.total > (pb.data.sections ?? []).length)) return fail("sem paginação sobre as secções");
      if (!/não é uma norma/i.test(pb.data.delimitation ?? "")) return fail("secções servidas sem delimitação");
      const ex = await c.tool("get_sbd_toe_playbook", { playbook_id: d.illustrative_examples.values[0]?.playbook_id });
      if (!ex.ok) return fail(ex.error);
      if (ex.data.playbook.authority.tier !== "illustrative") return fail("exemplo servido com tier normativo");
      if (!/n[ãa]o normaliza|N[ÃA]O t[êe]m o estatuto|ILUSTRATIVO/i.test(JSON.stringify(ex.data.playbook.authority)))
        return fail("o exemplo não avisa que ilustra e não normaliza");
      // framework sem cross-check: DECLARADO, com o roadmap do Manual
      const pci = await c.tool("get_sbd_toe_playbook", { framework: "PCI-DSS" });
      if (!pci.ok) return fail(pci.error);
      if (pci.data.status !== "no_cross_check") return fail("framework sem cross-check não é declarado");
      if (!(pci.data.roadmap_declared_by_manual ?? []).includes("PCI-DSS")) return fail("roadmap não derivado do Manual");
      if (!/ainda não existe/i.test(pci.data.note ?? "")) return fail("a nota não diz que o cross-check não existe");
      // ligação nos dois sentidos
      const reg = await c.tool("map_sbd_toe_regulatory_activation", { framework: "DORA" });
      if (!reg.ok) return fail(reg.error);
      const aponta = (reg.data.next ?? []).some((n) => n.tool === "get_sbd_toe_playbook");
      if (!aponta) return fail("o overlay não encaminha para o playbook");
      const volta = (pb.data.next ?? []).some((n) => n.tool === "map_sbd_toe_regulatory_activation");
      if (!volta) return fail("o playbook não aponta de volta para as obrigações");
      return ok(`DORA: ${d.normative_playbooks.length} normativos + ${d.illustrative_examples.values.length} ilustrativos em banda separada, com autoridade e delimitação; ${pb.data.coverage.total} secções paginadas; PCI-DSS declarado com roadmap de ${pci.data.roadmap_declared_by_manual.length}; ligação nos dois sentidos`); } },

  { id: "TC-F-61", axis: "F", title: "0.20.0-beta.34: vista IMPL — a MEDIDA de capacidade tem caminho, com thresholds por nível", tool: "get_sbd_toe_chapter_capability",
    run: async (c) => {
      const r = await c.tool("get_sbd_toe_chapter_capability", { chapter: "07-cicd-seguro", risk_level: "L2" });
      if (!r.ok) return fail(r.error);
      const d = r.data;
      const measures = d.measures ?? [];
      if (measures.length === 0) return fail("sem KPIs para o cap. 07 — a peça central continua sem caminho");
      // é MEDIR e não listar: thresholds POR NÍVEL como dado
      for (const m of measures) {
        if (!m.thresholds_by_level) return fail(`${m.metric_id} sem thresholds_by_level`);
        for (const lvl of ["L1", "L2", "L3"]) if (!(lvl in m.thresholds_by_level)) return fail(`${m.metric_id} sem ${lvl}`);
        if (!m.metric_type || !m.period) return fail(`${m.metric_id} sem tipo/período`);
      }
      const comAlvo = measures.filter((m) => m.target_at_level && m.target_at_level.value !== undefined);
      if (comAlvo.length === 0) return fail("risk_level não produziu alvo em nenhum KPI");
      // artefactos da capacidade
      if (!((d.artifacts?.total ?? 0) > 0)) return fail("a vista IMPL não traz os artefactos da capacidade");
      // a leitura vem DECLARADA e distingue-se da GUIDE
      if (d.reading?.id !== "IMPL") return fail("a resposta não declara que leitura é");
      if (!/GUIDE/.test(d.reading?.note ?? "")) return fail("a resposta não distingue IMPL de GUIDE");
      // capítulo sem KPIs: declarado, nunca vazio mudo
      const nada = await c.tool("get_sbd_toe_chapter_capability", { chapter: "00-fundamentos" });
      if (!nada.ok) return fail(nada.error);
      if ((nada.data.measures ?? []).length === 0 && nada.data.status !== "no_measures_published")
        return fail("capítulo sem KPIs devolve vazio mudo");
      // o ciclo fecha-se nos dois sentidos
      const paraAssess = (d.next ?? []).some((n) => n.tool === "assess_sbd_toe_implementation");
      if (!paraAssess) return fail("a vista IMPL não encaminha para a avaliação");
      // `assess` exige os valores medidos — é essa a sua natureza: avalia o que TU mediste.
      const assess = await c.tool("assess_sbd_toe_implementation", {
        risk_level: "L2",
        kpi_values: { [measures[0].metric_id]: 95 }
      });
      if (!assess.ok) return fail(assess.error);
      const volta = (assess.data.next ?? []).some((n) => n.tool === "get_sbd_toe_chapter_capability");
      if (!volta) return fail("a avaliação não aponta para os KPIs que o Manual define");
      // o brief serve os artefactos (era defeito da sonda, não do servidor)
      const brief = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "07-cicd-seguro" });
      if (!brief.ok) return fail(brief.error);
      const arts = (brief.data.data ?? brief.data).artifacts ?? [];
      if (arts.length === 0) return fail("o brief do cap. 07 não traz artefactos");
      return ok(`cap. 07: ${measures.length} KPIs com thresholds L1/L2/L3 e ${comAlvo.length} com alvo a L2; ${d.artifacts.total} artefactos (${d.artifacts.mandatory} obrigatórios); leitura declarada IMPL; ciclo fechado com o assess; brief com ${arts.length} artefactos`); } },

  { id: "TC-F-62", axis: "F", title: "0.20.0-beta.35: leitura CONSULT — antipadrões com porta e o nível ANOTA em vez de exigir", tool: "explain_sbd_toe_topic",
    run: async (c) => {
      // a pergunta do oráculo: conhecimento, sem tarefa, sem projecto e SEM risk_level
      const r = await c.tool("explain_sbd_toe_topic", { concern: "secrets" });
      if (!r.ok) return fail(r.error);
      const d = r.data;
      if (d.status) return fail(`a pergunta de conhecimento foi recusada: ${d.status}`);
      if (d.reading?.id !== "CONSULT") return fail("a resposta não declara a leitura");
      // atravessa o Manual
      for (const [k, v] of [["requisitos", d.requirements?.total], ["práticas", d.guidance?.practices], ["provas", d.proof?.evidence_patterns], ["ameaças", d.threats?.total]])
        if (!(v > 0)) return fail(`a travessia não traz ${k}`);
      if (!(d.where_in_lifecycle?.phases ?? []).length) return fail("sem «onde no ciclo»");
      // requisito distingue-se de orientação
      if (!/exig|REQUISITO/i.test(d.requirements?.note ?? "")) return fail("não distingue requisito de orientação");
      if (!/ORIENTA|não são exigíveis/i.test(d.guidance?.note ?? "")) return fail("a orientação não é marcada como tal");
      if (!/manual-grounded/i.test(d.provenance?.note ?? "")) return fail("sem proveniência manual-grounded");
      // ANTIPADRÕES: banda própria; zero é DECLARADO, nunca mudo
      if (!d.anti_patterns) return fail("sem banda de antipadrões — «o que NÃO fazer» continua sem porta");
      // 0.20.0-beta.36 (emenda v1.2): o vazio deixa de bastar declarar — tem de trazer
      // CAMINHO CONCRETO. O predicado antigo procurava a frase que a beta.36 reescreveu.
      if ((d.anti_patterns.total ?? 0) === 0 && !(d.anti_patterns.elsewhere?.by_chapter ?? []).some((x) => /\(chapter="/.test(String(x.read_with ?? ""))))
        return fail("zero antipadrões sem CAMINHO CONCRETO para onde eles estão (v1.2)");
      const iac = await c.tool("explain_sbd_toe_topic", { concern: "iac" });
      if (!iac.ok) return fail(iac.error);
      if (!((iac.data.anti_patterns?.total ?? 0) > 0)) return fail("um tópico COM antipadrões devolve zero");
      const ap = iac.data.anti_patterns.values[0];
      for (const k of ["antipattern_id", "risk", "chapters"]) if (!(k in ap)) return fail(`antipadrão sem ${k}`);
      // o nível ANOTA, não filtra
      const semNivel = await c.tool("explain_sbd_toe_topic", { concern: "iac" });
      const comNivel = await c.tool("explain_sbd_toe_topic", { concern: "iac", risk_level: "L1" });
      if (!comNivel.ok) return fail(comNivel.error);
      if (comNivel.data.requirements.total !== semNivel.data.requirements.total)
        return fail(`o risk_level FILTROU (${semNivel.data.requirements.total} → ${comNivel.data.requirements.total}) — devia só anotar`);
      if (!comNivel.data.your_level) return fail("o nível dado não produziu anotação");
      if (!comNivel.data.requirements.values.some((x) => "applies_to_your_level" in x)) return fail("sem anotação por requisito");
      // FRONTEIRA: onde o nível é legítimo continua OBRIGATÓRIO
      const sel = await c.tool("select_sbd_toe_requirements", { concerns: ["auth"] });
      if (sel.ok) return fail("o select passou a aceitar chamada sem risk_level — a fronteira quebrou");
      return ok(`CONSULT sem nível: ${d.requirements.total} requisitos, ${d.guidance.practices} práticas, ${d.proof.evidence_patterns} provas, ${d.threats.total} ameaças, ${d.where_in_lifecycle.phases.length} fases; antipadrões com banda própria (${iac.data.anti_patterns.total} em iac, zero DECLARADO em secrets); nível anota e não filtra; select continua a exigi-lo`); } },

  { id: "TC-F-63", axis: "F", title: "0.20.0-beta.36: inventário VIVO, conservação NA BANDA, âmbito do assess e cadeia de activação", tool: "explain_sbd_toe_topic",
    run: async (c) => {
      // (1+2) os `next` de TODAS as tools servidas apontam para parâmetros que existem
      const schemas = new Map((c.tools ?? []).map((t) => [t.name, Object.keys(t.inputSchema?.properties ?? {})]));
      if (schemas.size < 20) return fail("não foi possível derivar o inventário vivo");
      const cap = await c.tool("get_sbd_toe_chapter_capability", { chapter: "07-cicd-seguro", risk_level: "L2" });
      if (!cap.ok) return fail(cap.error);
      for (const n of cap.data.next ?? []) {
        const params = schemas.get(n.tool);
        if (!params) return fail(`sugere tool inexistente: ${n.tool}`);
        for (const m of String(n.with ?? "").matchAll(/(?:^|[\s,({])([a-z][a-z_]*)\s*=/g))
          if (!params.includes(String(m[1]))) return fail(`${n.tool}: sugere \`${m[1]}=\` que não existe (tem: ${params.join(", ")})`);
      }
      // (3) conservação NA BANDA: vazia havendo conteúdo ⇒ caminho CONCRETO
      const secrets = await c.tool("explain_sbd_toe_topic", { concern: "secrets" });
      if (!secrets.ok) return fail(secrets.error);
      const ap = secrets.data.anti_patterns;
      if (!ap) return fail("banda de antipadrões não anunciada");
      if ((ap.total ?? 0) === 0) {
        const ew = ap.elsewhere?.by_chapter ?? [];
        if (ew.length === 0) return fail("banda vazia sem caminho: v1.2 exige caminho CONCRETO");
        if (!ew.every((x) => /\(chapter="/.test(String(x.read_with ?? "")))) return fail("caminho genérico, não concreto");
        if (!ew.some((x) => (x.labels ?? []).length > 0)) return fail("caminho sem os rótulos — o consumidor não sabe se lhe interessa");
        const c07 = ew.find((x) => /^07-/.test(x.chapter));
        if (!c07 || !(c07.labels ?? []).some((l) => /segredo/i.test(l)))
          return fail("o caminho não expõe os antipadrões do cap. 07 que são sobre segredos");
      }
      // (4) o escasso declara-se
      const chk = await c.tool("get_sbd_toe_chapter_implementation_checklist", { chapter: "07-cicd-seguro" });
      if (!chk.ok) return fail(chk.error);
      const cd = chk.data.data ?? chk.data;
      if ((cd.items ?? []).length <= 3 && !cd.scarcity) return fail("checklist magro e não declarado (v1.2 regra 2)");
      // (5) âmbito do assess + denominador explicado
      const global = await c.tool("assess_sbd_toe_implementation", { risk_level: "L3", kpi_values: { "CIC-K01": 90 } });
      const scoped = await c.tool("assess_sbd_toe_implementation", { risk_level: "L3", chapter: "07-cicd-seguro", kpi_values: { "CIC-K01": 90 } });
      if (!global.ok || !scoped.ok) return fail(global.error ?? scoped.error);
      const gd = global.data.data ?? global.data, sd = scoped.data.data ?? scoped.data;
      if (!(sd.totals.applicable < gd.totals.applicable)) return fail("o `chapter` não restringiu o âmbito");
      if (!sd.scope || !/DENOMINADORES/.test(sd.scope.note ?? "")) return fail("o denominador continua por explicar");
      // (6) cadeia de activação completa
      const sel = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["secrets"], exposure: "public", detail: "minimal" });
      if (!sel.ok) return fail(sel.error);
      const arq = (sel.data.context?.activated_chapters ?? []).find((x) => /^04-/.test(x.chapter));
      if (!arq) return fail("fixture mudou: o cap. 04 não é activado");
      if (!(arq.activated_by ?? []).some((a) => /^exposure=/.test(a.trigger)))
        return fail("o activated_by regista só o último elo — a cadeia continua quebrada");
      if (!(arq.derived_chain ?? []).length) return fail("sem cadeia derivada para um concern não declarado");
      // (7) unmodelled_signals
      const mt = await c.tool("select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], task_context: "Aplicação multi-tenant com isolamento por cliente", detail: "minimal" });
      if (!mt.ok) return fail(mt.error);
      if (!(mt.data.unmodelled_signals?.values ?? []).includes("multi-tenant"))
        return fail("o servidor não declara o que não conseguiu ancorar");
      if (!/IGNOR[ÂA]NCIA|não sei/i.test(mt.data.unmodelled_signals.note ?? "")) return fail("a nota não distingue «não perguntei» de «não sei»");
      return ok(`next validados contra ${schemas.size} schemas vivos; banda vazia com caminho concreto (${(ap.elsewhere?.by_chapter ?? []).length} capítulos com rótulos); escassez declarada; assess ${gd.totals.applicable}→${sd.totals.applicable} com denominador; cadeia exposure→architecture→cap.04; ${mt.data.unmodelled_signals.values.length} sinais não modelados declarados`); } },

  { id: "TC-F-64", axis: "F", title: "0.20.0-beta.37: leitura PROGRAMA — ordem só por dependency (acíclica), limites declarados e sem despejo de requisitos", tool: "get_sbd_toe_macro_processes",
    run: async (c) => {
      const r = await c.tool("get_sbd_toe_macro_processes", {});
      if (!r.ok) return fail(r.error);
      const d = r.data;
      if (d.reading?.id !== "PROGRAMA") return fail("a resposta não declara a leitura que serve");
      // (1) os cinco MP existem como DADOS, com a pergunta/invariante/dono que os identifica
      const mps = d.macro_processes ?? [];
      if (mps.length !== 5) return fail(`esperava os 5 macro-processos publicados, vieram ${mps.length}`);
      if (!mps.every((m) => m.question && m.invariant && m.owner_role)) return fail("MP sem pergunta, invariante ou dono — é rótulo, não entidade");
      // (2) ORDEM = só dependency, e o subgrafo tem de ser ACÍCLICO
      const ao = d.adoption_order ?? {};
      const levels = ao.levels ?? [];
      if (!levels.length || !ao.rule) return fail("ordem de adopção sem níveis ou sem a regra declarada");
      if (levels.flat().length !== 5) return fail("a ordem não cobre os cinco MP");
      if (ao.first_step !== "MP-01") return fail(`primeiro passo publicado mudou: ${ao.first_step}`);
      const rank = new Map(levels.flatMap((lv, i) => lv.map((m) => [m, i])));
      const deps = d.prerequisites?.values ?? [];
      if (!deps.length) return fail("sem pares de pré-requisito — «o que é pré-requisito de quê» fica por responder");
      for (const e of deps) {
        if (!(rank.get(e.from_mp) < rank.get(e.to_mp))) return fail(`dependency ${e.from_mp}→${e.to_mp} contradiz a ordem publicada`);
        if (!e.output) return fail(`dependency ${e.from_mp}→${e.to_mp} sem o artefacto que é consumido`);
      }
      // (3) as FEEDBACK ficam fora da ordem — se entrassem, os cinco MP ciclariam (verificado aqui)
      const fbs = d.feedback_loops?.values ?? [];
      if (!fbs.length) return fail("realimentação não servida");
      if (d.adoption_order?.excluded_from_order?.kind !== "feedback") return fail("a exclusão da realimentação não é declarada");
      const withFb = [...deps.map((e) => [e.from_mp, e.to_mp]), ...fbs.map((e) => [e.from_mp, e.to_mp])];
      const adj = new Map(); for (const [a, b] of withFb) adj.set(a, [...(adj.get(a) ?? []), b]);
      const seen = new Set(); let cyclic = false;
      const walk = (n, stack) => { if (stack.has(n)) { cyclic = true; return; } if (seen.has(n)) return; seen.add(n); stack.add(n); for (const m of adj.get(n) ?? []) walk(m, stack); stack.delete(n); };
      for (const n of adj.keys()) walk(n, new Set());
      if (!cyclic) return fail("controlo: com as feedback o grafo devia ciclar — a fixture mudou e a exclusão deixou de ser demonstrável");
      if (deps.some((e) => fbs.some((f) => f.from_mp === e.from_mp && f.to_mp === e.to_mp && f.via === e.via))) return fail("aresta de realimentação a contar como pré-requisito");
      // (4) os TRÊS limites declarados — não existe entidade «programa», a fase é lacuna, e não há contenção
      const L = d.declared_limits ?? {};
      if (!L.no_programme_entity || !L.sdlc_phase_traversal || !L.three_segmentations) return fail("limites da vista processual não declarados");
      if (!/percurso/i.test(d.chapter_path?.note ?? "") || /cont[eé]m/i.test(d.chapter_path?.note ?? "")) return fail("o percurso de capítulos é servido como contenção");
      if (mps.some((m) => "phases" in m || "sdlc_phases" in m)) return fail("travessia MP↔fase DERIVADA — é lacuna declarada, não se infere");
      // (5) must-NOT do oráculo: a vista de programa não despeja os 273 requisitos nem um capítulo isolado
      const ids = (JSON.stringify(d).match(/[A-Z]{3}-\d{3}/g) ?? []).length;
      if (ids > 60) return fail(`a vista de programa traz ${ids} ids de requisito — é a leitura GUIDE disfarçada`);
      const tk = Math.round(JSON.stringify(d).length / 4);
      if (tk > 4000) return fail(`vista de programa com ${tk} tk — dieta de tokens`);
      // (6) nunca-silêncio: um MP inexistente declara-se e mostra os que há
      const u = await c.tool("get_sbd_toe_macro_processes", { mp_id: "MP-99" });
      if (!u.ok) return fail("um id desconhecido devia ser resposta declarada, não erro");
      if (u.data.status !== "unknown_macro_process" || (u.data.known ?? []).length !== 5) return fail("id desconhecido sem declaração ou sem os ids que existem");
      // (7) o detalhe de um MP responde à mesma pergunta, com a realimentação que RECEBE
      const one = await c.tool("get_sbd_toe_macro_processes", { mp_id: "MP-03" });
      if (!one.ok) return fail(one.error);
      if (one.data.macro_process?.mp_id !== "MP-03") return fail("detalhe não devolve o MP pedido");
      if (!(one.data.prerequisites?.values ?? []).length) return fail("MP-03 sem pré-requisitos — a fixture publica-os");
      return ok(`5 MP como dados; ordem ${levels.map((l) => l.join("∥")).join(" → ")} coerente com ${deps.length} dependency; ${fbs.length} feedback fora da ordem (com elas o grafo cicla ✓); 3 limites declarados; ${ids} ids de requisito; ${tk} tk`); } },

  { id: "TC-G-01", axis: "G", title: "trace válido: determinismo + paginação G1 (3 lentes, total, cursor, sem IRIs)", tool: "trace_sbd_toe_graph",
    run: async (c) => {
      const shas = [];
      for (const lens of ["slice_implementation", "objective_realization", "mechanism_provenance"]) {
        const a = await c.tool("trace_sbd_toe_graph", { lens, pageSize: 100 }); if (!a.ok) return fail(`${lens}: ${a.error}`);
        const b = await c.tool("trace_sbd_toe_graph", { lens, pageSize: 100 }); if (!b.ok) return fail(`${lens} (2ª): ${b.error}`);
        if (JSON.stringify(a.data) !== JSON.stringify(b.data)) return fail(`${lens}: duas chamadas idênticas divergem (não determinístico)`);
        if (a.data.total === undefined || a.data.cursor === undefined) return fail(`${lens}: sem envelope total/cursor (G1)`);
        const rows = []; const maxPages = Math.ceil(a.data.total / 100) + 1; let sawNullCursor = false;
        for (let page = 0; page < maxPages; page++) {
          const p = await c.tool("trace_sbd_toe_graph", { lens, pageSize: 100, page }); if (!p.ok) return fail(`${lens} paging: ${p.error}`);
          if (p.data.page !== page) return fail(`${lens}: page não ecoada (${p.data.page} ≠ ${page})`);
          rows.push(...p.data.rows);
          if (p.data.cursor === null) { sawNullCursor = true; break; }
          // `cursor` é o offset da PRÓXIMA linha (row offset), não um índice de página.
          if (p.data.cursor !== (page + 1) * 100) return fail(`${lens}: cursor ${p.data.cursor} ≠ offset seguinte ${(page + 1) * 100}`);
        }
        if (!sawNullCursor) return fail(`${lens}: última página sem cursor=null (fim não declarado)`);
        if (rows.length !== a.data.total) return fail(`${lens}: walk ${rows.length} ≠ total ${a.data.total}`);
        if (JSON.stringify(rows).includes("http")) return fail(`${lens}: fuga de IRI nas rows`);
        shas.push(`${lens}=${a.data.total}`);
      }
      return ok(`determinístico; walks completos sem fuga de IRI: ${shas.join(", ")}`); } },
  { id: "TC-G-02", axis: "G", title: "trace sem resultado: resposta declarada, nunca silenciosa (anchor fora da projecção v1)", tool: "trace_sbd_toe_graph",
    run: async (c) => {
      const r = await c.tool("trace_sbd_toe_graph", { lens: "slice_implementation", anchor: "REQ-AGN-001", pageSize: 5 }); if (!r.ok) return fail(r.error);
      if (!Array.isArray(r.data.rows) || r.data.rows.length !== 0 || r.data.total !== 0) return fail(`esperava 0 declarado, veio rows=${r.data.rows?.length}/total=${r.data.total}`);
      if (r.data.anchor !== "REQ-AGN-001") return fail("anchor não ecoado (resposta não auto-descritiva)");
      if (!r.data.provenance?.note) return fail("sem provenance.note a declarar o âmbito da projecção (silêncio)");
      const n = await c.tool("trace_sbd_toe_graph", { lens: "slice_implementation", anchor: "XX-NOPE-999", pageSize: 5 }); if (!n.ok) return fail(n.error);
      if (n.data.total !== 0) return fail("anchor inexistente devolveu resultados");
      return ok(`0 rows/total 0 declarados com anchor ecoado + provenance.note (âmbito v1); anchor inexistente idem`); } },
  { id: "TC-G-03", axis: "G", title: "trace com input inválido: erro declarado (-32602), nunca sucesso vazio", tool: "trace_sbd_toe_graph",
    run: async (c) => {
      const bad = await c.tool("trace_sbd_toe_graph", { lens: "banana" });
      if (bad.ok) return fail("lens inválida aceite (devia ser erro declarado)");
      if (!/lens/i.test(String(bad.error))) return fail(`erro não nomeia o campo: ${String(bad.error).slice(0, 80)}`);
      const missing = await c.tool("trace_sbd_toe_graph", {});
      if (missing.ok) return fail("lens em falta aceite");
      return ok(`lens inválida/em falta → erro declarado que nomeia o campo («${String(bad.error).slice(0, 40)}…»)`); } },

  // ───────────────────────── Axis H — selection vs golden oracle (measurement, NOT gate) ─────────────────────────
  // Oracle: golden-selection-cases.md v1 (programme lead's, read-only). One scenario per
  // golden case; semantics in scripts/acceptance/axis-h.mjs. Axis E remains the only gate.
  ...goldenCases.map((gc, i) => ({
    id: `TC-H-${String(i + 1).padStart(2, "0")}`, axis: "H", title: `${gc.id} — ${gc.title}`, tool: "prepare_sbd_toe_codegen_context + consult_security_requirements",
    run: async (c) => { const r = await runGoldenCase(c, gc, hCatalogue()); return { status: r.status, note: r.note, ...(r.status !== "PASS" ? { owner: r.causes.some((x) => x.cause === "manual") ? "manual" : r.causes.some((x) => x.cause === "oracle?") ? "oracle?" : "mcp" } : {}) }; },
  })),
];
