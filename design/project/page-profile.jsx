/* page-profile.jsx — overview + sections + experiences
   Uses LocalizedTextInput for editable fields.
*/

function PageProfile({ locale, pageState = "filled", onNavigate }) {
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(null); // section key or null
  const [pitch, setPitch] = useState(MOCK.profile.pitch);
  const [title, setTitle] = useState(MOCK.profile.identity.title);

  const exportMarkdown = () => {
    const p = MOCK.profile;
    const lines = [];
    lines.push(`# ${MOCK.user.name}`, "", `> ${title[locale] || title.fr} · ${MOCK.user.location}`, "");
    lines.push("## Pitch", "", pitch[locale] || pitch.fr, "");
    lines.push("## Exp\u00e9riences", "");
    p.experiences.forEach((e) => {
      const span = e.end ? `${e.start} \u2192 ${e.end}` : `${e.start} \u2192 pr\u00e9sent`;
      lines.push(`### ${e.role} \u2014 ${e.company} (${span})`);
      (e.achievementsFr || []).forEach((a) => lines.push(`- ${a}`));
      lines.push(`_Stack : ${e.techs.join(", ")}_`, "");
    });
    lines.push("## Comp\u00e9tences", "");
    lines.push(`- **Languages** : ${p.skills.languages.join(", ")}`);
    lines.push(`- **Frameworks** : ${p.skills.frameworks.join(", ")}`);
    lines.push(`- **Infra** : ${p.skills.infra.join(", ")}`);
    downloadText("jean-dupont-profil.md", lines.join("\n"), "text/markdown;charset=utf-8");
  };

  if (pageState === "loading") return <ProfileSkeleton />;
  if (pageState === "error") {
    return (
      <PageError
        title="Impossible de charger ton profil"
        detail="La requête Prisma a échoué. Le snapshot le plus récent n'est pas accessible."
        code="P2024 Timed out fetching a new connection from the pool"
        onRetry={() => {}}
      />
    );
  }
  if (pageState === "empty") {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 720, margin: "0 auto" }}>
        <div className="ch-card" style={{ padding: 0 }}>
          <EmptyState
            icon={<I.user size={22} />}
            title="Profil vide"
            hint="Importe ton personality.md pour pré-remplir identité, pitch, expériences et compétences en un seul coup. Tu pourras tout éditer ensuite."
            action={
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ch-btn primary" onClick={() => toast("Import de personality.md lancé", { type: "info" })}><I.download style={{ transform: "rotate(180deg)" }} /> Importer personality.md</button>
                <button className="ch-btn ghost" onClick={() => onNavigate && onNavigate("onboarding")}><I.plus /> Commencer à zéro</button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Identity strip ----------------------------------------- */}
      <div style={PRO.identityRow}>
        <div style={PRO.identityBlock}>
          <div style={PRO.bigAvatar}>{MOCK.user.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22 }}>{MOCK.user.name}</h1>
              <span className="ch-badge accent">{MOCK.user.yearsExp} ans d'expérience</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--fg-2)", fontSize: 13, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.briefcase /> {title[locale] || title.fr}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.globe /> {MOCK.user.location}
              </span>
              <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {MOCK.user.handle}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="ch-btn" onClick={exportMarkdown}>
            <I.download /> Exporter Markdown
          </button>
          <button className="ch-btn primary" onClick={() => onNavigate && onNavigate("campaign-new")}>
            <I.plus /> Nouvelle campagne
          </button>
        </div>
      </div>

      {/* 2-col layout: pitch + sections | experiences */}
      <div style={isMobile ? { ...PRO.grid, gridTemplateColumns: "1fr" } : PRO.grid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Pitch card -------------------------------------- */}
          <div className="ch-card">
            <div style={PRO.cardHead}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--accent-2)" }}><I.sparkle /></span>
                <h3 style={{ fontSize: 13 }}>Pitch professionnel</h3>
              </span>
              <span className="ch-badge mono">64 mots</span>
            </div>
            <LocalizedTextInput
              multiline
              rows={5}
              values={pitch}
              onChange={setPitch}
              placeholder="Décris-toi en 2-3 phrases…"
              hint="Utilisé dans tous les CV générés. Calibre-le pour ton positionnement."
            />
          </div>

          {/* Sections grid ----------------------------------- */}
          <div className="ch-card">
            <div style={PRO.cardHead}>
              <h3 style={{ fontSize: 13 }}>Sections de profil</h3>
              <span style={{ flex: 1 }} />
              <button className="ch-btn ghost sm" onClick={() => setEditing("nouvelle_section")}><I.plus /> Ajouter</button>
            </div>
            <div style={isMobile ? { ...PRO.sectionsGrid, gridTemplateColumns: "repeat(2, 1fr)" } : PRO.sectionsGrid}>
              {MOCK.profile.sections.map((s) => (
                <SectionTile key={s.key} s={s} locale={locale} onOpen={() => setEditing(s.key)} />
              ))}
            </div>
          </div>

          {/* Skills card ------------------------------------- */}
          <div className="ch-card">
            <div style={PRO.cardHead}>
              <h3 style={{ fontSize: 13 }}>Compétences techniques</h3>
              <span style={{ flex: 1 }} />
              <span className="ch-badge mono">{MOCK.profile.skills.languages.length + MOCK.profile.skills.frameworks.length + MOCK.profile.skills.infra.length} skills</span>
            </div>
            <SkillGroup label="Languages" items={MOCK.profile.skills.languages} accent />
            <SkillGroup label="Frameworks & libs" items={MOCK.profile.skills.frameworks} />
            <SkillGroup label="Infrastructure" items={MOCK.profile.skills.infra} />
          </div>

          {/* Education + Languages combined ----------- */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <div className="ch-card">
              <div style={PRO.cardHead}>
                <h3 style={{ fontSize: 13 }}>Formation</h3>
              </div>
              <EduItem
                school="INSA Lyon"
                diploma="Ingénieur en informatique"
                date="2017 – 2020"
              />
              <EduItem
                school="Lycée du Parc"
                diploma="CPGE MP*"
                date="2015 – 2017"
              />
            </div>
            <div className="ch-card">
              <div style={PRO.cardHead}>
                <h3 style={{ fontSize: 13 }}>Langues</h3>
              </div>
              <LangItem name="Français" level="Natif" pct={100} />
              <LangItem name="Anglais"   level="C1 — courant" pct={85} />
              <LangItem name="Espagnol"  level="B1 — conversationnel" pct={55} />
            </div>
          </div>
        </div>

        {/* Experiences column ---------------------------------- */}
        <div className="ch-card" style={{ padding: 0 }}>
          <div style={{ ...PRO.cardHead, padding: "var(--pad-card)", marginBottom: 0, borderBottom: "1px solid var(--border-s)" }}>
            <h3 style={{ fontSize: 13 }}>Expériences</h3>
            <span style={{ flex: 1 }} />
            <span className="ch-badge mono">{MOCK.profile.experiences.length}</span>
            <button className="ch-btn ghost sm" onClick={() => toast("Ajout d'une exp\u00e9rience", { type: "info" })}><I.plus /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {MOCK.profile.experiences.map((e, i) => (
              <ExperienceItem key={i} e={e} />
            ))}
          </div>
        </div>
      </div>

      {/* Drawer for section editing (mocked) */}
      {editing && (
        <Drawer onClose={() => setEditing(null)}>
          <SectionEditor sectionKey={editing} />
        </Drawer>
      )}
    </div>
  );
}

function SectionTile({ s, locale, onOpen }) {
  const filled = s.filled.fr || s.filled.en;
  return (
    <button onClick={onOpen} style={PRO.sectionTile}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
          {s.label[locale]}
        </span>
        <span style={{ color: "var(--fg-3)", flexShrink: 0 }}><I.arrowUpRight size={12} /></span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <span className={`ch-badge ${s.filled.fr ? "success" : "warning"}`}>
          FR · {s.filled.fr ? "rempli" : "vide"}
        </span>
        <span className={`ch-badge ${s.filled.en ? "success" : "warning"}`}>
          EN · {s.filled.en ? "rempli" : "vide"}
        </span>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        {filled ? `${s.words} mots` : "à compléter"}
      </div>
    </button>
  );
}

function SkillGroup({ label, items, accent }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((s, i) => (
          <span
            key={i}
            className="ch-badge"
            style={accent && i < 2 ? {
              background: "var(--accent-bg)", color: "var(--accent-2)", borderColor: "transparent",
            } : {}}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function EduItem({ school, diploma, date }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: "1px solid var(--border-s)" }}>
      <span style={{ color: "var(--fg-3)", marginTop: 2 }}><I.graduationCap /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--fg-1)", fontWeight: 500 }}>{school}</div>
        <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{diploma}</div>
      </div>
      <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{date}</span>
    </div>
  );
}

function LangItem({ name, level, pct }) {
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border-s)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "var(--fg-1)" }}>{name}</span>
        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{level}</span>
      </div>
      <div style={{ height: 3, background: "var(--bg-0)", borderRadius: 2 }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 2,
          background: "var(--accent)", opacity: 0.6,
        }} />
      </div>
    </div>
  );
}

function ExperienceItem({ e }) {
  const [open, setOpen] = useState(false);
  const yearsSpan = e.end ? `${e.start.slice(0,4)} – ${e.end.slice(0,4)}` : `${e.start.slice(0,4)} – présent`;
  return (
    <div style={{ borderTop: "1px solid var(--border-s)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "flex-start", gap: 14,
          padding: "16px var(--pad-card)",
          background: "transparent", border: "none", textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 6, marginTop: 6,
          height: 6, borderRadius: 999,
          background: e.end ? "var(--fg-3)" : "var(--success)",
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--fg-1)" }}>{e.company}</span>
            <span className="ch-badge">{e.status}</span>
            {!e.end && <span className="ch-badge success">actuel</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 2 }}>{e.role}</div>
          <div style={{ display: "flex", gap: 12, color: "var(--fg-3)", fontSize: 11.5, marginTop: 4, fontFamily: "var(--font-mono)" }}>
            <span>{yearsSpan}</span>
            <span>·</span>
            <span>{e.location}</span>
          </div>
          {open && (
            <>
              <ul style={{ marginTop: 10, paddingLeft: 16, color: "var(--fg-2)", fontSize: 12.5, lineHeight: 1.55 }}>
                {e.achievementsFr.map((a, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{a}</li>
                ))}
              </ul>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                {e.techs.map((t, i) => (
                  <span key={i} className="ch-badge mono" style={{ fontSize: 10.5 }}>{t}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button className="ch-btn ghost sm" onClick={(ev) => { ev.stopPropagation(); toast(`\u00c9dition : ${e.company}`, { type: "info" }); }}><I.edit /> Éditer</button>
                <button className="ch-btn ghost sm" style={{ color: "var(--accent-2)" }} onClick={(ev) => { ev.stopPropagation(); toast(`Traduction EN g\u00e9n\u00e9r\u00e9e pour ${e.company}`, { type: "success" }); }}><I.language /> Compléter EN</button>
              </div>
            </>
          )}
        </div>
        <span style={{
          color: "var(--fg-3)",
          transition: "transform 150ms",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          marginTop: 4,
        }}><I.chevronRight /></span>
      </button>
    </div>
  );
}

function Drawer({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.45)",
      display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(580px, 100vw)",
        background: "var(--bg-1)",
        borderLeft: "1px solid var(--border-m)",
        boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border-s)" }}>
          <h3 style={{ fontSize: 14 }}>Éditer la section</h3>
          <span style={{ flex: 1 }} />
          <button className="ch-btn ghost icon sm" onClick={onClose}><I.x /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {children}
        </div>
        <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border-s)", background: "var(--bg-0)" }}>
          <button className="ch-btn ghost" onClick={onClose}>Annuler</button>
          <div style={{ flex: 1 }} />
          <button className="ch-btn primary" onClick={() => { toast("Section enregistr\u00e9e", { type: "success" }); onClose(); }}><I.check /> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ sectionKey }) {
  const [val, setVal] = useState({
    fr: sectionKey === "pitch"
      ? MOCK.profile.pitch.fr
      : "Méthodique, fiable, allergique au bullshit. Je préfère un PR qui pousse 50 lignes propres qu'un PR qui en pousse 500 \"presque ok\". Communication écrite directe — pas de meeting si un message suffit.",
    en: "",
  });
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Section</div>
        <h2 style={{ fontSize: 18, marginTop: 4 }}>{sectionKey.replace("_", " ")}</h2>
      </div>
      <LocalizedTextInput
        multiline
        rows={10}
        values={val}
        onChange={setVal}
        placeholder="Markdown supporté…"
        hint="Ce contenu est utilisé dans le prompt de génération du CV et de la LM."
      />
    </div>
  );
}

const PRO = {
  identityRow: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  identityBlock: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flex: 1,
    minWidth: 0,
  },
  bigAvatar: {
    width: 56, height: 56,
    borderRadius: "var(--r-lg)",
    background: "linear-gradient(135deg, var(--accent), #7e1450)",
    color: "white",
    fontFamily: "var(--font-head)",
    fontWeight: 600,
    fontSize: 22,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 380px",
    gap: 16,
    alignItems: "start",
  },
  cardHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  },
  sectionTile: {
    background: "var(--bg-0)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-md)",
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    transition: "background 150ms, border-color 150ms",
  },
};

window.PageProfile = PageProfile;
