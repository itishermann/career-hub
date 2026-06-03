/* page-dashboard.jsx — Dashboard with stat tiles + 4 widgets */

const DASH_CAMPAIGNS = [
  { id: "c1", name: "Lead Dev — Doctolib", company: "Doctolib",  status: "INTERVIEWING", lang: "fr", generations: 3, updated: "il y a 2 jours" },
  { id: "c2", name: "Senior Engineer — Datadog", company: "Datadog", status: "SENT", lang: "en", generations: 2, updated: "il y a 5 jours" },
  { id: "c3", name: "Plateforme — Algan", company: "Algan", status: "DRAFT", lang: "fr", generations: 0, updated: "il y a 1 jour" },
];

const DASH_GENERATIONS = [
  { id: "g1", type: "CV", template: "sobre-fr",     campaign: "Lead Dev — Doctolib", ats: 78, when: "il y a 1 jour",  duration: "7.4s" },
  { id: "g2", type: "LM", template: "classique-fr", campaign: "Lead Dev — Doctolib", ats: null, when: "il y a 1 jour",  duration: "4.1s" },
  { id: "g3", type: "CV", template: "sobre-en",     campaign: "Senior Engineer — Datadog", ats: 81, when: "il y a 5 jours", duration: "6.8s" },
  { id: "g4", type: "CV", template: "sobre-fr-ats", campaign: "Lead Dev — Doctolib", ats: 71, when: "il y a 1 semaine", duration: "8.2s" },
];

const DASH_PENDING_FACTS = [
  { id: "f1", summary: "Maintenir p95 320ms sur 10 jours — Doctrine search", type: "achievement", target: "Doctrine" },
  { id: "f2", summary: "Pipeline indexation Algolia : 14min → 8min p95", type: "achievement", target: "Algolia" },
  { id: "f3", summary: "Préférence : équipes ≤ 25 personnes", type: "preference", target: "preferences" },
];

const DASH_RECURRING_SUGGESTIONS = [
  { keyword: "Kubernetes", frequency: 4, priority: "high",   campaigns: 3, hint: "Mentionner K8s explicitement dans 3 campagnes récentes." },
  { keyword: "RFCs",       frequency: 3, priority: "medium", campaigns: 2, hint: "Doctolib + Datadog insistent sur les RFCs." },
  { keyword: "Kafka",      frequency: 2, priority: "high",   campaigns: 2, hint: "Encore manquant après reformulation." },
];

function PageDashboard({ locale, onNavigate }) {
  const isMobile = useIsMobile();
  const stats = [
    { label: "Campagnes actives", value: 3,  hint: "1 en entretien", icon: <I.target />, color: "var(--accent)" },
    { label: "Générations ce mois", value: 12, hint: "+4 vs. avril", icon: <I.fileText />, color: "var(--info)" },
    { label: "À réconcilier", value: 6, hint: "extraits journal", icon: <I.brain />, color: "var(--warning)" },
    { label: "Score ATS moyen", value: 76, hint: "30 derniers jours", icon: <I.sparkle />, color: "var(--success)", suffix: "/100" },
  ];

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Bonjour Jean</h1>
        <div style={{ color: "var(--fg-3)", fontSize: 13 }}>
          Tu as <strong style={{ color: "var(--fg-1)" }}>3 campagnes actives</strong> et{" "}
          <button onClick={() => onNavigate("journal")} style={{
            background: "none", border: "none", padding: 0,
            color: "var(--accent-2)", fontWeight: 500, fontSize: 13, cursor: "pointer",
          }}>
            6 faits à réconcilier
          </button>{" "}depuis ton journal.
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
        {stats.map((s, i) => (
          <div key={i} className="ch-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: "var(--fg-3)", fontSize: 11.5 }}>
              <span style={{ color: s.color, display: "inline-flex" }}>{s.icon}</span>
              <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{
                fontFamily: "var(--font-head)",
                fontSize: 32,
                fontWeight: 600,
                color: "var(--fg-1)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}>{s.value}</span>
              {s.suffix && (
                <span style={{ fontSize: 13, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{s.suffix}</span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{s.hint}</div>
          </div>
        ))}
      </div>

      {/* Quick action bar */}
      <div className="ch-card" style={{ padding: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions rapides</span>
        <div style={{ flex: 1 }} />
        <button className="ch-btn" onClick={() => onNavigate("campaign-new")}>
          <I.plus /> Nouvelle campagne
        </button>
        <button className="ch-btn" onClick={() => onNavigate("journal")}>
          <I.edit /> Note journal
        </button>
        <button className="ch-btn" onClick={() => onNavigate("templates")}>
          <I.layout /> Templates
        </button>
        <button className="ch-btn primary" onClick={() => onNavigate("generation-new")}>
          <I.zap /> Générer un CV
        </button>
      </div>

      {/* 2-col widget grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Campaigns in progress */}
          <Widget title="Campagnes en cours" icon={<I.target />} cta="Voir tout" onCta={() => onNavigate("campaign")}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {DASH_CAMPAIGNS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => onNavigate("campaign")}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-s)",
                    background: "transparent", border: i === 0 ? "none" : "1px solid transparent",
                    borderTopColor: i === 0 ? "transparent" : "var(--border-s)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                      {c.company} · <span className="mono">{c.lang.toUpperCase()}</span> · {c.generations} génér.
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{c.updated}</span>
                  <span style={{ color: "var(--fg-3)" }}><I.chevronRight size={14} /></span>
                </button>
              ))}
            </div>
          </Widget>

          {/* Recurring ATS suggestions — cross-campaign */}
          <Widget
            title="Suggestions ATS récurrentes"
            icon={<I.sparkle />}
            hint="Mots-clés qui reviennent sur plusieurs campagnes mais manquent dans tes CV."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DASH_RECURRING_SUGGESTIONS.map((s, i) => (
                <div key={i} style={{
                  padding: "10px 12px",
                  background: "var(--bg-0)",
                  border: "1px solid var(--border-s)",
                  borderRadius: "var(--r-md)",
                  display: "flex", gap: 10, alignItems: "center",
                }}>
                  <span className="ch-badge mono" style={{
                    backgroundColor: "var(--accent-bg)", color: "var(--accent-2)", borderColor: "transparent",
                    fontSize: 11,
                  }}>{s.keyword}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.4 }}>{s.hint}</div>
                    <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                      manquant sur {s.campaigns} campagne{s.campaigns > 1 ? "s" : ""}
                    </div>
                  </div>
                  <span className={`ch-badge ${s.priority === "high" ? "danger" : "warning"}`}>{s.priority}</span>
                </div>
              ))}
            </div>
          </Widget>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Latest generations */}
          <Widget title="Dernières générations" icon={<I.fileText />} cta="Voir tout" onCta={() => onNavigate("generation")}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {DASH_GENERATIONS.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => onNavigate("generation")}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-s)",
                    background: "transparent", border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span className={`ch-badge mono ${g.type === "CV" ? "accent" : ""}`} style={{ fontWeight: 600, fontSize: 10.5 }}>{g.type}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 12, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {g.template}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {g.campaign}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {g.ats != null ? (
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 12,
                        fontWeight: 600,
                        color: g.ats >= 75 ? "var(--success)" : g.ats >= 50 ? "var(--warning)" : "var(--danger)",
                      }}>{g.ats}<span style={{ fontWeight: 400, color: "var(--fg-3)" }}>/100</span></span>
                    ) : (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>—</span>
                    )}
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{g.when}</div>
                  </div>
                </button>
              ))}
            </div>
          </Widget>

          {/* Pending facts to reconcile */}
          <Widget
            title="À réconcilier"
            icon={<I.brain />}
            badge="6"
            cta="Réconcilier"
            onCta={() => onNavigate("journal")}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DASH_PENDING_FACTS.map((f) => (
                <div key={f.id} style={{
                  padding: "10px 12px",
                  background: "var(--bg-0)",
                  border: "1px solid var(--border-s)",
                  borderRadius: "var(--r-md)",
                }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <span className="ch-badge success" style={{ fontSize: 10 }}>{f.type}</span>
                    <span className="ch-badge mono" style={{ fontSize: 10 }}>→ {f.target}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--fg-1)", lineHeight: 1.4 }}>{f.summary}</div>
                </div>
              ))}
              <div style={{ paddingTop: 4, fontSize: 11.5, color: "var(--fg-3)", textAlign: "center" }}>
                + 3 autres faits en attente
              </div>
            </div>
          </Widget>
        </div>
      </div>
    </div>
  );
}

function Widget({ title, icon, hint, cta, onCta, badge, children }) {
  return (
    <div className="ch-card" style={{ padding: 0 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-s)",
      }}>
        {icon && <span style={{ color: "var(--fg-3)" }}>{icon}</span>}
        <h3 style={{ fontSize: 13 }}>{title}</h3>
        {badge && (
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--warning)",
            background: "var(--warning-bg)",
            padding: "1px 6px",
            borderRadius: 999,
            fontWeight: 600,
          }}>{badge}</span>
        )}
        <div style={{ flex: 1 }} />
        {cta && <button className="ch-btn ghost sm" onClick={onCta}>{cta} <I.arrowUpRight /></button>}
      </div>
      {hint && (
        <div style={{
          padding: "8px 16px",
          fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.5,
          borderBottom: "1px solid var(--border-s)",
          background: "var(--bg-0)",
        }}>{hint}</div>
      )}
      <div style={{ padding: "8px 16px 14px" }}>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DRAFT:        { l: "Brouillon",   cls: "" },
    SENT:         { l: "Envoyée",     cls: "info" },
    INTERVIEWING: { l: "En entretien", cls: "accent" },
    REJECTED:     { l: "Refus",       cls: "danger" },
    ACCEPTED:     { l: "Acceptée",    cls: "success" },
  };
  const s = map[status] || { l: status, cls: "" };
  return <span className={`ch-badge ${s.cls}`} style={{ whiteSpace: "nowrap" }}>{s.l}</span>;
}

window.PageDashboard = PageDashboard;
