/* shell.jsx — sidebar, header, AppLayout, icons, mock data
   Globals exposed at bottom for cross-file use.
*/

// ---------- Tiny icon system (lucide-style, hand-rolled minimal stroke SVGs) ----------
// All icons are 14×14 at currentColor, 1.5 stroke. No fancy gradients, no fills.

const Icon = ({ d, size = 14, strokeWidth = 1.5, fill = "none", style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
    aria-hidden="true"
  >
    {d}
  </svg>
);

const I = {
  user: (p) => <Icon {...p} d={<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>} />,
  book: (p) => <Icon {...p} d={<><path d="M4 4h11a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3z"/><path d="M4 18a3 3 0 0 1 3-3h11"/></>} />,
  target: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></>} />,
  fileText: (p) => <Icon {...p} d={<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/></>} />,
  layout: (p) => <Icon {...p} d={<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></>} />,
  settings: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>} />,
  check: (p) => <Icon {...p} d={<path d="M4 12l5 5L20 6"/>} />,
  x: (p) => <Icon {...p} d={<><path d="M18 6L6 18M6 6l12 12"/></>} />,
  chevronRight: (p) => <Icon {...p} d={<path d="M9 6l6 6-6 6"/>} />,
  chevronLeft: (p) => <Icon {...p} d={<path d="M15 6l-6 6 6 6"/>} />,
  chevronDown: (p) => <Icon {...p} d={<path d="M6 9l6 6 6-6"/>} />,
  plus: (p) => <Icon {...p} d={<><path d="M12 5v14M5 12h14"/></>} />,
  search: (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>} />,
  sparkle: (p) => <Icon {...p} d={<path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>} />,
  download: (p) => <Icon {...p} d={<><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>} />,
  refresh: (p) => <Icon {...p} d={<><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>} />,
  sun: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>} />,
  moon: (p) => <Icon {...p} d={<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>} />,
  edit: (p) => <Icon {...p} d={<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>} />,
  trash: (p) => <Icon {...p} d={<><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>} />,
  briefcase: (p) => <Icon {...p} d={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>} />,
  graduationCap: (p) => <Icon {...p} d={<><path d="M22 10L12 5 2 10l10 5z"/><path d="M6 12v5a6 3 0 0 0 12 0v-5"/></>} />,
  code: (p) => <Icon {...p} d={<><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></>} />,
  globe: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>} />,
  send: (p) => <Icon {...p} d={<><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></>} />,
  zap: (p) => <Icon {...p} d={<path d="M13 2L3 14h8l-1 8 10-12h-8z"/>} />,
  alertTriangle: (p) => <Icon {...p} d={<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h0"/></>} />,
  loader: (p) => <Icon {...p} d={<path d="M21 12a9 9 0 1 1-6.2-8.6"/>} />,
  arrowUpRight: (p) => <Icon {...p} d={<><path d="M7 17L17 7"/><path d="M8 7h9v9"/></>} />,
  dot: (p) => <Icon {...p} d={<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>} />,
  copy: (p) => <Icon {...p} d={<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>} />,
  eye: (p) => <Icon {...p} d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>} />,
  brain: (p) => <Icon {...p} d={<path d="M9 4a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3 3 3 0 0 0 1 2 3 3 0 0 0-1 2 3 3 0 0 0 3 3v0a3 3 0 0 0 3 3 3 3 0 0 0 3-3V4z M15 4a3 3 0 0 1 3 3v0a3 3 0 0 1 3 3 3 3 0 0 1-1 2 3 3 0 0 1 1 2 3 3 0 0 1-3 3v0a3 3 0 0 1-3 3 3 3 0 0 1-3-3"/>} />,
  language: (p) => <Icon {...p} d={<><path d="M5 8h6M8 5v3M4 14h7M7 14a8 8 0 0 0 4-4M14 21l5-12 5 12M16 17h6"/></>} />,
  file: (p) => <Icon {...p} d={<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></>} />,
};

// ---------- Strings (FR + EN) ----------

const STR = {
  fr: {
    appName: "career-hub",
    nav: {
      profile: "Mon profil",
      journal: "Journal",
      campaigns: "Campagnes",
      generations: "Générations",
      templates: "Templates",
      settings: "Paramètres",
      dashboard: "Tableau de bord",
    },
    section: { workspace: "Espace de travail", config: "Configuration" },
    header: {
      langFr: "FR", langEn: "EN", theme: { dark: "Sombre", light: "Clair" },
    },
    pages: {
      onboarding: { crumb: "Configuration initiale" },
      profile: { crumb: "Mon profil" },
      campaign: { crumb: "Campagnes" },
      generation: { crumb: "Générations" },
    },
  },
  en: {
    appName: "career-hub",
    nav: {
      profile: "My profile",
      journal: "Journal",
      campaigns: "Campaigns",
      generations: "Generations",
      templates: "Templates",
      settings: "Settings",
      dashboard: "Dashboard",
    },
    section: { workspace: "Workspace", config: "Configuration" },
    header: {
      langFr: "FR", langEn: "EN", theme: { dark: "Dark", light: "Light" },
    },
    pages: {
      onboarding: { crumb: "Initial setup" },
      profile: { crumb: "My profile" },
      campaign: { crumb: "Campaigns" },
      generation: { crumb: "Generations" },
    },
  },
};

// ---------- Mock data — Jean Dupont, fullstack senior, France ----------

const MOCK = {
  user: {
    name: "Jean Dupont",
    handle: "jean.dupont@example.com",
    initials: "JD",
    location: "Lyon, France",
    yearsExp: 6,
  },
  profile: {
    identity: {
      title: { fr: "Développeur fullstack senior", en: "Senior fullstack engineer" },
      phone: "+33 6 12 34 56 78",
      site: "jeandupont.example.com",
      github: "github.com/jeandupont",
    },
    pitch: {
      fr: "Développeur fullstack avec 6 ans d'expérience sur des plateformes B2B exigeantes (santé, legal-tech, fintech). Je conçois et livre des produits TypeScript/Node de bout en bout, avec un goût marqué pour la rigueur de production : observabilité, tests, perf, et code lisible par celui qui passera après moi.",
      en: "Senior fullstack engineer with 6 years on demanding B2B platforms (health, legal-tech, fintech). I design and ship end-to-end TypeScript/Node products with a strong taste for production rigor: observability, testing, performance, and code that's readable by whoever picks it up next.",
    },
    sections: [
      { key: "pitch",        label: { fr: "Pitch pro",         en: "Pro pitch" },        filled: { fr: true,  en: true  }, words: 64 },
      { key: "soft_skills",  label: { fr: "Soft skills",       en: "Soft skills" },      filled: { fr: true,  en: false }, words: 38 },
      { key: "preferences",  label: { fr: "Préférences",       en: "Preferences" },      filled: { fr: true,  en: true  }, words: 52 },
      { key: "anti_patterns",label: { fr: "Anti-patterns",     en: "Anti-patterns" },    filled: { fr: true,  en: false }, words: 41 },
      { key: "voice",        label: { fr: "Voix",              en: "Voice" },            filled: { fr: true,  en: true  }, words: 29 },
      { key: "interests",    label: { fr: "Centres d'intérêt", en: "Interests" },        filled: { fr: false, en: false }, words: 0  },
    ],
    experiences: [
      {
        company: "Doctrine",
        role: "Senior fullstack engineer",
        status: "salarié",
        location: "Paris (remote)",
        start: "2023-04",
        end: null,
        techs: ["TypeScript", "Next.js", "Node", "Postgres", "ElasticSearch", "AWS"],
        achievementsFr: [
          "Refonte du moteur de recherche juridique — réduction p95 latency de 1.8s à 320ms",
          "Pilotage de la migration Postgres 13 → 16 sans downtime, 8M+ documents",
          "Mentorat de 3 devs juniors sur l'architecture event-driven",
        ],
      },
      {
        company: "Algolia",
        role: "Fullstack engineer (freelance, 8 mois)",
        status: "freelance",
        location: "Paris (remote)",
        start: "2022-06",
        end: "2023-03",
        techs: ["React", "Node", "Redis", "Kubernetes", "Go"],
        achievementsFr: [
          "Conception de l'UI de monitoring des index — adoptée par 4 équipes produit",
          "Optimisation du pipeline d'indexation : -42% de temps moyen par batch",
        ],
      },
      {
        company: "Padok",
        role: "DevOps engineer",
        status: "salarié",
        location: "Paris",
        start: "2020-09",
        end: "2022-05",
        techs: ["Kubernetes", "Terraform", "AWS", "GCP", "Python"],
        achievementsFr: [
          "Mise en place de plateformes K8s pour 6 clients scale-up (Doctolib, Back Market…)",
          "Auteur d'un module Terraform open-source — 200+ stars sur GitHub",
        ],
      },
    ],
    skills: {
      languages: ["TypeScript", "JavaScript", "Python", "Go", "SQL"],
      frameworks: ["React", "Next.js", "Node.js", "NestJS", "Prisma"],
      infra: ["Docker", "Kubernetes", "AWS", "Terraform", "PostgreSQL", "Redis"],
    },
  },
  campaign: {
    name: "Lead Dev — Doctolib",
    company: "Doctolib",
    role: "Senior Software Engineer",
    language: "fr",
    status: "INTERVIEWING",
    contact: { name: "Marie Lefèvre", email: "m.lefevre@doctolib.com" },
    updatedAt: "il y a 2 jours",
    jd: `Doctolib recherche un·e Senior Software Engineer pour rejoindre l'équipe Plateforme.

Stack : TypeScript, Ruby on Rails, React, Postgres, Kafka, AWS.

Missions :
- Concevoir et livrer des features critiques sur la plateforme de prise de rendez-vous (15M+ utilisateurs actifs).
- Driver la qualité technique au sein de l'équipe : revues de code, mentoring, RFCs.
- Contribuer aux décisions d'architecture sur les services Ruby/TypeScript.
- Participer à l'astreinte hebdomadaire.

Profil :
- 5+ ans d'expérience en développement backend ou fullstack.
- Maîtrise solide de TypeScript ou Ruby (idéalement les deux).
- Expérience Postgres en production (sharding, perf tuning).
- Goût pour la qualité de code, les tests, l'observabilité.
- Bonus : expérience Kafka, AWS, K8s.

Process : 4 entretiens — RH, technique pair-programming, system design, fit équipe.`,
    generations: [
      { id: "g_03may", type: "CV", template: "sobre-fr", at: "03 mai, 14:32", atsScore: 78, lang: "fr" },
      { id: "g_29apr", type: "CV", template: "sobre-fr-ats", at: "29 avr., 09:15", atsScore: 71, lang: "fr" },
      { id: "g_29apr_lm", type: "LM", template: "classique-fr", at: "29 avr., 09:22", atsScore: null, lang: "fr" },
    ],
  },
};

// ---------- Sidebar ----------

function Sidebar({ active, onNavigate, t, mobile = false, open = false, onClose }) {
  const items = [
    { key: "dashboard",   label: t.nav.dashboard,   icon: I.layout,   page: "dashboard" },
    { key: "profile",     label: t.nav.profile,     icon: I.user,     page: "profile" },
    { key: "journal",     label: t.nav.journal,     icon: I.book,     page: "journal",  count: 14 },
    { key: "campaigns",   label: t.nav.campaigns,   icon: I.target,   page: "campaigns", count: 8 },
    { key: "generations", label: t.nav.generations, icon: I.fileText, page: "generations", count: 23 },
    { key: "templates",   label: t.nav.templates,   icon: I.code,     page: "templates", count: 5 },
  ];
  // On mobile the sidebar is an off-canvas drawer; on desktop it's sticky.
  const asideStyle = mobile ? { ...S.sidebar, ...S.sidebarMobile } : S.sidebar;
  const go = (p) => { onNavigate(p); if (mobile && onClose) onClose(); };
  return (
    <aside style={asideStyle} className={mobile ? "ch-drawer-in" : undefined}>
      <div style={S.brand} onClick={() => go("dashboard")} role="button" tabIndex={0}>
        <div style={S.brandMark} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" fill="var(--accent)" />
            <path d="M8 14l3-3 3 3 3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>career-hub</span>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>self-hosted</span>
        </div>
        {mobile && (
          <button className="ch-btn ghost icon sm" onClick={(e) => { e.stopPropagation(); onClose && onClose(); }} title="Fermer" aria-label="Fermer le menu">
            <I.x />
          </button>
        )}
      </div>

      <div style={S.navSection}>
        <div style={S.navHeading}>{t.section.workspace}</div>
        {items.map((it) => {
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              style={{ ...S.navItem, ...(isActive ? S.navItemActive : {}) }}
              onClick={() => it.page && go(it.page)}
              disabled={!it.page}
            >
              <span style={S.navIcon}><it.icon /></span>
              <span style={{ flex: 1, textAlign: "left" }}>{it.label}</span>
              {it.count != null && (
                <span style={S.navCount}>{it.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={S.navSection}>
        <div style={S.navHeading}>{t.section.config}</div>
        <button
          style={{ ...S.navItem, ...(active === "settings" ? S.navItemActive : {}) }}
          onClick={() => go("settings")}
        >
          <span style={S.navIcon}><I.settings /></span>
          <span style={{ flex: 1, textAlign: "left" }}>{t.nav.settings}</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />
    </aside>
  );
}

// ---------- Header ----------

function Header({ crumbs, locale, onLocaleChange, theme, onThemeChange, t, rightExtra, onNavigate, onLogout, mobile = false, onMenu }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  // On mobile keep only the last crumb to avoid overflow.
  const shownCrumbs = mobile && crumbs.length > 1 ? crumbs.slice(-1) : crumbs;
  return (
    <header style={mobile ? { ...S.header, ...S.headerMobile } : S.header}>
      {mobile && (
        <button
          className="ch-btn ghost icon"
          onClick={onMenu}
          title="Menu"
          aria-label="Ouvrir le menu"
          style={{ flexShrink: 0 }}
        >
          <Icon size={18} d={<><path d="M3 6h18M3 12h18M3 18h18" /></>} />
        </button>
      )}
      <nav style={S.crumbs}>
        {shownCrumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={S.crumbSep}><I.chevronRight size={12} /></span>}
            <span style={i === shownCrumbs.length - 1 ? S.crumbActive : S.crumb}>{c}</span>
          </React.Fragment>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {rightExtra}

      {!mobile && (
        <div style={S.langSwitch} title="UI language">
          <button
            style={{ ...S.langBtn, ...(locale === "fr" ? S.langBtnActive : {}) }}
            onClick={() => onLocaleChange("fr")}
          >FR</button>
          <button
            style={{ ...S.langBtn, ...(locale === "en" ? S.langBtnActive : {}) }}
            onClick={() => onLocaleChange("en")}
          >EN</button>
        </div>
      )}

      <button
        className="ch-btn icon"
        title={theme === "dark" ? t.header.theme.light : t.header.theme.dark}
        onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <I.sun /> : <I.moon />}
      </button>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          title={MOCK.user.name}
          style={{
            ...S.avatar, width: 28, height: 28, fontSize: 11,
            border: menuOpen ? "1px solid var(--accent)" : "1px solid transparent",
            cursor: "pointer", padding: 0,
          }}
        >{MOCK.user.initials}</button>
        {menuOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 19 }} onClick={() => setMenuOpen(false)} />
            <div style={S.userMenu}>
              <div style={S.userMenuHead}>
                <div style={{ ...S.avatar, width: 34, height: 34, fontSize: 12 }}>{MOCK.user.initials}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>{MOCK.user.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis" }}>{MOCK.user.handle}</div>
                </div>
              </div>
              <div style={S.userMenuDivider} />
              <button className="ch-umenu-item" style={S.userMenuItem} onClick={() => { setMenuOpen(false); onNavigate && onNavigate("settings"); }}>
                <I.user size={14} /> <span>Mon compte</span>
              </button>
              <button className="ch-umenu-item" style={S.userMenuItem} onClick={() => { setMenuOpen(false); onNavigate && onNavigate("settings"); }}>
                <I.settings size={14} /> <span>Paramètres</span>
              </button>
              <div style={S.userMenuDivider} />
              <button
                className="ch-umenu-item"
                style={{ ...S.userMenuItem, color: "var(--danger)" }}
                onClick={() => { setMenuOpen(false); onLogout && onLogout(); }}
              >
                <I.arrowUpRight size={14} style={{ transform: "rotate(45deg)" }} /> <span>Se déconnecter</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// ---------- Styles for shell ----------

const S = {
  sidebar: {
    width: "var(--sidebar-w)",
    background: "var(--bg-1)",
    borderRight: "1px solid var(--border-s)",
    display: "flex",
    flexDirection: "column",
    padding: "16px 0 12px",
    flexShrink: 0,
    height: "100vh",
    position: "sticky",
    top: 0,
  },
  sidebarMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100dvh",
    width: "min(82vw, 300px)",
    zIndex: 50,
    boxShadow: "var(--shadow-lg)",
    transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
    willChange: "transform",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 16px 18px",
    borderBottom: "1px solid var(--border-s)",
    marginBottom: 14,
    cursor: "pointer",
  },
  brandMark: {
    width: 28, height: 28, borderRadius: 6,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  navSection: { padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 1 },
  navHeading: {
    fontSize: 10.5, fontWeight: 600, color: "var(--fg-3)",
    letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "8px 10px 6px",
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 9,
    padding: "7px 10px",
    backgroundColor: "transparent",
    border: "1px solid transparent",
    borderRadius: "var(--r-md)",
    color: "var(--fg-2)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  navItemActive: {
    backgroundColor: "var(--accent-bg)",
    color: "var(--accent-2)",
  },
  navIcon: { display: "flex", color: "currentColor" },
  navCount: {
    fontSize: 11, color: "var(--fg-3)",
    background: "var(--bg-2)",
    padding: "1px 6px",
    borderRadius: "var(--r-sm)",
    fontFamily: "var(--font-mono)",
  },
  sidebarFoot: {
    margin: "0 8px",
    padding: "10px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--bg-0)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-md)",
  },
  userMenu: {
    position: "absolute",
    top: 38,
    right: 0,
    zIndex: 20,
    width: 220,
    background: "var(--bg-2)",
    border: "1px solid var(--border-m)",
    borderRadius: "var(--r-md)",
    boxShadow: "var(--shadow-md)",
    padding: 4,
  },
  userMenuHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 8px 10px",
  },
  userMenuDivider: {
    height: 1,
    background: "var(--border-s)",
    margin: "4px 0",
  },
  userMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "8px 10px",
    background: "transparent",
    border: "none",
    borderRadius: "var(--r-sm)",
    color: "var(--fg-1)",
    fontSize: 13,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
  },
  avatar: {
    width: 30, height: 30,
    borderRadius: "var(--r-md)",
    background: "linear-gradient(135deg, var(--accent), #7e1450)",
    color: "white",
    fontSize: 12,
    fontWeight: 600,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-head)",
    flexShrink: 0,
  },
  header: {
    height: 56,
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid var(--border-s)",
    background: "var(--bg-0)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerMobile: {
    padding: "0 12px",
    gap: 6,
  },
  crumbs: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, minWidth: 0, overflow: "hidden" },
  crumb: { color: "var(--fg-3)", whiteSpace: "nowrap" },
  crumbActive: { color: "var(--fg-1)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  crumbSep: { color: "var(--fg-3)", display: "flex", flexShrink: 0 },
  langSwitch: {
    display: "flex", alignItems: "center",
    background: "var(--bg-1)",
    border: "1px solid var(--border-m)",
    borderRadius: "var(--r-md)",
    padding: 2,
    height: 32,
  },
  langBtn: {
    height: 26,
    padding: "0 8px",
    background: "transparent",
    border: "none",
    color: "var(--fg-3)",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.04em",
  },
  langBtnActive: { background: "var(--bg-2)", color: "var(--fg-1)" },
};

// Expose for cross-file use
Object.assign(window, {
  Icon, I, STR, MOCK, Sidebar, Header,
});
