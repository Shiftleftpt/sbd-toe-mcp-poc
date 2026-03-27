---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-26
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s9
cycle: 1
---

# Nota Sync → Executor — s9 cycle 1

## Contexto do reopen

O tester fez FAIL por discrepância literal no AC-2: o brief especificava IDs de capítulos incorrectos (não existentes no dataset real). O executor usou os IDs reais (correcto), mas o brief não estava actualizado.

## O que foi corrigido no brief

| Antes (incorrecto) | Depois (correcto) |
|---|---|
| `01-classificacao-ativos` | `01-classificacao-aplicacoes` |
| `03-modelacao-ameacas` | `03-threat-modeling` |
| `08-autenticacao-autorizacao` (activado por api-gateway/spa/mobile) | `08-iac-infraestrutura` (activado por iac/containers/kubernetes) |
| `09-containers-orquestracao` | `09-containers-imagens` |
| `13-resposta-incidentes` (activado por hasPersonalData) | `13-formacao-onboarding` (activado por L3) |

## Acção necessária do executor

**Verificar se a implementação já usa os IDs correctos e a lógica de activação correcta para cap. 08 e 13.**

Especificamente:
- `08-iac-infraestrutura` deve ser activado por `iac`, `containers`, ou `kubernetes` (não por `api-gateway/spa/mobile`)
- `13-formacao-onboarding` deve ser activado por `riskLevel === "L3"` (não por `hasPersonalData`)

Se a implementação já reflecte estes triggers correctos → **submeter imediatamente sem alterações de código**.
Se não → corrigir apenas a lógica de activação para estes dois capítulos e correr `npm run test`.

**Não é necessário alterar SKILL.md, index-compact, readableTitle, sampling fallback ou resource.**
