/* page-onboarding.jsx — 5-step wizard
   Steps: Welcome+UI lang · LLM mode · LLM config · Profile · Recap
*/

function PageOnboarding({ locale, onFinish }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    uiLang: locale,
    llmMode: "local",          // "local" | "anthropic"
    localUrl: "http://192.168.1.42:11434/v1",
    localApiKey: "",
    chatModel: "llama3.3:70b",
    embeddingModel: "nomic-embed-text",
    embeddingDim: 768,
    anthKey: "",
    anthModel: "claude-opus-4-7",
    name: "Jean Dupont",
    city: "Lyon, France",
    connectionTested: false,
  });

  const labels = ["Bienvenue", "Mode LLM", "Configuration", "Profil", "Récapitulatif"];

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const next = () => setStep((s) => Math.min(s + 1, labels.length - 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const isLast = step === labels.length - 1;
  const canNext = step !== 2 || data.connectionTested;

  return (
    <div style={{ padding: isMobile ? "22px 16px" : "32px 40px", maxWidth: 920, margin: "0 auto" }}>
      <WizardStep
        steps={labels}
        current={step}
        title={[
          "Bienvenue sur career-hub",
          "Quel moteur LLM veux-tu utiliser ?",
          data.llmMode === "local" ? "Configurer ton endpoint local" : "Configurer Anthropic",
          "Profil minimal",
          "On y est presque",
        ][step]}
        subtitle={[
          "career-hub est un hub personnel de carrière. Il centralise ton profil, ton journal, et te génère des CV et lettres de motivation contextualisés. Commence par choisir la langue de l'interface.",
          "Tu peux changer ce choix à tout moment dans Paramètres. Le mode local garde tout sur ton infra ; le mode Anthropic tape plus fort sur la qualité de génération.",
          data.llmMode === "local"
            ? "Pointe vers ton endpoint OpenAI-compatible (Ollama, LM Studio, llama.cpp server). Tu peux le tester avant de continuer."
            : "Ta clé reste stockée chiffrée. Aucune autre donnée n'est envoyée tant que tu ne lances pas une génération.",
          "Le profil détaillé se complète plus tard. Là on a juste besoin du minimum pour que les premiers CV te ressemblent.",
          "Vérifie tes choix, puis on lance.",
        ][step]}
        onPrev={prev}
        onNext={() => (isLast ? onFinish() : next())}
        nextDisabled={!canNext}
        isLast={isLast}
        nextLabel={isLast ? "Terminer la configuration" : "Suivant"}
      >
        {step === 0 && <StepWelcome data={data} set={set} />}
        {step === 1 && <StepLlmMode data={data} set={set} />}
        {step === 2 && <StepLlmConfig data={data} set={set} />}
        {step === 3 && <StepProfile data={data} set={set} />}
        {step === 4 && <StepRecap data={data} />}
      </WizardStep>
    </div>
  );
}

function StepWelcome({ data, set }) {
  return (
    <div>
      <label className="ch-label">Langue de l'interface</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { v: "fr", title: "Français", sub: "Interface, formulaires, e-mails." },
          { v: "en", title: "English",  sub: "Interface, forms, emails." },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => set("uiLang", o.v)}
            style={{
              textAlign: "left",
              padding: "16px 18px",
              background: data.uiLang === o.v ? "var(--accent-bg)" : "var(--bg-0)",
              border: data.uiLang === o.v ? "1px solid var(--accent)" : "1px solid var(--border-m)",
              borderRadius: "var(--r-md)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <I.globe />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{o.title}</span>
              {data.uiLang === o.v && (
                <span style={{ marginLeft: "auto", color: "var(--accent-2)" }}><I.check size={14} /></span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{o.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 28, padding: 14, background: "var(--bg-0)", border: "1px solid var(--border-s)", borderRadius: "var(--r-md)", display: "flex", gap: 12 }}>
        <span style={{ color: "var(--info)", flexShrink: 0 }}><I.dot /></span>
        <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
          Tu pourras saisir tes contenus de profil en FR et EN indépendamment.
          La langue de génération de chaque CV / LM se choisit campagne par campagne.
        </div>
      </div>
    </div>
  );
}

function StepLlmMode({ data, set }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
      <ModeCard
        active={data.llmMode === "local"}
        onClick={() => set("llmMode", "local")}
        title="Local"
        sub="Endpoint OpenAI-compatible (recommandé)"
        icon={<I.zap />}
        rows={[
          { ok: true,  text: "Tout reste sur ton infra" },
          { ok: true,  text: "RAG sémantique via embeddings" },
          { ok: true,  text: "Coût 0 — matériel à toi" },
          { ok: false, text: "Qualité dépend du modèle local" },
        ]}
        badge="défaut"
      />
      <ModeCard
        active={data.llmMode === "anthropic"}
        onClick={() => set("llmMode", "anthropic")}
        title="Anthropic"
        sub="API claude.ai"
        icon={<I.sparkle />}
        rows={[
          { ok: true,  text: "Meilleure qualité de génération" },
          { ok: false, text: "Données envoyées à Anthropic" },
          { ok: false, text: "Pas d'embeddings — RAG full-text" },
          { ok: false, text: "Tokens facturés" },
        ]}
      />
    </div>
  );
}

function ModeCard({ active, onClick, title, sub, icon, rows, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 18,
        background: active ? "var(--accent-bg)" : "var(--bg-0)",
        border: active ? "1px solid var(--accent)" : "1px solid var(--border-m)",
        borderRadius: "var(--r-md)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: active ? "var(--accent-2)" : "var(--fg-2)" }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--fg-1)" }}>{title}</span>
        {badge && <span className="ch-badge accent" style={{ marginLeft: 6 }}>{badge}</span>}
        {active && <span style={{ marginLeft: "auto", color: "var(--accent-2)" }}><I.check size={14} /></span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{sub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--fg-2)", alignItems: "center" }}>
            <span style={{ color: r.ok ? "var(--success)" : "var(--fg-3)", display: "flex" }}>
              {r.ok ? <I.check size={12} /> : <I.x size={12} />}
            </span>
            <span>{r.text}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function StepLlmConfig({ data, set }) {
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState(null);
  const test = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      setModels(["llama3.3:70b", "qwen2.5-coder:32b", "mistral-large:latest", "nomic-embed-text"]);
      set("connectionTested", true);
    }, 1400);
  };
  // anthropic auto-validates more loosely
  const testAnth = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      set("connectionTested", true);
    }, 900);
  };

  if (data.llmMode === "local") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="ch-label">URL de l'endpoint</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="ch-input"
              value={data.localUrl}
              onChange={(e) => { set("localUrl", e.target.value); set("connectionTested", false); }}
              placeholder="http://localhost:11434/v1"
              style={{ flex: 1, fontFamily: "var(--font-mono)" }}
            />
            <button className="ch-btn" onClick={test} disabled={testing}>
              {testing ? <><span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span> Test…</>
                       : <><I.zap /> Tester la connexion</>}
            </button>
          </div>
          {models && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, color: "var(--success)", fontSize: 12 }}>
              <I.check size={12} /> Connexion établie · {models.length} modèles détectés
            </div>
          )}
        </div>

        <div>
          <label className="ch-label">API key (optionnelle)</label>
          <input
            className="ch-input"
            type="password"
            value={data.localApiKey}
            onChange={(e) => set("localApiKey", e.target.value)}
            placeholder="sk-…"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div>
            <label className="ch-label">Modèle de chat</label>
            <select className="ch-select" value={data.chatModel} onChange={(e) => set("chatModel", e.target.value)}>
              {(models || ["llama3.3:70b"]).map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="ch-label">Modèle d'embeddings</label>
            <select className="ch-select" value={data.embeddingModel} onChange={(e) => set("embeddingModel", e.target.value)}>
              <option>nomic-embed-text</option>
              <option>mxbai-embed-large</option>
              <option>bge-large-en-v1.5</option>
            </select>
          </div>
        </div>
        <div>
          <label className="ch-label">Dimensions des embeddings</label>
          <input className="ch-input" type="number" value={data.embeddingDim} onChange={(e) => set("embeddingDim", parseInt(e.target.value || "0"))} style={{ fontFamily: "var(--font-mono)" }} />
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg-3)" }}>
            Doit matcher la dimension retournée par ton modèle (testée à la validation).
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: 12, background: "var(--warning-bg)", border: "1px solid transparent", borderRadius: "var(--r-md)", display: "flex", gap: 10, fontSize: 12.5, color: "var(--fg-2)" }}>
        <span style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }}><I.alertTriangle /></span>
        <div>
          Le RAG sémantique sera désactivé (Anthropic ne fournit pas d'embeddings). Les contenus envoyés sortent de ton infra.
        </div>
      </div>

      <div>
        <label className="ch-label">Clé API Anthropic</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="ch-input"
            type="password"
            value={data.anthKey}
            onChange={(e) => { set("anthKey", e.target.value); set("connectionTested", false); }}
            placeholder="sk-ant-…"
            style={{ flex: 1, fontFamily: "var(--font-mono)" }}
          />
          <button className="ch-btn" onClick={testAnth} disabled={testing || !data.anthKey}>
            {testing ? "Test…" : "Tester"}
          </button>
        </div>
        {data.connectionTested && (
          <div style={{ marginTop: 8, color: "var(--success)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <I.check size={12} /> Clé valide
          </div>
        )}
      </div>

      <div>
        <label className="ch-label">Modèle de chat</label>
        <select className="ch-select" value={data.anthModel} onChange={(e) => set("anthModel", e.target.value)}>
          <option value="claude-opus-4-7">claude-opus-4-7 — recommandé pour CV/LM</option>
          <option value="claude-sonnet-4-6">claude-sonnet-4-6 — bon compromis</option>
          <option value="claude-haiku-4-5">claude-haiku-4-5 — rapide, moins coûteux</option>
        </select>
      </div>
    </div>
  );
}

function StepProfile({ data, set }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label className="ch-label">Nom complet</label>
        <input className="ch-input" value={data.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className="ch-label">Ville</label>
        <input className="ch-input" value={data.city} onChange={(e) => set("city", e.target.value)} />
      </div>
      <div style={{ padding: 12, background: "var(--bg-0)", border: "1px solid var(--border-s)", borderRadius: "var(--r-md)", fontSize: 12.5, color: "var(--fg-2)" }}>
        Tu pourras compléter expériences, compétences, projets, journal, etc. depuis la page <strong style={{ color: "var(--fg-1)" }}>Mon profil</strong>. Là on s'arrête au minimum pour ne pas te bloquer.
      </div>
    </div>
  );
}

function StepRecap({ data }) {
  const items = [
    { k: "Langue UI", v: data.uiLang === "fr" ? "Français" : "English" },
    { k: "Mode LLM", v: data.llmMode === "local" ? "Local (self-hosted)" : "Anthropic" },
    data.llmMode === "local"
      ? { k: "Endpoint", v: data.localUrl, mono: true }
      : { k: "Modèle", v: data.anthModel, mono: true },
    { k: "Modèle chat", v: data.llmMode === "local" ? data.chatModel : data.anthModel, mono: true },
    data.llmMode === "local" && { k: "Embeddings", v: `${data.embeddingModel} · ${data.embeddingDim}d`, mono: true },
    { k: "Profil", v: `${data.name} · ${data.city}` },
  ].filter(Boolean);

  return (
    <div className="ch-card" style={{ padding: 0 }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: "grid",
          gridTemplateColumns: "minmax(110px, 160px) 1fr",
          padding: "12px 16px",
          borderTop: i === 0 ? "none" : "1px solid var(--border-s)",
          fontSize: 13,
        }}>
          <span style={{ color: "var(--fg-3)" }}>{it.k}</span>
          <span className={it.mono ? "mono" : ""} style={{ color: "var(--fg-1)" }}>{it.v}</span>
        </div>
      ))}
    </div>
  );
}

window.PageOnboarding = PageOnboarding;
