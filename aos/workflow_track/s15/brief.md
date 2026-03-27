---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s15
review_status: approved-by-sync
---

# Brief — s15: npm publish CI (release.yml automation)

## Metadata

- **slice_id:** s15
- **produced_by:** sync
- **date:** 2026-03-27
- **target:** executor
- **depends_on:** s14 (closed)
- **epic:** Distribution

---

## Objective

Automatizar a publicação do package `sbd-toe-mcp` no npm como parte do workflow de release
existente (`.github/workflows/release.yml`). Quando uma tag `v*.*.*` é pushed no master,
o workflow já valida, testa e publica o bundle para GitHub Releases — adicionar um step
final de `npm publish`.

Também corrigir referências no `README.md` que ainda descrevem GitHub Releases como canal
principal de distribuição (executor s13 identificou esta inconsistência).

**Sem alterações em `src/`.** Sem alterações a testes existentes.

---

## Scope

### 15.1 — `.github/workflows/release.yml`

Adicionar dois elementos ao workflow existente:

**1. Configurar `registry-url` no step `Setup Node.js`** existente:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
    registry-url: https://registry.npmjs.org  # ← adicionar esta linha
```

**2. Adicionar step `Publish to npm`** após o step `Create or update release`:

```yaml
- name: Publish to npm
  # Requires NPM_TOKEN secret configured in GitHub repository settings:
  # Settings → Secrets and variables → Actions → New repository secret
  # Name: NPM_TOKEN  Value: npm access token with publish permission
  run: npm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Importante:** o step de publish deve ocorrer **depois** de `Create or update release`.
A sequência final dos steps deve ser:
1. Checkout
2. Setup Node.js (com `registry-url`)
3. Install dependencies
4. Validate tagged commit (`npm run check` + `npm run build`)
5. Verify tag is on master
6. Build release bundle
7. Create or update release
8. **Publish to npm** ← novo

### 15.2 — `README.md` — correcção de inconsistências

O README ainda referencia GitHub Releases como canal principal de distribuição.
Identificar e corrigir as referências desactualizadas:

- Substituir menções de "o canal principal de distribuição é GitHub Releases, não npm"
  por texto que menciona npm como canal principal e GitHub Releases como canal secundário
  (bundle self-contained para instalação sem internet)
- Não remover a secção de GitHub Releases — manter como alternativa documentada
- A secção "Quick Start — instalar via npm" (adicionada em s13) já está correcta

---

## Out of Scope

- Não criar conta npm nem publicar manualmente (o CI faz isso)
- Não alterar `src/`
- Não alterar testes existentes
- Não criar o `NPM_TOKEN` secret (responsabilidade do operador após este slice)

---

## Deliverable

| Ficheiro | Acção |
|---|---|
| `.github/workflows/release.yml` | modificar — adicionar `registry-url` e step `Publish to npm` |
| `README.md` | modificar — corrigir referências GitHub Releases vs npm |

---

## Acceptance Criteria

**AC-1: `registry-url` configurado no step Setup Node.js**
- `grep "registry-url" .github/workflows/release.yml` retorna `registry-url: https://registry.npmjs.org`

**AC-2: step `Publish to npm` presente após `Create or update release`**
- `grep -A 5 "Publish to npm" .github/workflows/release.yml` mostra `npm publish --access public`
- Step usa `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`
- Comentário presente a explicar como configurar o secret

**AC-3: sequência correcta no workflow**
- `Publish to npm` é o **último** step do job (ou pelo menos após `Create or update release`)
- Validar via leitura do YAML: o step de publish não precede `npm run check` nem `npm run build`

**AC-4: `release.yml` é YAML válido**
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml')); print('YAML válido')"`

**AC-5: README.md corrigido**
- README não contém afirmações de que GitHub Releases é o canal principal **em detrimento** do npm
- A secção Quick Start (npm) permanece intacta

**AC-6: qualidade**
- `npm run check` limpo
- `npm run build` limpo
- `npm run test` passa — 247 testes, zero regressões

---

## Validation

```bash
cd /Volumes/G-DRIVE/Shared/Manual-SbD-ToE/sbd-toe-mcp-poc

# 1. registry-url presente
grep "registry-url" .github/workflows/release.yml

# 2. step publish presente com NPM_TOKEN
grep -A 6 "Publish to npm" .github/workflows/release.yml

# 3. YAML válido
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml')); print('YAML válido')"

# 4. Qualidade
npm run check && npm run build && npm run test -- --reporter=verbose 2>&1 | tail -5
```

---

## Nota operacional para o operador (Pedro)

Após este slice estar closed e o código mergeado, para activar a publicação npm:

1. Criar um npm access token em https://www.npmjs.com/settings → Access Tokens → Generate New Token (type: Automation)
2. No repositório GitHub: Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: o token gerado no passo 1
3. Na próxima tag `v*.*.*` pushed para master, o workflow publicará automaticamente no npm

---

## Risks

| Risco | Mitigação |
|---|---|
| `NPM_TOKEN` não configurado → step falha silenciosamente | O step falhará com erro explícito "403 Forbidden" — o operador saberá que precisa de configurar o secret |
| Publicação accidental numa tag de teste | O workflow já valida que a tag está no master e que `npm run check` passa — gates suficientes |
| README tem mais referências desactualizadas além das identificadas | Executor lê o README completo antes de editar |
