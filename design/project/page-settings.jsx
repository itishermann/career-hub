/* page-settings.jsx — Settings (LLM + API tokens + profile)
   Sub-tab navigation via internal state.
*/

const MOCK_TOKENS = [
  {
    id: "t1", name: "Claude Desktop (perso)",
    scopes: ["profile:read", "campaigns:write", "generations:write"],
    expiresAt: "2026-12-31",
    lastUsedAt: "il y a 4 jours",
    createdAt: "12 jan. 2026",
  },
  {
    id: "t2", name: "Claude Code (MBP work)",
    scopes: ["profile:read", "journal:write", "templates:read"],
    expiresAt: null,
    lastUsedAt: "il y a 2 heures",
    createdAt: "03 mar. 2026",
  },
  {
    id: "t3", name: "Test ad hoc",
    scopes: ["profile:read"],
    expiresAt: "2026-06-01",
    lastUsedAt: null,
    createdAt: "20 mai 2026",
  },
];

const ALL_SCOPES = [
  { v: "profile:read",      g: "Profil",      d: "Lire profil et sections" },
  { v: "profile:write",     g: "Profil",      d: "Modifier profil et sections" },
  { v: "journal:read",      g: "Journal",     d: "Lire entrées et faits" },
  { v: "journal:write",     g: "Journal",     d: "Ajouter / éditer entrées" },
  { v: "campaigns:read",    g: "Campagnes",   d: "Lire campagnes et JD" },
  { v: "campaigns:write",   g: "Campagnes",   d: "Créer / modifier campagnes" },
  { v: "generations:read",  g: "Générations", d: "Lire CV / LM générés" },
  { v: "generations:write", g: "Générations", d: "Lancer des générations" },
  { v: "templates:read",    g: "Templates",   d: "Lire templates" },
  { v: "templates:write",   g: "Templates",   d: "Modifier templates" },
];

function PageSettings({ initialTab = "account", pageState = "filled" }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState(initialTab);

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22 }}>Paramètres</h1>
      </div>
      <div style={{ color: "var(--fg-3)", fontSize: 13, marginBottom: 22 }}>
        Configuration locale de l'instance. Aucune valeur n'est partagée avec d'autres utilisateurs.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "200px 1fr", gap: isMobile ? 16 : 28, alignItems: "start" }}>
        {/* Side tabs */}
        <nav style={isMobile
          ? { display: "flex", flexDirection: "row", gap: 6, overflowX: "auto", paddingBottom: 4 }
          : { display: "flex", flexDirection: "column", gap: 1, position: "sticky", top: 70 }}>
          {[
            { v: "account",   label: "Compte",          icon: <I.user />, desc: "Identité, email, sessions" },
            { v: "llm",       label: "Moteur LLM",      icon: <I.zap />, desc: "Mode local / Anthropic" },
            { v: "tokens",    label: "Tokens API",      icon: <I.code />, desc: "MCP, intégrations" },
            { v: "profile",   label: "Préférences",     icon: <I.settings />, desc: "Langue UI, défauts" },
            { v: "danger",    label: "Zone dangereuse", icon: <I.alertTriangle />, desc: "Export, reset" },
          ].map((it) => (
            <button
              key={it.v}
              onClick={() => setTab(it.v)}
              style={{
                ...SET.tab,
                ...(tab === it.v ? SET.tabActive : {}),
                ...(isMobile ? { whiteSpace: "nowrap", flexShrink: 0 } : {}),
              }}
            >
              <span style={{ color: tab === it.v ? "var(--accent-2)" : "var(--fg-3)" }}>{it.icon}</span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.3 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{it.label}</span>
                {!isMobile && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{it.desc}</span>}
              </div>
            </button>
          ))}
        </nav>

        <div>
          {tab === "account" && <SettingsAccount pageState={pageState} />}
          {tab === "llm"     && <SettingsLlm    pageState={pageState} />}
          {tab === "tokens"  && <SettingsTokens pageState={pageState} />}
          {tab === "profile" && <SettingsProfile />}
          {tab === "danger"  && <SettingsDanger />}
        </div>
      </div>
    </div>
  );
}

// ----- Account -----------------------------------------------
const MOCK_SESSIONS = [
  { id: "s1", current: true,  device: "Chrome · macOS",   where: "Lyon, France",      ip: "82.66.xx.xx",  lastActive: "maintenant",       createdAt: "il y a 2 jours" },
  { id: "s2", current: false, device: "Firefox · Linux",  where: "Lyon, France",      ip: "82.66.xx.xx",  lastActive: "il y a 5 heures",  createdAt: "il y a 1 semaine" },
  { id: "s3", current: false, device: "Safari · iPhone",  where: "Paris, France",     ip: "176.x.xx.xx",  lastActive: "il y a 3 jours",   createdAt: "il y a 3 semaines" },
  { id: "s4", current: false, device: "Claude Desktop",   where: "localhost",          ip: "127.0.0.1",    lastActive: "il y a 2 heures",  createdAt: "il y a 1 mois" },
];

function SettingsAccount({ pageState }) {
  const [name, setName] = useState(MOCK.user.name);
  const [email] = useState(MOCK.user.handle);
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState("idle"); // idle | saving | saved
  const [avatarColor, setAvatarColor] = useState("magenta");
  const [avatarImg, setAvatarImg] = useState(null);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const fileRef = useRef(null);

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

  const AVATAR_COLORS = {
    magenta: "linear-gradient(135deg, var(--accent), #7e1450)",
    blue:    "linear-gradient(135deg, #0284c7, #075985)",
    green:   "linear-gradient(135deg, #16a34a, #14532d)",
    slate:   "linear-gradient(135deg, #475569, #1e293b)",
    amber:   "linear-gradient(135deg, #d97706, #92400e)",
  };

  const handleSave = () => {
    setSavingState("saving");
    setTimeout(() => {
      setSavingState("saved");
      setDirty(false);
      setTimeout(() => setSavingState("idle"), 1800);
    }, 800);
  };

  const otherSessions = sessions.filter((s) => !s.current);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Identity ----------------------------------------------- */}
      <Section
        title="Identité"
        hint="Ces informations apparaissent dans la chrome de l'app et sur les e-mails de connexion. Elles ne sont pas reprises dans tes CV — ça, c'est ton profil de carrière."
      >
        {/* Avatar row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: "var(--r-lg)",
            background: avatarImg ? `center/cover no-repeat url(${avatarImg})` : AVATAR_COLORS[avatarColor],
            color: "white",
            fontFamily: "var(--font-head)",
            fontWeight: 600,
            fontSize: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>{avatarImg ? "" : initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 8 }}>
              Avatar — initiales générées, ou image carrée (max 1 Mo).
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button className="ch-btn sm" onClick={() => fileRef.current?.click()}>
                <I.download style={{ transform: "rotate(180deg)" }} /> Importer
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                if (f.size > 1024 * 1024) { toast("Image trop lourde (max 1 Mo)", { type: "error" }); return; }
                const reader = new FileReader();
                reader.onload = () => { setAvatarImg(reader.result); setDirty(true); toast("Avatar mis à jour", { type: "success" }); };
                reader.readAsDataURL(f);
              }} />
              <span style={{ width: 1, height: 18, background: "var(--border-m)", margin: "0 2px" }} />
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Teinte</span>
              {Object.entries(AVATAR_COLORS).map(([key, bg]) => (
                <button
                  key={key}
                  onClick={() => { setAvatarColor(key); setDirty(true); }}
                  title={key}
                  style={{
                    width: 22, height: 22,
                    borderRadius: "var(--r-sm)",
                    background: bg,
                    border: avatarColor === key ? "2px solid var(--fg-1)" : "1px solid var(--border-m)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <Field label="Nom complet">
          <input
            className="ch-input"
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); }}
            style={{ maxWidth: 360 }}
          />
        </Field>

        {/* Save bar inside identity */}
        {dirty && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="ch-btn ghost" onClick={() => { setName(MOCK.user.name); setAvatarColor("magenta"); setDirty(false); }}>
              Annuler
            </button>
            <button className="ch-btn primary" onClick={handleSave} disabled={savingState === "saving"}>
              {savingState === "saving"
                ? <><span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span> Sauvegarde…</>
                : <><I.check /> Sauvegarder</>}
            </button>
          </div>
        )}
        {savingState === "saved" && !dirty && (
          <span style={{ color: "var(--success)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <I.check size={12} /> Identité mise à jour
          </span>
        )}
      </Section>

      {/* Email + auth ------------------------------------------- */}
      <Section
        title="Adresse e-mail & connexion"
        hint="career-hub utilise une authentification par lien magique — pas de mot de passe. Ton e-mail est l'unique identifiant de connexion."
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 14px",
          background: "var(--bg-0)",
          border: "1px solid var(--border-s)",
          borderRadius: "var(--r-md)",
        }}>
          <span style={{ color: "var(--fg-3)" }}><I.send /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 13, color: "var(--fg-1)" }}>{email}</div>
            <div style={{ fontSize: 11.5, color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <I.check size={11} /> Vérifié
            </div>
          </div>
          <button className="ch-btn sm" onClick={() => setChangeEmailOpen(true)}>
            <I.edit /> Changer
          </button>
        </div>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55,
        }}>
          <span style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }}><I.dot /></span>
          <span>
            Changer d'e-mail nécessite de confirmer la nouvelle adresse via un lien envoyé dessus. L'ancienne reste active tant que la nouvelle n'est pas validée.
          </span>
        </div>
      </Section>

      {/* Sessions ----------------------------------------------- */}
      <Section
        title="Sessions actives"
        hint="Les appareils et clients connectés à ton compte. Révoque ceux que tu ne reconnais pas."
        action={
          otherSessions.length > 0 ? (
            <button className="ch-btn ghost sm danger" onClick={() => setRevokeAllOpen(true)}>
              <I.x /> Tout déconnecter
            </button>
          ) : null
        }
      >
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-s)", borderRadius: "var(--r-md)" }}>
          {sessions.map((s, i) => (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 14px",
              borderTop: i === 0 ? "none" : "1px solid var(--border-s)",
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: "var(--r-md)",
                background: "var(--bg-0)", border: "1px solid var(--border-m)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--fg-3)", flexShrink: 0,
              }}>
                {s.device.includes("Claude") ? <I.code size={14} /> : <I.globe size={14} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>{s.device}</span>
                  {s.current && <span className="ch-badge success">cette session</span>}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
                  {s.where} · {s.ip} · actif {s.lastActive}
                </div>
              </div>
              {s.current ? (
                <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>—</span>
              ) : (
                <button
                  className="ch-btn ghost sm danger"
                  onClick={() => setSessions(sessions.filter((x) => x.id !== s.id))}
                  title="Révoquer cette session"
                >
                  <I.x /> Révoquer
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {changeEmailOpen && (
        <ChangeEmailModal current={email} onClose={() => setChangeEmailOpen(false)} />
      )}
      {revokeAllOpen && (
        <ConfirmModal
          title="Déconnecter toutes les autres sessions ?"
          body={`${otherSessions.length} session${otherSessions.length > 1 ? "s seront fermées" : " sera fermée"}. Tu resteras connecté ici. Les clients MCP devront se reconnecter avec leur token.`}
          confirm="Tout déconnecter"
          onCancel={() => setRevokeAllOpen(false)}
          onConfirm={() => { setSessions(sessions.filter((s) => s.current)); setRevokeAllOpen(false); }}
        />
      )}
    </div>
  );
}

function ChangeEmailModal({ current, onClose }) {
  const [newEmail, setNewEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const valid = /.+@.+\..+/.test(newEmail) && newEmail !== current;

  const submit = () => {
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); }, 900);
  };

  return (
    <Modal onClose={onClose} title="Changer d'adresse e-mail" width={460}>
      {!sent ? (
        <>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Adresse actuelle">
              <input className="ch-input" value={current} disabled style={{ fontFamily: "var(--font-mono)", opacity: 0.6 }} />
            </Field>
            <Field label="Nouvelle adresse" hint="Un lien de confirmation y sera envoyé.">
              <input
                className="ch-input"
                type="email"
                autoFocus
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouvelle@adresse.com"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border-s)", background: "var(--bg-0)" }}>
            <div style={{ flex: 1 }} />
            <button className="ch-btn ghost" onClick={onClose}>Annuler</button>
            <button className="ch-btn primary" disabled={!valid || sending} onClick={submit}>
              {sending
                ? <><span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span> Envoi…</>
                : <><I.send /> Envoyer le lien</>}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: 18 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 999,
              background: "var(--success-bg)", color: "var(--success)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <I.check size={20} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Lien de confirmation envoyé</div>
            <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
              Clique sur le lien envoyé à <strong className="mono" style={{ color: "var(--fg-1)" }}>{newEmail}</strong> pour valider le changement. Ton adresse actuelle reste active jusque-là.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border-s)", background: "var(--bg-0)" }}>
            <div style={{ flex: 1 }} />
            <button className="ch-btn primary" onClick={onClose}>Compris</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ----- LLM ---------------------------------------------------
function SettingsLlm({ pageState }) {
  const [mode, setMode] = useState("local");
  const [config, setConfig] = useState({
    localUrl: "http://192.168.1.42:11434/v1",
    localApiKey: "",
    chatModel: "llama3.3:70b",
    embeddingModel: "nomic-embed-text",
    embeddingDim: 768,
    anthKey: "sk-ant-…stored hashed",
    anthModel: "claude-opus-4-7",
  });
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState("idle"); // idle | saving | saved | error
  const [testState, setTestState] = useState("idle"); // idle | testing | ok | error
  const [confirmSwitch, setConfirmSwitch] = useState(null); // pending mode change

  const set = (k, v) => { setConfig((c) => ({ ...c, [k]: v })); setDirty(true); };

  const handleSave = () => {
    setSavingState("saving");
    setTimeout(() => {
      setSavingState(pageState === "error" ? "error" : "saved");
      if (pageState !== "error") setDirty(false);
      setTimeout(() => setSavingState("idle"), 1800);
    }, 900);
  };

  const handleTest = () => {
    setTestState("testing");
    setTimeout(() => setTestState(pageState === "error" ? "error" : "ok"), 1100);
  };

  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setConfirmSwitch(newMode);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section
        title="Mode"
        hint="Toutes les tâches LLM passent par le mode actif. Le switch ne supprime aucune config inactive."
      >
        <div style={{
          display: "inline-flex",
          background: "var(--bg-0)",
          border: "1px solid var(--border-m)",
          borderRadius: "var(--r-md)",
          padding: 3,
          marginBottom: 14,
        }}>
          {[
            { v: "local",     l: "Local (self-hosted)", i: <I.zap /> },
            { v: "anthropic", l: "Anthropic",           i: <I.sparkle /> },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => handleModeChange(o.v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px",
                background: mode === o.v ? "var(--bg-1)" : "transparent",
                border: mode === o.v ? "1px solid var(--border-m)" : "1px solid transparent",
                borderRadius: "var(--r-sm)",
                color: mode === o.v ? "var(--fg-1)" : "var(--fg-3)",
                fontSize: 12.5, fontWeight: 500,
              }}
            >
              {o.i}
              {o.l}
              {mode === o.v && <span className="ch-badge accent" style={{ marginLeft: 4 }}>actif</span>}
            </button>
          ))}
        </div>
        {mode === "anthropic" && (
          <div style={{
            padding: "10px 12px",
            background: "var(--warning-bg)",
            borderRadius: "var(--r-md)",
            fontSize: 12, color: "var(--fg-2)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }}><I.alertTriangle size={14} /></span>
            <span>RAG sémantique désactivé en mode Anthropic. La recherche journal passe en full-text PostgreSQL.</span>
          </div>
        )}
      </Section>

      {mode === "local" && (
        <Section title="Endpoint local" hint="Compatible OpenAI : Ollama, LM Studio, llama.cpp server.">
          <Field label="URL">
            <input
              className="ch-input"
              value={config.localUrl}
              onChange={(e) => set("localUrl", e.target.value)}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </Field>
          <Field label="API key (optionnelle)">
            <input
              className="ch-input"
              type="password"
              value={config.localApiKey}
              onChange={(e) => set("localApiKey", e.target.value)}
              placeholder="sk-…"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Modèle de chat">
              <select className="ch-select" value={config.chatModel} onChange={(e) => set("chatModel", e.target.value)}>
                <option>llama3.3:70b</option>
                <option>qwen2.5-coder:32b</option>
                <option>mistral-large:latest</option>
                <option>mixtral:8x22b</option>
              </select>
            </Field>
            <Field label="Modèle d'embeddings">
              <select className="ch-select" value={config.embeddingModel} onChange={(e) => set("embeddingModel", e.target.value)}>
                <option>nomic-embed-text</option>
                <option>mxbai-embed-large</option>
                <option>bge-large-en-v1.5</option>
              </select>
            </Field>
          </div>
          <Field label="Dimensions" hint="Doit correspondre au modèle.">
            <input
              className="ch-input"
              type="number"
              value={config.embeddingDim}
              onChange={(e) => set("embeddingDim", parseInt(e.target.value || "0"))}
              style={{ fontFamily: "var(--font-mono)", maxWidth: 180 }}
            />
          </Field>

          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
            <button className="ch-btn" onClick={handleTest} disabled={testState === "testing"}>
              {testState === "testing"
                ? <><span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span> Test en cours…</>
                : <><I.zap /> Tester la connexion</>}
            </button>
            {testState === "ok" && (
              <span style={{ color: "var(--success)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.check size={12} /> Endpoint OK · 4 modèles · embeddings 768d (cohérent)
              </span>
            )}
            {testState === "error" && (
              <span style={{ color: "var(--danger)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.x size={12} /> Connection refused
              </span>
            )}
          </div>
        </Section>
      )}

      {mode === "anthropic" && (
        <Section title="Anthropic" hint="Ta clé n'est jamais affichée en clair après sauvegarde — elle est stockée chiffrée et hachée pour signature.">
          <Field label="Clé API">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="ch-input"
                type="password"
                value={config.anthKey}
                onChange={(e) => set("anthKey", e.target.value)}
                placeholder="sk-ant-…"
                style={{ flex: 1, fontFamily: "var(--font-mono)" }}
              />
              <button className="ch-btn" onClick={handleTest} disabled={testState === "testing"}>
                {testState === "testing" ? "Test…" : "Tester"}
              </button>
            </div>
            {testState === "ok" && (
              <div style={{ marginTop: 6, color: "var(--success)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.check size={12} /> Clé valide · models/list a renvoyé 12 entrées
              </div>
            )}
          </Field>
          <Field label="Modèle de chat">
            <select className="ch-select" value={config.anthModel} onChange={(e) => set("anthModel", e.target.value)}>
              <option value="claude-opus-4-7">claude-opus-4-7 — recommandé CV/LM</option>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6 — bon compromis</option>
              <option value="claude-haiku-4-5">claude-haiku-4-5 — rapide</option>
            </select>
          </Field>
        </Section>
      )}

      {/* Save bar - explicit save */}
      <div style={{
        position: "sticky",
        bottom: 0,
        marginTop: 4,
        padding: 14,
        background: "var(--bg-1)",
        border: "1px solid var(--border-m)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-sm)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {dirty ? (
            <span style={{ color: "var(--warning)" }}>Modifications non sauvegardées.</span>
          ) : (
            <span>Pas d'auto-save sur cette page sensible.</span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {savingState === "saved" && (
          <span style={{ color: "var(--success)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <I.check size={12} /> Sauvegardé
          </span>
        )}
        {savingState === "error" && (
          <span style={{ color: "var(--danger)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <I.x size={12} /> Erreur · réessaie
          </span>
        )}
        <button className="ch-btn ghost" disabled={!dirty} onClick={() => { setDirty(false); }}>
          Annuler
        </button>
        <button className="ch-btn primary" disabled={!dirty || savingState === "saving"} onClick={handleSave}>
          {savingState === "saving"
            ? <><span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span> Sauvegarde…</>
            : <><I.check /> Sauvegarder</>}
        </button>
      </div>

      {confirmSwitch && (
        <ConfirmModal
          title={`Basculer en mode ${confirmSwitch === "local" ? "Local" : "Anthropic"} ?`}
          body={confirmSwitch === "anthropic"
            ? "La recherche sémantique du journal va être désactivée. Tes embeddings existants restent en BDD au cas où tu reviendrais en mode local."
            : "Si ton journal est rempli, une réindexation en arrière-plan va générer les embeddings manquants."}
          confirm={`Basculer en ${confirmSwitch === "local" ? "Local" : "Anthropic"}`}
          onCancel={() => setConfirmSwitch(null)}
          onConfirm={() => { setMode(confirmSwitch); setConfirmSwitch(null); setDirty(true); }}
        />
      )}
    </div>
  );
}

// ----- Tokens ------------------------------------------------
function SettingsTokens({ pageState }) {
  const [tokens, setTokens] = useState(pageState === "empty" ? [] : MOCK_TOKENS);
  const [creating, setCreating] = useState(false);
  const [revealing, setRevealing] = useState(null);

  if (pageState === "loading") return (
    <div className="ch-card">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-s)" }}>
          <Skel w={180} h={14} />
          <div style={{ flex: 1 }} />
          <Skel w={120} h={14} />
          <Skel w={80} h={14} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section
        title="Tokens API"
        hint="Sert à connecter Claude Desktop, Claude Code et autres clients MCP. Un token donne accès aux scopes que tu coches — pas plus."
        action={
          <button className="ch-btn primary" onClick={() => setCreating(true)}>
            <I.plus /> Créer un token
          </button>
        }
      >
        {tokens.length === 0 ? (
          <EmptyState
            icon={<I.code size={20} />}
            title="Aucun token actif"
            hint="Crée un token pour qu'un client externe (Claude Code, Claude Desktop, scripts) puisse parler au serveur MCP de career-hub."
            action={
              <button className="ch-btn primary" onClick={() => setCreating(true)}>
                <I.plus /> Créer mon premier token
              </button>
            }
          />
        ) : (
          <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-s)", borderRadius: "var(--r-md)" }}>
            {tokens.map((t, i) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 14px",
                borderTop: i === 0 ? "none" : "1px solid var(--border-s)",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t.name}</span>
                    {t.expiresAt
                      ? <span className="ch-badge">expire {t.expiresAt}</span>
                      : <span className="ch-badge warning">sans expiration</span>}
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {t.scopes.map((s) => (
                      <span key={s} className="ch-badge mono" style={{ fontSize: 10 }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                  <div>créé {t.createdAt}</div>
                  <div>{t.lastUsedAt ? `utilisé ${t.lastUsedAt}` : "jamais utilisé"}</div>
                </div>
                <button
                  className="ch-btn ghost sm danger"
                  onClick={() => setTokens(tokens.filter((x) => x.id !== t.id))}
                  title="Révoquer"
                >
                  <I.trash />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Endpoint MCP" hint="URL à donner aux clients après création d'un token.">
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px",
          background: "var(--bg-0)",
          border: "1px solid var(--border-s)",
          borderRadius: "var(--r-md)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}>
          <I.globe />
          <span style={{ color: "var(--fg-1)" }}>https://hub.example.com/api/mcp</span>
          <div style={{ flex: 1 }} />
          <button className="ch-btn ghost sm" onClick={() => copyText("https://hub.example.com/api/mcp", "URL MCP copiée")}><I.copy /> Copier</button>
        </div>
      </Section>

      {creating && (
        <TokenCreateModal
          onClose={() => setCreating(false)}
          onCreated={(token) => {
            setTokens([token, ...tokens]);
            setRevealing(token);
            setCreating(false);
          }}
        />
      )}

      {revealing && (
        <TokenRevealModal token={revealing} onClose={() => setRevealing(null)} />
      )}
    </div>
  );
}

function TokenCreateModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(["profile:read"]);
  const [expiry, setExpiry] = useState("90d");
  const [creating, setCreating] = useState(false);

  const toggleScope = (v) => {
    setScopes((s) => s.includes(v) ? s.filter((x) => x !== v) : [...s, v]);
  };

  const groups = ALL_SCOPES.reduce((acc, s) => {
    (acc[s.g] ||= []).push(s); return acc;
  }, {});

  const handleCreate = () => {
    setCreating(true);
    setTimeout(() => {
      const t = {
        id: "t_new",
        name: name || "Token sans nom",
        scopes,
        expiresAt: expiry === "never" ? null : new Date(Date.now() + (expiry === "30d" ? 30 : expiry === "90d" ? 90 : 365) * 86400e3).toISOString().slice(0, 10),
        lastUsedAt: null,
        createdAt: new Date().toISOString().slice(0, 10),
        plainToken: "chk_" + [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join(""),
      };
      onCreated(t);
    }, 700);
  };

  return (
    <Modal onClose={onClose} title="Créer un token API" width={620}>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nom" hint="Pour s'y retrouver dans la liste.">
          <input
            className="ch-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Claude Desktop perso"
            autoFocus
          />
        </Field>

        <Field label="Scopes" hint={`${scopes.length} sélectionné${scopes.length > 1 ? "s" : ""}`}>
          <div style={{ background: "var(--bg-0)", border: "1px solid var(--border-s)", borderRadius: "var(--r-md)", maxHeight: 280, overflow: "auto" }}>
            {Object.entries(groups).map(([g, list], gi) => (
              <div key={g} style={{ borderTop: gi === 0 ? "none" : "1px solid var(--border-s)" }}>
                <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
                  {g}
                </div>
                {list.map((s) => (
                  <label key={s.v} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 12px",
                    cursor: "pointer",
                    background: scopes.includes(s.v) ? "var(--accent-bg)" : "transparent",
                  }}>
                    <input
                      type="checkbox"
                      checked={scopes.includes(s.v)}
                      onChange={() => toggleScope(s.v)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-1)", minWidth: 140 }}>{s.v}</span>
                    <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{s.d}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Field>

        <Field label="Expiration">
          <select className="ch-select" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={{ maxWidth: 260 }}>
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
            <option value="365d">1 an</option>
            <option value="never">Jamais (déconseillé)</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border-s)", background: "var(--bg-0)" }}>
        <div style={{ flex: 1 }} />
        <button className="ch-btn ghost" onClick={onClose}>Annuler</button>
        <button
          className="ch-btn primary"
          disabled={creating || scopes.length === 0}
          onClick={handleCreate}
        >
          {creating
            ? <><span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span> Création…</>
            : <><I.check /> Créer le token</>}
        </button>
      </div>
    </Modal>
  );
}

function TokenRevealModal({ token, onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal onClose={onClose} title="Token créé — copie-le maintenant" width={620} preventClose>
      <div style={{ padding: 18 }}>
        <div style={{
          padding: "12px 14px",
          background: "var(--warning-bg)",
          borderRadius: "var(--r-md)",
          fontSize: 12.5, color: "var(--fg-2)",
          display: "flex", gap: 10, alignItems: "flex-start",
          marginBottom: 16,
          lineHeight: 1.5,
        }}>
          <span style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }}>
            <I.alertTriangle />
          </span>
          <div>
            <strong style={{ color: "var(--fg-1)" }}>Ce token ne sera plus jamais affiché.</strong>
            <div>Copie-le et range-le dans ton gestionnaire de secrets immédiatement. Si tu le perds, tu devras en créer un nouveau.</div>
          </div>
        </div>

        <div style={{
          display: "flex", gap: 8,
          padding: 12,
          background: "var(--bg-0)",
          border: "1px solid var(--border-m)",
          borderRadius: "var(--r-md)",
          alignItems: "center",
        }}>
          <code style={{
            flex: 1,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-1)",
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}>{token.plainToken}</code>
          <button
            className={`ch-btn ${copied ? "" : "primary"} sm`}
            onClick={() => {
              navigator.clipboard?.writeText?.(token.plainToken);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <><I.check /> Copié</> : <><I.copy /> Copier</>}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="ch-label">Configuration pour Claude Desktop / Code</div>
          <pre style={{
            margin: 0,
            padding: 12,
            background: "var(--bg-0)",
            border: "1px solid var(--border-s)",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-2)",
            lineHeight: 1.55,
            overflow: "auto",
          }}>{`{
  "mcpServers": {
    "career-hub": {
      "url": "https://hub.example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer ${token.plainToken.slice(0, 20)}…"
      }
    }
  }
}`}</pre>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border-s)", background: "var(--bg-0)" }}>
        <div style={{ flex: 1 }} />
        <button className="ch-btn primary" onClick={onClose}>
          <I.check /> J'ai copié le token
        </button>
      </div>
    </Modal>
  );
}

function SettingsProfile() {
  return (
    <Section title="Préférences" hint="Choix par défaut pour ton compte.">
      <Field label="Langue UI par défaut">
        <select className="ch-select" defaultValue="fr" style={{ maxWidth: 200 }}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </Field>
      <Field label="Langue de génération par défaut" hint="Surchargée campagne par campagne.">
        <select className="ch-select" defaultValue="fr" style={{ maxWidth: 200 }}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </Field>
      <Field label="Fuseau horaire">
        <select className="ch-select" defaultValue="Europe/Paris" style={{ maxWidth: 280 }}>
          <option>Europe/Paris</option>
          <option>UTC</option>
          <option>America/New_York</option>
        </select>
      </Field>
    </Section>
  );
}

function SettingsDanger() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section title="Export du profil" hint="Format markdown compatible avec le seed initial.">
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ch-btn" onClick={() => downloadText("profil-fr.md", "# Profil (FR)\n\nExport markdown du profil consolid\u00e9 \u2014 career-hub.", "text/markdown;charset=utf-8")}><I.download /> Exporter en français</button>
          <button className="ch-btn" onClick={() => downloadText("profile-en.md", "# Profile (EN)\n\nMarkdown export of the consolidated profile \u2014 career-hub.", "text/markdown;charset=utf-8")}><I.download /> Exporter en anglais</button>
        </div>
      </Section>

      <div className="ch-card" style={{ borderColor: "var(--danger)", borderWidth: 1 }}>
        <h3 style={{ fontSize: 13, marginBottom: 14, color: "var(--danger)", display: "flex", alignItems: "center", gap: 8 }}>
          <I.alertTriangle />
          Réinitialiser la base
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--fg-2)", marginBottom: 14, lineHeight: 1.55 }}>
          Supprime toutes les campagnes, générations, entrées de journal et faits extraits. Ton profil consolidé est conservé. Cette action est irréversible.
        </p>
        <button className="ch-btn danger" onClick={async () => {
          const ok = await confirmAction({
            title: "R\u00e9initialiser la base ?",
            body: "Toutes les campagnes, g\u00e9n\u00e9rations, entr\u00e9es de journal et faits extraits seront supprim\u00e9s. Ton profil consolid\u00e9 est conserv\u00e9. Action irr\u00e9versible.",
            confirmLabel: "Tout supprimer",
            danger: true,
          });
          if (ok) toast("Historique & journal supprim\u00e9s", { type: "success" });
        }}>
          <I.trash /> Supprimer historique & journal
        </button>
      </div>
    </div>
  );
}

// ===== Helpers ==============================================
function Section({ title, hint, children, action }) {
  return (
    <div className="ch-card">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: hint ? 4 : 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 13 }}>{title}</h3>
          {hint && <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
        </div>
        {action}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="ch-label">{label}</label>
      {children}
      {hint && <div style={{ marginTop: 5, fontSize: 11, color: "var(--fg-3)" }}>{hint}</div>}
    </div>
  );
}

function Modal({ onClose, title, children, width = 560, preventClose }) {
  return (
    <div
      onClick={() => !preventClose && onClose()}
      style={{
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
        width: width,
        maxWidth: "100%",
        maxHeight: "92vh",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border-s)" }}>
          <h3 style={{ fontSize: 14 }}>{title}</h3>
          <span style={{ flex: 1 }} />
          {!preventClose && <button className="ch-btn ghost icon sm" onClick={onClose}><I.x /></button>}
        </div>
        <div style={{ overflow: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, confirm, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} title={title} width={460}>
      <div style={{ padding: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
        {body}
      </div>
      <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border-s)", background: "var(--bg-0)" }}>
        <div style={{ flex: 1 }} />
        <button className="ch-btn ghost" onClick={onCancel}>Annuler</button>
        <button className="ch-btn primary" onClick={onConfirm}>{confirm}</button>
      </div>
    </Modal>
  );
}

const SET = {
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "var(--r-md)",
    textAlign: "left",
    cursor: "pointer",
    color: "var(--fg-2)",
  },
  tabActive: {
    background: "var(--accent-bg)",
    color: "var(--fg-1)",
  },
};

window.PageSettings = PageSettings;
