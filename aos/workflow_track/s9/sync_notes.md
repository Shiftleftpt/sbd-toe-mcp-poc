---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-26
purpose: governance-doc
produced_by: sync
target: tester
slice_id: s9
---

# Sync Notes — s9 (para Tester)

## Decisão de handover

Sync reviu o `executor_report.md`. ACs 1–6 com evidências satisfatórias. Handover ao tester aprovado.

## Pontos de atenção obrigatórios para o tester

### 🔴 Ponto 1 — Lógica de activação de `activatedBundles` para cap. 08 e 13

O brief s9 especificou IDs de capítulos incorrectos. O executor usou os IDs reais, mas a **lógica de activação foi herdada do brief e pode estar semanticamente errada**.

**Cap. 08:** O brief dizia `08-autenticacao-autorizacao` → activado por `api-gateway/spa/mobile`.
O capítulo real é `08-iac-infraestrutura` (IaC/Infra). Activar IaC para quem usa api-gateway ou spa é discutível — pode fazer sentido (ex: Terraform para deploy do gateway) mas não é obvio.

**Cap. 13:** O brief dizia `13-resposta-incidentes` → activado por `hasPersonalData: true`.
O capítulo real é `13-formacao-onboarding` (Formação/Onboarding). Activar Formação porque há dados pessoais **não faz sentido semântico**.

**O tester deve validar:**
- Input `{riskLevel: "L2", technologies: ["api-gateway"]}` → cap. `08-iac-infraestrutura` aparece em `domainBundles`? Faz sentido?
- Input `{riskLevel: "L2", hasPersonalData: true}` → cap. `13-formacao-onboarding` aparece em `operationalBundles`? Faz sentido?

Se o tester considerar que a lógica está semanticamente errada → **FAIL** em AC-2 → sync reabre para correcção.
Se considerar aceitável (IaC para infra de api-gateway tem alguma validade) → **PASS** com nota.

### ⚠️ Ponto 2 — `00-fundamentos` no index-compact

O executor adicionou `00-fundamentos` ao `sbd-toe-index-compact.json` (não estava no brief).
Não é bloqueante — verificar apenas se os 5 campos obrigatórios (`chapterId`, `readableTitle`, `domains`, `technologies`, `minLevel`) estão presentes nessa entrada.

### ✅ Ponto 3 — index-compact: criação de novo ficheiro é correcta

O tester não precisa de questionar a criação do novo ficheiro. O enriched index tem ~2700 records e campos curados (`domains`, `minLevel`) que não existem na fonte. O ficheiro estático é a abordagem correcta.
