---
version: "1.0"
date: "2026-03-27"
risk-level: "L2"
control: "CTRL-SUPPLY-002"
status: "active"
---

# Política de SBOM — sbd-toe-mcp

Define o processo de geração, publicação e manutenção do Software Bill of Materials (SBOM) para o pacote `@shiftleftpt/sbd-toe-mcp`.

---

## Objetivo

Manter rastreabilidade completa dos componentes incluídos em cada artefacto de release, em conformidade com o controlo CTRL-SUPPLY-002 (L2 — recomendado) e o Cap. 05 do Manual SbD-ToE.

---

## Estado Atual

| Item | Estado |
|---|---|
| SBOM gerado em releases | ❌ Em falta |
| Dependency scanning (Dependabot) | ✅ Activo |
| `npm audit` em CI | ✅ Activo |

---

## Formato

- **CycloneDX JSON** (`cyclonedx-npm`) — formato preferido para interoperabilidade
- Alternativa: **SPDX JSON** (`@spdx/spdx-tools`) se integração com ferramentas externas o exigir

---

## Processo de Geração

### Automatizado (a implementar em `release.yml`)

Adicionar `@cyclonedx/cyclonedx-npm` como devDependency versionada:

```bash
npm install --save-dev @cyclonedx/cyclonedx-npm
```

Snippet para `release.yml` (integrar no job existente, após o build):

```yaml
- name: Generate SBOM
  run: npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.cdx.json

- name: Upload SBOM to release
  uses: softprops/action-gh-release@v2
  with:
    files: sbom.cdx.json
    name: sbd-toe-mcp-${{ github.ref_name }}-sbom.cdx.json
```

O SBOM deve ser gerado **após o build** e **antes da publicação** no GitHub Release.

### Manual (interim até automação)

```bash
npm install
npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.cdx.json
```

---

## Publicação

O SBOM é publicado como asset no GitHub Release com o nome:
```
sbd-toe-mcp-<version>-sbom.cdx.json
```

Exemplo: `sbd-toe-mcp-0.3.0-sbom.cdx.json`

---

## Frequência

- **Por release:** gerado e publicado em cada tag `v*.*.*`
- **Auditoria trimestral:** comparar SBOM da última release com estado atual de `package-lock.json`

---

## Responsabilidade

O owner do workflow de release (`@pedrofarinhaatshiftleftpt`) é responsável por verificar que o SBOM está presente antes de publicar o release.

---

## Referências

- [CycloneDX npm plugin](https://github.com/CycloneDX/cyclonedx-node-npm)
- Manual SbD-ToE — Cap. 05: Dependências, SBOM e SCA
- [`docs/SecurityByDesign/controlos-l2.md`](controlos-l2.md) — CTRL-SUPPLY-002
