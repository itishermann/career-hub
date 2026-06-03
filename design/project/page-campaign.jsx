/* page-campaign.jsx — Campaign detail
   Header (name, status, target), Job Description with markdown preview,
   Generations list with CV/LM, CTA to generate a new one (modal).
*/

const STATUSES = [
  { v: "DRAFT",        label: "Brouillon",     color: null },
  { v: "SENT",         label: "Envoyée",       color: "info" },
  { v: "RESPONDED",    label: "Réponse reçue", color: "info" },
  { v: "INTERVIEWING", label: "En entretien",  color: "accent" },
  { v: "REJECTED",     label: "Refus",         color: "danger" },
  { v: "ACCEPTED",     label: "Acceptée",      color: "success" },
  { v: "WITHDRAWN",    label: "Retirée",       color: null },
];

function PageCampaign({ locale, onOpenGeneration, onBack, pageState = "filled" }) {
  const isMobile = useIsMobile();
  const c = MOCK.campaign;
  const [status, setStatus] = useState(c.status);
  const [statusOpen, setStatusOpen] = useState(false);
  const [jdPreview, setJdPreview] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(null); // null | "CV" | "LM"

  if (pageState === "loading") return <CampaignSkeleton />;
  if (pageState === "error") {
    return (
      <PageError
        title="Cette campagne n'a pas pu être chargée"
        detail="Le service ATS a renvoyé une 503 — les mots-clés en cache ne sont pas accessibles."
        code="GET /api/campaigns/c_doctolib 503 — Service Unavailable"
        onRetry={() => {}}
      />
    );
  }
  if (pageState === "empty") {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 720, margin: "0 auto" }}>
        <div className="ch-card" style={{ padding: 0 }}>
          <EmptyState
            icon={<I.target size={22} />}
            title="Aucune campagne"
            hint="Une campagne, c'est un poste cible : entreprise, intitulé, langue de génération. Toutes tes générations de CV et de LM s'y rattachent."
            action={
              <button className="ch-btn primary" onClick={() => toast("Ouvre l'assistant Nouvelle campagne", { type: "info" })}><I.plus /> Nouvelle campagne</button>
            }
          />
        </div>
      </div>
    );
  }

  const current = STATUSES.find((s) => s.v === status);

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {onBack && (
        <div style={{ marginBottom: 14 }}>
          <button className="ch-btn ghost sm" onClick={onBack}>
            <I.chevronLeft /> Toutes les campagnes
          </button>
        </div>
      )}
      {/* Header --------------------------------------------- */}
      <div style={CMP.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22 }}>{c.name}</h1>
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              style={{
                ...CMP.statusBtn,
                background: current.color === "accent" ? "var(--accent-bg)"
                          : current.color === "success" ? "var(--success-bg)"
                          : current.color === "danger" ? "var(--danger-bg)"
                          : current.color === "info" ? "var(--info-bg)"
                          : "var(--bg-1)",
                color: current.color === "accent" ? "var(--accent-2)"
                     : current.color === "success" ? "var(--success)"
                     : current.color === "danger" ? "var(--danger)"
                     : current.color === "info" ? "var(--info)"
                     : "var(--fg-2)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />
              {current.label}
              <I.chevronDown size={12} />
            </button>
            {statusOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 4 }} onClick={() => setStatusOpen(false)} />
                <div style={CMP.statusMenu}>
                  {STATUSES.map((s) => (
                    <button
                      key={s.v}
                      onClick={() => { setStatus(s.v); setStatusOpen(false); }}
                      style={{
                        ...CMP.statusMenuItem,
                        background: s.v === status ? "var(--bg-hover)" : "transparent",
                      }}
                    >
                      <span style={{
                        width: 6, height: 6, borderRadius: 999,
                        background: s.color === "accent" ? "var(--accent-2)"
                                  : s.color === "success" ? "var(--success)"
                                  : s.color === "danger" ? "var(--danger)"
                                  : s.color === "info" ? "var(--info)"
                                  : "var(--fg-3)",
                      }} />
                      <span>{s.label}</span>
                      {s.v === status && <span style={{ marginLeft: "auto", color: "var(--accent-2)" }}><I.check size={12} /></span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={CMP.meta}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <I.briefcase /> <strong style={{ color: "var(--fg-1)" }}>{c.company}</strong>
            </span>
            <span style={{ color: "var(--fg-3)" }}>·</span>
            <span>{c.role}</span>
            <span style={{ color: "var(--fg-3)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <I.globe /> <span className="mono" style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 600 }}>{c.language}</span>
              <span style={{ color: "var(--fg-3)" }}>(génération)</span>
            </span>
            <span style={{ color: "var(--fg-3)" }}>·</span>
            <span style={{ color: "var(--fg-3)" }}>mis à jour {c.updatedAt}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="ch-btn ghost" onClick={() => toast("Campagne dupliqu\u00e9e", { type: "success" })}><I.copy /> Dupliquer</button>
          <button className="ch-btn" onClick={() => setGenerateOpen("LM")}><I.sparkle /> Générer une LM</button>
          <button className="ch-btn primary" onClick={() => setGenerateOpen("CV")}>
            <I.zap /> Générer un CV
          </button>
        </div>
      </div>

      {/* 2-col grid : JD + meta | generations ------------------ */}
      <div style={isMobile ? { ...CMP.grid, gridTemplateColumns: "1fr" } : CMP.grid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Job description card */}
          <div className="ch-card" style={{ padding: 0 }}>
            <div style={{
              display: "flex", alignItems: "center",
              padding: "12px 16px 12px 18px",
              borderBottom: "1px solid var(--border-s)",
              gap: 8,
            }}>
              <I.fileText />
              <h3 style={{ fontSize: 13 }}>Description du poste</h3>
              <span className="ch-badge mono">{c.jd.split(/\s+/).length} mots</span>
              <span style={{ flex: 1 }} />
              <div style={{
                display: "inline-flex",
                background: "var(--bg-0)",
                border: "1px solid var(--border-m)",
                borderRadius: "var(--r-md)",
                padding: 2,
              }}>
                <button
                  onClick={() => setJdPreview(false)}
                  style={{ ...CMP.segBtn, ...(!jdPreview ? CMP.segBtnActive : {}) }}
                >
                  Source
                </button>
                <button
                  onClick={() => setJdPreview(true)}
                  style={{ ...CMP.segBtn, ...(jdPreview ? CMP.segBtnActive : {}) }}
                >
                  Aperçu
                </button>
              </div>
            </div>
            {jdPreview ? (
              <div style={CMP.jdPreview}>
                {c.jd.split("\n\n").map((para, i) => {
                  if (para.includes("Missions :") || para.includes("Profil :") || para.includes("Process :")) {
                    const [head, ...rest] = para.split("\n");
                    return (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <h4 style={{ fontSize: 13, marginBottom: 6 }}>{head.replace(" :", "")}</h4>
                        <ul style={{ paddingLeft: 18, color: "var(--fg-2)", margin: 0 }}>
                          {rest.map((l, j) => l.startsWith("- ") ? <li key={j} style={{ marginBottom: 3 }}>{l.slice(2)}</li> : null)}
                        </ul>
                      </div>
                    );
                  }
                  return <p key={i} style={{ marginBottom: 12, color: "var(--fg-2)", lineHeight: 1.6 }}>{para}</p>;
                })}
              </div>
            ) : (
              <textarea
                className="ch-textarea"
                defaultValue={c.jd}
                rows={14}
                style={{
                  border: "none",
                  borderRadius: 0,
                  background: "transparent",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  padding: 16,
                  boxShadow: "none",
                }}
              />
            )}
            <div style={{
              padding: "10px 16px",
              background: "var(--bg-0)",
              borderTop: "1px solid var(--border-s)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--fg-2)",
            }}>
              <span style={{ color: "var(--accent-2)" }}><I.sparkle /></span>
              <span>Mots-clés ATS extraits</span>
              <span style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>cache valide · jdHash 4f8a…</span>
              <button className="ch-btn ghost sm" onClick={() => toast("R\u00e9-extraction des mots-cl\u00e9s ATS lanc\u00e9e", { type: "info" })}><I.refresh /> Re-extraire</button>
            </div>
            <div style={{ padding: "10px 16px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["TypeScript", "Postgres", "Kafka", "AWS", "Ruby on Rails", "React", "K8s", "system design", "RFCs", "mentoring", "code review"].map((k, i) => (
                <span key={i} className="ch-badge mono" style={i < 4 ? { background: "var(--accent-bg)", color: "var(--accent-2)", borderColor: "transparent" } : {}}>{k}</span>
              ))}
            </div>
          </div>

          {/* Generations ---------------------------------- */}
          <div className="ch-card" style={{ padding: 0 }}>
            <div style={{
              display: "flex", alignItems: "center",
              padding: "12px 16px 12px 18px",
              borderBottom: "1px solid var(--border-s)",
              gap: 8,
            }}>
              <I.fileText />
              <h3 style={{ fontSize: 13 }}>Générations</h3>
              <span className="ch-badge mono">{c.generations.length}</span>
              <span style={{ flex: 1 }} />
              <button className="ch-btn ghost sm" onClick={() => setGenerateOpen("CV")}><I.plus /> Nouvelle</button>
            </div>
            <div style={CMP.genTable}>
              <div style={CMP.genTableHead}>
                <div style={{ width: 50 }}>Type</div>
                <div style={{ flex: 1 }}>Template</div>
                <div style={{ width: 100 }}>ATS</div>
                <div style={{ width: 140, textAlign: "right" }}>Date</div>
                <div style={{ width: 40 }}></div>
              </div>
              {c.generations.map((g, i) => (
                <button
                  key={i}
                  onClick={() => onOpenGeneration && onOpenGeneration(g.id)}
                  style={CMP.genRow}
                >
                  <div style={{ width: 50 }}>
                    <span className={`ch-badge ${g.type === "CV" ? "accent" : ""}`} style={{ fontWeight: 600 }}>{g.type}</span>
                  </div>
                  <div style={{ flex: 1, color: "var(--fg-1)", fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span className="mono nowrap">{g.template}</span>
                    <span className="ch-badge mono" style={{ fontSize: 10.5 }}>{g.lang.toUpperCase()}</span>
                  </div>
                  <div style={{ width: 100 }}>
                    {g.atsScore != null ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        color: g.atsScore >= 75 ? "var(--success)" : g.atsScore >= 50 ? "var(--warning)" : "var(--danger)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {g.atsScore}
                        <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>/100</span>
                      </span>
                    ) : (
                      <span style={{ color: "var(--fg-3)", fontSize: 12, fontFamily: "var(--font-mono)" }}>—</span>
                    )}
                  </div>
                  <div style={{ width: 140, textAlign: "right", color: "var(--fg-3)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{g.at}</div>
                  <div style={{ width: 40, color: "var(--fg-3)", display: "flex", justifyContent: "flex-end" }}>
                    <I.chevronRight />
                  </div>
                </button>
              ))}
              <button onClick={() => setGenerateOpen("CV")} style={CMP.genAddRow}>
                <I.plus />
                <span>Générer un nouveau CV ou LM</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column : meta + contact + actions ----------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ch-card">
            <h3 style={{ fontSize: 13, marginBottom: 14 }}>Cible</h3>
            <KvRow label="Entreprise" value={<strong style={{ color: "var(--fg-1)" }}>{c.company}</strong>} />
            <KvRow label="Poste" value={c.role} />
            <KvRow label="Langue génération" value={<span className="mono" style={{ textTransform: "uppercase" }}>{c.language}</span>} />
            <KvRow label="Statut" value={current.label} last />
          </div>

          <div className="ch-card">
            <h3 style={{ fontSize: 13, marginBottom: 14 }}>Contact</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 999,
                background: "var(--bg-0)", border: "1px solid var(--border-m)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--fg-2)", fontSize: 12, fontWeight: 500,
              }}>
                {c.contact.name.split(" ").map((p) => p[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.contact.name}</div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{c.contact.email}</div>
              </div>
            </div>
            <button className="ch-btn ghost sm" style={{ marginTop: 8 }}>
              <I.send /> Programmer un follow-up
            </button>
          </div>

          <div className="ch-card">
            <h3 style={{ fontSize: 13, marginBottom: 12 }}>Notes</h3>
            <textarea
              className="ch-textarea"
              rows={5}
              placeholder="Notes personnelles sur cette campagne…"
              defaultValue="Référée par Romain (ex-Padok). Process déjà entamé : RH ok, technique prévu semaine du 12 mai. Demander à mentionner le projet Spheroid en entretien."
            />
          </div>

          <div style={{
            padding: 14,
            background: "var(--bg-0)",
            border: "1px solid var(--border-s)",
            borderRadius: "var(--r-md)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ color: "var(--info)", marginTop: 1 }}><I.dot /></span>
            <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--fg-1)" }}>Reproductibilité.</strong> Chaque génération conserve un snapshot du profil au moment T. Tu peux régénérer plus tard avec un autre template, le résultat sera cohérent.
            </div>
          </div>
        </div>
      </div>

      {generateOpen && (
        <GenerateModal type={generateOpen} onClose={() => setGenerateOpen(null)} onGenerate={(id) => { setGenerateOpen(null); onOpenGeneration && onOpenGeneration("new"); }} />
      )}
    </div>
  );
}

function KvRow({ label, value, last }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto",
      padding: "8px 0",
      borderBottom: last ? "none" : "1px solid var(--border-s)",
      fontSize: 13,
    }}>
      <span style={{ color: "var(--fg-3)", fontSize: 12 }}>{label}</span>
      <span style={{ color: "var(--fg-1)" }}>{value}</span>
    </div>
  );
}

function GenerateModal({ type, onClose, onGenerate }) {
  const [tpl, setTpl] = useState("sobre-fr");
  const [target, setTarget] = useState(85);

  const templates = type === "CV"
    ? [
        { key: "sobre-fr",     name: "Sobre FR",      desc: "Mono-colonne, classique, ATS-friendly",            lang: "fr", ats: true,  recommended: true },
        { key: "sobre-fr-ats", name: "Sobre FR ATS+", desc: "Mise en page extra-conservatrice, Aspose-ready",   lang: "fr", ats: true },
        { key: "modern-fr",    name: "Modern FR",     desc: "Sidebar discrète, deux colonnes",                  lang: "fr", ats: false },
      ]
    : [
        { key: "classique-fr", name: "Classique FR", desc: "Lettre formelle française",      lang: "fr", recommended: true },
        { key: "concise-fr",   name: "Concise FR",   desc: "Une demi-page, ton plus direct", lang: "fr" },
      ];

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
        width: 560,
        maxWidth: "100%",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border-s)" }}>
          <h3 style={{ fontSize: 14 }}>Générer {type === "CV" ? "un CV" : "une LM"}</h3>
          <span style={{ flex: 1 }} />
          <button className="ch-btn ghost icon sm" onClick={onClose}><I.x /></button>
        </div>

        <div style={{ padding: 18, overflow: "auto" }}>
          <div className="ch-label">Template</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => setTpl(t.key)}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  background: tpl === t.key ? "var(--accent-bg)" : "var(--bg-1)",
                  border: tpl === t.key ? "1px solid var(--accent)" : "1px solid var(--border-m)",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 999,
                  border: tpl === t.key ? "4px solid var(--accent)" : "1px solid var(--border-l)",
                  background: tpl === t.key ? "white" : "var(--bg-0)",
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    {t.name}
                    {t.recommended && <span className="ch-badge accent">recommandé</span>}
                    {t.ats && <span className="ch-badge success">ATS</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{t.desc}</div>
                </div>
                <span className="ch-badge mono">{t.lang.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {type === "CV" && (
            <div style={{ marginTop: 18, padding: 14, background: "var(--bg-0)", border: "1px solid var(--border-s)", borderRadius: "var(--r-md)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--accent)" }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Loop ATS-target</span>
              </label>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, marginLeft: 24 }}>
                Régénérer jusqu'à atteindre ce score (3 itérations max).
              </div>
              <div style={{ marginLeft: 24, marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range"
                  min={50} max={100} step={5}
                  value={target}
                  onChange={(e) => setTarget(parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)" }}
                />
                <span className="mono" style={{ width: 50, textAlign: "right", color: "var(--fg-1)", fontWeight: 600 }}>{target}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border-s)", background: "var(--bg-0)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-3)", marginRight: 8 }}>
            <I.zap /> via <span className="mono">llama3.3:70b</span>
          </span>
          <span style={{ flex: 1 }} />
          <button className="ch-btn ghost" onClick={onClose}>Annuler</button>
          <button className="ch-btn primary" onClick={() => onGenerate(tpl)}>
            <I.sparkle /> Lancer la génération
          </button>
        </div>
      </div>
    </div>
  );
}

const CMP = {
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  statusBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    border: "1px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  statusMenu: {
    position: "absolute",
    top: 56,
    left: 0,
    zIndex: 5,
    background: "var(--bg-2)",
    border: "1px solid var(--border-m)",
    borderRadius: "var(--r-md)",
    boxShadow: "var(--shadow-md)",
    padding: 4,
    minWidth: 200,
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  statusMenuItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "7px 10px",
    background: "transparent", border: "none",
    color: "var(--fg-1)", fontSize: 12.5,
    borderRadius: "var(--r-sm)",
    textAlign: "left", cursor: "pointer",
    fontWeight: 500,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "var(--fg-2)",
    flexWrap: "wrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 16,
    alignItems: "start",
  },
  segBtn: {
    padding: "4px 10px",
    background: "transparent",
    border: "none",
    fontSize: 11.5,
    fontWeight: 500,
    color: "var(--fg-3)",
    borderRadius: 4,
  },
  segBtnActive: { background: "var(--bg-2)", color: "var(--fg-1)" },
  jdPreview: {
    padding: "16px 18px",
    color: "var(--fg-1)",
    fontSize: 13.5,
    minHeight: 280,
    maxHeight: 360,
    overflow: "auto",
  },
  genTable: { display: "flex", flexDirection: "column" },
  genTableHead: {
    display: "flex",
    gap: 12,
    padding: "8px 16px",
    background: "var(--bg-0)",
    borderBottom: "1px solid var(--border-s)",
    fontSize: 11, color: "var(--fg-3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 500,
  },
  genRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid var(--border-s)",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 120ms",
  },
  genAddRow: {
    display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
    padding: "14px 16px",
    background: "transparent",
    border: "none",
    color: "var(--fg-3)",
    fontSize: 12.5,
    cursor: "pointer",
    fontWeight: 500,
  },
};

window.PageCampaign = PageCampaign;
