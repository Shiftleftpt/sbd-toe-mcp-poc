---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: human+auditor
target: sync
status: pending-evaluation
---

# Mission Brief — Distribuição Pública do sbd-toe MCP

## Contexto

O sbd-toe MCP está funcionalmente completo (s1–s9 closed, s10–s11 pendentes).
O objectivo deste epic é preparar o servidor para distribuição pública — instalação simples,
sem fricção, para qualquer utilizador independentemente do cliente MCP que usa.

---

## Objectivo

Tornar o sbd-toe MCP instalável e configurável pelo público em geral, com o menor número
de passos manuais possível, para os seguintes clientes:

- **Claude Desktop** (`claude_desktop_config.json`)
- **Claude Code** (`.mcp.json` / `claude mcp add`)
- **VS Code + GitHub Copilot** (`.vscode/mcp.json`)
- **Outros** (Cursor, Windsurf, Zed) — documentação suficiente para auto-configuração

---

## Níveis de solução identificados (por ordem de autonomia)

### Nível 1 — Documentação com snippets (baseline)
Docs com config snippets por cliente. Mínimo aceitável. Requer copy-paste manual.

### Nível 2 — npm publish + npx (obrigatório)
Remover `"private": true` do `package.json`, publicar no npm.
Config passa a ser portável e sem absolute paths:
```json
{ "command": "npx", "args": ["-y", "sbd-toe-mcp"] }
```
Pré-requisito para todos os níveis seguintes.

### Nível 3 — Smithery (diferenciador principal)
Registar em smithery.dev com `smithery.yaml`.
O Smithery resolve descoberta, documentação e geração de config num só sítio.
Guia o utilizador pelos env vars com formulário. One-click install.

### Nível 4 — Setup CLI interactivo (diferenciador avançado)
Subcomando `npx sbd-toe-mcp setup` que:
1. Detecta clientes instalados
2. Pergunta credenciais interactivamente
3. Escreve config no sítio certo por cliente
4. Corre smoke-test de confirmação

---

## Decisões de design em aberto — o sync deve avaliar

1. **Dados (snapshots):** o bundle actual é self-contained mas pesado.
   Para npm/npx faz sentido download on-first-run (`postinstall` ou lazy load).
   O sync deve decidir a estratégia antes de decompor em slices.

2. **Env vars:** simplificar ao mínimo obrigatório é crítico para reduzir atrito.
   Quais são verdadeiramente obrigatórias vs opcionais com defaults?

3. **Nome do package npm:** `sbd-toe-mcp` — verificar disponibilidade.

4. **Sequência:** Nível 2 é pré-requisito de Nível 3.
   Nível 4 é independente mas beneficia de Nível 2.

---

## Restrições

- s10 e s11 não precisam de estar closed para este epic começar — são independentes
- Não alterar a arquitectura do servidor (src/)
- Sem breaking changes nas tools MCP existentes
- O `examples/vscode.mcp.json` actual usa absolute paths — deve ser corrigido

---

## Pré-requisito: fecho do epic anterior

Antes de criar os slices do novo epic, o sync deve executar o seguinte processo
de fecho do epic em curso (`epic/improve_for_claude`):

1. **Confirmar que todos os slices do epic estão `closed`** — verificar `implementation_roadmap.json`
2. **Commit final** no branch do epic com tudo o que está pendente
3. **Tag de backup sem `v`** no branch actual antes do merge — ex: `epic-improve-for-claude-final`
   - Serve como ponto de restauro se algo correr mal no merge
4. **Checkout master** e merge do branch do epic
5. **Push do master**
6. **Tag `v*.*.*` no master** — ex: `v0.2.0` — isto dispara o GitHub release automaticamente
   - O workflow `.github/workflows/release.yml` valida que a tag está no master
   - Faz `npm run check`, `npm run build`, e publica o bundle como GitHub Release

**Nota sobre o workflow de release:**
- Trigger: `push: tags: v*.*.*` — apenas tags com prefixo `v` disparam o release
- Validação interna: tag tem de estar no master (`Verify tag is on master`) — se não estiver, o workflow falha
- O bundle gerado é self-contained com todos os snapshots incluídos

---

## Entregável esperado do sync

1. Avaliar se os 4 níveis fazem sentido ou se algum deve ser descartado/reordenado
2. Resolver as decisões de design em aberto
3. Decompor em slices sequenciais com acceptance criteria verificáveis
4. Registar no `implementation_roadmap.json`
