/* page-campaigns-list.jsx — Index of all campaigns
   Grid of campaign cards with status, language, generation count, last activity.
   Filters: status, language. Search by name/company/role.
   Toggle list/grid view.
*/

const MOCK_CAMPAIGNS_LIST = [
  {
    id: "c1", name: "Lead Dev — Doctolib", company: "Doctolib", role: "Senior Software Engineer",
    status: "INTERVIEWING", lang: "fr", generations: 4, lastAts: 78,
    updatedAt: "il y a 1 jour", createdAt: "12 avr.", contact: "Marie Lefèvre",
  },
  {
    id: "c2", name: "Senior Engineer — Datadog", company: "Datadog", role: "Senior Engineer · Plateforme",
    status: "SENT", lang: "en", generations: 3, lastAts: 81,
    updatedAt: "il y a 6 jours", createdAt: "23 avr.", contact: "Sean Cole",
  },
  {
    id: "c3", name: "Plateforme — Algan", company: "Algan", role: "Senior Backend Engineer",
    status: "RESPONDED", lang: "fr", generations: 2, lastAts: 74,
    updatedAt: "il y a 3 jours", createdAt: "18 avr.", contact: null,
  },
  {
    id: "c4", name: "Tech Lead — Aircall", company: "Aircall", role: "Tech Lead · Voice Platform",
    status: "REJECTED", lang: "fr", generations: 5, lastAts: 84,
    updatedAt: "il y a 2 semaines", createdAt: "02 avr.", contact: "Léa Marchand",
  },
  {
    id: "c5", name: "Staff Engineer — Vercel", company: "Vercel", role: "Staff Engineer · Build",
    status: "WITHDRAWN", lang: "en", generations: 3, lastAts: 76,
    updatedAt: "il y a 3 semaines", createdAt: "29 mar.", contact: "Lee Robinson",
  },
  {
    id: "c6", name: "Backend Senior — Spendesk", company: "Spendesk", role: "Senior Backend Engineer",
    status: "ACCEPTED", lang: "fr", generations: 3, lastAts: 91,
    updatedAt: "il y a 1 mois", createdAt: "01 mar.", contact: "Camille Dubois",
  },
  {
    id: "c7", name: "Référence — Padok ami", company: "Padok", role: "Recommandation Romain",
    status: "DRAFT", lang: "fr", generations: 0, lastAts: null,
    updatedAt: "il y a 4 jours", createdAt: "22 avr.", contact: "Romain Bochet",
  },
  {
    id: "c8", name: "Lead — Algolia (revisite)", company: "Algolia", role: "Engineering Lead",
    status: "DRAFT", lang: "en", generations: 0, lastAts: null,
    updatedAt: "il y a 1 semaine", createdAt: "27 avr.", contact: null,
  },
];

const CAMPAIGN_STATUSES_LIST = [
  { v: "DRAFT",        l: "Brouillon",     color: null,    n: 2 },
  { v: "SENT",         l: "Envoyée",       color: "info",  n: 1 },
  { v: "RESPONDED",    l: "Réponse",       color: "info",  n: 1 },
  { v: "INTERVIEWING", l: "En entretien",  color: "accent", n: 1 },
  { v: "REJECTED",     l: "Refus",         color: "danger", n: 1 },
  { v: "ACCEPTED",     l: "Acceptée",      color: "success", n: 1 },
  { v: "WITHDRAWN",    l: "Retirée",       color: null,    n: 1 },
];

function PageCampaignsList({ locale, onOpenCampaign, onNewCampaign, pageState = "filled" }) {
  const isMobile = useIsMobile();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLang, setFilterLang] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // grid | list

  if (pageState === "loading") {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <Skel w={220} h={22} style={{ marginBottom: 22 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skel key={i} w="100%" h={200} r={8} />
          ))}
        </div>
      </div>
    );
  }
  if (pageState === "error") {
    return <PageError title="Campagnes indisponibles" detail="L'index des campagnes n'a pas répondu." onRetry={() => {}} />;
  }

  const allCampaigns = pageState === "empty" ? [] : MOCK_CAMPAIGNS_LIST;

  // Active campaigns are those in progress (not refused, withdrawn, accepted)
  const isActive = (s) => !["REJECTED", "WITHDRAWN", "ACCEPTED"].includes(s);
  const activeCount = allCampaigns.filter((c) => isActive(c.status)).length;
  const sentCount = allCampaigns.filter((c) => c.status !== "DRAFT").length;
  const totalGens = allCampaigns.reduce((s, c) => s + c.generations, 0);

  // Filter
  let filtered = allCampaigns.filter((c) => {
    if (filterStatus === "active" && !isActive(c.status)) return false;
    if (filterStatus !== "all" && filterStatus !== "active" && c.status !== filterStatus) return false;
    if (filterLang !== "all" && c.lang !== filterLang) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(c.name.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q) ||
            c.role.toLowerCase().includes(q) ||
            (c.contact && c.contact.toLowerCase().includes(q)))) return false;
    }
    return true;
  });

  const activeFiltersCount = [
    filterStatus !== "all",
    filterLang !== "all",
    !!search,
  ].filter(Boolean).length;

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Campagnes</h1>
          <div style={{ color: "var(--fg-3)", fontSize: 12.5 }}>
            <strong style={{ color: "var(--fg-1)" }}>{activeCount} active{activeCount > 1 ? "s" : ""}</strong>
            {" · "}{sentCount} envoyée{sentCount > 1 ? "s" : ""}{" · "}{totalGens} générations cumulées
          </div>
        </div>
        <button className="ch-btn primary" onClick={onNewCampaign}>
          <I.plus /> Nouvelle campagne
        </button>
      </div>

      {/* Status pills row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <StatusPill active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>
          Toutes <span style={CL.pillCount}>{allCampaigns.length}</span>
        </StatusPill>
        <StatusPill active={filterStatus === "active"} onClick={() => setFilterStatus("active")} accent>
          Actives <span style={CL.pillCount}>{activeCount}</span>
        </StatusPill>
        {CAMPAIGN_STATUSES_LIST.map((s) => {
          const count = allCampaigns.filter((c) => c.status === s.v).length;
          if (count === 0) return null;
          return (
            <StatusPill key={s.v} active={filterStatus === s.v} onClick={() => setFilterStatus(s.v)} color={s.color}>
              {s.l} <span style={CL.pillCount}>{count}</span>
            </StatusPill>
          );
        })}
      </div>

      {/* Search + secondary filters + view toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{
          flex: "1 1 240px",
          minWidth: 220,
          display: "flex", alignItems: "center",
          background: "var(--bg-1)",
          border: "1px solid var(--border-m)",
          borderRadius: "var(--r-md)",
          height: "var(--row-h)",
          paddingLeft: 10,
          gap: 6,
        }}>
          <span style={{ color: "var(--fg-3)" }}><I.search /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, entreprise, poste, contact…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: "var(--fg-1)", fontSize: 13 }}
          />
          {search && (
            <button className="ch-btn ghost icon sm" onClick={() => setSearch("")}><I.x /></button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Langue</span>
          <div style={{
            display: "inline-flex",
            background: "var(--bg-1)",
            border: "1px solid var(--border-m)",
            borderRadius: "var(--r-md)",
            padding: 2,
            height: "var(--row-h)",
          }}>
            {[
              { v: "all", l: "Toutes" },
              { v: "fr", l: "FR" },
              { v: "en", l: "EN" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setFilterLang(o.v)}
                style={{
                  padding: "0 10px",
                  backgroundColor: filterLang === o.v ? "var(--bg-2)" : "transparent",
                  border: "none",
                  color: filterLang === o.v ? "var(--fg-1)" : "var(--fg-3)",
                  fontSize: 11.5, fontWeight: 500,
                  borderRadius: 4,
                  fontFamily: o.l.length <= 3 ? "var(--font-mono)" : "inherit",
                }}
              >{o.l}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {activeFiltersCount > 0 && (
          <button className="ch-btn ghost sm" onClick={() => { setFilterStatus("all"); setFilterLang("all"); setSearch(""); }}>
            <I.x /> Réinitialiser
          </button>
        )}

        {/* View toggle */}
        <div style={{
          display: "inline-flex",
          background: "var(--bg-1)",
          border: "1px solid var(--border-m)",
          borderRadius: "var(--r-md)",
          padding: 2,
          height: "var(--row-h)",
        }}>
          {[
            { v: "grid", t: "Cartes", i: <I.layout size={12} /> },
            { v: "list", t: "Liste",  i: <I.fileText size={12} /> },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setView(o.v)}
              title={o.t}
              style={{
                padding: "0 9px",
                backgroundColor: view === o.v ? "var(--bg-2)" : "transparent",
                border: "none",
                color: view === o.v ? "var(--fg-1)" : "var(--fg-3)",
                fontSize: 11.5, fontWeight: 500,
                borderRadius: 4,
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >{o.i} {o.t}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {allCampaigns.length === 0 ? (
        <div className="ch-card" style={{ padding: 0 }}>
          <EmptyState
            icon={<I.target size={22} />}
            title="Aucune campagne"
            hint="Une campagne, c'est un poste cible : nom, entreprise, langue de génération. Toutes tes générations de CV et de LM s'y rattachent."
            action={<button className="ch-btn primary" onClick={onNewCampaign}><I.plus /> Créer ma première campagne</button>}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: 28, textAlign: "center", fontSize: 13, color: "var(--fg-3)",
          border: "1px dashed var(--border-m)", borderRadius: "var(--r-md)",
        }}>
          Aucune campagne ne correspond à ces filtres.
          {activeFiltersCount > 0 && (
            <div style={{ marginTop: 10 }}>
              <button className="ch-btn ghost sm" onClick={() => { setFilterStatus("all"); setFilterLang("all"); setSearch(""); }}>
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map((c) => <CampaignCardLg key={c.id} c={c} onOpen={() => onOpenCampaign(c.id)} />)}
        </div>
      ) : (
        <div className="ch-table-scroll">
        <div style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border-s)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
        }}>
          <div style={CL.listHead}>
            <div>Campagne</div>
            <div>Statut</div>
            <div style={{ textAlign: "right" }}>ATS</div>
            <div style={{ textAlign: "right" }}>Générations</div>
            <div style={{ textAlign: "right" }}>Mis à jour</div>
            <div></div>
          </div>
          {filtered.map((c, i) => (
            <CampaignRow key={c.id} c={c} onOpen={() => onOpenCampaign(c.id)} first={i === 0} />
          ))}
        </div>
        </div>
      )}
    </div>
  );
}

function CampaignCardLg({ c, onOpen }) {
  const status = CAMPAIGN_STATUSES_LIST.find((s) => s.v === c.status) || { l: c.status, color: null };
  const statusColor = colorFor(status.color);
  return (
    <button onClick={onOpen} style={CL.card}>
      {/* Header strip with status */}
      <div style={{
        height: 4,
        backgroundColor: statusColor.solid,
      }} />
      <div style={{ padding: "16px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.company}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.role}
            </div>
          </div>
          <span className="ch-badge mono" style={{ flexShrink: 0 }}>{c.lang.toUpperCase()}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 8px",
            backgroundColor: statusColor.bg,
            color: statusColor.fg,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: "currentColor" }} />
            {status.l}
          </span>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 12,
          padding: "10px 0",
          borderTop: "1px solid var(--border-s)",
          fontSize: 11.5,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--fg-3)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
              Générations
            </div>
            <div style={{ color: "var(--fg-1)", fontWeight: 500, fontSize: 13 }}>
              {c.generations || <span style={{ color: "var(--fg-3)" }}>—</span>}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--fg-3)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
              Meilleur ATS
            </div>
            <div style={{
              fontWeight: 600, fontSize: 13,
              fontFamily: "var(--font-mono)",
              color: c.lastAts == null ? "var(--fg-3)"
                  : c.lastAts >= 75 ? "var(--success)"
                  : c.lastAts >= 50 ? "var(--warning)" : "var(--danger)",
            }}>
              {c.lastAts ?? "—"}{c.lastAts != null && <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>/100</span>}
            </div>
          </div>
        </div>

        {/* Footer meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 10, borderTop: "1px solid var(--border-s)", color: "var(--fg-3)", fontSize: 11 }}>
          {c.contact && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 }}>
              <I.user size={11} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.contact}</span>
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span className="mono" style={{ whiteSpace: "nowrap" }}>{c.updatedAt}</span>
        </div>
      </div>
    </button>
  );
}

function CampaignRow({ c, onOpen, first }) {
  const status = CAMPAIGN_STATUSES_LIST.find((s) => s.v === c.status) || { l: c.status, color: null };
  const statusColor = colorFor(status.color);
  return (
    <button onClick={onOpen} style={{
      ...CL.row,
      borderTop: first ? "none" : "1px solid var(--border-s)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.name}
          </span>
          <span className="ch-badge mono" style={{ fontSize: 10, flexShrink: 0 }}>{c.lang.toUpperCase()}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.company} · {c.role}
        </div>
      </div>
      <div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "2px 8px",
          backgroundColor: statusColor.bg,
          color: statusColor.fg,
          borderRadius: 999,
          fontSize: 11, fontWeight: 500,
          whiteSpace: "nowrap",
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: "currentColor" }} />
          {status.l}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        {c.lastAts != null ? (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600,
            color: c.lastAts >= 75 ? "var(--success)" : c.lastAts >= 50 ? "var(--warning)" : "var(--danger)",
          }}>{c.lastAts}<span style={{ fontWeight: 400, color: "var(--fg-3)" }}>/100</span></span>
        ) : (
          <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 12 }}>—</span>
        )}
      </div>
      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-2)" }}>
        {c.generations}
      </div>
      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
        {c.updatedAt}
      </div>
      <div style={{ textAlign: "right", color: "var(--fg-3)" }}>
        <I.chevronRight size={14} />
      </div>
    </button>
  );
}

function StatusPill({ active, onClick, color, accent, children }) {
  const c = colorFor(accent ? "accent" : color);
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "5px 12px",
        backgroundColor: active ? c.bg : "var(--bg-1)",
        border: active ? `1px solid ${c.solid}` : "1px solid var(--border-m)",
        borderRadius: 999,
        color: active ? c.fg : "var(--fg-2)",
        fontSize: 12, fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function colorFor(color) {
  if (color === "accent")  return { bg: "var(--accent-bg)",  fg: "var(--accent-2)", solid: "var(--accent)" };
  if (color === "success") return { bg: "var(--success-bg)", fg: "var(--success)",  solid: "var(--success)" };
  if (color === "warning") return { bg: "var(--warning-bg)", fg: "var(--warning)",  solid: "var(--warning)" };
  if (color === "danger")  return { bg: "var(--danger-bg)",  fg: "var(--danger)",   solid: "var(--danger)" };
  if (color === "info")    return { bg: "var(--info-bg)",    fg: "var(--info)",     solid: "var(--info)" };
  return { bg: "var(--bg-1)", fg: "var(--fg-2)", solid: "var(--border-l)" };
}

const CL = {
  pillCount: {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    padding: "1px 6px",
    background: "rgba(0,0,0,0.18)",
    borderRadius: 999,
    fontWeight: 600,
  },
  card: {
    background: "var(--bg-1)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-lg)",
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    transition: "border-color 150ms, transform 150ms",
  },
  listHead: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 80px 100px 130px 30px",
    gap: 14,
    padding: "10px 18px",
    background: "var(--bg-0)",
    borderBottom: "1px solid var(--border-s)",
    fontSize: 10.5,
    color: "var(--fg-3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 500,
    alignItems: "center",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 80px 100px 130px 30px",
    gap: 14,
    padding: "12px 18px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    alignItems: "center",
    width: "100%",
  },
};

window.PageCampaignsList = PageCampaignsList;
