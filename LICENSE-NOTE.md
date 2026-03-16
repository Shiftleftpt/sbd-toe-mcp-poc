# Licenciamento e reutilização

Este repositório usa **split licensing** para separar claramente o código do servidor MCP do conteúdo documental e dos snapshots embutidos.

## 1. Licenças aplicadas

- **Código, runtime, prompts e automação técnica**  
  `Apache License 2.0`  
  Ver: `LICENSE`

- **Documentação pública do repositório e snapshots/índices embutidos**  
  `Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)`  
  Ver: `LICENSE-DATA`

## 2. Como interpretar esta divisão

Por defeito, aplica-se:

### Apache-2.0

- `src/`
- `scripts/`
- `prompts/`
- `examples/`
- `.github/`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `.env.example`

### CC BY-SA 4.0

- `README.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
- `GITHUB-CONFIG.md`
- `docs/`
- `data/publish/`
- `data/reports/`

Se um ficheiro futuro trouxer uma licença ou cabeçalho explícito diferente, essa indicação específica prevalece para esse ficheiro.

## 3. Sobre os snapshots embutidos

Os ficheiros em `data/publish/` e os metadados de proveniência associados em `data/reports/` são redistribuídos neste repositório como parte intencional do produto.

Esses artefactos:

- são consumidos por este servidor MCP em runtime
- são publicados no release bundle do projeto
- pertencem ao ecossistema SbD-ToE e devem preservar atribuição quando redistribuídos

## 4. Atribuição recomendada para documentação e snapshots

Ao redistribuir documentação do repositório, snapshots embutidos ou derivações desses materiais, incluir atribuição adequada e referência à licença CC BY-SA 4.0.

Modelo sugerido:

> Baseado em materiais do ecossistema SbD-ToE e no projeto `sbd-toe-mcp-poc`, distribuídos sob CC BY-SA 4.0.

Quando a redistribuição disser respeito aos snapshots derivados do manual SbD-ToE, preservar também a referência ao manual canónico `Security by Design - Theory of Everything (SbD-ToE)` e ao release/repositório de origem.

## 5. O que isto não altera

Esta nota resume a intenção de licenciamento do projeto, mas os textos vinculativos continuam a ser:

- `LICENSE`
- `LICENSE-DATA`
