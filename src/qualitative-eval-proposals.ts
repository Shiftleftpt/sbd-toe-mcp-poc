export type ProposedEvalProfile = "consult" | "guide" | "review" | "threats" | "authoring";

export interface ProposedQualitativeEvalCase {
  id: string;
  title: string;
  fitProfile: ProposedEvalProfile;
  prompt: string;
  whyItMatters: string;
  expectedBehavior: string[];
  expectedToolPath: string[];
  successSignals: string[];
  likelyFailureModes: string[];
  notesFromSession: string[];
}

export interface ProposedSmokeAssertion {
  id: string;
  title: string;
  scope: "smoke" | "harness-contract";
  assertion: string;
  rationale: string;
}

// Proposals captured from a real exploratory session using the SbD-ToE MCP.
// They are intentionally kept separate from the active harness so a developer
// can review, select, and implement only the cases that add signal.
export const proposedQualitativeEvalCases: ProposedQualitativeEvalCase[] = [
  {
    id: "C5",
    title: "Code-only classification should stay at L2 unless L3 evidence is explicit",
    fitProfile: "consult",
    prompt:
      "Olhando apenas para o codigo desta app web com frontend React e API Express autenticada, qual a classificacao SbD-ToE?",
    whyItMatters:
      "Tests whether the MCP-backed answer can classify by observed technical signals without over-promoting to L3 just because the stack looks security-aware.",
    expectedBehavior: [
      "Use classification logic grounded in chapter 01.",
      "Separate observed facts from inference.",
      "Return L2 as the prudent default for a public authenticated app with user data.",
      "Avoid claiming L3 without explicit evidence of regulated or high-impact data.",
    ],
    expectedToolPath: ["get_sbd_toe_chapter_brief", "search_sbd_toe_manual"],
    successSignals: [
      "Answer mentions exposure, data, and impact axes.",
      "Answer explicitly says what is observed vs inferred vs not verified.",
      "No unsupported leap to L3.",
    ],
    likelyFailureModes: [
      "Over-classifies to L3 because the app has auth/RBAC.",
      "Returns generic classification text with no code-sensitive reasoning.",
      "Does not explain uncertainty boundaries.",
    ],
    notesFromSession: [
      "This was a strong usability scenario because it forced the agent to distinguish technical posture from business criticality.",
      "The desired outcome was L2 probable, not L3 by default.",
    ],
  },
  {
    id: "R5",
    title: "Compliance assessment should separate code, evidence, and operations",
    fitProfile: "review",
    prompt:
      "Qual o grau de compliance com SbD-ToE deste projeto, o que foi analisado e o que falta?",
    whyItMatters:
      "Tests whether the MCP can support a realistic compliance review instead of collapsing everything into a single optimistic status.",
    expectedBehavior: [
      "Identify active bundles for the app profile.",
      "Separate implementation, documentation/evidence, and operational gaps.",
      "Ground the answer in repository-observable artifacts when possible.",
      "Avoid presenting aspirational architecture text as implemented compliance.",
    ],
    expectedToolPath: [
      "map_sbd_toe_applicability",
      "consult_security_requirements",
      "plan_sbd_toe_repo_governance",
    ],
    successSignals: [
      "Output distinguishes observed controls from missing evidence.",
      "Threat modeling, risk register, and release evidence are called out separately.",
      "Assessment does not confuse docs with runtime implementation.",
    ],
    likelyFailureModes: [
      "Turns into a generic chapter summary.",
      "Claims compliance only because requirements are annotated in code/comments.",
      "Misses the evidence dimension entirely.",
    ],
    notesFromSession: [
      "This exposed that the MCP is strong for grounding but does not itself perform gap analysis; the model had to bridge that gap.",
    ],
  },
  {
    id: "G5",
    title: "Developer guidance should return manual stories, not local remediation tasks",
    fitProfile: "guide",
    prompt:
      "Se es um developer neste projeto, quais as user stories a que tens de prestar atencao?",
    whyItMatters:
      "Tests whether role guidance stays at the manual practice/story level instead of drifting into repo-specific bugs and backlog items.",
    expectedBehavior: [
      "Use developer role guidance as the primary source.",
      "Return named user stories/practices from active chapters.",
      "Keep repo-specific tasks separate or clearly mark them as implementation follow-ups.",
    ],
    expectedToolPath: ["get_guide_by_role"],
    successSignals: [
      "Output mentions stories such as secure coding guidelines, validated GenAI use, local validations, dependency hygiene, and formal exceptions.",
      "No confusion between manual stories and sprint tasks.",
    ],
    likelyFailureModes: [
      "Returns a remediation plan for this repo instead of role guidance.",
      "Produces only generic developer advice without chapter/story anchors.",
    ],
    notesFromSession: [
      "This distinction became explicit when backlog proposals were correctly challenged as not being manual stories.",
    ],
  },
  {
    id: "G6",
    title: "Sprint planning should map manual stories to concrete project tasks",
    fitProfile: "guide",
    prompt:
      "Estou a preparar o proximo sprint. Que user stories do manual sao relevantes e que tasks concretas deste projeto as implementam?",
    whyItMatters:
      "Tests whether the agent can bridge framework-level guidance and executable backlog without confusing the two.",
    expectedBehavior: [
      "Return a two-column style answer: manual story/practice and local project task.",
      "Keep traceability explicit.",
      "Use role, CI/CD, containers, monitoring, and governance stories where relevant.",
    ],
    expectedToolPath: [
      "get_guide_by_role",
      "consult_security_requirements",
      "plan_sbd_toe_repo_governance",
    ],
    successSignals: [
      "Manual story and project task are clearly separated.",
      "Each task is plausibly tied back to a chapter/practice.",
      "No silent mixing of normative text and local remediation.",
    ],
    likelyFailureModes: [
      "Returns only story names with no project impact.",
      "Returns only repo tasks with no manual linkage.",
    ],
    notesFromSession: [
      "This is a high-value usability scenario because it reflects real planning work rather than pure manual Q&A.",
    ],
  },
  {
    id: "C6",
    title: "NIS2 mapping should be decomposed by code, evidence, and out-of-repo measures",
    fitProfile: "consult",
    prompt:
      "Para NIS2, o que faltaria neste projeto do que se consegue fazer a este nivel?",
    whyItMatters:
      "Tests whether the MCP helps structure cross-framework reasoning without pretending that NIS2 is fully encoded in SbD-ToE.",
    expectedBehavior: [
      "Use SbD-ToE as the decomposition model.",
      "Separate what can be done in code/pipeline, what belongs to repository evidence, and what requires organisational process.",
      "Avoid claiming NIS2 compliance from repo state alone.",
    ],
    expectedToolPath: [
      "consult_security_requirements",
      "plan_sbd_toe_repo_governance",
      "get_sbd_toe_chapter_brief",
    ],
    successSignals: [
      "Output explicitly says what is feasible at repository level and what is outside the repo.",
      "No claim that SbD-ToE already provides a full NIS2 checklist.",
    ],
    likelyFailureModes: [
      "Overstates regulatory coverage.",
      "Collapses process/governance obligations into code-only tasks.",
    ],
    notesFromSession: [
      "This scenario was useful because it showed SbD-ToE as a structuring framework, not a ready-made NIS2 mapping.",
    ],
  },
  {
    id: "C7",
    title: "CRA applicability should stay conditional until product-distribution facts are explicit",
    fitProfile: "consult",
    prompt:
      "E CRA, seria aplicavel aqui? E se a app for wrapped em React e distribuida como mobile?",
    whyItMatters:
      "Tests whether the agent can use SbD-ToE grounding while staying disciplined about a framework that is not the manual's core subject.",
    expectedBehavior: [
      "Treat CRA as conditional on product distribution, not just on technical stack.",
      "Explain the difference between SaaS/service and distributed digital product.",
      "Raise applicability if the app is packaged and distributed as mobile.",
    ],
    expectedToolPath: ["get_sbd_toe_chapter_brief", "search_sbd_toe_manual"],
    successSignals: [
      "No definitive CRA claim without distribution facts.",
      "Clear distinction between service operation and product placement on the market.",
    ],
    likelyFailureModes: [
      "Treats CRA as always applicable to any app.",
      "Ignores the change in posture once the app becomes a distributed mobile product.",
    ],
    notesFromSession: [
      "This measured the agent's restraint more than raw retrieval, but it is still a valuable usability case.",
    ],
  },
  {
    id: "G7",
    title: "Third-party governance should cover supplier lifecycle, exceptions, and contractors",
    fitProfile: "guide",
    prompt:
      "O que o SbD-ToE indica sobre contratacao de terceiros?",
    whyItMatters:
      "Tests whether the governance/contracting chapter is usable for procurement and supplier assurance, not only for engineering.",
    expectedBehavior: [
      "Cover onboarding assessment, periodic re-evaluation, continuous monitoring, and formal exceptions.",
      "Include contractors as a separate lifecycle concern.",
      "Reference evidence artifacts expected by the manual.",
    ],
    expectedToolPath: [
      "get_sbd_toe_chapter_brief",
      "search_sbd_toe_manual",
      "plan_sbd_toe_repo_governance",
    ],
    successSignals: [
      "Mentions supplier assessment, approval records, exception records, access review, and ongoing monitoring.",
      "Mentions contractors pre-access preparation and offboarding.",
    ],
    likelyFailureModes: [
      "Reduces the answer to generic procurement advice.",
      "Misses the continuous re-evaluation requirement.",
    ],
    notesFromSession: [
      "This was one of the strongest governance-oriented interactions of the session.",
    ],
  },
  {
    id: "C8",
    title: "Training should be presented as mandatory and evidence-based, not generic certification talk",
    fitProfile: "consult",
    prompt:
      "E formacao/certificacao? O manual exige certificacao formal ou formacao por funcao com evidencia?",
    whyItMatters:
      "Tests whether the MCP can distinguish what the manual actually says from common but unsupported assumptions about certifications.",
    expectedBehavior: [
      "State that training is mandatory by role with evidence.",
      "Avoid inventing mandatory external certifications unless the manual says so.",
      "Reference onboarding checklist, quiz result, and training plan artifacts.",
    ],
    expectedToolPath: ["get_sbd_toe_chapter_brief", "search_sbd_toe_manual"],
    successSignals: [
      "Answer is explicit that certification is not a generic mandatory requirement in the consulted material.",
      "Training cadence and evidence are made concrete.",
    ],
    likelyFailureModes: [
      "Invents CISSP/ISO-style certification requirements.",
      "Talks about awareness in vague terms without evidence artifacts.",
    ],
    notesFromSession: [
      "The training vs certification distinction mattered because it changes both policy and contracting language.",
    ],
  },
  {
    id: "C9",
    title: "User story retrieval should be faithful enough to quote wording and checklist structure",
    fitProfile: "consult",
    prompt:
      "Qual a redacao do US-02?",
    whyItMatters:
      "Tests whether the MCP can support close-reading tasks instead of only thematic summaries.",
    expectedBehavior: [
      "Return the user story wording, context, and BDD/checklist excerpt if available.",
      "Stay faithful to the retrieved text.",
      "Avoid paraphrasing away the normative structure.",
    ],
    expectedToolPath: ["search_sbd_toe_manual"],
    successSignals: [
      "Output includes the title, context, story, and at least part of the acceptance structure.",
      "Minimal editorial drift.",
    ],
    likelyFailureModes: [
      "Only returns a summary.",
      "Blends wording from multiple stories.",
      "Cannot reliably answer by ID.",
    ],
    notesFromSession: [
      "This surfaced a likely product gap: a direct get_user_story-by-id tool would reduce friction.",
    ],
  },
  {
    id: "A1",
    title: "Authoring gap proposal for agent-security requirement should stay anchored in existing chapters",
    fitProfile: "authoring",
    prompt:
      "Quero propor um novo requisito para agentes de IA com contexto de seguranca. Em que capitulos ancorar e que artefacto criar?",
    whyItMatters:
      "Tests whether the MCP can support disciplined authoring proposals by grounding them in existing governance, IDE, and onboarding structures.",
    expectedBehavior: [
      "Anchor the proposal in IDE/tooling, governance/contracting, and training/onboarding chapters.",
      "State clearly what is manual-grounded and what is proposed.",
      "Avoid pretending the new requirement already exists.",
    ],
    expectedToolPath: [
      "consult_security_requirements",
      "get_sbd_toe_chapter_brief",
      "search_sbd_toe_manual",
    ],
    successSignals: [
      "The answer frames the change as a proposal, not existing canon.",
      "The answer identifies appropriate anchoring chapters and evidence artifacts.",
    ],
    likelyFailureModes: [
      "Invents an existing requirement ID.",
      "Fails to distinguish proposal from retrieved manual content.",
    ],
    notesFromSession: [
      "This is useful for measuring extensibility and authoring support, even though the current MCP is largely read-only.",
    ],
  },
  {
    id: "C10",
    title: "Document structure discovery should return SbD chapter and artifact structure clearly",
    fitProfile: "consult",
    prompt:
      "Qual e a estrutura de documentos do SbD-ToE e que tipos de artefactos/documentos existem?",
    whyItMatters:
      "Tests whether the MCP can orient a user quickly in the document model of the manual instead of only answering isolated conceptual questions.",
    expectedBehavior: [
      "Return chapter structure or chapter list in an ordered and navigable way.",
      "Mention expected artifact families where relevant.",
      "Make it easy to understand where policies, threat modeling, CI/CD, operations, and governance live.",
    ],
    expectedToolPath: ["list_sbd_toe_chapters", "plan_sbd_toe_repo_governance", "get_sbd_toe_chapter_brief"],
    successSignals: [
      "The answer gives a coherent top-down map of the manual.",
      "The answer distinguishes chapters from artifacts.",
      "The answer is useful for onboarding and navigation.",
    ],
    likelyFailureModes: [
      "Returns only one chapter instead of the full structure.",
      "Mixes chapter titles, requirements, and artifacts without hierarchy.",
      "Produces an overlong narrative with poor navigability.",
    ],
    notesFromSession: [
      "This came up implicitly several times when we had to navigate chapters 13 and 14 and artifact families.",
    ],
  },
  {
    id: "C11",
    title: "User story retrieval should support ipsis verbis extraction by identifier",
    fitProfile: "consult",
    prompt:
      "Obtem a user story US-02 ipsis verbis, incluindo contexto, historia e checklist se existirem.",
    whyItMatters:
      "Tests whether the MCP can support exact or near-exact retrieval for downstream use in requirements, policies, or cards.",
    expectedBehavior: [
      "Retrieve the requested story by identifier or a close grounded match.",
      "Preserve wording structure where available.",
      "Avoid summarising when the request asks for verbatim wording.",
    ],
    expectedToolPath: ["search_sbd_toe_manual"],
    successSignals: [
      "The answer includes title, context, story, and acceptance/checklist elements.",
      "The answer clearly signals retrieved wording rather than generated paraphrase.",
    ],
    likelyFailureModes: [
      "Cannot resolve by story ID.",
      "Returns only a summary instead of quoted structure.",
      "Blends nearby stories or chapters.",
    ],
    notesFromSession: [
      "This is one of the strongest indicators for a future direct story-by-id tool.",
    ],
  },
  {
    id: "G8",
    title: "Card generation should preserve manual wording before deriving backlog structure",
    fitProfile: "guide",
    prompt:
      "Obtem as user stories relevantes ipsis verbis e cria cards prontos para colar no board, mantendo ligacao explicita ao texto do manual.",
    whyItMatters:
      "Tests whether the agent can move from verbatim manual content to actionable cards without losing traceability or misrepresenting the original story.",
    expectedBehavior: [
      "Retrieve or cite the relevant user stories first.",
      "Create backlog cards as a derived artifact, clearly separated from the original wording.",
      "Maintain explicit traceability from story to card.",
    ],
    expectedToolPath: ["get_guide_by_role", "search_sbd_toe_manual", "plan_sbd_toe_repo_governance"],
    successSignals: [
      "The answer clearly separates manual text from derived backlog card text.",
      "Each card references a chapter or story link.",
      "The transformation remains faithful to the manual's intent.",
    ],
    likelyFailureModes: [
      "Creates cards with no manual linkage.",
      "Claims card text is the exact story text.",
      "Drops acceptance criteria in the transformation.",
    ],
    notesFromSession: [
      "This reflects the real friction we saw between story retrieval and project backlog translation.",
    ],
  },
  {
    id: "C12",
    title: "Policy retrieval should clarify whether the manual provides policies or only expected governance artifacts",
    fitProfile: "consult",
    prompt:
      "Que documentos de politicas o SbD-ToE espera ou sugere, e onde entram na estrutura?",
    whyItMatters:
      "Tests whether the MCP can answer policy-oriented questions without pretending the manual ships normative policy templates when it mostly defines governance artifacts and evidence expectations.",
    expectedBehavior: [
      "Explain what governance artifacts are expected.",
      "Distinguish between policy/report/checklist/approval artifacts.",
      "Avoid inventing policy templates if the manual does not provide them.",
    ],
    expectedToolPath: ["plan_sbd_toe_repo_governance", "get_sbd_toe_chapter_brief", "search_sbd_toe_manual"],
    successSignals: [
      "The answer states clearly whether policies are canonical manual artifacts or local project governance outputs.",
      "It helps the user understand what kind of document to create.",
    ],
    likelyFailureModes: [
      "Invents policy names/templates as if they came from the manual.",
      "Answers only with generic governance talk and no artifact guidance.",
    ],
    notesFromSession: [
      "This scenario matters because users naturally ask for policy documents even when the manual is more artifact-centric than template-centric.",
    ],
  },
  {
    id: "G9",
    title: "Coding-rule questions should return requirement-grounded guidance for auth and logging domains",
    fitProfile: "guide",
    prompt:
      "Que regras de codificacao sao aplicaveis a auth e logging neste projeto? Inclui o que deve ser masked nos logs.",
    whyItMatters:
      "Tests whether the MCP can support domain-specific coding guidance grounded in active concerns without over-claiming implementation detail that belongs to the model.",
    expectedBehavior: [
      "Use auth and logging concerns to ground active requirements and controls.",
      "Translate them into coding-oriented guidance.",
      "Clearly separate manual-grounded requirements from inferred implementation advice such as field masking policy.",
    ],
    expectedToolPath: ["consult_security_requirements", "get_threat_landscape", "search_sbd_toe_manual"],
    successSignals: [
      "The answer anchors auth guidance in AUT/ACC/SES and logging guidance in LOG-related controls/chapters.",
      "The answer explicitly marks masking guidance as derived operational policy when not directly specified by the manual.",
      "The answer is specific enough to guide code review.",
    ],
    likelyFailureModes: [
      "Returns only generic secure coding advice.",
      "Presents inferred masking tables as if they were retrieved canon.",
      "Misses one of the two domains requested.",
    ],
    notesFromSession: [
      "This reflects repeated questions about auth, logging structure, and what should be masked in logs.",
    ],
  },
  {
    id: "G10",
    title: "RFP preparation for agents should combine third-party governance, legal constraints, and policy references",
    fitProfile: "guide",
    prompt:
      "Preparacao para a contratacao de agentes: o que deve estar no RFP, que legal deve ser considerado, que policies podem ser referidas?",
    whyItMatters:
      "Tests whether the MCP-backed answer can support a realistic procurement/governance task that spans supplier assessment, contractors, evidence, and policy references.",
    expectedBehavior: [
      "Ground the answer in supplier governance and contractor lifecycle material.",
      "Reference expected artifacts such as supplier assessment, approval, access review, exception, pipeline config, SBOM, provenance, and signature.",
      "Distinguish between manual-grounded governance requirements and inferred legal/procurement clauses.",
    ],
    expectedToolPath: ["get_sbd_toe_chapter_brief", "search_sbd_toe_manual", "plan_sbd_toe_repo_governance"],
    successSignals: [
      "The answer is usable for RFP drafting.",
      "It covers onboarding, re-evaluation, access, exceptions, and evidence.",
      "It does not pretend the manual itself is a legal contract template.",
    ],
    likelyFailureModes: [
      "Collapses into generic procurement advice with little SbD grounding.",
      "Overstates what the manual says about legal clauses.",
      "Misses policy references entirely.",
    ],
    notesFromSession: [
      "This is a good end-to-end usability case because it forces the MCP to support governance, not just technical implementation.",
    ],
  },
];

export const proposedSmokeAssertions: ProposedSmokeAssertion[] = [
  {
    id: "S9",
    title: "Developer role guide contains governance stories, not only coding stories",
    scope: "smoke",
    assertion:
      "handleGetGuideByRole({ risk_level: 'L2', role: 'developer' }) should include chapter 14 assignments alongside chapters 05/06/07/09/12.",
    rationale:
      "The session showed that developer guidance spans exceptions, compliance repo, and periodic control, not only secure coding.",
  },
  {
    id: "S10",
    title: "Governance chapter advertises supplier and evidence artifacts",
    scope: "smoke",
    assertion:
      "handleGetSbdToeChapterBrief({ chapterId: '14-governanca-contratacao' }) should expose supplier/governance artifacts such as assessment, approval, exception, access-review, SBOM, provenance, and pipeline config.",
    rationale:
      "The chapter was heavily used for procurement and third-party governance questions in the session.",
  },
  {
    id: "S11",
    title: "Training chapter advertises onboarding evidence artifacts",
    scope: "smoke",
    assertion:
      "handleGetSbdToeChapterBrief({ chapterId: '13-formacao-onboarding' }) should expose onboarding checklist, quiz result, and training plan artifacts.",
    rationale:
      "These artifacts were central to the training-vs-certification discussion.",
  },
  {
    id: "S12",
    title: "Qualitative harness should keep room for authoring-oriented cases",
    scope: "harness-contract",
    assertion:
      "The qualitative evaluation model should allow storing proposals that are not yet mapped to the current four profiles, without forcing them into an unrelated bucket.",
    rationale:
      "The session produced a genuine authoring/extensibility scenario around agent-security requirements.",
  },
  {
    id: "S13",
    title: "Governance tooling should support policy/artifact distinction",
    scope: "harness-contract",
    assertion:
      "Policy-oriented questions should be evaluable without forcing the runtime to invent policy templates; proposed evaluations should check for a clear distinction between expected governance artifacts and generated local policy documents.",
    rationale:
      "Several session questions revolved around policies, while the manual often provides artifact expectations rather than ready-made policy texts.",
  },
  {
    id: "S14",
    title: "Coding-guidance questions should tolerate a manual-grounded plus inferred split",
    scope: "harness-contract",
    assertion:
      "Qualitative evaluations for coding-rule questions should allow answers that combine retrieved requirements with explicitly marked inferred implementation guidance, instead of expecting pure canonical retrieval.",
    rationale:
      "Questions such as auth/logging/masking are only partially canonical and rely on a disciplined split between retrieved constraints and derived coding advice.",
  },
];

// Current integration status for the active MCP harness.
// - "adopted" means the signal already exists in smoke/harness coverage.
// - "harness-ready" means the proposal maps cleanly to the current four MCP profiles.
// - "interactive-mixed" means the scenario is valuable but blends MCP grounding with
//   repo/model judgement and should stay manual or semi-manual for now.
// - "future-gap" means the proposal depends on product functionality that does not
//   exist yet in the MCP contract.
export const adoptedSmokeAssertionIds = ["S9", "S10", "S11"] as const;
export const harnessReadyProposalIds = ["C8", "C10", "C12", "G7"] as const;
export const interactiveMixedScopeProposalIds = [
  "C5",
  "R5",
  "G6",
  "C6",
  "C7",
  "G9",
  "G10",
] as const;
export const futureProductGapProposalIds = ["C9", "C11", "G8", "A1"] as const;
