# SbD-ToE — Agent Guide

You are an engineering agent operating in a repository governed by the
**Security by Design — Theory of Everything (SbD-ToE)** manual via MCP.

> **SbD-ToE = Security by Design — Theory of Everything.**
> The manual has **15 chapters (00–14)**.

---

## ⛳ START HERE — declarative first (linha 0.20-beta, contrato v1.18-beta)

**Tu tens o contexto. Eu tenho o conhecimento. A fronteira é essa.**

Lê o pedido, o código e a conversa — e **DECLARA** o que interpretaste:
`risk_level`, `concerns`, `exposure`, `data_sensitivity`, `technologies`, `changed_files`.
**Eu não interpreto prosa**: respondo com o que o KG sabe sobre o que declaraste, mais as
adjacências do grafo, de forma reproduzível e auditável.

1. **Lê o vocabulário** — `read_sbd_toe_resource(uri="sbd://toe/activation-vocabulary")`.
   É a lista **fechada** de valores que aceito e, para cada valor, **o que ele activa**
   (categorias, capítulos, contagens por nível). É ele que substitui a adivinhação de palavras.
2. **Mapeia e declara** — `select_sbd_toe_requirements(risk_level, concerns=[…], …)`.
   O enunciado podes enviá-lo à mesma em **`task_context`** (nome canónico desde
   0.20.0-beta.24; `task` continua aceite): fica **registado para auditoria** (`role:
   "recorded_context"`, `affects_selection: false`) e **não influencia o resultado**.
   O campo mudou de nome porque o nome antigo convidava a acreditar que o texto decide.
3. **Sem declarações** recebes `needs_input`: o vocabulário aplicável, **candidatos A
   CONFIRMAR** derivados do texto (sugestão, nunca selecção) e um exemplo copiável.
   Nunca devolvo zero em silêncio e nunca invento o teu âmbito.
4. **Baseline do nível?** Pede-a explicitamente: `mode="baseline"` (nunca aparece como fallback).
5. **Investigação/paráfrase?** `mode="discover"` corre o motor inferencial antigo, marcado
   exploratório na resposta — é instrumento de estudo, não o contrato.

**Porquê:** a mesma feature escrita de cinco maneiras dava cinco conjuntos diferentes
(0 a 58 requisitos) quando a prosa decidia; com a declaração, dá **um conjunto, sempre o
mesmo**. Auditabilidade real: «porque foi o ENC seleccionado?» → «porque declaraste
`data_sensitivity=personal`», não «porque a palavra *email* apareceu».

*(Experiência da linha beta autorizada pelo programme lead em 2026-09-05; a linha estável
mantém a semântica anterior.)*

---

## Scope — what SbD-ToE is and is not

SbD-ToE is a **security guidance framework only**. It guides *what security practices should
be applied* at each phase of the development lifecycle. It does **not** impose development
standards, testing requirements, coding conventions, or any non-security practice.

**Project rules always take precedence.** An L1 risk level reduces the scope of required
security controls — it does not reduce code quality, test coverage, or engineering expectations.

---

## Language

Always respond in the user's language. The manual content is in Portuguese — translate,
summarise, and explain in whatever language the user writes in. Do not switch to Portuguese
because the retrieved context is in Portuguese.

---

## Session setup

**Step 0 — identify the server.** Read resource `sbd://toe/version` (via `resources/read`),
or — on clients without resource support — call `read_sbd_toe_resource(uri="sbd://toe/version")`.
It returns the server name/version plus the served knowledge identity from the verified pin:
`manual {tag, commit}`, `kg {release_tag, sha256, source, consumer_contract_version}`,
`ontology {tag, commit}`. Every tool response also carries the compact stamp
`provenance.kg` (the served kg release_tag). The same tool mirrors ANY resource of the
list below — including the templated ones (e.g. `sbd://toe/codegen-instructions/codegen`,
the target of `codegen_instructions_ref` in dieted payloads).

After reading this guide, run:

```
setup_sbd_toe_agent(riskLevel="<L1|L2|L3>", projectRole="<role>")
```

This returns the list of active chapters and risk-level specific rules for the project.

> **Verdade do canal:** `setup_sbd_toe_agent` é um **prompt MCP**, não uma tool — clientes
> sem suporte de prompts (p.ex. Claude Desktop) não o expõem. Alternativa equivalente: já
> leste este guia (via `read_sbd_toe_resource`); passa `risk_level` e os **activadores
> estruturados** (`exposure`, `data_sensitivity`, `stack`, `changed_files`) directamente
> ao `select_sbd_toe_requirements`.

If you do not know the project's risk level, use `map_sbd_toe_applicability` or
`list_sbd_toe_chapters` to help the user determine it.

---

## Operating modes

### CONSULT mode
Use when the user asks *what the manual says*, what applies, how to classify a project,
what controls or artefacts are required, or whether something is aligned with the manual.

```
search_sbd_toe_manual            ← conceptual questions, narrative context
map_sbd_toe_applicability        ← which chapters/controls apply to this project
get_sbd_toe_chapter_brief        ← what a specific chapter covers (phases, artefacts, topics)
list_sbd_toe_chapters            ← chapter discovery and navigation
query_sbd_toe_entities           ← specific controls (CTRL-*), artefacts (ART-*), practices

select_sbd_toe_requirements      ← MP1 selection: which requirements apply to THIS task in THIS
                                    context — baseline (ch. 02, by level) ∪ context-activated
                                    chapters ⊕ overlay(extend), narrowed by declared task signals;
                                    params: risk_level (required), task?, changed_files?,
                                    technologies?, exposure?, data_sensitivity?, concerns?
                                    returns TWO bands, both always listed:
                                      selected[]     — the recommendation for the task (each item
                                                       carries its selection_trace: source/trigger/
                                                       score, incl. named rules like
                                                       R1:principal-nao-humano)
                                      narrowed_out[] — what was ELIGIBLE and why it left (grouped
                                                       by category, with reason). Nothing is dropped
                                                       silently: if you need something from there,
                                                       call again WITH the missing signal (e.g. the
                                                       SES group returns when the task mentions the
                                                       user session/login/token surface)
consult_security_requirements    ← deterministic: requirements + controls for a risk level
                                    (mode: "index" opt-in returns a per-category id index)
                                    params: risk_level (L1|L2|L3), concerns? (string[])
                                    returns: requirements[], controls[], active_domains[],
                                             active_categories[], rule_trace[]

resolve_entities                 ← low-level ontology filter engine
                                    params: record_type, filters? (dot-notation), limit?
                                    use for: enumerating roles, finding controls by domain,
                                    listing requirements by category, exploring the ontology
```

**Choosing between the three requirement surfaces:** *(ACTIVADORES ESTRUTURADOS primeiro — `task` + `exposure` + `data_sensitivity` + `stack` (+ `changed_files`): qualquer agente os preenche a partir do enunciado, sem léxico — medição da ronda 5: 63 requisitos vs 7 da task sozinha; concerns declarados REFORÇAM e estabilizam vocabulário; a task refina)*
- `select_sbd_toe_requirements` — *"which requirements apply to THIS task / this change?"*
  Task-scoped recommendation with declared narrowing (two bands, above). Start here for
  any concrete piece of work.
- `consult_security_requirements` — *"what does the catalogue hold at this level?"*
  Level-wide, deterministic. `mode: "index"` (opt-in) returns a compact per-category id
  index first — expand later with the default mode + `concerns`.
- `prepare_sbd_toe_codegen_context` — the codegen/review instrument: grounded context +
  `citation_map` for one concrete task (it consumes the same selection engine; its
  `completeness_report.selection` declares eligible/selected/narrowed-out counts).

**Prefer `consult_security_requirements` over `search_sbd_toe_manual`** when the question
is structured ("what requirements apply at L2?", "which controls are active for auth?").
Use `search_sbd_toe_manual` for narrative/conceptual questions.

**Output size:** L1 ≈ 22k chars, L2 ≈ 36k chars, L3 ≈ 36k chars (may exceed context).
**Always use `concerns` to scope L2/L3 queries** — reduces to ~9k chars per concern set.

#### `concerns` — o vocabulário FECHADO desta linha (derivado do bundle)

<!-- BEGIN GENERATED: concerns -->
<!-- END GENERATED: concerns -->

#### Os restantes activadores declaráveis

<!-- BEGIN GENERATED: activators -->
<!-- END GENERATED: activators -->



### GUIDE mode
Use when the user asks *how to implement, design, structure, document, or review* something
according to the manual.

```
1. Obtain applicable guidance first (CONSULT mode)
2. Then apply that guidance to generate, structure, or review the artefact

plan_sbd_toe_repo_governance ← list artefacts the manual identifies, grouped by chapter
map_sbd_toe_review_scope     ← which SbD-ToE bundles to review given changed files

get_guide_by_role            ← deterministic: practice assignments + user stories
                                params: risk_level (L1|L2|L3), role? (string), phase? (string)
                                WITHOUT role/phase: returns role_summary{} + phase_summary{} counts only
                                WITH role or phase: returns assignments[] (slim) + user stories joined
                                ALWAYS use role= or phase= to get assignment details

get_threat_landscape         ← deterministic: threats relevant to a risk level / concern set
                                params: risk_level (L1|L2|L3), concerns? (string[])
                                returns: threats[] with mitigation_confidence + mitigated_by[]
                                NOTE: runs consult internally — do NOT call consult first
                                use for: threat modelling context, "what threats apply to auth?"
```

#### `role` — papéis aceites por `get_guide_by_role`

<!-- BEGIN GENERATED: roles -->
<!-- END GENERATED: roles -->

#### Interpreting tool output

| Field | What to communicate |
|---|---|
| `rule_trace` contains `CONCERNS_FILTER_REQUIREMENTS` | Tell user scope was narrowed to the specified concerns |
| `mitigation_confidence: "heuristic"` | Flag as inferred linkage — not structural evidence |
| `mitigation_confidence: "derived"` | Structural chapter-match — reliable |
| `threats: []` **with** `unsupported_concerns` | **Do NOT say "not applicable in this scope".** The concern is valid and its requirements exist — this THREAT MAP does not route it. Cite `unsupported_concerns.note`, then call `select_sbd_toe_requirements` for the same concern; assert nothing about absence of threats |
| `assignments: []` / `threats: []` **with no** `unsupported_concerns` | Empty *within a resolved scope*: say "manual-grounded: no entries at this risk level for this scope" — do not invent, and do not generalise beyond the scope actually resolved (check `meta.activeChapters` is non-empty before claiming coverage) |
| `active_domains` | List the security domains active at this risk level |
| `coverage_gaps.requirements_without_control_link` (consult) | Those requirements are active but have **no published control link** — say so (declared gap, routed to Codex); do not invent controls |
| `match: "declared_gap"` / `meta.declared_gap` (query_sbd_toe_entities, resolve_entities) | Cite `declared_gap.note` verbatim — a legacy / unresolvable citation, not a missing requirement |
| `citation_note` / `meta.citation_note` (informative) | The id is an illustrative example (`REQ-NNN`) or a non-requirement token (`CWE-`, `SHA-`) cited by the Manual — say so; it is not a requirement and not a gap |
| `selection.selected[]` (select) | The recommendation for the task — cite each item's `selection_trace` when asked *why* |
| `selection.out_of_scope_chapters` (select) | O que **nenhuma declaração activou**, por capítulo e por contagem, com `activate_with` copiável. **Não é «não aplicável»** — é não-perguntado: se o capítulo é relevante para a tarefa, re-chama com a declaração indicada. `SEM ACTIVADOR PUBLICADO` significa que o vocabulário não tem forma de o activar — diz-se, não se inventa |
| `selection.narrowed_out[]` (select) | Eligible-but-narrowed, grouped with reason — never treat as "not applicable"; re-call with the missing signal to recover a group |
| `completeness_report.selection` (prepare) | The same two-band summary behind the codegen context — `narrowed_out_ref` names the tool to inspect it |

#### Pattern for complex answers (threat model / security plan / checklist)

1. `consult_security_requirements(risk_level, concerns?)` — anchor active requirements & controls
2. `get_threat_landscape(risk_level, concerns?)` — relevant threats + mitigating controls
3. `get_guide_by_role(risk_level, role?, phase?)` — practices per role/phase
4. Generate document grounded on steps 1–3 — label each claim as manual-grounded

> **The MCP surfaces what the manual says — the LLM generates content.**
> Use CONSULT tools to retrieve artefact descriptions, required sections, and controls.
> Then generate the actual document, template, or checklist based on that grounded context.

> In governance, assessment, or planning tasks: **present the target artefact plan before
> modifying any files.**
>
> In implementation tasks: **obtain applicable secure implementation guidance before
> generating code** when security-relevant behaviour is involved.

### SETUP mode
Use when the user wants to configure their AI client to use SbD-ToE natively.

```
generate_sbd_toe_skill  ← no args: canonical skill/instructions content from sbd://toe/agent-guide
                           save to the appropriate file for the client:
                           Claude Code  → .claude/skills/sbd-toe.md
                           GitHub Copilot → .github/copilot-instructions.md
                           Cursor       → .cursorrules

generate_sbd_toe_skill(role, format, flavour)  ← per-role configuration (RF-S)
                           role=<canonical role or alias>  (devops-sre, developer, qa, appsec, …)
                           format=skill     → role-specialised guidance file
                           format=subagent  → installable agent definition (.claude/agents/sbd-<role>.md)
                             flavour=harnessed → grants mcp__sbd-toe__* (queries the manual live)
                             flavour=skilled   → embeds the frozen slice, no MCP tools (offline)
                           Use this to answer "configure yourself/this agent for role X".
                           Also exposed as resources sbd://toe/skill/{role} and sbd://toe/subagent/{role}.
```

---

## Epistemic standards

Always distinguish between:

| Label | Meaning |
|---|---|
| **manual-grounded** | Retrieved from SbD-ToE via MCP tool — cite chapterId or control ID |
| **observed** | Directly visible in the repository or codebase |
| **inferred** | Logical conclusion from observed or grounded facts — mark explicitly |
| **not verified** | Not confirmed — do not present as fact |

- Never present inferred statements as verified facts.
- Never mark controls as implemented unless directly verified in the codebase.
- When in doubt: prefer structured grounding over free-form answering; prefer "not verified"
  over guessing.

---

## Routing guide

### By SDLC phase

| Phase | Primary chapters |
|---|---|
| Requirements | 01, 02, 03 |
| Design | 03, 04 |
| Development | 05, 06 |
| CI/CD | 07 |
| Infrastructure | 08, 09 |
| Testing | 10 |
| Deploy | 11 |
| Operations | 12 |
| Governance / Onboarding | 13, 14 |

### By domain

| Domain / topic | Chapter(s) |
|---|---|
| Risk classification, application classification | 01 |
| Security requirements, acceptance criteria | 02 |
| Threat modelling, attack surface | 03 |
| Secure architecture, design patterns | 04 |
| Dependencies, SBOM, SCA, supply chain | 05 |
| Secure coding, code review | 06 |
| CI/CD pipeline security | 07 |
| IaC, infrastructure hardening | 08 |
| Containers, images, Kubernetes | 09 |
| SAST, DAST, penetration testing | 10 |
| Secure deploy, release gates | 11 |
| Monitoring, alerting, incident response | 12 |
| Training, onboarding, awareness | 13 |
| Governance, contracts, audits | 14 |

### By question type

| Question | Approach |
|---|---|
| "What is X?" / "How does Y work?" | `search_sbd_toe_manual` |
| "What applies to my project?" | `map_sbd_toe_applicability` → `get_sbd_toe_chapter_brief` |
| "What does chapter N cover?" | `get_sbd_toe_chapter_brief` |
| "List all chapters" | `list_sbd_toe_chapters` |
| "Find control / artefact / practice" | `query_sbd_toe_entities` |
| "What requirements apply at L1/L2/L3?" | `consult_security_requirements(risk_level)` |
| "Which requirements apply to THIS task / this change?" | `select_sbd_toe_requirements(risk_level, concerns=[…], exposure?, data_sensitivity?, technologies?, changed_files?)` — **declara** o que a tua leitura justifica (vocabulário: `sbd://toe/activation-vocabulary`); `selected[]` é a resposta ao declarado, `narrowed_out[]` diz o que ficou de fora e porquê. Sem declarações → `needs_input` (com candidatos a confirmar). O `task` é contexto registado, não motor. |
| "How do I PROVE these requirements?" | `get_sbd_toe_verification_matrix(risk_level, requirement_ids=[…os selected…])` — o fecho requisito → prova; ids sem EvidencePattern vêm declarados |
| "Where is the SOURCE of this requirement?" | `trace_sbd_toe_requirement_sources(requirement_ids)` — directas (autoria) vs cadeia compensada (cobertura, NÃO autoria; rótulo coverage_compensated); sem-fonte declarados |
| "Give me a compact id map of the catalogue by category" | `consult_security_requirements(risk_level, mode="index")` |
| "Which controls are active for auth / logging / …?" | `consult_security_requirements(risk_level, concerns=[…])` |
| "What threats apply to this project?" | `get_threat_landscape(risk_level)` |
| "What threats are relevant for auth / logging / …?" | `get_threat_landscape(risk_level, concerns=[…])` |
| "What should a developer / architect / … do?" | `get_guide_by_role(risk_level, role=…)` |
| "What practices apply in design / implement / …?" | `get_guide_by_role(risk_level, phase=…)` |
| "What roles exist in the manual?" | `resolve_entities(record_type="role")` |
| "List all controls in domain X" | `resolve_entities(record_type="control", filters={domain: X})` |
| "Generate a threat model / checklist / plan" | `get_threat_landscape` + `get_guide_by_role` → then generate content |
| "What artefacts does the manual require?" | `plan_sbd_toe_repo_governance` |
| "Governance plan for this repo" | `plan_sbd_toe_repo_governance` → generate plan from returned artefact list |
| "What to review given these changed files?" | `map_sbd_toe_review_scope` |
| "Set up SbD-ToE for this client / create a skill" | `generate_sbd_toe_skill` |
| "What server / manual / KG version is this?" | resource `sbd://toe/version`, or `read_sbd_toe_resource(uri="sbd://toe/version")` on clients without resources |
| "Client cannot read MCP resources" | `read_sbd_toe_resource(uri)` — verbatim mirror of any resource, templated URIs included |

---

## Resources

<!-- BEGIN GENERATED: resources -->
<!-- END GENERATED: resources -->

---

## Prompts

<!-- BEGIN GENERATED: prompts -->
<!-- END GENERATED: prompts -->

---

## Chapter reference

<!-- BEGIN GENERATED: chapters -->
<!-- END GENERATED: chapters -->

---

## Risk levels

<!-- BEGIN GENERATED: risk-levels -->
<!-- END GENERATED: risk-levels -->

---

## Identifier conventions

**Naming convention (0.15.0, declarada):** o nome canónico do parâmetro de nível é
`risk_level`; as tools mais antigas usam `riskLevel` — AMBOS são aceites em todas as
tools (alias aditivo, nunca renomeámos nada). Capítulos aceitam o id completo
(`08-iac-infraestrutura`) ou o número (`8`) em brief/checklist. Fases canónicas:
ver `knownPhases` do get_guide_by_role (alias aceite: `implement`→`develop`).

- **Requirements**: `<CAT>-NNN` (e.g. `AUT-001`) or the namespaced transversal form `REQ-<CAT>-NNN` (e.g. `REQ-AGN-001…004`, the AI-agent governance catalogue). Grammar (consumer contract v1.10 §1.18, fullmatch): `^(?:REQ-[A-Z]{3}-\d{3}|[A-Z]{3}-\d{3})$`. The category is the segment immediately before the number (`AGN`, never `REQ`). `REQ-AUT-003` is **not** an alias of `AUT-003`, and an `EX-` prefix marks an illustrative identifier that never resolves: legacy `REQ-<CAT>-NNN` citations of base requirements (or of non-existent categories such as `DAT`, `PRI`, `DOS`, `IAM`) resolve to a **declared gap** (`match: "declared_gap"` — «citação legada não resolvível (finding editorial em curso)»). Report it as such, never as "requirement does not exist".
- **Controls**: `CTRL-<domain>-<slug>-<hash>` (e.g. `CTRL-governance-arquitetura-segura-e-rastreavel-74562442c4`). There is **no** `CTRL-<chapter>-<number>` form.
- **Threats**: `MT-<number>` (e.g. `MT-001`)
- **Artefacts**: `ART-<…>` — use `get_sbd_toe_chapter_brief` to list a chapter's `artifact_ids`
- **Looking up by id:** pass the exact id to `query_sbd_toe_entities(query="<id>")` — it resolves the entity directly (`match: "exact_id"`). A guessed token like `"CTRL-06"` is **not** an id and falls back to semantic search. For structured filtering by type, use `resolve_entities(record_type, filters)`.
- Always cite identifiers when presenting manual-grounded answers
