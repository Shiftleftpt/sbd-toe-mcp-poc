<!--
  AI-PREPARED SKELETON — pending human review by programme lead (Pedro Farinha).
  Created to satisfy PROGRAMME-PRESERVATION-PROTOCOL.md §5 (the file was absent).
  Per §8.2, fields that could not be verified from git + CITATION.cff are marked
  "TODO — verify". No SHA-256 hashes, DOIs, or tags were invented; commit short-
  hashes below are read directly from `git for-each-ref`. The mapping of release
  tags to paper-publication / freeze events is INFERRED and must be confirmed.
-->

# FREEZE REGISTRY — sbd-toe-mcp

**Repository:** SbD-ToE/sbd-toe-mcp — https://github.com/SbD-ToE/sbd-toe-mcp
  (formerly `Shiftleftpt/sbd-toe-mcp-poc`; relocated 2026-06)
**Part of programme:** SbD-ToE / AppSec Core (P0 DOI 10.17605/OSF.IO/7T849)
**Governed by:** PROGRAMME-PRESERVATION-PROTOCOL.md v1.0
**Last updated:** 2026-08-31
**Status:** skeleton — pending human verification

## Published states

The 2026-05-21 state is the one cited by the ICSME 2026 Tool Demonstration
(CITATION.cff `version: 0.9.0`, `date-released: 2026-05-21`). Two candidate tags
carry that date — confirm which is canonical.

| Tag | Commit | Date | Paper/event | DOI(s) | Archives |
|---|---|---|---|---|---|
| icsme-2026-tool-demonstration | 4156582 | 2026-05-21 | ICSME 2026 Tool Demo & Data Showcase | OSF 10.17605/OSF.IO/PGDR6 | figshare 10.6084/m9.figshare.32389887 (tool-bundle); B2SHARE 10.23728/b2share.2bgbn-k8044 (tool-bundle); figshare 10.6084/m9.figshare.32389878 (screencast); B2SHARE 10.23728/b2share.z5sgr-wkt02 (screencast) |
| v0.9.0 | 521f764 | 2026-05-21 | release line cited by CITATION.cff | see row above — TODO confirm same deposit | TODO — verify |

## Frozen states

| Tag | Commit | Date | Description | Freeze reason | Archives |
|---|---|---|---|---|---|
| v0.1.0-frozen | 880a07f | 2026-03-24 | earliest frozen snapshot | TODO — verify | TODO — verify |

## Protected tags

Per §3.2 the following are permanently immutable (no delete, no move, no
force-push). This lists the published/frozen/event tags; routine intermediate
release tags (`v0.2.x`–`v0.8.x`) are retained but their protection scope is
TODO — confirm with programme lead.

- v0.1.0-frozen
- icsme-2026-tool-demonstration
- v0.9.0
- v0.10.0
- v0.10.1 (packaging fix — see CHANGELOG)
- v0.10.2 → `31aa22af780d56f958b220258ffa82ca46f1d7c7` (2026-08-29; formal KG release v1.6.0
  pinned — see CHANGELOG; npm `@shiftleftpt/sbd-toe-mcp@0.10.2` = `latest`, gitHead same commit;
  GitHub Release `v0.10.2`)
- v0.10.3 → `06f8bbaa5e4d5f3ac6ddda890a6fbebd78f6be9b` (2026-08-30; formal KG release v1.6.1
  pinned — see CHANGELOG; npm `@shiftleftpt/sbd-toe-mcp@0.10.3` = `latest`, gitHead same commit;
  GitHub Release `v0.10.3`)
- v0.10.4 → `2937236d7521d72be140dbc4d9111dae211eb14b` (2026-08-30; formal KG release v1.7.0
  pinned — see CHANGELOG; npm `@shiftleftpt/sbd-toe-mcp@0.10.4` = `latest`, gitHead same commit;
  GitHub Release `v0.10.4`)
- v0.11.0 *(MP1 selection operation — see CHANGELOG; annotated tag to be created only after
  the 0.20 beta absorbs P2 (0.20.0-beta.6) and Pontifex verifies both lines, per the
  G-mp1a plan; no npm publish before that)*

### Beta line (`0.20.x-beta`) — NOT citable, NOT a freeze candidate

Prerelease tags on the `0.20-beta` branch (e.g. `v0.20.0-beta.0`) publish to the npm
`beta` dist-tag for engine R&D (the SPARQL graph-query capability, `trace_sbd_toe_graph`).
They are **experimental, non-citable, and explicitly excluded from the scientific record**
— no DOI, no freeze, no archival deposit. `CITATION.cff` and the published states above
track **only** the stable line. A beta graduates to the scientific record only by being
folded into a stable `vX.Y.Z` release (with canonical, upstream-ratified IRIs).

Prerelease tags issued on `0.20-beta` (annotated; immutable like every pushed tag, but
**not** protected/frozen states and never archived):

| Tag | Commit | Date | Served bundle | npm |
|---|---|---|---|---|
| v0.20.0-beta.1 | cf4f011 | 2026-06-29 | KG v1.5.0 (`feaa0155…`) | `beta` (superseded) |
| v0.20.0-beta.2 | 0cc9e14 | 2026-07-05 | KG v1.5.0 (`feaa0155…`) | `beta` (superseded) |
| v0.20.0-beta.3 | 5b34638 (`5b346387cdfd48146d64422c0e7a217d9b3f320f`; annotated tag object `48cdd14d`) | 2026-08-29 | formal KG `v1.6.0` (`baf5913b…`, contract v1.11, Manual v1.7.0) — same pin and content as stable v0.10.2 | `beta` (superseded) |
| v0.20.0-beta.4 | d89b30d (`d89b30dfacbc89c023ec53c1b5b882b77a9f86a9`; annotated tag object `6291f50d`) | 2026-08-30 | formal KG `v1.6.1` (`df6920cb…`, contract v1.12, Manual v1.7.1) — same pin and content as stable v0.10.3 | `beta` (superseded) |
| v0.20.0-beta.5 | 62a1eda (`62a1eda3982147e44369c8a9271ca3697af2680f`; annotated tag object `5165a04a`) | 2026-08-31 | formal KG `v1.7.0` (`29156b86…`, contract v1.14, ontology v2.2, Manual v1.7.1) — same pin and content as stable v0.10.4 | `beta` (superseded) |
| v0.20.0-beta.6 | 322c38f (`322c38f4dc440aad40bf110b8e20d3d40f623318`; annotated tag object `71098136`) | 2026-08-31 | formal KG `v1.7.0` + MP1 selection operation (= stable 0.11.0 → `102b8166`) | `beta` (superseded) |
| v0.20.0-beta.7 | 4256ee0 (`4256ee0f09386a45e69012ec565375965f49b0de`; annotated tag object `6e75ef23`) | 2026-08-31 | formal KG `v1.9.0` (`11153c85…`, contract v1.15, 273/29 FIL/PRI — zero-delta over the verified v1.8.0 dev-build) | `beta` (formal batch, «3 sims») |
| v0.20.0-beta.25 | 0c3060e (`0c3060e9d4e64fc9ad3c459d54831ba86719d015`) | 2026-09-06 | adenda ao beta.24: teoria do minLevel morta na GERAÇÃO do guia (sobrevivia na coluna «Presente desde» introduzida pela beta.24) + varredura do guia inteiro (10 afirmações que contradiziam o comportamento: «TWO bands», «L1 reduz o âmbito», doutrina pré-declarativa, tamanhos folclóricos, search sem a marca NÃO-NORMATIVO); guarda de 6→10 propriedades; bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.4, estável inalterada) |
| v0.20.0-beta.24 | 863ed99 (`863ed99bacb3797b9603ef387b4c736dd8ec40c1`) | 2026-09-06 | agent-guide GERADO do vocabulário e da superfície real (os «13 concerns» eram o supported_values do mapa de ameaças); `out_of_scope_chapters` dá ÂMBITO à promessa never-silent e a invariante de conservação varre o universo; higiene do `task` (resíduos + `task_context` canónico, alias mantido); bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.4, estável inalterada) |
| v0.20.0-beta.23 | e99a2cb (`e99a2cb2e09e33b25c8d3a42e959b3513f5f08f8`) | 2026-09-05 | CONSERVAÇÃO: invariante de conservação sobre o vocabulário todo (apanhou 12 violações em 4 famílias); motor cede à promessa por CATEGORIA (traço `declared_category`); `unsupported_concerns` em get_threat_landscape; guarda anti-zero cobre `technologies`; `provenance.server`; bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.4, estável inalterada) |
| v0.20.0-beta.22 | 6a695af (`6a695af9e0002e876ad5eb5163f578ea79073987`) | 2026-09-05 | «caminho para 9»: 7 itens da validação externa (guarda anti-zero como INVARIANTE, vocabulário como fonte única dos enums, traços em falta); bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.4, estável inalterada) |
| v0.20.0-beta.21 | 4155341 (`415534192f02defcb64f60b878df4252851e6957`) | 2026-09-05 | EXPERIÊNCIA «declarativo primeiro» (contrato de serviço v1.18-beta): selecção = f(declarado), sbd://toe/activation-vocabulary, needs_input, modos baseline/discover; bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.4, estável inalterada) |
| v0.20.0-beta.20 | bc10179 (`bc101795a0959dcece37e4d277c2e061a4a77b22`; annotated tag object `31d41684`) | 2026-09-04 | COMBINED: absorbs stable 0.19.3 + 0.19.4 (next-verbatim invariant extended to beta refs — 2 legend URIs fixed; per-detail requirement ceilings); bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.4 untouched) |
| v0.20.0-beta.19 | 084cb3f (`084cb3f801484550926b8565c53156124d277e0b`; annotated tag object `5c510d30`) | 2026-09-04 | absorbs stable 0.19.2 — next calibrated with destination limits + START HERE in descriptions; bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.2 untouched) |
| v0.20.0-beta.18 | 6289bb8 (`6289bb8b11478656438bfd612d59bff9f26d0f34`; annotated tag object `8fdb4b7a`) | 2026-09-04 | absorbs stable 0.19.1 — empty-selection alarm + declared-beats-lexical precedence; bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.1 untouched) |
| v0.20.0-beta.17 | 18cc23f (`18cc23fd7c872b5b1074f7ff303eb66cda67560c`; annotated tag object `440f602c`) | 2026-09-04 | absorbs stable 0.19.0 — selection stability to wording (basis declared/lexical, dominance warning, slots by index); bundle pin unchanged (KG `v1.11.0`) | `beta` (`latest` = 0.19.0 untouched) |
| v0.20.0-beta.16 | 791b412 (`791b4124ff1c7b1a412fb927d5cbbe79b6f525f3`; annotated tag object `a4dbc640`) | 2026-09-03 | absorbs stable 0.18.1 — formal batch: re-pin release KG `v1.11.0` (`b7444094…`, byte-identical to the dev-build; stamp "v1.11.0") | `beta` (`latest` = 0.18.1 untouched) |
| v0.20.0-beta.15 | 1bce819 (`1bce819ed42a603b1d37c8e9844e999b732c6fdc`; annotated tag object `4707ed4d`) | 2026-09-03 | absorbs stable 0.18.0 — re-pin dev-build kg-2026-09-03 (`e5c3581b…`, contract v1.17) + trace_sbd_toe_requirement_sources | `beta` (`latest` = 0.18.0 untouched) |
| v0.20.0-beta.14 | 5f30aaa (`5f30aaa814dc1a04a96660a92f597809f267885c`; annotated tag object `bafe13b4`) | 2026-09-02 | absorbs stable 0.17.0 — never-silent resolve filters + requirement→proof chain; bundle pin unchanged (KG `v1.10.0`) | `beta` (`latest` = 0.17.0 untouched) |
| v0.20.0-beta.13 | 0795d54 (`0795d54727841abad94089e41765cb5ac3ee537d`; annotated tag object `10239f57`) | 2026-09-02 | absorbs stable 0.16.1 — formal batch: re-pin release KG `v1.10.0` (`d8df472b…`, byte-identical to the dev-build; stamp "v1.10.0") | `beta` (`latest` = 0.16.1 untouched) |
| v0.20.0-beta.12 | 9c7c177 (`9c7c177cf0efe2d74a8a4675e8584748d866c4a5`; annotated tag object `d0b65cdd`) | 2026-09-02 | absorbs stable 0.16.0 — re-pin dev-build `kg-v1-manual-v1.8.0-aligned-2026-09-02` (`c832fd97…`, contract v1.16, joins served, stamp dev:<sha12>) | `beta` (`latest` = 0.16.0 untouched) |
| v0.20.0-beta.11 | df78dd2 (`df78dd2967190468a167156bf3ff72562130adc2`; annotated tag object `e607435c`) | 2026-09-02 | absorbs stable 0.15.1 (Desktop reverification closed on both lines); bundle pin unchanged (KG `v1.9.0`) | `beta` (`latest` = 0.15.1 untouched) |
| v0.20.0-beta.10 | acba784 (`acba78458cf43ed837602662213ee6187f80bc62`; annotated tag object `a5665f4a`) | 2026-09-02 | absorbs stable 0.15.0 (Desktop-audit cycle; line_note inverted for this line); bundle pin unchanged (KG `v1.9.0`) | `beta` (`latest` = 0.15.0 untouched) |
| v0.20.0-beta.9 | 3f035b2 (`3f035b213c75f245cc7c61735adda475efbab5c1`; annotated tag object `48d6a6f2`) | 2026-09-01 | absorbs stable 0.14.0 (graduated applicability) + Axis G scenarios (24/24 tools); bundle pin unchanged (KG `v1.9.0`) | `beta` (`latest` = 0.14.0 untouched) |
| v0.20.0-beta.8 | 4681fd2 (`4681fd2039c443e6628162bb822d083a1885504c`) | 2026-09-01 | absorbs stable 0.13.0 (`8a3a9a90` via cherry-pick `079bb35`): read_sbd_toe_resource + provenance.kg stamp + inspect pin provenance; bundle pin unchanged (KG `v1.9.0`) | `beta` |

## Current working state

**Current branch:** `0.20-beta` — this copy of the registry lives on the beta branch; the
stable-line rows mirror master (`102b816`, 0.11.0 prepared) and are maintained there.
**Beta line:** v0.20.0-beta.25 → `0c3060e9d4e64fc9ad3c459d54831ba86719d015` (2026-09-06; tag anotada nesta commit; npm registado ao fechar) fecha a adenda
ao ciclo beta.24: a teoria do minLevel (retirada em 0.14.0) sobrevivia na documentação-mãe e, depois
da beta.24, num bloco GERADO — a coluna «Presente desde» reintroduzia-a pela forma; morre
explicitamente, com a afirmação positiva («nenhum capítulo se exclui por nível») nos dois blocos.
A varredura do guia inteiro achou mais nove afirmações que contradiziam o comportamento actual,
incluindo «TWO bands» (são quatro desde 0.15.0), tamanhos de resposta com 30-45% de erro (agora
medidos e gerados) e o `search_sbd_toe_manual` apresentado sem a marca NÃO-NORMATIVO que a própria
tool declara. Guarda de suite de 6 para 10 propriedades.
Prior: v0.20.0-beta.24 → `863ed99bacb3797b9603ef387b4c736dd8ec40c1` (2026-09-06; `release.yml` run 33999753605 publicou npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.24` = `beta`, gitHead igual; GitHub pre-release;
`latest` = 0.19.4 intocado) tira da mão a última peça manual e dá âmbito à promessa: o agent-guide
passa a ser GERADO do vocabulário e da superfície MCP real (a tabela que publicava como
«ontology-controlled vocabulary» era, carácter a carácter, o `supported_values` do mapa de ameaças —
13 valores em vez de 24, e o seu complemento eram exactamente os 11 `unsupported_concerns` da
beta.23), com guarda de suite da família next-verbatim; a promessa «nunca em silêncio» passa a
declarar o seu ÂMBITO com `out_of_scope_chapters` (133 requisitos em 14 capítulos que desapareciam
sem uma linha, agora por contagem e com caminho de recuperação derivado, a 538 tokens contra os
3.689 que custaria listá-los); e a invariante de conservação deixa de varrer só a baseline.
Prior: v0.20.0-beta.23 → `e99a2cb2e09e33b25c8d3a42e959b3513f5f08f8` (2026-09-05; `release.yml` run 33990234962 publicou npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.23` = `beta`, gitHead igual; GitHub pre-release;
`latest` = 0.19.4 intocado) fecha a classe CONSERVAÇÃO: a invariante nova varre o vocabulário
todo (24 concerns × 3 níveis + exposure + data_sensitivity + technologies + paths) e exige que
tudo o que é PROMETIDO apareça nalguma banda — apanhou 12 violações em 4 famílias (`build`,
`supply_chain`, `release`, `deployment`), quando a sonda externa só tocava uma. O motor cede à
promessa publicada por categoria (traço próprio `declared_category`); efeito cirúrgico: 12 de 72
combinações mudam, 60 ficam idênticas e o ouro não se move em nenhum dos braços. `get_threat_landscape`
declara `unsupported_concerns` (11 de 24 devolviam zero mudo) e o agent-guide deixou de mandar afirmar
ausência fundamentada a partir de lista vazia; a guarda anti-zero cobre `technologies` e deixa de
descartar declarações com efeito; `provenance.server` torna cada resposta atribuível.
Prior: v0.20.0-beta.22 → `6a695af9e0002e876ad5eb5163f578ea79073987` (2026-09-05;
`release.yml` run 33980538378 publicou npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.22` = `beta`,
gitHead igual; GitHub pre-release; `latest` = 0.19.4 intocado) fecha os 7 itens da validação externa da linha declarativa: a guarda anti-zero passou a
INVARIANTE indexada à activação (192 combinações; apanhou 2 instâncias novas), o vocabulário passou a
fonte única dos `enum` das tools, e as activações que não deixavam rasto (stack, regra nomeada) passaram
a declará-lo. Prior: v0.20.0-beta.21 → `415534192f02defcb64f60b878df4252851e6957` (2026-09-05;
`release.yml` run 33963546721 publicou npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.21` = `beta`,
gitHead igual; GitHub pre-release; `latest` = 0.19.4 intocado) é a EXPERIÊNCIA «declarativo primeiro» autorizada pelo programme lead: a selecção passa
a responder ao que o chamador DECLARA (vocabulário publicado em `sbd://toe/activation-vocabulary`), a
ausência de declaração é `needs_input`, e o motor inferencial fica em `mode="discover"`. Contrato de
SERVIÇO v1.18-beta anunciado em `sbd://toe/version` (o pin do KG não muda). A linha ESTÁVEL mantém a
semântica anterior — nada se propaga sem números e decisão do lead. Prior: v0.20.0-beta.20 → `bc101795a0959dcece37e4d277c2e061a4a77b22` (2026-09-04;
`release.yml` run 33907019917 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.20` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.19.4) is a COMBINED wave absorbing stable 0.19.3 + 0.19.4: the next-verbatim invariant was
extended to this line's executable references (2 beta-only legend URIs fixed) and the per-detail
requirement ceilings landed (88-req case + taught-batch round-trip verified). Prior: v0.20.0-beta.19 → `084cb3f801484550926b8565c53156124d277e0b` (2026-09-04;
`release.yml` run 33896956237 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.19` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.19.2) absorbs stable 0.19.2 — next calibrated (top-3 by weight; matrix cap declared);
START HERE in the select/setup descriptions; beta-only next sweep clean (trace has no next[]).
Prior: v0.20.0-beta.18 → `6289bb8b11478656438bfd612d59bff9f26d0f34` (2026-09-04;
`release.yml` run 33890710115 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.18` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.19.1) absorbs stable 0.19.1 — the zero becomes an alarm (empty_selection_warning), R2 yields
only to explicit_concern (invariant selected∧narrowed=∅; replay-SES guard re-run); eval gate now
asserts package_version. Prior: v0.20.0-beta.17 → `18cc23fd7c872b5b1074f7ff303eb66cda67560c` (2026-09-04;
`release.yml` run 33863271967 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.17` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.19.0) absorbs stable 0.19.0 — basis declared|lexical on selection, lexical-dominance
warning, form-diet, slots by index; two-wordings case reproduced live; sentinel hard-gate adopted.
Prior: v0.20.0-beta.16 → `791b4124ff1c7b1a412fb927d5cbbe79b6f525f3` (2026-09-03;
`release.yml` run 33790707850 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.16` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.18.1) closes the formal batch on this line — `source: release` KG `v1.11.0` (sha256
`b7444094…`, contract v1.17), stamp transition to the tag verified live; TC-F-28 re-run on the
formal pin. Prior: v0.20.0-beta.15 → `1bce819ed42a603b1d37c8e9844e999b732c6fdc` (2026-09-03;
`release.yml` run 33787544447 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.15` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.18.0) absorbs stable 0.18.0 — station 3: requirement→source traceability served
(direct vs compensated); dev-build kg-2026-09-03 pinned (sha256 `e5c3581b…`, contract v1.17);
semantic-layer projection lens declared as an opportunity, not implemented. Prior: v0.20.0-beta.14 → `5f30aaa814dc1a04a96660a92f597809f267885c` (2026-09-02;
`release.yml` run 33675619715 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.14` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.17.0) absorbs stable 0.17.0 — never-silent filter-key validation on resolve_entities and the
requirement→proof chain; no beta-only surface accepts field filters (audited, declared). Prior: v0.20.0-beta.13 → `0795d54727841abad94089e41765cb5ac3ee537d` (2026-09-02;
`release.yml` run 33629570546 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.13` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.16.1) closes the formal batch on this line — `source: release` KG `v1.10.0` (sha256
`d8df472b…`, contract v1.16), stamp transition to the tag verified live. Prior: v0.20.0-beta.12 → `9c7c177cf0efe2d74a8a4675e8584748d866c4a5` (2026-09-02;
`release.yml` run 33626266819 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.12` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.16.0) absorbs stable 0.16.0 — the serving line re-pins the dev-build
`kg-v1-manual-v1.8.0-aligned-2026-09-02` (sha256 `c832fd97…`, contract v1.16 «data debt» served);
the v1.16 join fields are outside the RDF projection (declared). Prior: v0.20.0-beta.11 → `df78dd2967190468a167156bf3ff72562130adc2` (2026-09-02;
`release.yml` run 33619034393 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.11` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.15.1) absorbs stable 0.15.1 — the Desktop-audit reverification series closes on both lines
(tool_prefix placeholder, assess complete, maxItems 5 measured). Prior: v0.20.0-beta.10 → `acba78458cf43ed837602662213ee6187f80bc62` (2026-09-02;
`release.yml` run 33609792488 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.10` = `beta`,
gitHead same commit; GitHub pre-release; `latest` = 0.15.0) absorbs stable 0.15.0 — universal pagination, excluded_by_level band, derived
index-compact (static file deleted here too), harmonized errors; codegen-instructions line_note
inverted (the trace tool exists on this line). Prior: v0.20.0-beta.9 → `3f035b213c75f245cc7c61735adda475efbab5c1` (2026-09-01;
`release.yml` run 33448740512 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.9` = `beta`,
gitHead same commit; GitHub pre-release) absorbs stable 0.14.0 (graduated applicability — Author decision verbatim) and
closes Axis G (trace_sbd_toe_graph scenarios; 24/24 tools). Prior: v0.20.0-beta.8 → `4681fd20`
(absorbs 0.13.0; npm `beta` was 0.20.0-beta.8, gitHead confirmed; 727/727, gate E PASS, golden 10/10,
ceilings intact). Prior: v0.20.0-beta.7 → `4256ee0f09386a45e69012ec565375965f49b0de` (2026-08-31, formal batch
«3 sims»; `release.yml` run 33433883272 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.7` =
`beta`, gitHead same commit; GitHub pre-release; `latest` = 0.12.0, stable lane) serves the **formal KG `v1.9.0`** (sha256
`11153c85…`, contract v1.15, FIL/PRI 273/29); fixture-2 payload gates ratified + harmonised
(9,200/8,450). Prior: v0.20.0-beta.6 → `322c38f4` (KG v1.7.0 + MP1). Not a published/frozen state.
**Most recent published state:** icsme-2026-tool-demonstration / v0.9.0 (2026-05-21)
**Most recent release:** v0.10.4 (2026-08-30) — served bundle: formal KG release
`v1.7.0` (commit `894af32a85d6a50f648f10d8a643848e806e533e` = `mcp-stable`; asset sha256
`29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`; consumer contract
v1.14), ontology `sbdtoe-ontology-v2.2` (`2be86e8b`), Manual v1.7.1
(`8e03454c5137ded5a0a88ac2b91b1c4d6ee8fdac`). Tag `v0.10.4` = squash commit of the PR
introducing this row (recorded here once created). Prior: v0.10.3 (2026-08-30,
`06f8bbaa`, KG v1.6.1), v0.10.2 (2026-08-29, `31aa22af`, KG v1.6.0).
**Expected next freeze event:** none scheduled — the formal KG v1.9.0 batch is executing
(this beta.7; stable 0.12.0 on master). Prior tags: `v0.11.0` (`102b8166`),
`v0.20.0-beta.6` (`322c38f4`), cut 2026-08-31 after the side-by-side.

## Cross-references

This repository is referenced by:
- ICSME 2026 Tool Demonstration (see preferred-citation in CITATION.cff)

Programme papers cited by this tool (upstream, see CITATION.cff):
- P0 = 10.17605/OSF.IO/7T849 (programme prospectus / anchor)
- P1 = 10.17605/OSF.IO/WG8PV (AppSec Core v0 — Normalized Ontology)
- P5 = 10.17605/OSF.IO/KH8Y7 (MCP Instrument Specification — pre-registered)
- P6 = 10.17605/OSF.IO/U9CRD (AppSec Core v1 — Formalized Ontology)
- P7 = 10.17605/OSF.IO/3E8G5 (Pressure-Testing AppSec Core — DSR)
- P8 = 10.17605/OSF.IO/TXW8P (Coverage-Preserving Compilation v2)

This repository depends on (upstream, pinned in `consumed-bundle.json`, digest-verified):
- sbd-toe-knowledge-graph — formal release `v1.7.0` @ `894af32a85d6a50f648f10d8a643848e806e533e`
  (asset sha256 `29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`) since v0.10.4;
  `v1.6.1` @ `e9fc54f312829c632ecd50e2306bfa356e9e457c`
  (asset sha256 `df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b`) for v0.10.3;
  `v1.6.0` @ `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d` (sha256 `baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`) for v0.10.2;
  `v1.5.0` (sha256 `feaa0155b64d78fe529d805c6e17430fb3ce9fe1c5b5900eb6e267e2fa077294`) for v0.10.0/v0.10.1
- SbD-ToE/sbd-toe-manual — `v1.7.1` @ `8e03454c5137ded5a0a88ac2b91b1c4d6ee8fdac` (via the KG bundle) since v0.10.3;
  `v1.7.0` @ `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce` for v0.10.2
- SbD-ToE/sbd-toe-ontology — `sbdtoe-ontology-v2.2` @ `2be86e8b` (via the KG bundle, sync tag `corpus-v2-ontology-sync-2be86e8`) since v0.10.4; `ontology-v1.1-fair-baseline` @ `84fe8bf6f5de1443d778f9b2f0555b722540bbff` (AppSec Core anchor)
- appsec-core-ontology-research (programme papers P1/P6/P7/P8, see CITATION.cff)

## Violations / anomalies detected

Per Rule 8, flagged for human review (not remediated by the agent — Rule 9
prohibits tag deletion without explicit authorisation):

- A lightweight tag named **`list`** (commit 65c729a, 2026-03-30) appears to be
  an accidental artifact (e.g. from a mistyped `git tag list`). Recommend review
  and, if confirmed erroneous, document + remove per §3.2 with programme-lead
  authorisation. Do NOT delete without that authorisation.
- This registry was created 2026-06-25, well after the protocol's effective date
  (2026-04-17) and after the §8.1 four-week retroactive window. Class B per §9.2
  (reversible; no scientific damage if completed promptly).

- **Tag `v0.2.5` diverges between a local clone and origin** (observed 2026-08-29 while
  preparing v0.20.0-beta.3). `origin` `refs/tags/v0.2.5` → `8a479c81892e12a249279c772be313d7efffd777`
  (lightweight; «ci: remove NODE_AUTH_TOKEN from npm publish step», 2026-03-27 18:07:05Z; the
  GitHub Release `v0.2.5` was created at that instant on that commit). The local clone at
  `SecurityByDesign-TheoryOfEverything/sbd-toe-mcp-poc` carries `v0.2.5` →
  `318b8ee7e952c6e968a2836aa59223e778e62ec7` («chore: bump to 0.2.5», 18:07:36Z). The two
  commits are siblings (neither is an ancestor of the other; both reachable from master) and
  npm never published 0.2.5 (`npm view …@0.2.5` → 404). **Canonical = origin (`8a479c81`)** —
  the pushed tag and its GitHub Release are the published state (§3.2); the local ref is a
  stale pre-push variant. Per Rule 9 nothing was re-pointed; the only remediation, if the
  programme lead wants it, is refreshing the local ref in that clone
  (`git fetch origin --tags --force`), which touches no published state.

## Change log for this registry

| Date | Change | Author |
|---|---|---|
| 2026-06-25 | Initial skeleton created (file was absent). Populated from git tags + CITATION.cff; uncertain mappings marked TODO. | Claude (AI agent), under Pedro Farinha |
| 2026-08-29 | v0.10.2 registered (protected tag list, current working state, upstream pins with exact tags/hashes: KG v1.6.0, Manual v1.7.0, ontology v1.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-29 | v0.10.2 tag commit recorded (`31aa22af`, squash of #47); npm publish + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-29 | Beta-line copy (branch `0.20-beta`): prerelease-tag table (beta.1/beta.2/beta.3), beta current working state, `v0.2.5` local/origin divergence recorded (canonical = origin; nothing re-pointed). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-29 | v0.20.0-beta.3 tag commit recorded (`5b346387`); npm `beta` publish + GitHub pre-release confirmed (run 33266147054). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.3 registered (protected tag list, current working state, upstream pins: KG v1.6.1, Manual v1.7.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.3 tag commit recorded (`06f8bbaa`, squash of #51); npm publish + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.4 registered (protected tag list, current working state, upstream pins: KG v1.7.0, ontology v2.2, Manual v1.7.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | v0.10.4 tag commit recorded (`2937236d`, squash of #54); npm publish + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | v0.11.0 registered as pending (protected-tag list; tag gated on 0.20.0-beta.6 + two-line verification). Served bundle pins unchanged (KG v1.7.0). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | Beta-line copy: stable rows synced from master (v0.10.3, KG v1.6.1); v0.20.0-beta.4 registered in the prerelease table (tag on the commit introducing this row). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.20.0-beta.4 tag commit recorded (`d89b30df`, fix-forward over `272d8c9`); npm `beta` publish + GitHub pre-release confirmed (run 33282763025). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | Beta-line copy: stable rows synced from master (v0.10.4, KG v1.7.0); v0.20.0-beta.5 registered in the prerelease table (tag on the commit introducing this row). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | v0.20.0-beta.5 tag commit recorded (`62a1eda3`); npm `beta` publish + GitHub pre-release confirmed (run 33376552153). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | Beta-line copy: MP1 cycle absorbed (beta.6 prepared row; stable rows synced incl. 0.11.0 prepared). No published/frozen-state rows changed; no tag yet. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | v0.20.0-beta.6 tag commit recorded (`322c38f4`; npm `beta` confirmed; stable `v0.11.0` → `102b8166`). Dev-build `kg-v1-manual-v1.8.0-aligned-2026-08-31` pinned on the beta serving line (sha256 `ad0fc96c…`, contract v1.15, FIL/PRI). No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | Formal batch («3 sims»): v0.20.0-beta.7 registered — formal KG `v1.9.0` pinned (`source: release`, sha256 `11153c85…`); fixture-2 gates ratified + harmonised (9,200/8,450), deviations emptied. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | v0.20.0-beta.7 tag commit recorded (`4256ee0f`); npm `beta` publish + GitHub pre-release confirmed (run 33433883272). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-01 | v0.20.0-beta.8 tag commit recorded (`4681fd2` — absorbs stable 0.13.0 via cherry-pick `079bb35`: read_sbd_toe_resource + provenance.kg stamp + inspect pin provenance; no ceiling touched; pins unchanged KG v1.9.0); npm dist-tag `beta` + gitHead confirmed. Registry rows land in THIS follow-up: the close-chore registry step aborted on this file's layout and its commit message overstated — declared here. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-01 | v0.20.0-beta.9 registered (absorbs stable 0.14.0 graduated applicability; Axis G scenarios added in runner + governance doc, 24/24 tools; bundle pin unchanged KG v1.9.0). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-01 | v0.20.0-beta.9 tag commit recorded (`3f035b21`); npm `beta` publish + GitHub pre-release confirmed (run 33448740512). Governance catalogue committed in DevelopmentGovernance (Axis G filled; file was previously untracked there — declared). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.10 registered (absorbs stable 0.15.0; line_note inverted for the beta; static index-compact deleted on this line too; bundle pin unchanged KG v1.9.0). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.10 tag commit recorded (`acba7845`); npm `beta` publish + GitHub pre-release confirmed (run 33609792488). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.11 registered (absorbs stable 0.15.1; beta-only surfaces audited clean; bundle pin unchanged KG v1.9.0). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.11 tag commit recorded (`df78dd29`); npm `beta` publish + GitHub pre-release confirmed (run 33619034393). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.12 registered (absorbs stable 0.16.0; dev-build 2026-09-02 pinned, sha256 `c832fd97…`, contract v1.16; v1.16 join fields declared outside the RDF projection). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.12 tag commit recorded (`9c7c177c`); npm `beta` publish + GitHub pre-release confirmed (run 33626266819). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.13 registered (absorbs stable 0.16.1; formal re-pin release KG v1.10.0, sha256 `d8df472b…`, byte-identical to the dev-build; stamp "v1.10.0" verified). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.13 tag commit recorded (`0795d547`); npm `beta` publish + GitHub pre-release confirmed (run 33629570546). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.14 registered (absorbs stable 0.17.0; beta-only surfaces audited — no field filters to validate; bundle pin unchanged KG v1.10.0). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.20.0-beta.14 tag commit recorded (`5f30aaa8`); npm `beta` publish + GitHub pre-release confirmed (run 33675619715). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-03 | v0.20.0-beta.15 registered (absorbs stable 0.18.0; dev-build kg-2026-09-03 pinned, sha256 `e5c3581b…`, contract v1.17; 2 semantic surfaces as named packaging exceptions, npm pack --dry-run verified). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-03 | v0.20.0-beta.15 tag commit recorded (`1bce819e`); npm `beta` publish + GitHub pre-release confirmed (run 33787544447). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-03 | v0.20.0-beta.16 registered (absorbs stable 0.18.1; formal re-pin release KG v1.11.0, sha256 `b7444094…`, byte-identical to the dev-build; stamp "v1.11.0" verified). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-03 | v0.20.0-beta.16 tag commit recorded (`791b4124`); npm `beta` publish + GitHub pre-release confirmed (run 33790707850). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.20.0-beta.17 registered (absorbs stable 0.19.0; precondition completed by watching the in-flight v0.19.0 publish run before absorbing; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.20.0-beta.17 tag commit recorded (`18cc23fd`); npm `beta` publish + GitHub pre-release confirmed (run 33863271967). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.20.0-beta.18 registered (absorbs stable 0.19.1; V2/V4/replay-guard reproduced; agentic heuristics coherent under the new precedence — no divergence; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.20.0-beta.18 tag commit recorded (`6289bb8b`); npm `beta` publish + GitHub pre-release confirmed (run 33890710115). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.20.0-beta.19 registered (absorbs stable 0.19.2; beta-only next sweep declared clean; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.20.0-beta.19 tag commit recorded (`084cb3f8`); npm `beta` publish + GitHub pre-release confirmed (run 33896956237). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.20.0-beta.20 registered (COMBINED absorption of stable 0.19.3 + 0.19.4; beta invariant extension caught and fixed 2 legend URIs served without naming read_sbd_toe_resource; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.20.0-beta.20 tag commit recorded (`bc101795`); npm `beta` publish + GitHub pre-release confirmed (run 33907019917). | Claude Opus 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-05 | v0.20.0-beta.21 registered (experiência «declarativo primeiro»: contrato de serviço v1.18-beta, vocabulário de activação publicado, needs_input, modos baseline/discover; oráculo histórico 10/10 em discover + conjunto declarativo novo 6/4/0; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched; stable line unaffected. | Claude Opus 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-05 | v0.20.0-beta.21 tag commit recorded (`41553419`); npm `beta` publish + GitHub pre-release confirmed (run 33963546721). | Claude Opus 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-06 | v0.20.0-beta.25 registered (adenda beta.24: minLevel morta na geração + varredura do guia com 10 correcções; guarda 6→10; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched; stable line unaffected. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-06 | v0.20.0-beta.24 tag commit recorded (`863ed99b`); npm `beta` publish + GitHub pre-release confirmed (run 33999753605); gitHead = tag commit. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-06 | v0.20.0-beta.24 registered (agent-guide derivado + guarda de suite; out_of_scope_chapters e âmbito declarado da promessa; invariante de conservação estendida ao universo; higiene do `task` com `task_context` canónico; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched; stable line unaffected. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-05 | v0.20.0-beta.23 tag commit recorded (`e99a2cb2`); npm `beta` publish + GitHub pre-release confirmed (run 33990234962); gitHead = tag commit. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-05 | v0.20.0-beta.23 registered (CONSERVAÇÃO: invariante de conservação sobre o vocabulário completo — 12 violações apanhadas em 4 famílias; motor cede à promessa por categoria com traço `declared_category`; `unsupported_concerns` no threat landscape + agent-guide corrigido; guarda anti-zero cobre `technologies`; `provenance.server` em 20 sítios; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched; stable line unaffected. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-05 | v0.20.0-beta.22 registered («caminho para 9»: P1-A..E + P2-A; invariante anti-zero com 192 combinações; enum gerado do vocabulário nas 3 tools; bundle pin unchanged KG v1.11.0). Tag on the commit introducing this row. No frozen state touched; stable line unaffected. | Claude Opus 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-05 | v0.20.0-beta.22 tag commit recorded (`6a695af9`); npm `beta` publish + GitHub pre-release confirmed (run 33980538378). | Claude Opus 5 (Pontifex), authorised by Pedro Farinha |
