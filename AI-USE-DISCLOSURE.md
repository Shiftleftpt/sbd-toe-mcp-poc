# AI-Assisted Authoring and Development — Disclosure

This document discloses the use of AI-assisted tools in the development of the
`sbd-toe-mcp-poc` repository (the SbD-ToE MCP server), in line with the
disclosure expectations of ACM, IEEE, SIGSOFT, Springer-Nature, and Elsevier
publishing policies, and the ICMJE recommendations on AI in scholarly
publishing.

The disclosure distinguishes between **development use** (AI as a coding and
authoring assistant during tool implementation) and **runtime use** (the tool
itself mediates LLM access to grounded knowledge content; that is the tool's
methodological substance, not an AI-content-generation event).

## Tools Used

| Tool | Provider | Used for |
|------|----------|----------|
| **Claude** (Opus 4.6, Opus 4.7, Opus 4.8, Sonnet 4.6, Fable 5, Opus 5) | Anthropic | Implementation pair-programming, README and documentation drafting, code review, refactoring, release-pipeline scripting, optimization planning |
| **Codex** | OpenAI | Initial code-generation drafts for selected modules during early development iterations |

## Development Use

AI tools were used to support the development of `sbd-toe-mcp-poc`, including:

- Implementation pair-programming for the MCP server and its exposed tools
- Drafting and structural revision of the README, CONTRIBUTING, and other
  repository documentation
- Code review, refactoring suggestions, and test scaffolding
- Build, release, and CI pipeline scripting
- The acceptance regression runner (`npm run eval:acceptance`, from 0.10.3): the
  scenario verdicts are computed by deterministic script against the live server —
  no language model takes part in producing a verdict

All AI outputs were reviewed, verified, and edited by the author before being
committed. Where AI suggestions were accepted, they passed human review against
correctness, security, licensing, and consistency with the upstream AppSec
Core research programme's frozen artefacts.

The author retains full responsibility for the design, the code, the bundled
data composition, the licensing model, and the operational behaviour of the
released software.

### Multi-Agent Persona Protocol (development workflow)

As of 2026-06-11, AI-assisted development across the SbD-ToE / AppSec Core
programme is organized under a named multi-agent persona protocol defined in the
programme-level `AGENTS.md` roster. Within this repository, the Claude-based
development assistant operates under the **Pontifex** persona — the keeper of the
consumption / MCP-serving layer — as specified by `AGENTS.md` at the repository
root, with a per-repository attestation gate preceding any modification.

Persona names (Pontifex here; sibling roles for the upstream compilation,
ontology, external-source, manual-authoring, scientific-authoring, and
cross-repository coordination workstreams) are **operational role labels that
scope and coordinate AI-assisted work across the programme's repositories. They
are not authorship attributions and confer no authorship.** The accountability
position stated in this disclosure is unchanged by the persona protocol: all AI
outputs remain subject to human review, and the human author retains full
responsibility for the released artefacts.

### What AI Was NOT Used For

AI was explicitly **not** used to:

- Generate or fabricate the bundled knowledge artefacts (the practitioner
  manual content, the AppSec Core v1 ontology, the normalized substrate, the
  knowledge-graph runtime). These are derived from the upstream
  `appsec-core-ontology-research` programme repositories under SHA-256-pinned
  releases of papers P1 (v0 ontology), P6 (v1 ontology), P7 (normalization
  DSR cycle), and P8 (Manual + KG joint compilation).
- Generate or invent SHA-256 hashes, DOIs, release tags, or any provenance
  identifier; all provenance references in the code and documentation are
  verified against the upstream programme. The served bundle is pinned in
  `consumed-bundle.json` to a named upstream release (from v0.10.2 / v0.20.0-beta.3: KG formal
  release `v1.6.0`, Manual `v1.7.0`) whose archive digest is verified against the
  upstream-published `.sha256` before it is materialised; the AI agent never
  edits the served data.
- Make security-relevant judgements about the SbD content the tool mediates.
- Replace human decisions on licensing, distribution, or release model.

## Runtime Use (Methodological)

The tool itself is a Model Context Protocol (MCP) server that mediates
large-language-model access to a curated, ontology-grounded knowledge surface.
This is the substance of the software, not an AI-content-generation event:

- The server **does not** itself invoke a language model. It returns retrieval
  results, structured citations, and grounded contexts to the client (Claude,
  GitHub Copilot, Cursor, Windsurf, Zed, or any other MCP-compatible client),
  which is the component that may then perform language-model inference.
- All retrieval outputs are citation-backed against the bundled manual + KG
  artefacts, themselves SHA-256-pinned to upstream programme releases.
- The `prepare_sbd_toe_codegen_context` tool (introduced in v0.9.0) assembles
  a deterministic grounded context for downstream code work but **does not**
  generate code; code generation remains the responsibility of the MCP client
  and its language model.

## Position Versus the P5 Apparatus Specification

The pre-registered companion study (Paper 5,
OSF DOI 10.17605/OSF.IO/KH8Y7) specifies a controlled experimental apparatus
for evaluating ontology-grounded retrieval against plain RAG and no-retrieval
baselines, with documented controlled and variable factors, token-budget
accounting, and instrumented logging. The `sbd-toe-mcp-poc` tool **is not**
that apparatus: the controlled RAG-access boundaries, token-budget
instrumentation, and experimental-factor decomposition described by P5 are
not implemented here. The released tool may serve as a starting base for that
apparatus implementation; that path is registered as future work.

## Authorship and Accountability

In line with **ICMJE**, **ACM**, **IEEE**, **Springer-Nature**, and
**Elsevier** policies on AI in scholarly publishing:

- **AI tools are not credited as authors** of this software, of its
  documentation, or of any paper presenting it.
- **AI tools do not bear authorship responsibility** for the released
  artefacts.
- **The author bears full responsibility** for the design, the implementation,
  the licensing, the data composition, and the operational claims made about
  the software.

## Compliance References

| Body | Policy / Statement |
|------|--------------------|
| ACM | [Authorship Policy on Generative AI](https://www.acm.org/publications/policies/new-acm-policy-on-authorship) (2023+) |
| IEEE | [Submission and Peer Review Policies on AI](https://journals.ieeeauthorcenter.ieee.org/become-an-ieee-journal-author/publishing-ethics/guidelines-and-policies/submission-and-peer-review-policies/) |
| Springer-Nature | [Editorial policies on AI](https://www.springernature.com/gp/editorial-policies/ai) |
| Elsevier | [Generative AI policies for journals](https://www.elsevier.com/about/policies-and-standards/the-use-of-generative-ai-and-ai-assisted-technologies-in-scientific-writing) |
| ICMJE | [Recommendations: AI in scholarly publishing](https://www.icmje.org/recommendations/) |
| SIGSOFT | Ralph et al. (2021), *ACM SIGSOFT Empirical Standards for Software Engineering Research*, arXiv:2010.03525 |

## Updates

This disclosure will be updated if:

- New AI tools are introduced into the development workflow
- The role of an AI tool materially changes
- The runtime behaviour or licensing of the released software materially changes
- Venue-specific disclosure requirements differ from this baseline

Last updated: 2026-08-30
