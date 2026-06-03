/* app.jsx — root app : routing, theme/density state, Tweaks panel, mount */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "compact",
  "locale": "fr",
  "startScreen": "dashboard",
  "pageState": "filled"
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [page, setPage] = useState(tw.startScreen || "dashboard");
  const [editingTemplate, setEditingTemplate] = useState("sobre-fr");
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever we navigate or switch to desktop.
  useEffect(() => { setDrawerOpen(false); }, [page]);
  useEffect(() => { if (!isMobile) setDrawerOpen(false); }, [isMobile]);

  // Apply theme + density to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tw.theme);
    document.documentElement.setAttribute("data-density", tw.density);
  }, [tw.theme, tw.density]);

  // Sidebar active key
  const activeKey =
    page === "onboarding" || page === "login" ? null :
    page === "dashboard" ? "dashboard" :
    page === "profile" ? "profile" :
    page === "journal" ? "journal" :
    page === "campaigns" || page === "campaign" || page === "campaign-new" ? "campaigns" :
    page === "generations" || page === "generation" || page === "generation-new" ? "generations" :
    page === "templates" || page === "template-edit" ? "templates" :
    page === "settings" ? "settings" :
    null;

  // Crumbs per page
  const t = STR[tw.locale] || STR.fr;
  const crumbs =
    page === "onboarding" ? ["Configuration initiale", "Wizard"] :
    page === "login"      ? [] :
    page === "dashboard"  ? [t.nav.dashboard] :
    page === "profile"    ? [t.section.workspace, t.nav.profile] :
    page === "journal"    ? [t.section.workspace, t.nav.journal] :
    page === "campaigns"  ? [t.section.workspace, t.nav.campaigns] :
    page === "campaign"   ? [t.section.workspace, t.nav.campaigns, "Lead Dev — Doctolib"] :
    page === "campaign-new" ? [t.section.workspace, t.nav.campaigns, "Nouvelle campagne"] :
    page === "generations" ? [t.section.workspace, t.nav.generations] :
    page === "generation" ? [t.section.workspace, t.nav.campaigns, "Lead Dev — Doctolib", t.nav.generations, "03 mai"] :
    page === "generation-new" ? [t.section.workspace, t.nav.campaigns, "Lead Dev — Doctolib", "Nouvelle génération"] :
    page === "templates"  ? [t.section.workspace, t.nav.templates] :
    page === "template-edit" ? [t.section.workspace, t.nav.templates, editingTemplate] :
    page === "settings"   ? [t.section.config, t.nav.settings] :
    [];

  const showChrome = page !== "onboarding" && page !== "login";

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }} data-screen-label={page}>
      {showChrome && (!isMobile || drawerOpen) && (
        <Sidebar
          active={activeKey}
          onNavigate={(p) => setPage(p)}
          t={t}
          mobile={isMobile}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {showChrome && isMobile && drawerOpen && (
        <button
          className="ch-drawer-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100dvh", overflow: "hidden" }}>
        {showChrome && (
          <Header
            crumbs={crumbs}
            locale={tw.locale}
            onLocaleChange={(v) => setTweak("locale", v)}
            theme={tw.theme}
            onThemeChange={(v) => setTweak("theme", v)}
            onNavigate={(p) => setPage(p)}
            onLogout={() => setPage("login")}
            t={t}
            mobile={isMobile}
            onMenu={() => setDrawerOpen(true)}
            rightExtra={
              page === "profile" && !isMobile ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "0 10px", height: 30,
                  background: "var(--bg-1)",
                  border: "1px solid var(--border-m)",
                  borderRadius: "var(--r-md)",
                  fontSize: 11.5, color: "var(--fg-3)",
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--success)" }} />
                  Auto-saved · 2s
                </div>
              ) : null
            }
          />
        )}

        <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative", overflowY: "auto" }}>
          <div key={page}>
            {page === "login" && (
              <PageLogin onLoggedIn={() => setPage("dashboard")} />
            )}
            {page === "onboarding" && (
              <PageOnboarding locale={tw.locale} onFinish={() => setPage("dashboard")} />
            )}
            {page === "dashboard" && <PageDashboard locale={tw.locale} onNavigate={setPage} />}
            {page === "profile" && <PageProfile locale={tw.locale} pageState={tw.pageState} onNavigate={setPage} />}
            {page === "journal" && <PageJournal locale={tw.locale} pageState={tw.pageState} />}
            {page === "campaign" && (
              <PageCampaign
                locale={tw.locale}
                pageState={tw.pageState}
                onBack={() => setPage("campaigns")}
                onOpenGeneration={(id) => setPage(id === "new" ? "generation-new" : "generation")}
              />
            )}
            {page === "campaigns" && (
              <PageCampaignsList
                locale={tw.locale}
                pageState={tw.pageState}
                onOpenCampaign={(id) => setPage("campaign")}
                onNewCampaign={() => setPage("campaign-new")}
              />
            )}
            {page === "campaign-new" && (
              <PageCampaignNew
                locale={tw.locale}
                onCancel={() => setPage("campaigns")}
                onCreated={() => setPage("campaign")}
              />
            )}
            {page === "generation" && (
              <PageGeneration initialIsNew={false} pageState={tw.pageState} onBack={() => setPage("generations")} />
            )}
            {page === "generations" && (
              <PageGenerationsList
                locale={tw.locale}
                pageState={tw.pageState}
                onOpenGeneration={() => setPage("generation")}
                onOpenCampaign={() => setPage("campaign")}
              />
            )}
            {page === "generation-new" && (
              <PageGeneration initialIsNew={true} onBack={() => setPage("campaign")} />
            )}
            {page === "templates" && (
              <PageTemplates
                locale={tw.locale}
                pageState={tw.pageState}
                onOpenEditor={(name) => { setEditingTemplate(name); setPage("template-edit"); }}
              />
            )}
            {page === "template-edit" && (
              <PageTemplateEdit name={editingTemplate} onBack={() => setPage("templates")} />
            )}
            {page === "settings" && <PageSettings pageState={tw.pageState} />}
          </div>
        </div>

        {/* Page jumper (also discoverable bottom-left for the prototype) */}
        <PageJumper page={page} setPage={setPage} />
      </main>

      <FeedbackHost />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Apparence">
          <TweakRadio
            label="Thème"
            value={tw.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "dark", label: "Sombre" },
              { value: "light", label: "Clair" },
            ]}
          />
          <TweakRadio
            label="Densité"
            value={tw.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Confortable" },
            ]}
          />
          <TweakRadio
            label="Locale UI"
            value={tw.locale}
            onChange={(v) => setTweak("locale", v)}
            options={[
              { value: "fr", label: "FR" },
              { value: "en", label: "EN" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Navigation">
          <TweakSelect
            label="Page"
            value={page}
            onChange={setPage}
            options={[
              { value: "login", label: "00 — Login" },
              { value: "onboarding", label: "01 — Onboarding wizard" },
              { value: "dashboard", label: "02 — Dashboard" },
              { value: "profile", label: "03 — Mon profil" },
              { value: "journal", label: "04 — Journal" },
              { value: "campaigns", label: "05 — Campagnes (list)" },
              { value: "campaign", label: "05a — Campagne (detail)" },
              { value: "campaign-new", label: "05b — Nouvelle campagne (wizard)" },
              { value: "generations", label: "06 — Générations (list)" },
              { value: "generation", label: "06a — Génération (detail)" },
              { value: "generation-new", label: "06b — Génération (streaming)" },
              { value: "templates", label: "07 — Templates (gallery)" },
              { value: "template-edit", label: "07b — Template editor" },
              { value: "settings", label: "08 — Paramètres" },
            ]}
          />
          <TweakSelect
            label="État"
            value={tw.pageState}
            onChange={(v) => setTweak("pageState", v)}
            options={[
              { value: "filled", label: "Rempli" },
              { value: "empty", label: "Vide" },
              { value: "loading", label: "Chargement (skeleton)" },
              { value: "error", label: "Erreur" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Tiny fade-on-key wrapper (no library) — 100ms per brief
// (unused; kept for reference)
function FadeKey({ page, children }) {
  const [shown, setShown] = useState(page);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    if (page === shown) return;
    setOpacity(0);
    const t = setTimeout(() => {
      setShown(page);
      setOpacity(1);
    }, 100);
    return () => clearTimeout(t);
  }, [page, shown]);
  return (
    <div style={{ opacity, transition: "opacity 100ms ease" }} key={shown}>
      {children}
    </div>
  );
}

// Floating quick jumper that's visible until first click — helps user discover the prototype
function PageJumper({ page, setPage }) {
  const [hidden, setHidden] = useState(false);
  const isMobile = useIsMobile();
  if (hidden) return null;
  const items = [
    { v: "login", l: "Login" },
    { v: "onboarding", l: "Onboarding" },
    { v: "dashboard", l: "Dashboard" },
    { v: "profile", l: "Profil" },
    { v: "journal", l: "Journal" },
    { v: "campaigns", l: "Campagnes" },
    { v: "campaign", l: "+ Detail" },
    { v: "campaign-new", l: "+ Nouv." },
    { v: "generations", l: "Générations" },
    { v: "generation", l: "+ Detail" },
    { v: "generation-new", l: "▶ streaming" },
    { v: "templates", l: "Templates" },
    { v: "template-edit", l: "Editor" },
    { v: "settings", l: "Paramètres" },
  ];
  return (
    <div style={{
      position: "fixed",
      left: isMobile ? 8 : 16,
      bottom: isMobile ? 8 : 16,
      zIndex: 30,
      background: "var(--bg-2)",
      border: "1px solid var(--border-m)",
      borderRadius: "var(--r-md)",
      boxShadow: "var(--shadow-md)",
      padding: 6,
      display: "flex",
      gap: 4,
      fontSize: 12,
      maxWidth: isMobile ? "calc(100vw - 16px)" : "calc(100vw - 320px)",
      overflowX: "auto",
      alignItems: "center",
    }}>
      {items.map((it) => (
        <button
          key={it.v}
          onClick={() => setPage(it.v)}
          style={{
            padding: "5px 9px",
            border: "1px solid transparent",
            background: page === it.v ? "var(--accent-bg)" : "transparent",
            color: page === it.v ? "var(--accent-2)" : "var(--fg-2)",
            borderRadius: 4,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {it.l}
        </button>
      ))}
      <button onClick={() => setHidden(true)} className="ch-btn ghost icon sm" style={{ marginLeft: 4, flexShrink: 0 }} title="Masquer">
        <I.x />
      </button>
    </div>
  );
}

// Mount ============================================================
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
