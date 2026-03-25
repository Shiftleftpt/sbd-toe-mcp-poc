---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: documentation
reasoning: Template created to establish governance pattern for AI-assisted documents in the SbD-ToE MCP project
review_status: approved-by-sync
---

# AI-Assisted Documentation Template

## Purpose

This document serves as a template and reference guide for AI-assisted documents in the **sbd-toe-mcp-poc** repository.

All documentation that is generated, co-authored, or significantly modified with the assistance of Large Language Models (LLMs) **must include an explicit AI disclosure** in the document header.

**Regulatory Context:** SbD-ToE Cap. 14 (Governança, Revisões e Conformidade, Tema T20) requires:
- ✅ Explicit disclosure of AI-assisted content
- ✅ Mandatory human review before merge
- ✅ Automatic validation in CI/CD pipeline
- ✅ PR template checkbox for reviewer acknowledgment

---

## Disclosure Format

### Option 1: YAML Frontmatter (Recommended)

Place at the very beginning of your Markdown or code file:

```yaml
---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: governance-doc
reasoning: Document created to clarify governance requirements
review_status: pending-human-review
---

# Your Document Title

Content starts here...
```

**Fields:**
- `ai_assisted` (boolean, **required**): Must be `true` for AI-assisted content
- `model` (string, **required**): Model/tool used (e.g., "Claude Haiku 4.5", "Claude 3.5 Sonnet")
- `date` (string, **required**): Creation/modification date in `YYYY-MM-DD` format
- `purpose` (string, **required**): One of:
  - `generated-code` — LLM-generated source code
  - `governance-doc` — Policy, process, or governance documents
  - `test-plan` — Test specifications or test case descriptions
  - `integration-test` — Test execution scripts or integration scenarios
  - `documentation` — User guides, API docs, technical specs
  - `other` — Anything else; use sparingly and document reasoning
- `reasoning` (string, optional): Brief explanation of why the content was AI-generated
- `review_status` (string, optional): Status of human review (e.g., "pending-human-review", "approved-by-sync")

### Option 2: HTML Comment Section

Alternative format using an HTML comment at the document start:

```html
<!-- AI-ASSISTED: true, MODEL: Claude Haiku 4.5, DATE: 2026-03-24, PURPOSE: test-plan -->

# Your Document Title

Content starts here...
```

This format is useful for files where YAML frontmatter is not appropriate.

---

## Examples by Purpose

### Example 1: Governance Document

```yaml
---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: governance-doc
reasoning: Document establishes AI disclosure requirements and validation process
review_status: approved-by-sync
---

# S8 — AI-Assisted Governance Brief

This brief outlines the requirements for AI disclosure...
```

### Example 2: Generated Code

```typescript
---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: generated-code
reasoning: Validator function generated from specification
review_status: pending-human-review
---

export function validateAIDisclosure(content: string): AIDisclosure {
  // Generated code summary...
  const disclosure = extractDisclosure(content);
  // ... rest of implementation
}
```

### Example 3: Integration Test Plan

```yaml
---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: integration-test
reasoning: Test scenarios generated from acceptance criteria
review_status: approved-by-tester
---

## Integration Test Plan — s8

### Surefire Scenarios
1. **Disclosure Validation**
   - Input: File with valid YAML frontmatter
   - Output: Parser extracts disclosure correctly
   - Assert: All required fields present

2. **Missing Fields**
   - Input: YAML with AI_ASSISTED but no MODEL
   - Output: Validator rejects with specific error
   - Assert: Error message includes "MODEL is required"
```

---

## Validation Process

### Local Validation

Before committing, validate your file locally:

```bash
# From project root
node scripts/validate-ai-disclosure.mjs

# With check mode (exit 1 if failures)
node scripts/validate-ai-disclosure.mjs --check
```

### CI/CD Validation

The validation script is automatically run as part of `npm run check`:

```bash
npm run check
```

**Failure Modes:**
- ❌ Missing disclosure header → CI fails (exit code 1)
- ❌ Invalid DATE format → CI fails with specific error message
- ❌ PURPOSE not in allowlist → CI fails with list of allowed values
- ❌ Required field empty → CI fails naming the field

### PR Review Checkpoint

All pull requests **must include a human review checkpoint**:

1. When opening a PR with AI-assisted content:
   - [ ] **Governance:** All AI-assisted documents in this PR are reviewed and disclosed

2. Reviewer validates:
   - ✅ Disclosure headers are present and valid
   - ✅ MODEL correctly identifies the LLM used
   - ✅ DATE is recent (matches work timeline)
   - ✅ PURPOSE accurately describes the content type
   - ✅ REASONING (if provided) is clear and justified

---

## Files Subject to Disclosure Requirement

The following directories are **monitored and require AI disclosure** if modified:

1. **aos/** — AOS (Agile Orchestration System) lifecycle documents
   - Implementation roadmaps, slice briefs, coordination records

2. **docs/requests/** — Feature and enhancement requests
   - Implementation plans, test plans, integration test scenarios

3. **docs/governors/** — Governance and policy documents
   - AI disclosure templates, validation guidelines

4. **.github/skills/** — Copilot skills and agent procedures
   - Skill definitions, execution procedures, SbD-ToE mappings

---

## Common Questions

### Q: Do I need disclosure for human-authored content?
**A:** No. Disclosure is required **only** if an LLM contributed substantially to the content. Minor edits or suggestions by humans do not require disclosure.

### Q: What if I use multiple LLMs?
**A:** List the primary model in the `MODEL` field. If multiple major models were used, note this in the `REASONING` field:
```yaml
model: Claude Haiku 4.5 (primary) + GitHub Copilot
reasoning: Primary architecture by Claude; code refinements by Copilot; human review and integration
```

### Q: Can I have a document with no AI content?
**A:** Yes. Simply omit the disclosure header entirely. Files without a disclosure header are treated as human-authored.

### Q: What if the disclosure is wrong after merge?
**A:** Update the file in a follow-up PR:
1. Correct the disclosure fields (especially `date`, `model`, `review_status`)
2. Ensure the updated file still passes `npm run check`
3. Get human review as normal

### Q: Is this disclosure shared publicly?
**A:** Yes. Disclosure headers are visible in the published repository and serve as transparency for users, contributors, and auditors. They demonstrate the project's commitment to AI governance (SbD-ToE Cap. 14).

---

## References

- **SbD-ToE Manual:** Chapter 14 — Governança, Revisões e Conformidade (T20 — AI Governance)
- **Validation Script:** `scripts/validate-ai-disclosure.mjs`
- **Validator Module:** `src/validators/ai-disclosure.ts`
- **Project Role:** Refer to `docs/role.md` for governance context
- **Copilot Instructions:** `.github/copilot-instructions.md` (Section: "Sobre output gerado por IA")

---

## Support

For questions or clarifications on AI disclosure requirements:

1. Check `CONTRIBUTING.md` — "AI-Assisted Contributions" section
2. Review existing disclosed documents in `aos/` for patterns
3. Open an issue with the `governance` label
4. Contact the sync coordinator for your slice

---

**Last Updated:** 2026-03-24  
**Maintained By:** SbD-ToE MCP Governance (s8 — Executor)  
**Status:** Active (All monitored files must comply)
