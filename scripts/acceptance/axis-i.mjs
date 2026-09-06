/**
 * Axis I — LEITURAS: medição das outras leituras do Manual contra o oráculo do lead.
 *
 * Oráculo: DevelopmentGovernance/docs/golden-reading-cases.md — **v1 RATIFICADO
 * 2026-09-06 («adjudico»), sem emendas**. O .md é canónico e é do programme lead: este
 * módulo TRANSCREVE as perguntas e os must-have/must-NOT para execução e **nunca os
 * ajusta ao comportamento observado**. Regra herdada do Eixo H.
 *
 * Porque existe: os 10 casos do Eixo H medem UMA leitura (GUIDE — «que requisitos se
 * aplicam a esta tarefa») e medem-na bem. As outras leituras (IMPL, CROSS-CHECK, PROGRAMA,
 * PAPEL/MOMENTO, CONSULT, SETUP) nunca foram medidas — e é por isso que onze ciclos de
 * melhoria não moveram o Eixo H: melhoraram tudo menos a selecção por tarefa.
 *
 * Veredicto por caso (método confirmado pelo lead na ratificação):
 *   SERVIDO      — há caminho E a resposta traz as peças que a leitura exige.
 *   SERVIDO-MAL  — há caminho, mas faltam peças; ou só se lá chega por superfície
 *                  NÃO-NORMATIVA; ou o que falta NÃO é declarado.
 *   NÃO SERVIDO  — não há caminho.
 * A evolução mede-se por MIGRAÇÃO DE ESTADO, não por percentagem.
 *
 * Axis I é MEDIÇÃO: nunca entra no gate de promoção (como o H; o gate é o Axis E).
 */

export const ORACLE_VERSION = "v1 (ratificado 2026-09-06, «adjudico», sem emendas)";
export const ORACLE_PATH = "DevelopmentGovernance/docs/golden-reading-cases.md";

const SERVIDO = "SERVIDO";
const SERVIDO_MAL = "SERVIDO-MAL";
const NAO_SERVIDO = "NÃO SERVIDO";

/** Uma peça do must-have: encontrada, e por que caminho. */
const piece = (name, found, evidence, opts = {}) => ({
  name,
  found: Boolean(found),
  evidence: String(evidence ?? ""),
  nonNormative: Boolean(opts.nonNormative),
  declared: opts.declared === undefined ? null : Boolean(opts.declared),
});

/**
 * Classificação — CRITÉRIO v1.1 (emenda do lead, 2026-09-06: «sigo recomendação»).
 *
 * «Há caminho» passa a exigir caminho para a **PEÇA CENTRAL** da leitura. Com o critério
 * original (qualquer caminho conta) quase nada seria NÃO SERVIDO e a escala deixava de
 * discriminar — o GR-03 provou-o ao dar SERVIDO-MAL com 1 de 6 peças.
 *
 * Peça central por caso, ratificada com a emenda: GR-01 = os KPIs/medida de capacidade ·
 * GR-02 = o PLAYBOOK · GR-03 = a sequência/programa (MP1-5) · GR-04 = o que o papel faz
 * naquele momento · GR-05 = a resposta de conhecimento atravessada · GR-06 = o arranque
 * configurável. Uma peça servida só por superfície NÃO-NORMATIVA nunca conta como servida.
 */
/**
 * EMENDA v1.2, regra 1 — CONSERVAÇÃO NA BANDA. O que o bundle tem para o âmbito perguntado
 * aparece na banda, OU é declarado com CAMINHO CONCRETO para onde está. Banda anunciada e
 * vazia, havendo conteúdo no bundle e SEM caminho concreto ⇒ SERVIDO-MAL, mesmo com todas
 * as peças presentes. Verificável mecanicamente; não pede juízo editorial.
 */
function bandViolations(probe) {
  return (probe.bands ?? []).filter((b) => b.announced && b.empty && b.bundleHasContent && !b.concretePath);
}

function classify({ pieces, mustNotViolations, bands }, centralPiece) {
  const central = pieces.find((p) => p.name === centralPiece);
  if (central === undefined) return NAO_SERVIDO;
  if (!central.found || central.nonNormative) return NAO_SERVIDO;
  const missing = pieces.filter((p) => !p.found || p.nonNormative);
  const bandFails = bandViolations({ bands });
  if (missing.length === 0 && mustNotViolations.length === 0 && bandFails.length === 0) return SERVIDO;
  return SERVIDO_MAL;
}

export const readingCases = [
  {
    id: "GR-01",
    /** Peça CENTRAL (emenda v1.1 do oráculo) — sem caminho para ela, é NÃO SERVIDO. */
    centralPiece: "KPIs/métricas DO CAPÍTULO",
    reading: "IMPL",
    title: "pôr de pé um capítulo (capacidade organizacional)",
    question:
      "A organização quer implementar o cap. 07 (CI/CD seguro). O que precisa de ter, como sabe que está capaz, e como mede?",
    async probe(client) {
      const used = [];
      const notes = [];
      const checklist = await client.tool("get_sbd_toe_chapter_implementation_checklist", { chapter: "07-cicd-seguro" });
      used.push("get_sbd_toe_chapter_implementation_checklist");
      const items = checklist.ok ? (checklist.data?.data?.items ?? checklist.data?.items ?? []) : [];
      /**
       * O brief pede `chapterId`, não `chapter` — a 1ª versão desta sonda chamava-o com o
       * nome errado e lia `artifact_ids` em vez de `artifacts`, o que deu «0 artefactos» na
       * baseline. Defeito da MEDIÇÃO: o brief serve 29 artefactos para o cap. 07.
       */
      const brief = await client.tool("get_sbd_toe_chapter_brief", { chapterId: "07-cicd-seguro" });
      used.push("get_sbd_toe_chapter_brief");
      const briefData = brief.ok ? (brief.data?.data ?? brief.data ?? {}) : {};
      // KPIs por capítulo: existe caminho NORMATIVO, com thresholds por nível?
      const cap = await client.tool("get_sbd_toe_chapter_capability", { chapter: "07-cicd-seguro", risk_level: "L2" });
      used.push("get_sbd_toe_chapter_capability");
      const capData = cap.ok ? cap.data ?? {} : {};
      const measures = capData.measures ?? [];
      const kpiPath = measures.length > 0 && measures.every((m) => m.thresholds_by_level !== undefined);
      // papéis e momento
      const roles = await client.tool("get_guide_by_role", { risk_level: "L2", phase: "build" });
      used.push("get_guide_by_role");
      const roleData = roles.ok ? (roles.data?.data ?? roles.data ?? {}) : {};
      // ligação ao cap. 14
      const gov = await client.tool("select_sbd_toe_requirements", {
        risk_level: "L2",
        chapters: ["14-governanca-contratacao"],
        detail: "minimal",
        limit: 200,
      });
      used.push("select_sbd_toe_requirements");
      const pieces = [
        piece("checklist de implementação do capítulo", items.length > 0, `${items.length} itens de checklist`),
        piece(
          "KPIs/métricas DO CAPÍTULO",
          kpiPath,
          kpiPath
            ? `get_sbd_toe_chapter_capability: ${measures.length} KPIs com thresholds por nível`
            : "sem caminho para pedir KPIs por capítulo"
        ),
        piece(
          "artefactos que a capacidade exige",
          (Array.isArray(briefData.artifacts) && briefData.artifacts.length > 0) || (capData.artifacts?.total ?? 0) > 0,
          `${(briefData.artifacts ?? []).length} no brief · ${capData.artifacts?.total ?? 0} na vista IMPL`
        ),
        piece(
          "papéis envolvidos e momento no ciclo",
          (roleData.assignments ?? []).length > 0 || Object.keys(roleData.role_summary ?? {}).length > 0,
          `${(roleData.assignments ?? []).length} atribuições na fase`
        ),
        piece(
          "ligação ao cap. 14 (governação/excepção)",
          gov.ok && (gov.data?.selection?.selected ?? []).length > 0,
          `${(gov.data?.selection?.selected ?? []).length} requisitos GOV alcançáveis`
        ),
      ];
      // must-NOT: devolver a lista de requisitos técnicos como se fosse a resposta
      const mustNotViolations = [];
      if (items.length === 0 && (gov.data?.selection?.selected ?? []).length > 0)
        notes.push("sem checklist, a única resposta disponível seria a lista de requisitos (must-NOT do caso)");
      const scarcity = checklist.ok ? (checklist.data?.data ?? checklist.data ?? {}).scarcity : undefined;
      if (scarcity) notes.push(`ESCASSEZ DECLARADA (v1.2 regra 2): ${scarcity.items} bloco(s) — achado de CONTEÚDO, sobe ao Author`);
      else if (items.length > 0 && items.length <= 3) notes.push("checklist MAGRO e NÃO declarado (v1.2 regra 2)");
      return { path: checklist.ok, pieces, mustNotViolations, used, notes };
    },
  },
  {
    id: "GR-02",
    /** Peça CENTRAL (emenda v1.1 do oráculo) — sem caminho para ela, é NÃO SERVIDO. */
    centralPiece: "playbook: mapa artigo→capítulo→acção",
    reading: "CROSS-CHECK/PLAYBOOK",
    title: "usar uma norma com o Manual (DORA)",
    question: "Somos entidade financeira sujeita a DORA. Como é que o SbD-ToE nos serve?",
    async probe(client) {
      const used = [];
      const notes = [];
      const overlay = await client.tool("map_sbd_toe_regulatory_activation", { framework: "DORA" });
      used.push("map_sbd_toe_regulatory_activation");
      const od = overlay.ok ? (overlay.data?.data ?? overlay.data ?? {}) : {};
      // 0.20.0-beta.33: existe caminho NORMATIVO — a sonda usa-o, como um agente usaria.
      const idx = await client.tool("get_sbd_toe_playbook", { framework: "DORA" });
      used.push("get_sbd_toe_playbook");
      const normative = idx.ok ? (idx.data?.normative_playbooks ?? []) : [];
      const pbId = normative.find((p) => p.playbook_kind === "implementation_playbook")?.playbook_id;
      const pb = pbId ? await client.tool("get_sbd_toe_playbook", { playbook_id: pbId, limit: 40 }) : { ok: false };
      const sections = pb.ok ? (pb.data?.sections ?? []) : [];
      const allText = JSON.stringify(sections).toLowerCase();
      const search = await client.tool("search_sbd_toe_manual", { query: "DORA playbook cross-check fases marcos" });
      used.push("search_sbd_toe_manual");
      const searchHit = search.ok && JSON.stringify(search.data ?? {}).toLowerCase().includes("dora");
      const pieces = [
        piece(
          "playbook: mapa artigo→capítulo→acção",
          normative.length > 0 && sections.length > 0,
          normative.length > 0
            ? `get_sbd_toe_playbook (NORMATIVO): ${normative.length} playbooks, ${pb.ok ? pb.data.coverage.total : 0} secções`
            : searchHit
              ? "só via search_sbd_toe_manual"
              : "não encontrado",
          { nonNormative: normative.length === 0 && searchHit }
        ),
        piece(
          "as 6 fases com marcos (M0-M2 … M12-M18)",
          /\bm0\b|\bm1\b|fase\s*\d|marco/.test(allText),
          sections.length > 0 ? "nas secções do playbook servido" : "sem caminho"
        ),
        piece(
          "checklist de leitura",
          /checklist/.test(allText),
          sections.length > 0 ? "nas secções do playbook servido" : "sem caminho próprio"
        ),
        piece(
          "delimitação honesta (manual vs overlay/compliance)",
          Boolean(idx.ok && String(idx.data?.delimitation ?? "").length > 50) || Boolean(od.unsupported_obligations) || (od.activated ?? []).length > 0,
          (od.activated ?? []).length > 0 ? `${(od.activated ?? []).length} áreas activadas` : "sem áreas"
        ),
        piece(
          "princípio declarado (cobre base AppSec; conformidade exige formalização)",
          Boolean(idx.ok && /não é uma norma|conformidade final depende/i.test(String(idx.data?.delimitation ?? ""))),
          "delimitação servida em toda a resposta da superfície de playbooks"
        ),
      ];
      const mustNotViolations = [];
      if ((od.activated ?? []).length > 0 && !od.unsupported_obligations)
        notes.push("a resposta disponível é contagem de obrigações activadas — o must-NOT do caso");
      // variante negativa
      const pci = await client.tool("map_sbd_toe_regulatory_activation", { framework: "PCI-DSS" });
      used.push("map_sbd_toe_regulatory_activation(PCI-DSS)");
      const pciDeclared = !pci.ok || Boolean((pci.data?.data ?? pci.data ?? {}).unsupported_obligations);
      notes.push(
        pciDeclared
          ? "variante negativa (PCI-DSS): o servidor recusa/declara em vez de improvisar ✓"
          : "variante negativa (PCI-DSS): responde sem declarar que o cross-check não existe ✗"
      );
      return { path: overlay.ok || idx.ok, pieces, mustNotViolations, used, notes };
    },
  },
  {
    id: "GR-03",
    /** Peça CENTRAL (emenda v1.1 do oráculo) — sem caminho para ela, é NÃO SERVIDO. */
    centralPiece: "macro-processos MP1–MP5 como dados",
    reading: "PROGRAMA",
    title: "implementar SbD de raiz",
    question: "Organização de ~200 pessoas, sem programa de segurança aplicacional. Por onde começamos e com que sequência?",
    async probe(client) {
      const used = [];
      const notes = [];
      /**
       * 0.20.0-beta.37: os MP1–MP5 deixaram de ser prosa e passaram a dados; a sonda usa a
       * superfície processual, como um agente usaria. A verificação de que são ENTIDADES
       * mantém-se — foi ela que apanhou o falso positivo da beta.33 (o regex casava com o
       * título de um chunk).
       */
      const prog = await client.tool("get_sbd_toe_macro_processes", {});
      used.push("get_sbd_toe_macro_processes");
      const p = prog.ok ? prog.data ?? {} : {};
      const mps = p.macro_processes ?? [];
      const levels = p.adoption_order?.levels ?? [];
      const cla = await client.tool("select_sbd_toe_requirements", {
        risk_level: "L1",
        chapters: ["01-classificacao-aplicacoes"],
        detail: "minimal",
        limit: 50,
      });
      used.push("select_sbd_toe_requirements");
      const gov = await client.tool("select_sbd_toe_requirements", {
        risk_level: "L2",
        chapters: ["14-governanca-contratacao"],
        detail: "minimal",
        limit: 200,
      });
      // travessia longitudinal: há MP que atravessa o cap. 14 E outros capítulos?
      const longitudinal = mps.filter((m) => (m.traverses_bundles ?? []).includes("14-governanca-contratacao"));
      const pieces = [
        piece(
          "macro-processos MP1–MP5 como dados",
          mps.length === 5 && levels.length > 0,
          mps.length === 5 ? `${mps.length} macro-processos publicados, ordem em ${levels.length} níveis` : "sem sequência publicada"
        ),
        piece(
          "travessia longitudinal (cap. 14: governo em operação E pôr o programa de pé)",
          longitudinal.length > 0 && (gov.data?.selection?.selected ?? []).length > 0,
          `${longitudinal.length} MP atravessam o cap. 14; ${(gov.data?.selection?.selected ?? []).length} requisitos GOV alcançáveis`
        ),
        piece(
          "ordem/fases do programa",
          levels.length > 0 && Boolean(p.adoption_order?.rule),
          `ordem publicada em ${levels.length} níveis, com a regra declarada`
        ),
        piece(
          "o que é pré-requisito de quê",
          (p.prerequisites?.total ?? 0) > 0,
          `${p.prerequisites?.total ?? 0} pares dependency, com o artefacto consumido; ${p.feedback_loops?.total ?? 0} feedback DECLARADAS fora da ordem`
        ),
        piece(
          "papéis a criar",
          (p.roles_involved?.values ?? []).length > 0,
          `${(p.roles_involved?.values ?? []).length} papéis nomeados pelos MP (dono + participantes)`
        ),
        piece(
          "ligação à classificação (cap. 01) como primeiro passo",
          (cla.data?.selection?.selected ?? []).length > 0 && String(p.adoption_order?.first_step ?? "") === "MP-01",
          `primeiro passo publicado: ${p.adoption_order?.first_step ?? "—"}; ${(cla.data?.selection?.selected ?? []).length} requisitos CLA`
        ),
      ];
      const mustNotViolations = [];
      // must-NOT: devolver os 273 requisitos, ou um capítulo isolado como se fosse o programa
      const payload = JSON.stringify(p);
      const reqIds = (payload.match(/[A-Z]{3}-\d{3}/g) ?? []).length;
      if (reqIds > 60) mustNotViolations.push(`a vista de programa devolve ${reqIds} ids de requisito — é a leitura GUIDE, não a PROGRAMA`);
      if (mps.length === 1) mustNotViolations.push("devolve um único agregado como se fosse o programa");
      if (p.declared_limits?.no_programme_entity) notes.push("limite DECLARADO: não existe entidade «programa» (recusa de curadoria ratificada)");
      if (p.declared_limits?.sdlc_phase_traversal) notes.push("lacuna DECLARADA: travessia MP↔fase do SDLC é parcial e não publicada");
      if (p.adoption_order?.excluded_from_order) notes.push(`ordem = só dependency; ${p.adoption_order.excluded_from_order.count} feedback excluídas por definição`);
      return { path: prog.ok, pieces, mustNotViolations, used, notes };
    },
  },
  {
    id: "GR-04",
    /** Peça CENTRAL (emenda v1.1 do oráculo) — sem caminho para ela, é NÃO SERVIDO. */
    centralPiece: "user stories aplicáveis ao papel",
    reading: "PAPEL/MOMENTO",
    title: "o que faço eu, agora",
    question:
      "Sou Product Owner, início de sprint, equipa a construir uma feature de exportação de dados. O que tenho de garantir?",
    async probe(client) {
      const used = [];
      const notes = [];
      const po = await client.tool("get_guide_by_role", { risk_level: "L2", role: "product-owner", include_detail: true });
      used.push("get_guide_by_role");
      const d = po.ok ? (po.data?.data ?? po.data ?? {}) : {};
      const assignments = d.assignments ?? [];
      const checklist = d.role_checklist ?? [];
      const withPhase = assignments.filter((a) => a.canonical_phase ?? a.phase).length;
      const otherRoles = assignments.filter((a) => (a.canonical_role ?? a.role) && (a.canonical_role ?? a.role) !== d.canonicalRole);
      const ids = checklist.map((x) => x.user_story_id ?? x.id).filter(Boolean);
      const pieces = [
        piece("user stories aplicáveis ao papel", checklist.length > 0 || assignments.length > 0, `${checklist.length} histórias / ${assignments.length} atribuições`),
        piece("o momento no ciclo", withPhase > 0, `${withPhase} atribuições com fase`),
        piece(
          // O Manual NÃO publica uma taxonomia decide-vs-delega. Publica `proportionality`:
          // prosa autorada que nomeia quem valida/aprova ao nível. Servi-la é honesto;
          // contá-la como a peça pedida seria ajustar a medida ao trabalho feito.
          "o que o PO decide vs o que delega",
          false,
          `não publicado como dado — o bundle tem \`proportionality\` (${assignments.filter((a) => a.proportionality).length}/${assignments.length} atribuições, prosa que nomeia quem valida) e NENHUMA taxonomia de decisão. ACHADO DE CONTEÚDO, não de serving.`
        ),
        piece(
          "a evidência que fica",
          checklist.some((x) => JSON.stringify(x).toLowerCase().includes("dod") || JSON.stringify(x).toLowerCase().includes("evid")),
          "DoD/evidência nas histórias"
        ),
      ];
      const mustNotViolations = [];
      if (otherRoles.length > 0) mustNotViolations.push(`${otherRoles.length} atribuições de OUTROS papéis na resposta`);
      if (ids.length !== new Set(ids).size) mustNotViolations.push("contagens inflacionadas por histórias duplicadas");
      if (d.meta?.assignmentCount !== undefined && d.meta?.distinctUserStoryCount !== undefined)
        notes.push(`denominadores declarados: ${d.meta.assignmentCount} atribuições / ${d.meta.distinctUserStoryCount} histórias`);
      return { path: po.ok, pieces, mustNotViolations, used, notes };
    },
  },
  {
    id: "GR-05",
    /** Peça CENTRAL (emenda v1.1 do oráculo) — sem caminho para ela, é NÃO SERVIDO. */
    centralPiece: "requisitos",
    reading: "CONSULT",
    title: "o que o Manual diz sobre X (sem tarefa)",
    question: "O que é que o SbD-ToE diz sobre gestão de segredos?",
    async probe(client) {
      const used = [];
      const notes = [];
      /**
       * 0.20.0-beta.35: a leitura de CONHECIMENTO tem superfície própria e NÃO exige nível —
       * a sonda passa a fazer a pergunta como o oráculo a escreve: sem tarefa, sem projecto
       * e SEM risk_level.
       */
      const topic = await client.tool("explain_sbd_toe_topic", { concern: "secrets" });
      used.push("explain_sbd_toe_topic");
      const t = topic.ok ? topic.data ?? {} : {};
      const consult = await client.tool("consult_security_requirements", { risk_level: "L2", concerns: ["secrets"] });
      used.push("consult_security_requirements");
      const cd = consult.ok ? (consult.data?.data ?? consult.data ?? {}) : {};
      const threats = await client.tool("get_threat_landscape", { risk_level: "L2", concerns: ["secrets"] });
      used.push("get_threat_landscape");
      const anti = await client.tool("query_sbd_toe_entities", { query: "antipadrão segredos" });
      used.push("query_sbd_toe_entities");
      const antiFound = anti.ok && /antipattern|antipadr/i.test(JSON.stringify(anti.data ?? {}));
      const matrix = await client.tool("get_sbd_toe_verification_matrix", { risk_level: "L2" });
      used.push("get_sbd_toe_verification_matrix");
      const guide = await client.tool("get_guide_by_role", { risk_level: "L2", phase: "build" });
      used.push("get_guide_by_role");
      // a peça é «não exigir nível para conhecimento»: mede-se na superfície de conhecimento
      const knowledgeNeedsLevel = !topic.ok || (t.status !== undefined && /risk_level/i.test(JSON.stringify(t)));
      const requiresLevel = knowledgeNeedsLevel;
      const pieces = [
        piece(
          "requisitos",
          (t.requirements?.total ?? 0) > 0 || (cd.requirements ?? []).length > 0,
          `${t.requirements?.total ?? 0} pela leitura de conhecimento (sem nível) · ${(cd.requirements ?? []).length} pelo consult`
        ),
        piece("práticas / onde no ciclo", guide.ok, "get_guide_by_role por fase"),
        piece("provas", matrix.ok && ((matrix.data?.data ?? matrix.data ?? {}).rows ?? []).length > 0, "matriz de verificação"),
        piece("ameaças", threats.ok && (threats.data?.coverage?.total ?? 0) > 0, `${threats.data?.coverage?.total ?? 0} ameaças`),
        piece(
          // servido = há CAMINHO e a resposta é honesta: os antipadrões do tópico, ou o zero
          // DECLARADO com o sítio onde eles estão. Zero mudo continuaria a não servir.
          // v1.2 regra 1: servida se o conteúdo aparece na banda OU vem com CAMINHO
          // CONCRETO para onde está. (O predicado anterior procurava uma frase que a
          // beta.36 reescreveu — defeito da medição, corrigido para a formulação da emenda.)
          "antipadrões (o que NÃO fazer)",
          Boolean(t.anti_patterns) &&
            ((t.anti_patterns.total ?? 0) > 0 ||
              (t.anti_patterns.elsewhere?.by_chapter ?? []).some((x) => /\(chapter="/.test(String(x.read_with ?? "")))),
          `banda própria: ${t.anti_patterns?.total ?? 0} neste tópico${(t.anti_patterns?.total ?? 0) === 0 ? ` (vazio com CAMINHO CONCRETO: ${(t.anti_patterns?.elsewhere?.by_chapter ?? []).length} capítulos com chamada executável e rótulos)` : ""}`
        ),
        piece("proveniência marcada (manual-grounded)", Boolean(cd.provenance ?? consult.data?.provenance), "provenance no payload"),
        piece(
          "não exige risk_level para uma pergunta de conhecimento",
          !knowledgeNeedsLevel,
          knowledgeNeedsLevel
            ? "as superfícies normativas exigem risk_level"
            : "explain_sbd_toe_topic responde sem nível; o nível ANOTA quando dado"
        ),
      ];
      const mustNotViolations = [];
      if (requiresLevel) mustNotViolations.push("exige risk_level para responder a uma pergunta de conhecimento");
      notes.push("a pergunta foi feita como o oráculo a escreve: sem tarefa, sem projecto e sem `risk_level`");
      // v1.2: a banda dos antipadrões é anunciada pela tool — avalia-se a conservação nela.
      const apTotal = t.anti_patterns?.total ?? 0;
      const elsewhere = t.anti_patterns?.elsewhere?.by_chapter ?? [];
      const bundleHasAntipatterns = elsewhere.reduce((n, x) => n + (x.total ?? 0), 0) > 0 || apTotal > 0;
      const bands = [
        {
          name: "anti_patterns",
          announced: Boolean(t.anti_patterns),
          empty: apTotal === 0,
          bundleHasContent: bundleHasAntipatterns,
          // caminho CONCRETO = a chamada executável por capítulo, não a lista genérica
          concretePath: elsewhere.some((x) => typeof x.read_with === "string" && /\(chapter="/.test(x.read_with))
        }
      ];
      if (apTotal === 0)
        notes.push(
          bands[0].concretePath
            ? `banda vazia com CAMINHO CONCRETO: ${elsewhere.length} capítulos com chamada executável e rótulos`
            : "banda vazia SEM caminho concreto (v1.2 ⇒ SERVIDO-MAL)"
        );
      return { path: topic.ok || consult.ok, pieces, mustNotViolations, used, notes, bands };
    },
  },
  {
    id: "GR-06",
    /** Peça CENTRAL (emenda v1.1 do oráculo) — sem caminho para ela, é NÃO SERVIDO. */
    centralPiece: "arranque barato (quick-start)",
    reading: "SETUP",
    title: "configurar-se para usar bem o Manual (controlo positivo)",
    question: "Sou um agente novo neste repositório. Como me configuro para trabalhar com o SbD-ToE?",
    async probe(client) {
      const used = [];
      const notes = [];
      const quick = await client.resource("sbd://toe/quick-start");
      const model = await client.resource("sbd://toe/model");
      const guideRes = await client.resource("sbd://toe/agent-guide");
      used.push("read_sbd_toe_resource(quick-start, model, agent-guide)");
      const skill = await client.tool("generate_sbd_toe_skill", { role: "developer", format: "skill" });
      used.push("generate_sbd_toe_skill");
      const guideText = guideRes.text ?? "";
      const quickTk = Math.round((quick.text ?? "").length / 4);
      const ways = (model.data?.how_to_ask?.ways ?? []).map((w) => w.id);
      const pieces = [
        piece("arranque barato (quick-start)", quickTk > 0 && quickTk < 1200, `${quickTk} tk`),
        piece("skill/subagente do papel certo", skill.ok && (skill.data?.content ?? "").length > 0, "generate_sbd_toe_skill(role)"),
        piece("vocabulário e as três formas de pedir", ways.length === 3, `formas publicadas: ${ways.join(",") || "—"}`),
        piece(
          "declaração do que o servidor NÃO faz",
          /nunca CALCULA|não classifica|nunca emitir n[íi]vel|NÃO INTERPRETO PROSA/i.test(guideText + (quick.text ?? "")),
          "declarado no guia/quick-start"
        ),
      ];
      const mustNotViolations = [];
      /**
       * must-NOT: mandar CHAMAR o que o cliente pode não expor antes de avisar.
       *
       * A 1ª versão desta sonda comparava a primeira MENÇÃO ao nome com a primeira ocorrência
       * de «prompt MCP» — e deu falso positivo: a primeira menção está DENTRO da própria
       * ressalva («ANTES de o tentares chamar — verdade do canal: `setup_sbd_toe_agent` é um
       * **prompt MCP**»), e a regex falhava na quebra de linha do markdown. Achado sobre a
       * MEDIÇÃO, não sobre o servidor — que era exactamente o que o oráculo previa para o
       * controlo positivo. Agora compara-se a INVOCAÇÃO (chamada com parênteses) com a
       * ressalva, sobre o texto normalizado.
       */
      const flat = guideText.replace(/\s+/g, " ");
      const invocationIdx = flat.search(/setup_sbd_toe_agent\s*\(/);
      const caveatIdx = flat.search(/setup_sbd_toe_agent[^.]{0,120}?(é um )?\*{0,2}prompt/i);
      if (invocationIdx >= 0 && (caveatIdx < 0 || caveatIdx > invocationIdx))
        mustNotViolations.push("o guia manda chamar `setup_sbd_toe_agent` antes de avisar que é um prompt");
      if (/infer[eê]nc|adivinh/i.test(guideText) && !/n[ãa]o (interpreto|adivinh|infer)/i.test(guideText))
        mustNotViolations.push("promete inferência");
      return { path: Boolean(quick.text), pieces, mustNotViolations, used, notes };
    },
  },
];

export async function runReadingCase(client, rc) {
  let probe;
  try {
    probe = await rc.probe(client);
  } catch (error) {
    return {
      case: rc.id,
      reading: rc.reading,
      title: rc.title,
      verdict: NAO_SERVIDO,
      pieces: [],
      missing: ["a sonda não conseguiu correr"],
      mustNotViolations: [String(error?.message ?? error).slice(0, 120)],
      used: [],
      notes: [],
    };
  }
  const verdict = classify(probe, rc.centralPiece);
  const bandFails = bandViolations(probe).map(
    (b) => `banda \`${b.name}\` anunciada e VAZIA havendo conteúdo no bundle, sem caminho concreto (v1.2)`
  );
  const missing = probe.pieces
    .filter((p) => !p.found || p.nonNormative)
    .map((p) => `${p.name}${p.nonNormative ? " (só por superfície NÃO-NORMATIVA)" : ""} — ${p.evidence}`);
  return {
    case: rc.id,
    reading: rc.reading,
    title: rc.title,
    question: rc.question,
    verdict,
    centralPiece: rc.centralPiece,
    pieces: probe.pieces,
    missing: [...missing, ...bandFails],
    bands: probe.bands ?? [],
    mustNotViolations: probe.mustNotViolations,
    used: [...new Set(probe.used)],
    notes: probe.notes,
  };
}

export const VERDICTS = { SERVIDO, SERVIDO_MAL, NAO_SERVIDO };
