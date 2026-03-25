# MCP Usage Patterns & Agent Input/Output Scenarios

## Data Available in Indices

### Docs (3,268 records)
- **Base fields:** chapter_id, content, heading, section_id, related_entity_ids, related_roles, related_risk_levels
- **Enriched fields:** artifact_ids, canonical_control_ids, canonical_terms, aliases_pt_en, intent_topics
- **Metadata:** classification (chapter_summary, sec_detail, example, etc.), authority_level, confidence scores

### Entities (2,709 records)
- **Types:** practices, controls, mitigated_threats, roles, phases, domains, frameworks, themes (Txx)
- **Linkage:** chapter_id, related_phases, related_roles, risk_levels, authority_level
- **Structure:** Each entity indexed by entity_id with searchable_text for retrieval

---

## Real Agent Usage Patterns

### **Pattern 1: Architecture-to-Controls Mapping**
**Agent input:** Project architecture context  
**Question:** "We're building a Node.js MCP server, L2 risk, with GitHub Releases. What SbD-ToE chapters apply?"

**Query to indices:**
- Retrieve only `controls`, `practices`, `themes` where `related_roles` matches "developer" or "architect"
- Filter entities by `risk_levels` = ["L1", "L2"]
- Retrieve chapters where `chapter_id` in [01, 02, 05, 06, 07, 10, 11, 12, 14]
- Output: **Sorted by applicability**, with `artifact_ids` suggesting templates/examples

**Tool chain (s9 — Repo Guidance):**
```
generate_sbd_toe_guidance(
  projectName: "MCP-server-xyz",
  repoRole: "mcp-server",
  riskLevel: "L2",
  techStack: ["node.js", "typescript"],
  distributionModel: "github-release",
  hasCi: true,
  hasReleaseWorkflow: true
)

→ Returns: {
    chapterApplicability: [
      {chapterId: "01", title: "Classificação", reasoning: "defines L2 criticality"},
      {chapterId: "02", title: "Requisitos", reasoning: "base controls"},
      {chapterId: "05", title: "Dependências", reasoning: "you use package.json"},
      ...
    ],
    changeTriggers: [
      {path: "src/**", chapters: ["02", "06"]},
      {path: ".github/workflows/**", chapters: ["07", "10", "11"]},
      ...
    ]
  }
```

**Benefit to agent:** Agent can now embed SbD-ToE context into instructions without reinventing what applies.

---

### **Pattern 2: Diff-to-Chapters Reasoning**
**Agent input:** Git diff summary + file paths changed  
**Question:** "We modified src/config.ts, added .github/workflows/security.yml, and bumped package.json deps. What should we review?"

**Query to indices:**
- **Path detection rules** (hardcoded, non-configurable):
  - `src/config.ts` → [02-CFG, 02-SEC]
  - `.github/workflows/*.yml` → [07-CI, 10-TEST, 11-DEPLOY]
  - `package.json`, `*-lock.json` → [05-DEPS]
- **Enriched correlation:** For each chapter, pull `related_phases` (plan/dev/test/deploy) and `related_roles` (developer/reviewer/deployer)
- **Evidence mapping:** For each chapter, suggest what evidence to collect (SAST logs, test reports, SBOM, branch protection status)

**Tool chain (s10 — Review Scope):**
```
map_sbd_toe_review_scope(
  changedFiles: ["src/config.ts", ".github/workflows/security.yml", "package.json"],
  riskLevel: "L2",
  projectContext: {repoRole: "mcp-server", runtimeModel: "stdio"},
  diffSummary: "Config update + security workflow + npm audit results"
)

→ Returns: {
    chaptersToReview: [
      {chapterId: "02", reason: "config.ts touches CFG domain", themes: ["CFG-001", "CFG-004"]},
      {chapterId: "05", reason: "package.json dependency change", themes: ["DEP-001"]},
      {chapterId: "07", reason: ".github/workflows/* triggers CI review", themes: ["CI-002", "CI-005"]},
      {chapterId: "10", reason: "security workflow = SAST/scanning", themes: ["TEST-001"]},
    ],
    pathMapping: {
      "src/**": ["02", "06"],
      ".github/workflows/**": ["07", "10", "11"],
      "package.json": ["05"]
    },
    nextSteps: [
      "Run SAST on src/ changes",
      "Verify SCA checks in CI",
      "Check GitHub branch protection rules"
    ]
  }
```

**Benefit to agent:** Reviewers get targeted guidance. No more "check the whole manual" — instead, focus on specific chapters + evidence.

---

### **Pattern 3: Risk Profile to Governance Baseline**
**Agent input:** Repository profile (type, platform, risk, org context)  
**Question:** "We're setting up governance for a L3 regulated application on GitHub. What controls must we implement?"

**Query to indices:**
- Filter `controls` where `risk_levels` = ["L1", "L2", "L3"] (cumulative)
- Flag entities where `authority_level` = "mandatory" or "recommended"
- Cross-reference with `related_phases` to sequence (plan → dev → test → deploy)
- Lookup `artifact_ids` for templates/checklists in each chapter

**Tool chain (s11 — Governance Planning):**
```
plan_sbd_toe_repo_governance(
  repoType: "application",
  platform: "github",
  riskLevel: "L3",
  organizationContext: {
    scope: "regulated",
    team_size: 5,
    enforcement_level: "strict"
  }
)

→ Returns: {
    mandatoryControls: [
      {controlId: "SEC-01", title: "Secure configuration", chapter: "02", domains: ["CFG-001"]},
      {controlId: "CI-03", title: "Automated security checks", chapter: "07", domains: ["CI-002"]},
      {controlId: "SBOM-001", title: "Software Bill of Materials", chapter: "05", domains: ["DEP-001"]},
      ...
    ],
    baselineCheckpoints: [
      "Phase 1: Setup CI with SAST + SCA",
      "Phase 2: Implement branch protection",
      "Phase 3: Enable security scanning on PRs",
      "Phase 4: Establish release approval workflow"
    ],
    github_specific: {
      branch_protection: {
        required_status_checks: ["ci/sast", "ci/sca", "ci/test-coverage"],
        required_approvals: 2,
        enforce_admins: true
      },
      required_checks: ["npm run check", "npm run test", "npm run build"],
      security_features: ["enable-secret-scanning", "enable-dependabot"]
    },
    gaps: [
      {control: "MON-001", remediation: "Add operational monitoring", effort: "3d"}
    ]
  }
```

**Benefit to agent:** Instead of researching governance manually, get a **compliance roadmap** tailored to risk + platform + org context.

---

## Actionable Input/Output for Agents

### **For s9 (Repo Guidance):**

**INPUT Classification:**
```json
{
  "projectName": "string (1-100 chars, sanitized)",
  "repoRole": "enum (mcp-server|vscode-extension|application|library|ci-orchestrator|governance-tool)",
  "riskLevel": "enum (L1|L2|L3)",
  "runtimeModel": "enum (stdio|http-server|containerized|cli-tool|library)",
  "techStack": ["array of: node.js|typescript|python|java|go|rust|c#|other"],
  "distributionModel": "enum (local-only|github-release|npm-registry|docker-hub|public-registry)",
  "hasCi": "boolean",
  "hasReleaseWorkflow": "boolean",
  "hasRuntime": "boolean",
  "usesContainers": "boolean",
  "usesIaC": "boolean",
  "hasOperationalMonitoring": "boolean"
}
```

**OUTPUT Structure:**
```json
{
  "classification": {
    "riskEstimate": "L1|L2|L3",
    "exposure": "E=1 stdio|E=2 http|E=3 public",
    "dataExposure": "D=1 local|D=2 internal|D=3 public",
    "impact": "I=1 advisory|I=2 availability|I=3 integrity"
  },
  "chapterApplicability": [
    {
      "chapterId": "01",
      "title": "Classificação de Criticidade",
      "applicability": "active|conditional|excluded",
      "motivation": "text explaining why"
    }
  ],
  "changeTriggers": [
    {
      "pattern": "glob (src/**, *.py, etc.)",
      "chapters": ["02", "06"],
      "reason": "Development code touches security domain"
    }
  ],
  "expectedEvidence": [
    {
      "chapter": "06",
      "evidence": "SAST scan results",
      "tool": "CodeQL|eslint|pylint",
      "frequency": "per-commit|per-release"
    }
  ],
  "likelyExceptions": [
    {
      "chapter": "11",
      "reason": "Local-only distribution does not require formal release governance",
      "formal_waiver_needed": false
    }
  ],
  "copilotInstructionsOutline": "text (markdown bullet points for agent skill)"
}
```

---

### **For s10 (Review Scope):**

**INPUT Classification:**
```json
{
  "changedFiles": ["src/index.ts", ".github/workflows/test.yml"],
  "riskLevel": "L1|L2|L3",
  "projectContext": {
    "repoRole": "mcp-server|...",
    "runtimeModel": "stdio|...",
    "distributionModel": "github-release|...",
    "hasCi": true
  },
  "diffSummary": "optional text"
}
```

**OUTPUT Structure:**
```json
{
  "chaptersToReview": [
    {
      "chapterId": "06",
      "title": "Desenvolvimento Seguro",
      "applicability": "primary|secondary",
      "themes": ["DEV-001", "DEV-004"],
      "reason": "src/ changes require security code review",
      "evidence": ["SAST results", "code review checklist"]
    }
  ],
  "pathMapping": [
    {"pattern": "src/**", "chapters": ["02", "06"], "reason": "development code"},
    {"pattern": ".github/workflows/**", "chapters": ["07", "10", "11"], "reason": "CI/CD"}
  ],
  "expectedEvidence": [
    {
      "chapter": "06",
      "checklist": ["SAST scan clean", "no hardcoded secrets", "types validated"]
    }
  ],
  "nextSteps": [
    "Review SAST logs for src/index.ts",
    "Validate GitHub Actions permissions in .github/workflows/test.yml",
    "Check if new env vars require disclosure"
  ]
}
```

---

### **For s11 (Governance Planning):**

**INPUT Classification:**
```json
{
  "repoType": "mcp-server|vscode-extension|application|library|ci-orchestrator|governance-tool",
  "platform": "github|gitlab",
  "riskLevel": "L1|L2|L3",
  "organizationContext": {
    "scope": "solo|team|regulated",
    "teamSize": "number",
    "enforceLevel": "lenient|standard|strict"
  }
}
```

**OUTPUT Structure:**
```json
{
  "classification": {
    "riskProfile": "L1|L2|L3",
    "recommendedControlDensity": "minimal|moderate|comprehensive"
  },
  "applicableControls": [
    {
      "controlId": "SEC-01",
      "title": "Secure Configuration",
      "chapter": "02",
      "domain": "CFG-001",
      "mandatory": true,
      "evidence": "Config validation in CI"
    }
  ],
  "mandatoryControls": ["SEC-01", "CI-003", "DEP-001"],
  "recommendedControls": ["MON-001", "GO-002"],
  "baselineCheckpoints": [
    {
      "phase": 1,
      "name": "CI Foundation",
      "tasks": ["Setup SAST", "Enable SCA", "Create security policy"]
    }
  ],
  "evidenceChecklist": [
    "Branch protection rules",
    "Required status checks",
    "SBOM generation",
    "Test coverage ≥80%",
    "No hardcoded secrets"
  ],
  "gaps": [
    {
      "control": "MON-001",
      "title": "Operational Monitoring",
      "remediation": "Add structured logging + alerting",
      "effort_days": 5
    }
  ],
  "platformSpecific": {
    "github": {
      "branchProtection": {
        "requireStatusChecks": ["ci/sast", "ci/sca"],
        "requireApprovals": 2
      },
      "securityFeatures": ["enable-secret-scanning"]
    }
  }
}
```

---

## Real-World Agent Scenarios

### **Scenario 1: New CI/CD Setup**
**Agent:** DevOps engineer setting up GitHub Actions  
**Input to s10:** `changedFiles: [".github/workflows/ci.yml", ".github/workflows/security.yml"]`  
**Output:** "You should review Ch. 07 (CI), 10 (Testing), 11 (Deploy)"  
**Agent decision:** "Add SAST step, SCA checks, and branch protection rules from Ch. 07 template"

### **Scenario 2: Dependency Upgrade**
**Agent:** Dependency manager bot reviewing npm update  
**Input to s10:** `changedFiles: ["package-lock.json"]`, `diffSummary: "25 packages updated, 0 critical CVEs"`  
**Output:** "Review Ch. 05 (Dependências) + Ch. 10 (Tests)"  
**Agent decision:** "Run SCA, verify SBOM, check license compatibility"

### **Scenario 3: Project Onboarding**
**Agent:** Copilot assisting new team member  
**Input to s9:** `{projectName: "my-app", repoRole: "application", riskLevel: "L2", runtimeModel: "containerized", ...}`  
**Output:** "This project applies Ch. 01, 02, 04, 06, 07, 10, 11, 12, 14. Here's what you must know..."  
**Agent decision:** "Inject SbD-ToE knowledge into .instructions.md for this repo"

### **Scenario 4: Release Validation**
**Agent:** Tester before production deployment  
**Input to s11:** `{repoType: "application", platform: "github", riskLevel: "L3", scope: "regulated"}`  
**Output:** "Mandatory controls: SEC-01, CI-03, DEP-001. Checkpoint: Do you have SBOM + signed commits?"  
**Agent decision:** "Block release if SBOM missing; require security sign-off"

---

## Implementation Priority for s9–s11

**High-value agents will use these patterns if:**
1. Input validation is **strict** (allowlists, no external control of URLs)
2. Output is **deterministic** (same input = same output)
3. Integration with **existing tools** (s4/s5 infrastructure) is clear
4. **Evidence trails** are explicit (not "because I said so")

**Start with s9:** Repo Guidance unlocks context for downstream tools (s10, s11).
