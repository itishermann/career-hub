/* page-generations-list.jsx — Global index of all generations
   Filters: type, campaign, language, ATS range, search by template name
   Sort: by date desc (default), by ATS desc
*/

const MOCK_GENERATIONS_LIST = [
  { id: "g23", type: "CV", template: "sobre-fr",      campaign: "Lead Dev — Doctolib",       campaignId: "c1", company: "Doctolib",  lang: "fr", ats: 78, at: "03 mai, 14:32", model: "llama3.3:70b", duration: 7400, ago: "il y a 1 jour" },
  { id: "g22", type: "LM", template: "classique-fr",  campaign: "Lead Dev — Doctolib",       campaignId: "c1", company: "Doctolib",  lang: "fr", ats: null, at: "03 mai, 09:15", model: "llama3.3:70b", duration: 4100, ago: "il y a 1 jour" },
  { id: "g21", type: "CV", template: "sobre-fr-ats",  campaign: "Lead Dev — Doctolib",       campaignId: "c1", company: "Doctolib",  lang: "fr", ats: 71, at: "29 avr., 09:15", model: "llama3.3:70b", duration: 8200, ago: "il y a 5 jours" },
  { id: "g20", type: "CV", template: "sobre-en",      campaign: "Senior Engineer — Datadog", campaignId: "c2", company: "Datadog",   lang: "en", ats: 81, at: "28 avr., 18:02", model: "claude-opus-4-7", duration: 5800, ago: "il y a 6 jours" },
  { id: "g19", type: "LM", template: "classic-en",    campaign: "Senior Engineer — Datadog", campaignId: "c2", company: "Datadog",   lang: "en", ats: null, at: "28 avr., 18:09", model: "claude-opus-4-7", duration: 3700, ago: "il y a 6 jours" },
  { id: "g18", type: "CV", template: "sobre-fr",      campaign: "Plateforme — Algan",        campaignId: "c3", company: "Algan",     lang: "fr", ats: 69, at: "24 avr., 11:48", model: "llama3.3:70b", duration: 7900, ago: "il y a 1 sem." },
  { id: "g17", type: "CV", template: "sobre-fr",      campaign: "Tech Lead — Aircall",       campaignId: "c4", company: "Aircall",   lang: "fr", ats: 84, at: "22 avr., 16:30", model: "llama3.3:70b", duration: 6900, ago: "il y a 2 sem." },
  { id: "g16", type: "CV", template: "sobre-fr-ats",  campaign: "Tech Lead — Aircall",       campaignId: "c4", company: "Aircall",   lang: "fr", ats: 79, at: "20 avr., 09:08", model: "llama3.3:70b", duration: 8400, ago: "il y a 2 sem." },
  { id: "g15", type: "LM", template: "classique-fr",  campaign: "Tech Lead — Aircall",       campaignId: "c4", company: "Aircall",   lang: "fr", ats: null, at: "20 avr., 09:14", model: "llama3.3:70b", duration: 4300, ago: "il y a 2 sem." },
  { id: "g14", type: "CV", template: "sobre-en",      campaign: "Staff Engineer — Vercel",   campaignId: "c5", company: "Vercel",    lang: "en", ats: 76, at: "15 avr., 11:22", model: "claude-opus-4-7", duration: 5200, ago: "il y a 3 sem." },
  { id: "g13", type: "CV", template: "sobre-en",      campaign: "Staff Engineer — Vercel",   campaignId: "c5", company: "Vercel",    lang: "en", ats: 73, at: "14 avr., 14:55", model: "claude-opus-4-7", duration: 5500, ago: "il y a 3 sem." },
  { id: "g12", type: "LM", template: "classic-en",    campaign: "Staff Engineer — Vercel",   campaignId: "c5", company: "Vercel",    lang: "en", ats: null, at: "14 avr., 15:01", model: "claude-opus-4-7", duration: 3900, ago: "il y a 3 sem." },
  { id: "g11", type: "CV", template: "sobre-fr",      campaign: "Backend Senior — Spendesk", campaignId: "c6", company: "Spendesk",  lang: "fr", ats: 88, at: "08 avr., 10:12", model: "llama3.3:70b", duration: 7100, ago: "il y a 1 mois" },
  { id: "g10", type: "CV", template: "sobre-fr",      campaign: "Backend Senior — Spendesk", campaignId: "c6", company: "Spendesk",  lang: "fr", ats: 85, at: "08 avr., 09:50", model: "llama3.3:70b", duration: 6800, ago: "il y a 1 mois" },
  { id: "g09", type: "LM", template: "classique-fr",  campaign: "Backend Senior — Spendesk", campaignId: "c6", company: "Spendesk",  lang: "fr", ats: null, at: "08 avr., 11:30", model: "llama3.3:70b", duration: 4500, ago: "il y a 1 mois" },
  { id: "g08", type: "CV", template: "sobre-fr",      campaign: "Lead Dev — Doctolib",       campaignId: "c1", company: "Doctolib",  lang: "fr", ats: 62, at: "05 avr., 18:40", model: "llama3.3:70b", duration: 9800, ago: "il y a 1 mois" },
  { id: "g07", type: "CV", template: "sobre-fr-ats",  campaign: "Plateforme — Algan",        campaignId: "c3", company: "Algan",     lang: "fr", ats: 74, at: "02 avr., 13:15", model: "llama3.3:70b", duration: 7600, ago: "il y a 1 mois" },
  { id: "g06", type: "CV", template: "sobre-en",      campaign: "Senior Engineer — Datadog", campaignId: "c2", company: "Datadog",   lang: "en", ats: 77, at: "28 mar., 15:00", model: "claude-opus-4-7", duration: 5300, ago: "il y a 5 sem." },
  { id: "g05", type: "CV", template: "modern-fr",     campaign: "Tech Lead — Aircall",       campaignId: "c4", company: "Aircall",   lang: "fr", ats: 45, at: "25 mar., 09:30", model: "llama3.3:70b", duration: 8100, ago: "il y a 5 sem." },
  { id: "g04", type: "LM", template: "concise-fr",    campaign: "Plateforme — Algan",        campaignId: "c3", company: "Algan",     lang: "fr", ats: null, at: "20 mar., 16:45", model: "llama3.3:70b", duration: 3500, ago: "il y a 2 mois" },
  { id: "g03", type: "CV", template: "sobre-fr",      campaign: "Backend Senior — Spendesk", campaignId: "c6", company: "Spendesk",  lang: "fr", ats: 91, at: "12 mar., 20:18", model: "llama3.3:70b", duration: 7200, ago: "il y a 2 mois" },
  { id: "g02", type: "CV", template: "sobre-fr",      campaign: "Tech Lead — Aircall",       campaignId: "c4", company: "Aircall",   lang: "fr", ats: 80, at: "08 mar., 11:00", model: "llama3.3:70b", duration: 6700, ago: "il y a 2 mois" },
  { id: "g01", type: "CV", template: "sobre-fr",      campaign: null,                        campaignId: null, company: null,        lang: "fr", ats: null, at: "02 mar., 14:20", model: "llama3.3:70b", duration: 7800, ago: "il y a 2 mois" },
];

function PageGenerationsList({ locale, onOpenGeneration, onOpenCampaign, pageState = "filled" }) {
  const isMobile = useIsMobile();
  const [filterType, setFilterType] = useState("all");        // all | CV | LM
  const [filterLang, setFilterLang] = useState("all");        // all | fr | en
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterAts, setFilterAts] = useState("all");          // all | high | medium | low | none
  const [sort, setSort] = useState("date");                   // date | ats
  const [search, setSearch] = useState("");

  if (pageState === "loading") {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <Skel w={220} h={22} style={{ marginBottom: 22 }} />
        <Skel w="100%" h={40} r={6} style={{ marginBottom: 14 }} />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--border-s)" }}>
            <Skel w={40} h={20} r={999} />
            <Skel w="50%" h={14} />
            <div style={{ flex: 1 }} />
            <Skel w={60} h={14} />
            <Skel w={100} h={14} />
          </div>
        ))}
      </div>
    );
  }
  if (pageState === "error") {
    return <PageError title="Liste indisponible" detail="Le service générations n'a pas répondu." onRetry={() => {}} />;
  }

  const allGenerations = pageState === "empty" ? [] : MOCK_GENERATIONS_LIST;
  const campaigns = [...new Set(allGenerations.filter((g) => g.campaign).map((g) => g.campaign))];

  // Filter
  let filtered = allGenerations.filter((g) => {
    if (filterType !== "all" && g.type !== filterType) return false;
    if (filterLang !== "all" && g.lang !== filterLang) return false;
    if (filterCampaign !== "all" && filterCampaign !== "none" && g.campaign !== filterCampaign) return false;
    if (filterCampaign === "none" && g.campaign != null) return false;
    if (filterAts === "high"   && (g.ats == null || g.ats < 75)) return false;
    if (filterAts === "medium" && (g.ats == null || g.ats < 50 || g.ats >= 75)) return false;
    if (filterAts === "low"    && (g.ats == null || g.ats >= 50)) return false;
    if (filterAts === "none"   && g.ats != null) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(g.template.toLowerCase().includes(q) ||
            (g.campaign && g.campaign.toLowerCase().includes(q)) ||
            (g.company && g.company.toLowerCase().includes(q)))) return false;
    }
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sort === "ats") return (b.ats ?? -1) - (a.ats ?? -1);
    return 0; // default ordering is by date desc (mock array already sorted)
  });

  // Stats
  const cvCount = filtered.filter((g) => g.type === "CV").length;
  const lmCount = filtered.filter((g) => g.type === "LM").length;
  const scoredCv = filtered.filter((g) => g.type === "CV" && g.ats != null);
  const avgAts = scoredCv.length ? Math.round(scoredCv.reduce((s, g) => s + g.ats, 0) / scoredCv.length) : null;

  const activeFiltersCount = [
    filterType !== "all",
    filterLang !== "all",
    filterCampaign !== "all",
    filterAts !== "all",
    !!search,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterType("all"); setFilterLang("all"); setFilterCampaign("all"); setFilterAts("all"); setSearch("");
  };

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Générations</h1>
          <div style={{ color: "var(--fg-3)", fontSize: 12.5 }}>
            Toutes les CV et LM générés, toutes campagnes confondues. Chaque ligne reste reproductible via son snapshot de profil.
          </div>
        </div>
        <button className="ch-btn primary" onClick={() => toast("Lancement d'une nouvelle g\u00e9n\u00e9ration", { type: "info" })}><I.zap /> Générer un CV</button>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        <StatTile label="Total" value={allGenerations.length} hint={`${cvCount} CV · ${lmCount} LM`} />
        <StatTile label="ATS moyen" value={avgAts ?? "—"} suffix={avgAts != null ? "/100" : ""}
                  hint={`${scoredCv.length} CV scorés`}
                  valueColor={avgAts == null ? "var(--fg-3)" : avgAts >= 75 ? "var(--success)" : "var(--warning)"} />
        <StatTile label="Campagnes" value={campaigns.length} hint="couvertes par les générations" />
        <StatTile label="Mode LLM" value="local" mono hint="llama3.3:70b · claude-opus-4-7" />
      </div>

      {/* Filter bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10,
        padding: 12,
        background: "var(--bg-1)",
        border: "1px solid var(--border-s)",
        borderRadius: "var(--r-lg)",
        marginBottom: 14,
        alignItems: "center",
      }}>
        <div style={{
          flex: "1 1 220px",
          minWidth: 200,
          display: "flex", alignItems: "center",
          background: "var(--bg-0)",
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
            placeholder="Template, campagne, entreprise…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: "var(--fg-1)", fontSize: 13 }}
          />
          {search && (
            <button className="ch-btn ghost icon sm" onClick={() => setSearch("")}><I.x /></button>
          )}
        </div>

        <FSeg label="Type" value={filterType} onChange={setFilterType} options={[
          { v: "all", l: "Tous" }, { v: "CV", l: "CV" }, { v: "LM", l: "LM" },
        ]} />
        <FSeg label="Langue" value={filterLang} onChange={setFilterLang} options={[
          { v: "all", l: "Toutes" }, { v: "fr", l: "FR" }, { v: "en", l: "EN" },
        ]} />
        <FSelect label="Campagne" value={filterCampaign} onChange={setFilterCampaign}>
          <option value="all">Toutes</option>
          {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="none">— Aucune campagne</option>
        </FSelect>
        <FSelect label="ATS" value={filterAts} onChange={setFilterAts}>
          <option value="all">Tous</option>
          <option value="high">≥ 75 (vert)</option>
          <option value="medium">50–74 (ambre)</option>
          <option value="low">&lt; 50 (rouge)</option>
          <option value="none">Non scoré</option>
        </FSelect>
        <FSelect label="Tri" value={sort} onChange={setSort}>
          <option value="date">Date ↓</option>
          <option value="ats">Score ATS ↓</option>
        </FSelect>

        {activeFiltersCount > 0 && (
          <button className="ch-btn ghost sm" onClick={clearFilters}>
            <I.x /> {activeFiltersCount} filtre{activeFiltersCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Result count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 11.5, color: "var(--fg-3)" }}>
        <span>{filtered.length} {filtered.length > 1 ? "résultats" : "résultat"} sur {allGenerations.length}</span>
        <button className="ch-btn ghost sm" onClick={() => downloadCSV("generations.csv", [
          ["Type", "Template", "Langue", "Campagne", "Entreprise", "ATS", "Mod\u00e8le", "Date"],
          ...filtered.map((g) => [g.type, g.template, (g.lang || "").toUpperCase(), g.campaign || "", g.company || "", g.ats == null ? "" : g.ats, g.model || "", g.at || ""]),
        ])}><I.download /> Exporter CSV</button>
      </div>

      {/* List */}
      {allGenerations.length === 0 ? (
        <div className="ch-card" style={{ padding: 0 }}>
          <EmptyState
            icon={<I.fileText size={22} />}
            title="Aucune génération"
            hint="Crée une campagne, ajoute une description de poste et lance une première génération."
            action={<button className="ch-btn primary" onClick={() => toast("Lancement d'une nouvelle g\u00e9n\u00e9ration", { type: "info" })}><I.zap /> Générer un CV</button>}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: 28, textAlign: "center", fontSize: 13, color: "var(--fg-3)",
          border: "1px dashed var(--border-m)", borderRadius: "var(--r-md)",
        }}>
          Aucune génération ne correspond à ces filtres.
          {activeFiltersCount > 0 && (
            <div style={{ marginTop: 10 }}>
              <button className="ch-btn ghost sm" onClick={clearFilters}>Réinitialiser les filtres</button>
            </div>
          )}
        </div>
      ) : (
        <div className="ch-table-scroll">
        <div style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border-s)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
        }}>
          <div style={GS_LIST.head}>
            <div style={GS_LIST.cellType}>Type</div>
            <div style={GS_LIST.cellTemplate}>Template</div>
            <div style={GS_LIST.cellCampaign}>Campagne</div>
            <div style={GS_LIST.cellAts}>ATS</div>
            <div style={GS_LIST.cellModel}>Modèle</div>
            <div style={GS_LIST.cellDate}>Date</div>
            <div style={GS_LIST.cellAction}></div>
          </div>
          {filtered.map((g, i) => (
            <button key={g.id} onClick={() => onOpenGeneration(g.id)} style={{
              ...GS_LIST.row,
              borderTop: i === 0 ? "none" : "1px solid var(--border-s)",
            }}>
              <div style={GS_LIST.cellType}>
                <span className={`ch-badge mono ${g.type === "CV" ? "accent" : ""}`} style={{ fontWeight: 600 }}>
                  {g.type}
                </span>
              </div>
              <div style={GS_LIST.cellTemplate}>
                <div className="mono nowrap" style={{ fontSize: 12.5, color: "var(--fg-1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {g.template}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>
                  {g.lang.toUpperCase()} · #{g.id}
                </div>
              </div>
              <div style={GS_LIST.cellCampaign} onClick={(e) => { if (g.campaignId) { e.stopPropagation(); onOpenCampaign(g.campaignId); } }}>
                {g.campaign ? (
                  <>
                    <div style={{ fontSize: 12.5, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.campaign}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{g.company}</div>
                  </>
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--fg-3)", fontStyle: "italic" }}>standalone</span>
                )}
              </div>
              <div style={GS_LIST.cellAts}>
                {g.ats != null ? (
                  <AtsPill ats={g.ats} />
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>—</span>
                )}
              </div>
              <div style={GS_LIST.cellModel}>
                <span className="mono nowrap" style={{ fontSize: 11, color: "var(--fg-3)" }}>
                  {g.model}
                </span>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>
                  {(g.duration / 1000).toFixed(1)}s
                </div>
              </div>
              <div style={GS_LIST.cellDate}>
                <span className="mono nowrap" style={{ fontSize: 11.5, color: "var(--fg-2)" }}>{g.at}</span>
                <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{g.ago}</div>
              </div>
              <div style={GS_LIST.cellAction}>
                <span style={{ color: "var(--fg-3)" }}><I.chevronRight size={14} /></span>
              </div>
            </button>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}

function AtsPill({ ats }) {
  const color = ats >= 75 ? "var(--success)" : ats >= 50 ? "var(--warning)" : "var(--danger)";
  const bg = ats >= 75 ? "var(--success-bg)" : ats >= 50 ? "var(--warning-bg)" : "var(--danger-bg)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "2px 8px",
      backgroundColor: bg,
      borderRadius: 999,
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      fontWeight: 600,
      color,
      whiteSpace: "nowrap",
    }}>
      {ats}
      <span style={{ color: "var(--fg-3)", fontWeight: 400, fontSize: 10 }}>/100</span>
    </span>
  );
}

function StatTile({ label, value, hint, suffix, valueColor, mono }) {
  return (
    <div className="ch-card" style={{ padding: 14 }}>
      <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 4 }}>
        <span style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-head)",
          fontSize: mono ? 18 : 24,
          fontWeight: 600,
          color: valueColor || "var(--fg-1)",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}>{value}</span>
        {suffix && <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{hint}</div>
    </div>
  );
}

// Filter segment
function FSeg({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{label}</span>
      <div style={{
        display: "inline-flex",
        background: "var(--bg-0)",
        border: "1px solid var(--border-m)",
        borderRadius: "var(--r-md)",
        padding: 2,
        height: 28,
      }}>
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: "0 9px",
              backgroundColor: value === o.v ? "var(--bg-2)" : "transparent",
              border: "none",
              color: value === o.v ? "var(--fg-1)" : "var(--fg-3)",
              fontSize: 11.5, fontWeight: 500,
              borderRadius: 3,
              fontFamily: o.l.length <= 3 ? "var(--font-mono)" : "inherit",
            }}
          >{o.l}</button>
        ))}
      </div>
    </div>
  );
}

function FSelect({ label, value, onChange, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{label}</span>
      <select
        className="ch-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: 28, width: "auto", fontSize: 12, padding: "2px 22px 2px 8px" }}
      >
        {children}
      </select>
    </div>
  );
}

const GS_LIST = {
  head: {
    display: "grid",
    gridTemplateColumns: "60px 1fr 1.4fr 90px 1fr 120px 30px",
    gap: 12,
    padding: "10px 16px",
    background: "var(--bg-0)",
    borderBottom: "1px solid var(--border-s)",
    fontSize: 10.5, color: "var(--fg-3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 500,
    alignItems: "center",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "60px 1fr 1.4fr 90px 1fr 120px 30px",
    gap: 12,
    padding: "11px 16px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    alignItems: "center",
    width: "100%",
  },
  cellType: { display: "flex", alignItems: "center" },
  cellTemplate: { minWidth: 0 },
  cellCampaign: { minWidth: 0 },
  cellAts: { display: "flex", justifyContent: "flex-start" },
  cellModel: { minWidth: 0 },
  cellDate: { textAlign: "left" },
  cellAction: { display: "flex", justifyContent: "flex-end", color: "var(--fg-3)" },
};

window.PageGenerationsList = PageGenerationsList;
