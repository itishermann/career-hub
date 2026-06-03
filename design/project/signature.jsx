/* signature.jsx — the 5 signature components, designed with care
   LocalizedTextInput, AtsScoreCard, GenerationStream, TypstEditor, WizardStep
*/

const { useState, useEffect, useRef, useMemo } = React;

// ===================================================================
// LocalizedTextInput — FR/EN tabs + per-language status + translate hint
// ===================================================================

function LocalizedTextInput({
  label, multiline, rows = 4, values, onChange, placeholder, hint, fontMono,
}) {
  const [lang, setLang] = useState("fr");
  const [translating, setTranslating] = useState(false);

  const valFr = values.fr || "";
  const valEn = values.en || "";
  const filledFr = valFr.trim().length > 0;
  const filledEn = valEn.trim().length > 0;

  const fakeTranslate = () => {
    setTranslating(true);
    setTimeout(() => {
      const source = lang === "fr" ? valFr : valEn;
      const target = lang === "fr" ? "en" : "fr";
      const fake = source.replace(/^./, (c) => c.toLowerCase()).slice(0, 40) +
        (target === "en" ? " — translated draft (review me)" : " — traduction brouillon (à valider)");
      onChange({ ...values, [target]: fake });
      setTranslating(false);
    }, 1100);
  };

  const otherLang = lang === "fr" ? "en" : "fr";
  const otherFilled = lang === "fr" ? filledEn : filledFr;
  const canTranslate = (lang === "fr" ? filledFr : filledEn) && !otherFilled;

  const statusBadge = (filled) =>
    filled ? <span className="ch-badge success">rempli</span>
           : <span className="ch-badge warning">vide</span>;

  return (
    <div>
      {label && <label className="ch-label">{label}</label>}
      <div style={LS.frame}>
        <div style={LS.tabRow}>
          <button style={{ ...LS.tab, ...(lang === "fr" ? LS.tabActive : {}) }} onClick={() => setLang("fr")}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>FR</span>
            {statusBadge(filledFr)}
          </button>
          <button style={{ ...LS.tab, ...(lang === "en" ? LS.tabActive : {}) }} onClick={() => setLang("en")}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>EN</span>
            {statusBadge(filledEn)}
          </button>
          <div style={{ flex: 1 }} />
          {canTranslate && (
            <button
              className="ch-btn ghost sm"
              onClick={fakeTranslate}
              disabled={translating}
              title={`Pré-remplir l'onglet ${otherLang.toUpperCase()} via LLM`}
              style={{ color: "var(--accent-2)" }}
            >
              {translating
                ? <><span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span> traduction…</>
                : <><I.sparkle /> Traduire vers {otherLang.toUpperCase()}</>}
            </button>
          )}
        </div>
        {multiline ? (
          <textarea
            className="ch-textarea"
            rows={rows}
            value={values[lang] || ""}
            placeholder={placeholder}
            onChange={(e) => onChange({ ...values, [lang]: e.target.value })}
            style={{
              border: "none", borderRadius: 0, background: "transparent",
              fontFamily: fontMono ? "var(--font-mono)" : "inherit",
              padding: "10px 12px",
              boxShadow: "none",
            }}
          />
        ) : (
          <input
            className="ch-input"
            value={values[lang] || ""}
            placeholder={placeholder}
            onChange={(e) => onChange({ ...values, [lang]: e.target.value })}
            style={{ border: "none", borderRadius: 0, background: "transparent", boxShadow: "none" }}
          />
        )}
      </div>
      {hint && <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg-3)" }}>{hint}</div>}
    </div>
  );
}

const LS = {
  frame: {
    background: "var(--bg-input)",
    border: "1px solid var(--border-m)",
    borderRadius: "var(--r-md)",
    overflow: "hidden",
    transition: "border-color 150ms",
  },
  tabRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 6px 6px 6px",
    background: "var(--bg-0)",
    borderBottom: "1px solid var(--border-s)",
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 9px",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "var(--r-sm)",
    color: "var(--fg-2)",
  },
  tabActive: {
    background: "var(--bg-1)",
    border: "1px solid var(--border-m)",
    color: "var(--fg-1)",
  },
};

// ===================================================================
// AtsScoreCard — ring + sub-bars + accordions
// ===================================================================

function ScoreRing({ value, size = 96, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Animate from 0 to value
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let raf;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 800);
      setShown(value * (0.5 - 0.5 * Math.cos(t * Math.PI)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => raf && cancelAnimationFrame(raf);
  }, [value]);
  const color = value >= 90 ? "var(--success)"
    : value >= 75 ? "var(--success)"
    : value >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--border-m)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - shown / 100)}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: size * 0.32, fill: "var(--fg-1)" }}>
        {Math.round(shown)}
      </text>
    </svg>
  );
}

function SubBar({ label, value, max = 100 }) {
  const pct = value == null ? 0 : (value / max) * 100;
  const color = value == null ? "var(--border-m)"
    : value >= 75 ? "var(--success)"
    : value >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11.5, color: "var(--fg-2)", whiteSpace: "nowrap" }}>{label}</span>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-1)", fontWeight: 500 }}>
          {value == null ? "—" : value}
        </span>
      </div>
      <div style={{ height: 4, background: "var(--bg-0)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 600ms ease-out" }} />
      </div>
    </div>
  );
}

function Accordion({ label, badge, children, defaultOpen, accent }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ borderTop: "1px solid var(--border-s)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", width: "100%", alignItems: "center", gap: 8,
          padding: "10px 0", background: "transparent", border: "none",
          color: "var(--fg-1)", fontSize: 12.5, fontWeight: 500, textAlign: "left",
        }}
      >
        <span style={{
          transition: "transform 150ms",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          display: "inline-flex", color: "var(--fg-3)",
        }}><I.chevronRight /></span>
        <span style={{ color: accent ? accent : "var(--fg-1)" }}>{label}</span>
        {badge != null && <span className="ch-badge mono" style={{ marginLeft: "auto" }}>{badge}</span>}
      </button>
      {open && <div style={{ paddingBottom: 12 }}>{children}</div>}
    </div>
  );
}

function AtsScoreCard({ data, onJump }) {
  return (
    <div className="ch-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
        <ScoreRing value={data.global} />
        <div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
            ATS Score
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.45, maxWidth: 200 }}>
            Bon score global, quelques mots-clés à renforcer côté infra.
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <SubBar label="Extraction texte" value={data.breakdown.extraction} />
        <SubBar label="Structure" value={data.breakdown.structure} />
        <SubBar label="Mots-clés" value={data.breakdown.keywords} />
        <SubBar label="Contextuel" value={data.breakdown.contextual} />
      </div>

      <Accordion label="Forces" badge={data.strengths.length} accent="var(--success)" defaultOpen>
        <ul style={ATSStyles.list}>
          {data.strengths.map((s, i) => (
            <li key={i} style={ATSStyles.li}>
              <span style={{ ...ATSStyles.bullet, background: "var(--success)" }} />
              <span><strong style={{ color: "var(--fg-1)" }}>{s.title}.</strong> <span className="subtle">{s.detail}</span></span>
            </li>
          ))}
        </ul>
      </Accordion>

      <Accordion label="Faiblesses" badge={data.weaknesses.length} accent="var(--warning)">
        <ul style={ATSStyles.list}>
          {data.weaknesses.map((s, i) => (
            <li key={i} style={ATSStyles.li}>
              <span style={{ ...ATSStyles.bullet, background: "var(--warning)" }} />
              <span><strong style={{ color: "var(--fg-1)" }}>{s.title}.</strong> <span className="subtle">{s.detail}</span></span>
            </li>
          ))}
        </ul>
      </Accordion>

      <Accordion label="Suggestions" badge={data.suggestions.length} accent="var(--accent-2)">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onJump && onJump(s.section)}
              style={ATSStyles.suggCard}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className={`ch-badge ${s.priority === "high" ? "danger" : s.priority === "medium" ? "warning" : ""}`}>
                  {s.priority}
                </span>
                <span className="ch-badge mono">→ {s.section}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--fg-1)" }}>{s.suggestion}</div>
            </button>
          ))}
        </div>
      </Accordion>
    </div>
  );
}

const ATSStyles = {
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 },
  li: { display: "flex", gap: 8, fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.45 },
  bullet: { width: 5, height: 5, borderRadius: 999, marginTop: 7, flexShrink: 0 },
  suggCard: {
    textAlign: "left",
    background: "var(--bg-0)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-md)",
    padding: "10px 12px",
    cursor: "pointer",
    transition: "border-color 150ms, background 150ms",
  },
};

// ===================================================================
// GenerationStream — vertical step list w/ states + token stream
// ===================================================================

const STEPS = [
  { key: "snapshot",   label: "Snapshot du profil",      duration: 600 },
  { key: "template",   label: "Récupération du template", duration: 400 },
  { key: "journal",    label: "Recherche journal (RAG)",  duration: 900 },
  { key: "prompt",     label: "Construction du prompt",   duration: 500 },
  { key: "llm",        label: "Génération LLM",           duration: 4200 },
  { key: "compile",    label: "Compilation Typst",        duration: 700 },
  { key: "scoring",    label: "Scoring ATS",              duration: 1200 },
];

// A plausible Typst snippet streamed out token-by-token.
const TYPST_STREAM = `#import "@local/sobre-fr": cv-template, accent-color
#show: cv-template.with(accent: rgb("#c4006d"))

= Jean Dupont
#set text(size: 9.5pt)
Développeur fullstack senior — Lyon, France
jean.dupont@example.com · +33 6 12 34 56 78 · jeandupont.example.com

== Profil
Développeur fullstack avec 6 ans d'expérience sur des plateformes B2B exigeantes. Conception et livraison de produits TypeScript/Node de bout en bout, avec un goût marqué pour la rigueur de production.

== Expériences
*Helios Lab* — Senior fullstack engineer · 2023 – présent
- Refonte du moteur de recherche juridique — p95 latency 1.8s → 320ms.
- Pilotage de la migration Postgres 13 → 16 sans downtime, 8M+ documents.
- Mentorat de 3 devs juniors sur l'architecture event-driven.

*Indexio* (freelance) — Fullstack engineer · 2022 – 2023
- Conception de l'UI de monitoring des index, adoptée par 4 équipes produit.
- Optimisation du pipeline d'indexation : -42% temps moyen par batch.`;

function GenerationStream({ onDone, onRestart }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [errors] = useState({});
  const [streamedChars, setStreamedChars] = useState(0);
  const [finished, setFinished] = useState(false);
  const tokenContainerRef = useRef(null);

  useEffect(() => {
    if (stepIdx >= STEPS.length) {
      setFinished(true);
      onDone && onDone();
      return;
    }
    const step = STEPS[stepIdx];
    if (step.key !== "llm") {
      const t = setTimeout(() => setStepIdx((i) => i + 1), step.duration);
      return () => clearTimeout(t);
    }
    // LLM step: stream chars
    let i = 0;
    const total = TYPST_STREAM.length;
    const interval = setInterval(() => {
      i += Math.max(2, Math.round(total / 380));
      if (i >= total) {
        setStreamedChars(total);
        clearInterval(interval);
        setTimeout(() => setStepIdx((idx) => idx + 1), 350);
      } else {
        setStreamedChars(i);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [stepIdx, onDone]);

  useEffect(() => {
    if (tokenContainerRef.current) {
      tokenContainerRef.current.scrollTop = tokenContainerRef.current.scrollHeight;
    }
  }, [streamedChars]);

  return (
    <div className="ch-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>
            {finished ? "Génération terminée" : "Génération en cours…"}
          </h3>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
            Pipeline reproductible · mode <span className="mono">local</span> · llama3.3:70b
          </div>
        </div>
        {finished && (
          <button className="ch-btn ghost sm" onClick={onRestart}>
            <I.refresh /> Relancer
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {STEPS.map((step, i) => {
          const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
          const isLlm = step.key === "llm";
          return (
            <div key={step.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                <StepDot state={state} />
                <span style={{
                  flex: 1,
                  fontSize: 13,
                  color: state === "pending" ? "var(--fg-3)"
                       : state === "active"  ? "var(--fg-1)"
                       : "var(--fg-2)",
                  fontWeight: state === "active" ? 500 : 400,
                }}>
                  {step.label}
                </span>
                {state === "done" && <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{step.duration}ms</span>}
                {state === "active" && <span className="mono ch-pulse nowrap" style={{ fontSize: 11, color: "var(--accent-2)" }}>en cours</span>}
              </div>

              {isLlm && (state === "active" || state === "done") && (
                <div style={GS.tokenPanel} ref={state === "active" ? tokenContainerRef : null}>
                  <div style={GS.tokenHeader}>
                    <span style={{ color: "var(--fg-3)" }}>out.typ</span>
                    <span className="mono" style={{ color: "var(--fg-3)" }}>
                      {state === "done" ? `${TYPST_STREAM.length} chars` : `${streamedChars}/${TYPST_STREAM.length}`}
                    </span>
                  </div>
                  <pre style={GS.tokenBody}>
                    {state === "done" ? TYPST_STREAM : TYPST_STREAM.slice(0, streamedChars)}
                    {state === "active" && <span className="ch-caret" />}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {finished && (
        <div style={{ marginTop: 18, display: "flex", gap: 8, paddingTop: 16, borderTop: "1px solid var(--border-s)" }}>
          <button className="ch-btn primary" onClick={() => downloadText("Jean_Dupont_CV.txt", "CV généré par career-hub — Jean Dupont\n\n(export texte de démonstration)", "text/plain;charset=utf-8")}>
            <I.download /> Télécharger le PDF
          </button>
          <button className="ch-btn" onClick={() => toast("Score ATS : 78/100", { type: "success" })}>
            <I.target /> Voir le score ATS
          </button>
          <button className="ch-btn ghost" onClick={onRestart}>
            <I.refresh /> Régénérer
          </button>
        </div>
      )}
    </div>
  );
}

function StepDot({ state }) {
  if (state === "done") {
    return (
      <span style={{ ...GS.dot, background: "var(--success-bg)", color: "var(--success)" }}>
        <I.check size={11} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span style={{ ...GS.dot, background: "var(--accent-bg)", color: "var(--accent-2)" }}>
        <span className="ch-spin" style={{ display: "inline-flex" }}><I.loader size={11} /></span>
      </span>
    );
  }
  if (state === "error") {
    return (
      <span style={{ ...GS.dot, background: "var(--danger-bg)", color: "var(--danger)" }}>
        <I.x size={11} />
      </span>
    );
  }
  return (
    <span style={{ ...GS.dot, background: "var(--bg-0)", color: "var(--fg-3)", border: "1px solid var(--border-s)" }} />
  );
}

const GS = {
  dot: {
    width: 18, height: 18, borderRadius: 999,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  tokenPanel: {
    margin: "4px 0 8px 28px",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-md)",
    background: "var(--bg-0)",
    overflow: "hidden",
    maxHeight: 220,
    display: "flex", flexDirection: "column",
  },
  tokenHeader: {
    display: "flex", justifyContent: "space-between",
    padding: "5px 10px",
    fontSize: 10.5,
    background: "var(--bg-1)",
    borderBottom: "1px solid var(--border-s)",
    fontFamily: "var(--font-mono)",
  },
  tokenBody: {
    margin: 0,
    padding: "8px 10px",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    lineHeight: 1.55,
    color: "var(--fg-2)",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    maxHeight: 180,
  },
};

// ===================================================================
// TypstEditor — dual pane, lightweight syntax highlight, status bar
// ===================================================================

const TYPST_KEYWORDS = ["set", "show", "import", "include", "let", "if", "else", "for", "while", "return", "true", "false", "none"];

function highlightTypst(src) {
  // Tokenize line by line for fidelity & React keys.
  // Returns array of <span> per line.
  return src.split("\n").map((line, lineIdx) => {
    const parts = [];
    let i = 0;
    const push = (text, cls) => parts.push({ text, cls });
    while (i < line.length) {
      const ch = line[i];
      // comment
      if (ch === "/" && line[i + 1] === "/") {
        push(line.slice(i), "tk-com"); i = line.length; continue;
      }
      // string
      if (ch === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') j++;
        push(line.slice(i, j + 1), "tk-str"); i = j + 1; continue;
      }
      // keyword (after #)
      if (ch === "#") {
        let j = i + 1;
        while (j < line.length && /[a-zA-Z_]/.test(line[j])) j++;
        const w = line.slice(i + 1, j);
        if (TYPST_KEYWORDS.includes(w)) {
          push("#" + w, "tk-kw"); i = j; continue;
        }
        push("#" + w, "tk-fn"); i = j; continue;
      }
      // heading
      if (ch === "=" && (i === 0 || line[i-1] === " ")) {
        let j = i;
        while (j < line.length && line[j] === "=") j++;
        const rest = line.slice(j);
        push(line.slice(i, j), "tk-head"); push(rest, "tk-head"); i = line.length; continue;
      }
      // number
      if (/\d/.test(ch)) {
        let j = i;
        while (j < line.length && /[0-9.]/.test(line[j])) j++;
        push(line.slice(i, j), "tk-num"); i = j; continue;
      }
      // bold * ... *
      if (ch === "*") {
        let j = i + 1;
        while (j < line.length && line[j] !== "*") j++;
        push(line.slice(i, j + 1), "tk-bold"); i = j + 1; continue;
      }
      // bullet -
      if (ch === "-" && (i === 0 || line.slice(0, i).trim() === "")) {
        push("-", "tk-bul"); i++; continue;
      }
      // default
      let j = i;
      while (j < line.length && !"#\"=*-".includes(line[j])) j++;
      push(line.slice(i, j === i ? i + 1 : j), null);
      i = j === i ? i + 1 : j;
    }
    return { line: lineIdx + 1, parts };
  });
}

function TypstEditor({ initialSource, compact }) {
  const [src, setSrc] = useState(initialSource || TYPST_STREAM);
  const [compileMs, setCompileMs] = useState(312);
  const [compiling, setCompiling] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (val) => {
    setSrc(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCompiling(true);
    debounceRef.current = setTimeout(() => {
      setCompileMs(280 + Math.floor(Math.random() * 80));
      setCompiling(false);
    }, 600);
  };

  const lines = highlightTypst(src);

  return (
    <div style={{
      ...TE.frame,
      height: compact ? 360 : 540,
    }}>
      <div style={TE.toolbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <I.code />
          <span style={{ fontWeight: 500, fontSize: 12.5 }}>sobre-fr.typ</span>
          <span className="ch-badge mono">v3</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="ch-btn ghost sm" onClick={() => toast("Historique des versions", { type: "info" })}><I.refresh /> Versions</button>
        <button className="ch-btn primary sm" onClick={() => toast("Template sauvegardé (v4)", { type: "success" })}><I.check /> Sauvegarder</button>
      </div>

      <div style={TE.body}>
        {/* Editor pane */}
        <div style={TE.editorPane}>
          {/* invisible textarea for editing, visible pre for highlight */}
          <pre style={TE.code} aria-hidden="true">
            {lines.map(({ line, parts }) => (
              <div key={line} style={TE.lineRow}>
                <span style={TE.gutter}>{line}</span>
                <span style={TE.lineContent}>
                  {parts.map((p, i) =>
                    p.cls
                      ? <span key={i} className={`tk ${p.cls}`}>{p.text}</span>
                      : <span key={i}>{p.text}</span>
                  )}
                </span>
              </div>
            ))}
          </pre>
          <textarea
            value={src}
            onChange={(e) => handleChange(e.target.value)}
            style={TE.editTa}
            spellCheck={false}
          />
        </div>

        {/* Preview pane */}
        <div style={TE.previewPane}>
          <div style={TE.previewLabel}>
            <I.file /> <span>preview · A4</span>
            <div style={{ flex: 1 }} />
            {compiling
              ? <span className="mono" style={{ color: "var(--warning)" }}>compilation…</span>
              : <span className="mono" style={{ color: "var(--fg-3)" }}>{compileMs}ms</span>}
          </div>
          <div style={TE.previewBox}>
            <div style={TE.pdfMock}>
              <div style={{ width: 60, height: 60, borderRadius: 6, background: "var(--border-s)", margin: "0 auto 12px" }} />
              <div style={{ color: "var(--fg-3)", fontSize: 12, fontFamily: "var(--font-mono)" }}>PDF preview</div>
              <div style={{ color: "var(--fg-3)", fontSize: 10.5, fontFamily: "var(--font-mono)", marginTop: 4 }}>
                Jean_Dupont_CV.pdf · 1 page
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={TE.statusBar}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: compiling ? "var(--warning)" : "var(--success)" }} />
          <span>{compiling ? "Compilation en cours" : "Aucune erreur"}</span>
        </span>
        <span style={{ flex: 1 }} />
        <span>{src.split("\n").length} lignes</span>
        <span>·</span>
        <span>UTF-8</span>
        <span>·</span>
        <span>Typst 0.14.2</span>
      </div>
    </div>
  );
}

const TE = {
  frame: {
    background: "var(--bg-1)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-lg)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid var(--border-s)",
    background: "var(--bg-0)",
  },
  body: { flex: 1, display: "flex", minHeight: 0 },
  editorPane: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    borderRight: "1px solid var(--border-s)",
    overflow: "auto",
    background: "var(--bg-1)",
  },
  code: {
    margin: 0,
    padding: "12px 0",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    lineHeight: 1.6,
    color: "var(--fg-2)",
    minHeight: "100%",
  },
  lineRow: { display: "flex", paddingRight: 12, whiteSpace: "pre" },
  gutter: {
    width: 38,
    flexShrink: 0,
    color: "var(--fg-3)",
    textAlign: "right",
    paddingRight: 10,
    userSelect: "none",
    fontSize: 11,
  },
  lineContent: { flex: 1, minWidth: 0 },
  editTa: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    background: "transparent",
    color: "transparent",
    caretColor: "var(--accent)",
    border: "none",
    outline: "none",
    padding: "12px 12px 12px 48px",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    lineHeight: 1.6,
    resize: "none",
    whiteSpace: "pre",
    overflow: "auto",
  },
  previewPane: { flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-0)", minWidth: 0 },
  previewLabel: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px",
    fontSize: 12, color: "var(--fg-2)",
    borderBottom: "1px solid var(--border-s)",
    fontFamily: "var(--font-mono)",
  },
  previewBox: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16,
    background: "repeating-linear-gradient(45deg, var(--bg-0), var(--bg-0) 10px, var(--bg-1) 10px, var(--bg-1) 11px)",
  },
  pdfMock: {
    width: "100%", maxWidth: 280, aspectRatio: "1 / 1.414",
    background: "var(--bg-1)",
    border: "1px solid var(--border-m)",
    borderRadius: 4,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column",
    boxShadow: "var(--shadow-sm)",
  },
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 12px",
    fontSize: 11,
    color: "var(--fg-3)",
    fontFamily: "var(--font-mono)",
    borderTop: "1px solid var(--border-s)",
    background: "var(--bg-0)",
  },
};

// inject token colors once
(function injectTypstColors() {
  if (document.getElementById("__typst-colors")) return;
  const s = document.createElement("style");
  s.id = "__typst-colors";
  s.textContent = `
    .tk-kw   { color: var(--accent-2); }
    .tk-fn   { color: #7eb6e6; }
    .tk-str  { color: #9dd693; }
    .tk-num  { color: #d6ad6d; }
    .tk-com  { color: var(--fg-3); font-style: italic; }
    .tk-head { color: var(--fg-1); font-weight: 600; }
    .tk-bold { color: var(--fg-1); font-weight: 600; }
    .tk-bul  { color: var(--accent-2); }
    [data-theme="light"] .tk-fn { color: #1f6feb; }
    [data-theme="light"] .tk-str { color: #1a7f37; }
    [data-theme="light"] .tk-num { color: #953800; }
  `;
  document.head.appendChild(s);
})();

// ===================================================================
// WizardStep — numeric breadcrumb + content slot + nav
// ===================================================================

function WizardStep({ steps, current, title, subtitle, children, onPrev, onNext, nextLabel, nextDisabled, isLast }) {
  return (
    <div style={WZ.frame}>
      <div style={WZ.steps}>
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <React.Fragment key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  ...WZ.dot,
                  background: done ? "var(--accent)" : active ? "var(--bg-1)" : "var(--bg-0)",
                  border: active ? "1px solid var(--accent)" : "1px solid var(--border-m)",
                  color: done ? "white" : active ? "var(--accent-2)" : "var(--fg-3)",
                }}>
                  {done ? <I.check size={11} /> : i + 1}
                </span>
                <span style={{
                  fontSize: 12,
                  color: active ? "var(--fg-1)" : done ? "var(--fg-2)" : "var(--fg-3)",
                  fontWeight: active ? 500 : 400,
                }}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 1,
                  background: done ? "var(--accent)" : "var(--border-m)",
                  transition: "background 200ms",
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={WZ.bodyOuter}>
        <div style={WZ.body}>
          <div style={{ marginBottom: 26 }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>{title}</h1>
            {subtitle && <p style={{ color: "var(--fg-2)", fontSize: 14, lineHeight: 1.55 }}>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>

      <div style={WZ.footer}>
        <button
          className="ch-btn ghost"
          onClick={onPrev}
          disabled={current === 0}
        >
          <I.chevronLeft /> Précédent
        </button>
        <div style={{ flex: 1 }} />
        <span className="mono nowrap" style={{ color: "var(--fg-3)", fontSize: 11 }}>
          Étape {current + 1} sur {steps.length}
        </span>
        <div style={{ flex: 1 }} />
        <button
          className="ch-btn primary"
          onClick={onNext}
          disabled={nextDisabled}
        >
          {isLast ? <><I.check /> {nextLabel || "Terminer"}</> : <>{nextLabel || "Suivant"} <I.chevronRight /></>}
        </button>
      </div>
    </div>
  );
}

const WZ = {
  frame: {
    background: "var(--bg-1)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-lg)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: 580,
  },
  steps: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "18px 28px",
    borderBottom: "1px solid var(--border-s)",
    background: "var(--bg-0)",
  },
  dot: {
    width: 22, height: 22,
    borderRadius: 999,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
    transition: "background 200ms, color 200ms, border-color 200ms",
  },
  bodyOuter: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "40px 28px",
  },
  body: {
    width: "100%",
    maxWidth: 600,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
    borderTop: "1px solid var(--border-s)",
    background: "var(--bg-0)",
  },
};

Object.assign(window, {
  LocalizedTextInput,
  AtsScoreCard, ScoreRing, SubBar, Accordion,
  GenerationStream, TYPST_STREAM,
  TypstEditor,
  WizardStep,
});
