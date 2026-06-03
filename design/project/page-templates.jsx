/* page-templates.jsx — Templates gallery + editor
   - Gallery : grid of cards, filter by type/lang, + card to create new
   - Editor : back button + TypstEditor + meta sidebar
*/

const MOCK_TEMPLATES = [
  {
    name: "sobre-fr",
    type: "CV",
    nativeLang: "fr",
    supported: ["fr"],
    description: "Mono-colonne, classique français, ATS-friendly. Le template de référence de Jean.",
    atsCompliant: true,
    isDefault: true,
    version: 3,
    updatedAt: "il y a 4 jours",
    usedBy: 23,
  },
  {
    name: "sobre-fr-ats",
    type: "CV",
    nativeLang: "fr",
    supported: ["fr"],
    description: "Variante extra-conservatrice : zéro fantaisie typographique, optimisé Workday/Greenhouse.",
    atsCompliant: true,
    version: 2,
    updatedAt: "il y a 2 semaines",
    usedBy: 4,
  },
  {
    name: "sobre-en",
    type: "CV",
    nativeLang: "en",
    supported: ["en"],
    description: "Anglo-saxon format. Pas de photo, pas de date de naissance, bullet-driven.",
    atsCompliant: true,
    version: 2,
    updatedAt: "il y a 3 semaines",
    usedBy: 1,
  },
  {
    name: "classique-fr",
    type: "COVER_LETTER",
    nativeLang: "fr",
    supported: ["fr"],
    description: "Lettre formelle française, en-tête à droite, formule de politesse classique.",
    atsCompliant: true,
    version: 1,
    updatedAt: "il y a 2 mois",
    usedBy: 8,
  },
  {
    name: "classic-en",
    type: "COVER_LETTER",
    nativeLang: "en",
    supported: ["en"],
    description: "Short cover letter, 3 paragraphs, no rambling.",
    atsCompliant: true,
    version: 1,
    updatedAt: "il y a 2 mois",
    usedBy: 0,
  },
];

function PageTemplates({ locale, onOpenEditor, pageState = "filled" }) {
  const isMobile = useIsMobile();
  const [typeFilter, setTypeFilter] = useState("all"); // all | CV | COVER_LETTER
  const [langFilter, setLangFilter] = useState("all"); // all | fr | en
  const [createOpen, setCreateOpen] = useState(false);

  if (pageState === "loading") {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <Skel w={220} h={22} style={{ marginBottom: 22 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skel key={i} w="100%" h={240} r={8} />
          ))}
        </div>
      </div>
    );
  }
  if (pageState === "error") {
    return <PageError title="Templates inaccessibles" detail="Le store des templates n'a pas répondu." onRetry={() => {}} />;
  }

  const items = (pageState === "empty" ? [] : MOCK_TEMPLATES).filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (langFilter !== "all" && !t.supported.includes(langFilter)) return false;
    return true;
  });

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Templates</h1>
          <div style={{ color: "var(--fg-3)", fontSize: 12.5 }}>
            Code Typst versionné. Modifiable par toi ou par le LLM.
          </div>
        </div>
        <button className="ch-btn primary" onClick={() => setCreateOpen(true)}>
          <I.plus /> Nouveau template
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
        <Seg
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { v: "all", l: "Tous" },
            { v: "CV", l: "CV" },
            { v: "COVER_LETTER", l: "Lettre" },
          ]}
        />
        <Seg
          value={langFilter}
          onChange={setLangFilter}
          options={[
            { v: "all", l: "Toutes langues" },
            { v: "fr", l: "FR" },
            { v: "en", l: "EN" },
          ]}
        />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
          {items.length} {items.length > 1 ? "templates" : "template"}
        </span>
      </div>

      {items.length === 0 && pageState === "empty" ? (
        <div className="ch-card" style={{ padding: 0 }}>
          <EmptyState
            icon={<I.layout size={22} />}
            title="Pas encore de template"
            hint="Les templates sont du code Typst versionné. Tu peux partir d'un exemple, modifier les variables, et l'utiliser pour générer des CV / LM."
            action={
              <button className="ch-btn primary" onClick={() => setCreateOpen(true)}>
                <I.plus /> Importer un template d'exemple
              </button>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div style={{
          padding: 18, textAlign: "center", fontSize: 13, color: "var(--fg-3)",
          border: "1px dashed var(--border-m)", borderRadius: "var(--r-md)",
        }}>
          Aucun template ne correspond à ces filtres.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {items.map((t) => (
            <TemplateCard key={t.name} t={t} onOpen={() => onOpenEditor(t.name)} />
          ))}
          <button onClick={() => setCreateOpen(true)} style={TPL.addCard}>
            <span style={TPL.addIcon}><I.plus size={18} /></span>
            <div style={{ fontSize: 13, color: "var(--fg-2)", fontWeight: 500, marginTop: 10 }}>Créer un nouveau template</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4, textAlign: "center" }}>
              Partir d'un blanc, ou cloner un existant.
            </div>
          </button>
        </div>
      )}

      {createOpen && <TemplateCreateModal onClose={() => setCreateOpen(false)} onCreate={(d) => { setCreateOpen(false); onOpenEditor(d.name); }} />}
    </div>
  );
}

function TemplateCard({ t, onOpen }) {
  return (
    <button onClick={onOpen} style={TPL.card}>
      {/* Preview area : mock printed page */}
      <div style={TPL.preview}>
        <div style={TPL.previewPage}>
          <PreviewMock type={t.type} />
        </div>
        <div style={TPL.previewOverlay}>
          <div style={TPL.previewBadges}>
            {t.atsCompliant && <span className="ch-badge success" style={{ fontSize: 10 }}>ATS</span>}
            {t.isDefault && <span className="ch-badge accent" style={{ fontSize: 10 }}>défaut</span>}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{t.name}</span>
          <span style={{ flex: 1 }} />
          <span className="ch-badge mono" style={{ fontSize: 10 }}>{t.type === "CV" ? "CV" : "LM"}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5, height: 36, overflow: "hidden", marginBottom: 12 }}>
          {t.description}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          <span>v{t.version}</span>
          <span>·</span>
          <span>{t.usedBy} génér.</span>
          <span>·</span>
          <span>{t.supported.map((l) => l.toUpperCase()).join(" / ")}</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: "var(--fg-3)" }}><I.arrowUpRight size={12} /></span>
        </div>
      </div>
    </button>
  );
}

// Mock typographic preview — gives a feel without claiming to render the actual Typst
function PreviewMock({ type }) {
  if (type === "CV") {
    return (
      <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ height: 11, width: "55%", background: "var(--fg-2)", opacity: 0.85, borderRadius: 1 }} />
        <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
          {[40, 24, 36].map((w, i) => (
            <div key={i} style={{ height: 4, width: `${w}%`, background: "var(--fg-3)", opacity: 0.6, borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ height: 1, background: "var(--border-m)", marginTop: 2 }} />
        <div style={{ height: 7, width: 50, background: "var(--accent)", opacity: 0.7, borderRadius: 1, marginTop: 3 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[90, 78, 84].map((w, i) => (
            <div key={i} style={{ height: 3, width: `${w}%`, background: "var(--fg-3)", opacity: 0.45, borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ height: 7, width: 60, background: "var(--accent)", opacity: 0.7, borderRadius: 1, marginTop: 4 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[88, 70, 92, 76].map((w, i) => (
            <div key={i} style={{ height: 3, width: `${w}%`, background: "var(--fg-3)", opacity: 0.45, borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ height: 7, width: 45, background: "var(--accent)", opacity: 0.7, borderRadius: 1, marginTop: 4 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {[10, 14, 12, 11, 14, 10, 12].map((w, i) => (
            <div key={i} style={{ height: 5, width: `${w}px`, background: "var(--fg-3)", opacity: 0.4, borderRadius: 2 }} />
          ))}
        </div>
      </div>
    );
  }
  // Cover letter mock
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
        {[40, 30, 50].map((w, i) => (
          <div key={i} style={{ height: 3, width: w, background: "var(--fg-3)", opacity: 0.55, borderRadius: 1 }} />
        ))}
      </div>
      <div style={{ height: 4, width: "35%", background: "var(--fg-2)", opacity: 0.7, borderRadius: 1, marginTop: 8 }} />
      <div style={{ height: 1 }} />
      {[95, 90, 96, 88, 92, 85, 70].map((w, i) => (
        <div key={i} style={{ height: 3, width: `${w}%`, background: "var(--fg-3)", opacity: 0.45, borderRadius: 1 }} />
      ))}
      <div style={{ height: 4 }} />
      {[80, 90, 60].map((w, i) => (
        <div key={i} style={{ height: 3, width: `${w}%`, background: "var(--fg-3)", opacity: 0.45, borderRadius: 1 }} />
      ))}
    </div>
  );
}

// ====== Template editor ============================================
function PageTemplateEdit({ name, onBack }) {
  const isMobile = useIsMobile();
  const t = MOCK_TEMPLATES.find((x) => x.name === name) || MOCK_TEMPLATES[0];

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "24px 32px", maxWidth: 1500, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button className="ch-btn ghost sm" onClick={onBack}><I.chevronLeft /> Templates</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20 }} className="mono">{t.name}</h1>
            <span className="ch-badge accent">{t.type === "CV" ? "CV" : "LM"}</span>
            <span className="ch-badge mono">v{t.version}</span>
            {t.atsCompliant && <span className="ch-badge success">ATS</span>}
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--fg-3)", flexWrap: "wrap" }}>
            <span>{t.description}</span>
          </div>
        </div>
        <button className="ch-btn ghost" onClick={() => toast(`Template ${t.name} dupliqu\u00e9`, { type: "success" })}><I.copy /> Dupliquer</button>
        <button className="ch-btn ghost" onClick={() => downloadText(`${t.name}.typ`, TYPST_STREAM, "text/plain;charset=utf-8")}><I.download /> Exporter</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 280px", gap: 18, alignItems: "start" }}>
        <TypstEditor initialSource={TYPST_STREAM} />

        {/* Meta sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="ch-card">
            <h3 style={{ fontSize: 13, marginBottom: 12 }}>Variables exposées</h3>
            <Var label="accent_color" type="color" current="#c4006d" />
            <Var label="show_photo" type="boolean" current="false" />
            <Var label="page_size" type="enum" current="a4" />
          </div>

          <div className="ch-card">
            <h3 style={{ fontSize: 13, marginBottom: 12 }}>Sections supportées</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {["identity", "pitch", "experiences", "education", "skills", "languages", "projects", "interests"].map((s) => (
                <span key={s} className="ch-badge mono" style={{ fontSize: 10.5 }}>{s}</span>
              ))}
            </div>
          </div>

          <div className="ch-card">
            <h3 style={{ fontSize: 13, marginBottom: 12 }}>Langues supportées</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {t.supported.map((l) => (
                <span key={l} className="ch-badge accent">{l.toUpperCase()}</span>
              ))}
            </div>
            <button className="ch-btn ghost sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => toast("Ajout d'une langue au template", { type: "info" })}>
              <I.plus /> Ajouter une langue
            </button>
          </div>

          <div className="ch-card">
            <h3 style={{ fontSize: 13, marginBottom: 12 }}>Historique</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <VersionRow v={3} who="moi" when="il y a 4 jours" current />
              <VersionRow v={2} who="LLM (auto-fix ATS)" when="il y a 2 semaines" />
              <VersionRow v={1} who="seed initial" when="12 jan. 2026" />
            </div>
          </div>

          <div style={{
            padding: 12,
            background: "var(--bg-0)",
            border: "1px solid var(--border-s)",
            borderRadius: "var(--r-md)",
            fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.55,
          }}>
            <strong style={{ color: "var(--fg-2)" }}>{t.usedBy} générations</strong> utilisent ce template. Une nouvelle version est créée à chaque sauvegarde.
          </div>
        </div>
      </div>
    </div>
  );
}

function Var({ label, type, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border-s)" }}>
      <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-1)" }}>{label}</span>
      <span className="ch-badge mono" style={{ marginLeft: 8, fontSize: 9.5 }}>{type}</span>
      <div style={{ flex: 1 }} />
      <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{current}</span>
    </div>
  );
}

function VersionRow({ v, who, when, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 18, height: 18,
        borderRadius: "var(--r-sm)",
        backgroundColor: current ? "var(--accent-bg)" : "var(--bg-0)",
        border: current ? "1px solid var(--accent)" : "1px solid var(--border-s)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        color: current ? "var(--accent-2)" : "var(--fg-3)",
      }}>{v}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--fg-1)" }}>{who}</div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{when}</div>
      </div>
      {!current && <button className="ch-btn ghost sm" onClick={() => toast(`Version ${v} restaur\u00e9e`, { type: "success" })}>restaurer</button>}
    </div>
  );
}

// Segment control reused
function Seg({ value, onChange, options }) {
  return (
    <div style={{
      display: "inline-flex",
      background: "var(--bg-1)",
      border: "1px solid var(--border-m)",
      borderRadius: "var(--r-md)",
      padding: 2,
      height: "var(--row-h)",
    }}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          style={{
            padding: "0 12px",
            backgroundColor: value === o.v ? "var(--bg-2)" : "transparent",
            border: "none",
            color: value === o.v ? "var(--fg-1)" : "var(--fg-3)",
            fontSize: 12, fontWeight: 500,
            borderRadius: 4,
          }}
        >{o.l}</button>
      ))}
    </div>
  );
}

function TemplateCreateModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("CV");
  const [lang, setLang] = useState("fr");
  const [source, setSource] = useState("blank");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border-m)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-lg)",
        width: 540,
        maxWidth: "100%",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border-s)" }}>
          <h3 style={{ fontSize: 14 }}>Nouveau template</h3>
          <span style={{ flex: 1 }} />
          <button className="ch-btn ghost icon sm" onClick={onClose}><I.x /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="ch-label">Nom (slug)</label>
            <input
              className="ch-input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())}
              placeholder="ex. moderne-fr"
              style={{ fontFamily: "var(--font-mono)" }}
            />
            <div style={{ marginTop: 5, fontSize: 11, color: "var(--fg-3)" }}>
              Sans espaces ni accents. Convention : <span className="mono">style-langue</span>.
            </div>
          </div>
          <div>
            <label className="ch-label">Type</label>
            <Seg value={type} onChange={setType} options={[{ v: "CV", l: "CV" }, { v: "COVER_LETTER", l: "Lettre" }]} />
          </div>
          <div>
            <label className="ch-label">Langue native</label>
            <Seg value={lang} onChange={setLang} options={[{ v: "fr", l: "Français" }, { v: "en", l: "English" }]} />
          </div>
          <div>
            <label className="ch-label">Point de départ</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { v: "blank", t: "Vide", d: "Partir d'un template Typst minimal." },
                { v: "clone-sobre", t: "Cloner sobre-fr", d: "Recommandé : la structure ATS la plus solide." },
                { v: "clone-sobre-ats", t: "Cloner sobre-fr-ats", d: "Variante extra-conservatrice." },
              ].map((o) => (
                <label key={o.v} style={{
                  display: "flex", gap: 10, padding: "8px 10px",
                  backgroundColor: source === o.v ? "var(--accent-bg)" : "var(--bg-1)",
                  border: source === o.v ? "1px solid var(--accent)" : "1px solid var(--border-m)",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                }}>
                  <input type="radio" checked={source === o.v} onChange={() => setSource(o.v)} style={{ accentColor: "var(--accent)" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{o.t}</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{o.d}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border-s)", background: "var(--bg-0)" }}>
          <div style={{ flex: 1 }} />
          <button className="ch-btn ghost" onClick={onClose}>Annuler</button>
          <button className="ch-btn primary" disabled={!name} onClick={() => onCreate({ name, type, lang, source })}>
            <I.check /> Créer et ouvrir
          </button>
        </div>
      </div>
    </div>
  );
}

const TPL = {
  card: {
    background: "var(--bg-1)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-lg)",
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    transition: "border-color 150ms",
  },
  preview: {
    height: 200,
    backgroundColor: "var(--bg-0)",
    borderBottom: "1px solid var(--border-s)",
    position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  previewPage: {
    height: "80%",
    aspectRatio: "1 / 1.414",
    background: "white",
    boxShadow: "var(--shadow-sm)",
    borderRadius: 2,
    overflow: "hidden",
  },
  previewOverlay: {
    position: "absolute", top: 10, right: 10,
  },
  previewBadges: {
    display: "flex", gap: 5,
  },
  addCard: {
    background: "var(--bg-0)",
    border: "1px dashed var(--border-m)",
    borderRadius: "var(--r-lg)",
    padding: 18,
    minHeight: 312,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    color: "var(--fg-3)",
  },
  addIcon: {
    width: 48, height: 48,
    borderRadius: "var(--r-md)",
    background: "var(--bg-1)",
    border: "1px solid var(--border-m)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--accent-2)",
  },
};

Object.assign(window, { PageTemplates, PageTemplateEdit });
