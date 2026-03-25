---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: integration-test
reasoning: Integration test scenarios for s6 GitHub Releases checkout with SSRF mitigation and security hardening
review_status: approved-by-tester
---

# s6 — Integration Test Plan: Checkout via GitHub Releases

Slice: **s6**  
Status: **ready-for-testing**  
Date: 2026-03-24

## Scope

Validates the `UPSTREAM_SOURCE=release` mode added in s6, the `UPSTREAM_SOURCE` config validation, and the security controls in `release-checkout.ts`.

---

## T1 — Default local checkout (regression)

**Purpose:** Confirm the existing `local` flow is unaffected.

**Steps:**

```bash
# Ensure UPSTREAM_SOURCE is not set (or set to 'local')
unset UPSTREAM_SOURCE
npm run checkout:backend
```

**Expected:** Exits 0. Local snapshot files are copied successfully. No error output.

---

## T2 — Release checkout with a non-existent tag

**Purpose:** Confirm that an invalid tag produces a clear, actionable error from the GitHub API layer.

**Steps:**

```bash
UPSTREAM_SOURCE=release UPSTREAM_RELEASE_TAG=tag-inexistente-xyz npm run checkout:backend
```

**Expected:** Exits non-zero. Stderr contains a message like `GitHub API respondeu 404`. No partial writes to `data/`.

---

## T3 — Invalid UPSTREAM_SOURCE value

**Purpose:** Confirm that an invalid enum value is rejected at config load time before any I/O.

**Steps:**

```bash
UPSTREAM_SOURCE=INVALID npm run checkout:backend
```

**Expected:** Exits non-zero. Stderr (or process error output) contains:

```
UPSTREAM_SOURCE deve ser 'local' ou 'release', recebido: 'INVALID'
```

---

## T4 — Manual code review of security controls

**Purpose:** Verify that hardcoded security constraints are present in source.

**Checklist (reviewer verifies in `src/bootstrap/release-checkout.ts`):**

- [ ] `HARDCODED_API_BASE` is defined as a `const` string literal — **not** derived from `process.env` or any config field.
- [ ] `assertSafeAssetUrl` is called before any download.
- [ ] `assertSafeDestPath` is called before every `copyFile` in the copy loop.
- [ ] `spawnSync` calls use `shell: false` and fixed argument arrays (no interpolation).
- [ ] Size limit (`upstreamReleaseMaxBytes`) is enforced during streaming, before the file is fully written.
- [ ] Temp directory is cleaned up in a `finally` block.

---

## T5 — Build and static checks

**Purpose:** CI gate parity.

**Steps:**

```bash
npm run check && npm run build
```

**Expected:** Both commands exit 0. No TypeScript errors. No lint errors.

---

## Notes

- T2 requires network access to `api.github.com`. Mark as "skipped" in offline environments and note manually.
- T4 is a manual review step and must be attested by the tester.
- T1 and T5 must always pass; they are blocking acceptance criteria.
