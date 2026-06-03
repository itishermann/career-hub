/* page-generation.jsx — Generation detail
   Tabs : Preview / Typst / Prompt / Snapshot
   If isNew: kick off GenerationStream first, then reveal the result.
*/

const MOCK_ATS = {
  global: 78,
  breakdown: { extraction: 95, structure: 88, keywords: 64, contextual: 78 },
  strengths: [
    { title: "Stack technique alignée", detail: "TypeScript, Postgres, AWS — 3 mots-clés clés couverts en évidence dans Helios Lab." },
    { title: "Indicateurs chiffrés", detail: "p95 1.8s → 320ms, -42% pipeline. Excellent signal pour un poste senior." },
    { title: "Single-column, PDF/UA-1", detail: "Le format passe sans dégâts sur tous les ATS connus (Greenhouse, Lever, Workday)." },
    { title: "Density confortable", detail: "1 page, 6 expériences, sans bourrer la maquette." },
  ],
  weaknesses: [
    { title: "Kafka non mentionné", detail: "Doctolib le liste comme tech principale. Tu as touché à Redis/event-driven, à expliciter." },
    { title: "Pas de signal RFC", detail: "La JD insiste sur les RFCs et décisions d'archi. Ajoute 1 ligne sur Helios Lab." },
    { title: "Astreinte/on-call invisible", detail: "Mentionné dans la JD — à reformuler dans la ligne Cloudpeak ou Helios Lab." },
  ],
  suggestions: [
    { priority: "high",   section: "experiences", suggestion: "Ajouter une mention Kafka ou architecture event-driven dans Helios Lab — réutiliser le bullet de Indexio.", rationale: "Mot-clé high importance manquant." },
    { priority: "medium", section: "experiences", suggestion: "Reformuler 'mentorat de 3 devs' en incluant 'revues de code et RFCs'.", rationale: "Aligne avec 'driver la qualité technique'." },
    { priority: "medium", section: "skills",      suggestion: "Promouvoir Kafka et Ruby dans Languages plutôt que dans Infra.", rationale: "Visibilité ATS sur ces deux skills critiques." },
    { priority: "low",    section: "pitch",       suggestion: "Mentionner 'plateforme à fort trafic' dans le pitch.", rationale: "Doctolib insiste sur 15M+ utilisateurs." },
  ],
};

const PROMPT_TEXT = `Tu es un assistant qui rédige des CV pour Jean Dupont.

[Contexte profil]
- 6 ans d'expérience fullstack senior (TS / Node / Postgres).
- Voix: directe, première personne, factuelle. Pas de buzzwords.
- Anti-patterns: éviter "passionné", "synergie", "agile-by-default".

[Cible]
- Entreprise: Novatech Solutions
- Poste: Senior Software Engineer
- Langue: fr
- Job description: <inséré ci-dessous>

[Snapshot profil] <profil sérialisé, langue fr avec fallback en>

[Journal — top 8 entrées sémantiquement liées]
- "Bilan technique de la refonte du search Helios Lab, focus perf p95 et indexation incrémentale."
- "Note sur l'astreinte chez Helios Lab, gérer 3 incidents prod en 1 semaine."
- ...

[Contraintes template — sobre-fr]
- Une seule colonne, PDF/UA-1, headings sémantiques.
- Variables: accent_color = #c4006d.
- Sections supportées: identity, pitch, experiences, education, skills, languages, projects.

[Instructions]
1. Produire le source Typst complet d'un CV 1 page.
2. Mettre en avant TypeScript, Postgres, expérience à fort trafic.
3. Reformuler les bullets en optimisant la densité d'information.
4. Sortir UNIQUEMENT du code Typst valide compilable, pas de markdown.
`;

const SNAPSHOT_TEXT = `{
  "user": { "name": "Jean Dupont", "email": "jean.dupont@example.com", "location": "Lyon, FR" },
  "pitch": "Développeur fullstack avec 6 ans d'expérience…",
  "experiences": [
    {
      "company": "Helios Lab",
      "role": "Senior fullstack engineer",
      "start": "2023-04", "end": null,
      "achievements": [
        "Refonte du moteur de recherche juridique — p95 1.8s → 320ms",
        "Pilotage de la migration Postgres 13 → 16 sans downtime, 8M+ documents",
        "Mentorat de 3 devs juniors sur l'architecture event-driven"
      ]
    },
    { "company": "Indexio", "role": "Fullstack engineer (freelance)", "..." },
    { "company": "Cloudpeak", "role": "DevOps engineer", "..." }
  ],
  "skills": {
    "languages":  ["TypeScript", "JavaScript", "Python", "Go", "SQL"],
    "frameworks": ["React", "Next.js", "Node.js", "NestJS", "Prisma"],
    "infra":      ["Docker", "Kubernetes", "AWS", "Terraform", "PostgreSQL", "Redis"]
  },
  "_meta": {
    "snapshot_at":  "2026-05-03T14:32:01Z",
    "snapshot_id":  "snap_2k8wf3",
    "language":     "fr",
    "fallbacks":    { "anti_patterns": "fr (en vide)" }
  }
}`;

const GENERATED_CV_TEXT = `JEAN DUPONT
Développeur fullstack senior · Lyon, France · jean.dupont@example.com

PITCH
Développeur fullstack avec 6 ans d'expérience sur des plateformes B2B
exigeantes. TypeScript/Node de bout en bout, goût marqué pour la rigueur
de production : observabilité, tests, perf.

EXPÉRIENCES
- Senior fullstack engineer — Helios Lab (2023 → présent)
  · Refonte du moteur de recherche : p95 1.8s → 320ms
  · Migration Postgres 13 → 16 sans downtime, 8M+ documents
- Fullstack engineer (freelance) — Indexio (2022 → 2023)
  · Pipeline d'indexation : -42% de temps moyen par batch
- DevOps engineer — Cloudpeak (2020 → 2022)
  · Plateformes K8s pour 6 scale-ups · module Terraform OSS 200+ stars

COMPÉTENCES
Languages   : TypeScript, JavaScript, Python, Go, SQL
Frameworks  : React, Next.js, Node.js, NestJS, Prisma
Infra       : Docker, Kubernetes, AWS, Terraform, PostgreSQL, Redis

— Généré par career-hub · template sobre-fr · score ATS 78/100
`;

function PageGeneration({ initialIsNew, onBack, pageState = "filled" }) {
  const isMobile = useIsMobile();
  const [isNew, setIsNew] = useState(initialIsNew);
  const [tab, setTab] = useState("preview");

  if (pageState === "loading") return <GenerationSkeleton />;
  if (pageState === "error") {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <button className="ch-btn ghost sm" onClick={onBack}><I.chevronLeft /> Campagne</button>
        </div>
        <ErrorState
          title="La compilation Typst a échoué"
          detail="Le source généré par le LLM contient une référence à un fichier de template manquant. La génération a été archivée avec l'erreur — tu peux relancer ou éditer le source."
          code={`typst-compile failed at line 14:
  Unknown variable: \`accent-color\`
  Expected one of: accent, primary, foreground, background

Hint: a recent update renamed \`accent-color\` to \`accent\`.`}
          onRetry={() => {}}
        />
      </div>
    );
  }

  if (isNew) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ch-btn ghost sm" onClick={onBack}>
            <I.chevronLeft /> Retour
          </button>
          <span style={{ flex: 1 }} />
          <span className="ch-badge accent">en cours</span>
        </div>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, marginBottom: 6 }}>Nouvelle génération · CV</h1>
          <div style={{ color: "var(--fg-2)", fontSize: 13 }}>
            Campagne <strong style={{ color: "var(--fg-1)" }}>Lead Dev — Doctolib</strong> · template <span className="mono">sobre-fr</span>
          </div>
        </div>
        <GenerationStream onDone={() => { /* keep on stream so user sees the result, but reveal CTA */ }} onRestart={() => setIsNew(false)} />
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button className="ch-btn ghost sm" onClick={onBack}><I.chevronLeft /> Campagne</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20 }}>Jean_Dupont_CV.pdf</h1>
            <span className="ch-badge accent">CV</span>
            <span className="ch-badge mono">sobre-fr</span>
            <span className="ch-badge mono">FR</span>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--fg-3)", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
              <I.target /> Campagne Lead Dev — Doctolib
            </span>
            <span style={{ whiteSpace: "nowrap" }}>·</span>
            <span className="mono nowrap">généré le 03 mai, 14:32</span>
            <span style={{ whiteSpace: "nowrap" }}>·</span>
            <span className="mono nowrap">via llama3.3:70b · 7.4s · 4 218 → 2 087 tokens</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="ch-btn ghost" onClick={() => toast("G\u00e9n\u00e9ration dupliqu\u00e9e", { type: "success" })}><I.copy /> Dupliquer</button>
          <button className="ch-btn" onClick={() => setIsNew(true)}><I.refresh /> Régénérer</button>
          <button className="ch-btn primary" onClick={() => downloadText("Jean_Dupont_CV.txt", GENERATED_CV_TEXT, "text/plain;charset=utf-8")}><I.download /> Télécharger PDF</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ch-tabs" style={{ marginBottom: 18 }}>
        {[
          { v: "preview",  label: "Preview" },
          { v: "typst",    label: "Code Typst" },
          { v: "prompt",   label: "Prompt utilisé" },
          { v: "snapshot", label: "Snapshot du profil" },
        ].map((t) => (
          <button
            key={t.v}
            className={`ch-tab ${tab === t.v ? "active" : ""}`}
            onClick={() => setTab(t.v)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "preview" && <PreviewTab />}
      {tab === "typst" && <TypstEditor compact initialSource={TYPST_STREAM} />}
      {tab === "prompt" && <CodePanel title="prompt.md" content={PROMPT_TEXT} mono />}
      {tab === "snapshot" && <CodePanel title="snapshot.json" content={SNAPSHOT_TEXT} mono />}
    </div>
  );
}

function PreviewTab() {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr",
      gap: 18,
      alignItems: "start",
    }}>
      {/* PDF preview panel */}
      <div className="ch-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-s)",
          background: "var(--bg-0)",
          gap: 8,
        }}>
          <I.file />
          <span className="mono" style={{ fontSize: 12 }}>Jean_Dupont_CV.pdf</span>
          <span className="ch-badge mono">A4 · 1 page</span>
          <span style={{ flex: 1 }} />
          <button className="ch-btn ghost icon sm" title="Plein écran" onClick={() => toast("Aperçu plein écran", { type: "info" })}><I.eye /></button>
          <button className="ch-btn ghost icon sm" title="Télécharger" onClick={() => downloadText("Jean_Dupont_CV.txt", GENERATED_CV_TEXT, "text/plain;charset=utf-8")}><I.download /></button>
        </div>
        <div style={{
          padding: 28,
          background: "repeating-linear-gradient(45deg, var(--bg-0), var(--bg-0) 10px, var(--bg-1) 10px, var(--bg-1) 11px)",
          display: "flex", justifyContent: "center",
          minHeight: 760,
        }}>
          <div style={{
            width: "100%",
            maxWidth: 420,
            aspectRatio: "1 / 1.414",
            background: "var(--bg-1)",
            border: "1px solid var(--border-m)",
            borderRadius: 4,
            boxShadow: "var(--shadow-md)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column",
            gap: 10,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 8, background: "var(--border-s)" }} />
            <div style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 12 }}>PDF preview</div>
            <div style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>(rendu désactivé dans le prototype)</div>
          </div>
        </div>
        <div style={{
          padding: "8px 14px",
          borderTop: "1px solid var(--border-s)",
          background: "var(--bg-0)",
          fontSize: 11,
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
          display: "flex", gap: 12, alignItems: "center",
        }}>
          <span>1 / 1</span>
          <span>·</span>
          <span>Typst 0.14.2</span>
          <span>·</span>
          <span>PDF/UA-1 ✓</span>
          <span style={{ flex: 1 }} />
          <span>318 KB</span>
        </div>
      </div>

      {/* Right column : ATS + meta */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <AtsScoreCard data={MOCK_ATS} onJump={() => {}} />

        <div className="ch-card">
          <h3 style={{ fontSize: 13, marginBottom: 12 }}>Mots-clés ATS</h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Matched · 8
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {[
                { k: "TypeScript", c: 4 },
                { k: "Postgres", c: 3 },
                { k: "React", c: 2 },
                { k: "AWS", c: 2 },
                { k: "system design", c: 1 },
                { k: "mentoring", c: 1 },
                { k: "RFCs", c: 1 },
                { k: "code review", c: 1 },
              ].map((m, i) => (
                <span key={i} className="ch-badge success">
                  {m.k}
                  <span className="mono" style={{ opacity: 0.7, marginLeft: 2 }}>×{m.c}</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Missing · 3
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {["Kafka", "Ruby on Rails", "K8s"].map((m, i) => (
                <span key={i} className="ch-badge danger">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodePanel({ title, content }) {
  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--border-s)",
      borderRadius: "var(--r-lg)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        padding: "8px 14px",
        borderBottom: "1px solid var(--border-s)",
        background: "var(--bg-0)",
        gap: 8,
      }}>
        <I.code />
        <span className="mono" style={{ fontSize: 12 }}>{title}</span>
        <span style={{ flex: 1 }} />
        <button className="ch-btn ghost sm" onClick={() => copyText(content, `${title} copié`)}><I.copy /> Copier</button>
      </div>
      <pre style={{
        margin: 0,
        padding: 18,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--fg-2)",
        background: "var(--bg-1)",
        maxHeight: 640,
        overflow: "auto",
        whiteSpace: "pre-wrap",
      }}>
        {content}
      </pre>
    </div>
  );
}

window.PageGeneration = PageGeneration;
