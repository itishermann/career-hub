/* page-login.jsx — Magic link login, minimalist, full-bleed (no sidebar/header) */

function PageLogin({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!email || !/.+@.+\..+/.test(email)) {
      setError("Email invalide");
      return;
    }
    setError(null);
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 900);
  };

  return (
    <div style={LP.root}>
      {/* Subtle background : single soft accent halo, no gradient gimmickry */}
      <div style={LP.halo} />

      <div style={LP.card}>
        {/* Brand */}
        <div style={LP.brand}>
          <div style={LP.brandMark}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="5" fill="var(--accent)" />
              <path d="M8 14l3-3 3 3 3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "var(--font-head)", letterSpacing: "-0.01em" }}>career-hub</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>self-hosted · <span className="mono">v0.4.2</span></div>
          </div>
        </div>

        {!sent ? (
          <>
            <h2 style={LP.headline}>Connexion à ton hub.</h2>
            <p style={LP.sub}>
              On t'envoie un lien magique sur ton e-mail. Pas de mot de passe à retenir.
            </p>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="ch-label">Adresse e-mail</label>
                <input
                  className="ch-input"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="jean.dupont@example.com"
                  style={{ height: 40, fontSize: 14 }}
                />
                {error && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--danger)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <I.alertTriangle size={12} /> {error}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="ch-btn primary"
                style={{ height: 40, justifyContent: "center", fontSize: 13, fontWeight: 500 }}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span>
                    Envoi du lien…
                  </>
                ) : (
                  <>
                    <I.send /> M'envoyer un lien de connexion
                  </>
                )}
              </button>
            </form>

            <div className="ch-login-divider">
              <span style={LP.dividerText}>ou</span>
            </div>

            <div style={LP.devBox}>
              <span style={{ color: "var(--fg-3)", marginTop: 1 }}><I.zap size={12} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-2)", marginBottom: 2 }}>
                  Mode développement
                </div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.5 }}>
                  <span className="mono">AUTH_ENABLED=false</span> dans <span className="mono">.env</span> bypasse l'auth pour le dev local.
                </div>
              </div>
              <button
                className="ch-btn sm"
                onClick={onLoggedIn}
                style={{ flexShrink: 0 }}
              >
                Entrer
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={LP.successIcon}>
              <I.check size={22} />
            </div>
            <h2 style={LP.headline}>Lien envoyé.</h2>
            <p style={LP.sub}>
              On a envoyé un lien de connexion à{" "}
              <strong style={{ color: "var(--fg-1)" }} className="mono">{email}</strong>.
              Clique dessus depuis ta boîte pour entrer. Il expire dans 15 minutes.
            </p>

            <div style={LP.devBox}>
              <span style={{ color: "var(--fg-3)", marginTop: 1 }}><I.dot /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-2)", marginBottom: 2 }}>
                  Tu ne reçois rien ?
                </div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.5 }}>
                  Vérifie tes spams. Sur les déploiements self-hosted, le SMTP custom peut être lent (5-30s).
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                className="ch-btn ghost"
                onClick={() => { setSent(false); setEmail(""); }}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <I.chevronLeft /> Changer d'adresse
              </button>
              <button
                className="ch-btn"
                onClick={() => { setSent(false); submit(); }}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <I.refresh /> Renvoyer
              </button>
            </div>

            {/* Dev shortcut */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-s)", textAlign: "center" }}>
              <button
                onClick={onLoggedIn}
                style={{
                  background: "none", border: "none",
                  color: "var(--fg-3)", fontSize: 12,
                  fontFamily: "var(--font-mono)", cursor: "pointer",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                  textUnderlineOffset: 3,
                }}
              >
                [dev] Simuler le clic sur le lien
              </button>
            </div>
          </>
        )}
      </div>

      <div style={LP.footer}>
        <span className="mono" style={{ color: "var(--fg-3)", fontSize: 11 }}>
          career-hub · self-hosted on Freebox · made by Jean
        </span>
      </div>
    </div>
  );
}

const LP = {
  root: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "var(--bg-0)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: "32px 16px",
  },
  halo: {
    position: "absolute",
    top: "20%",
    left: "50%",
    width: 600,
    height: 600,
    transform: "translateX(-50%)",
    backgroundImage: "radial-gradient(circle, rgba(196, 0, 109, 0.08) 0%, rgba(196, 0, 109, 0) 60%)",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "var(--bg-1)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-lg)",
    padding: 28,
    boxShadow: "var(--shadow-md)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  brandMark: {
    width: 40, height: 40, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  headline: {
    fontSize: 20,
    fontWeight: 600,
    fontFamily: "var(--font-head)",
    letterSpacing: "-0.01em",
    marginTop: 4,
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: "var(--fg-2)",
    lineHeight: 1.55,
    marginBottom: 4,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "8px 0",
  },
  dividerText: {
    fontSize: 11,
    color: "var(--fg-3)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    flex: "0 0 auto",
  },
  devBox: {
    padding: 12,
    backgroundColor: "var(--bg-0)",
    border: "1px solid var(--border-s)",
    borderRadius: "var(--r-md)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  successIcon: {
    width: 48, height: 48,
    borderRadius: 999,
    backgroundColor: "var(--success-bg)",
    color: "var(--success)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  footer: {
    marginTop: 24,
    textAlign: "center",
  },
};

// Inject divider line pseudo-elements once
(function injectLoginStyles() {
  if (document.getElementById("__login-styles")) return;
  const s = document.createElement("style");
  s.id = "__login-styles";
  s.textContent = `
    .ch-login-divider { position: relative; display: flex; align-items: center; gap: 12px; margin: 8px 0; }
    .ch-login-divider::before, .ch-login-divider::after {
      content: ""; flex: 1; height: 1px; background: var(--border-s);
    }
  `;
  document.head.appendChild(s);
})();

window.PageLogin = PageLogin;
