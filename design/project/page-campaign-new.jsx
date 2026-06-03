/* page-campaign-new.jsx — Wizard for creating a new campaign
   4 steps : target · job description · contact & notes · recap
   Reuses WizardStep component.
*/

function PageCampaignNew({ locale, onCancel, onCreated }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: "",
    company: "",
    role: "",
    language: locale,
    status: "DRAFT",
    jd: "",
    contactName: "",
    contactEmail: "",
    notes: "",
  });
  const [extractingKw, setExtractingKw] = useState(false);
  const [keywords, setKeywords] = useState(null);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const labels = ["Cible", "Description", "Contact", "Récap"];
  const isLast = step === labels.length - 1;

  // canNext validation per step
  const canNext = (() => {
    if (step === 0) return data.name.trim() && data.company.trim() && data.role.trim();
    if (step === 1) return data.jd.trim().length > 50;
    return true;
  })();

  // Trigger fake keyword extraction when leaving step 1
  const next = () => {
    if (step === 1 && !keywords && !extractingKw) {
      setExtractingKw(true);
      setTimeout(() => {
        setExtractingKw(false);
        setKeywords([
          { k: "TypeScript", g: "language" },
          { k: "Postgres", g: "tool" },
          { k: "Kafka", g: "tool" },
          { k: "system design", g: "methodology" },
          { k: "code review", g: "soft" },
          { k: "RFCs", g: "soft" },
          { k: "mentoring", g: "soft" },
          { k: "AWS", g: "tool" },
        ]);
      }, 1400);
    }
    setStep((s) => Math.min(s + 1, labels.length - 1));
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div style={{ padding: isMobile ? "22px 16px" : "32px 40px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button className="ch-btn ghost sm" onClick={onCancel}><I.chevronLeft /> Annuler</button>
        <span style={{ color: "var(--fg-3)", fontSize: 12 }}>· retour aux campagnes</span>
      </div>

      <WizardStep
        steps={labels}
        current={step}
        title={[
          "Quel poste vises-tu ?",
          "La description du poste",
          "Suivi de la candidature",
          "Vérifie avant de créer",
        ][step]}
        subtitle={[
          "On garde la cible nette : entreprise, poste, langue de génération. La langue choisie ici fixe la langue de tous les CV et LM générés sur cette campagne.",
          "Colle le texte de l'annonce. À la sortie de cette étape, le LLM en extrait les mots-clés ATS qu'on cachera pour réutilisation.",
          "Optionnel mais bien pratique : qui contacter et tes notes perso. Tu pourras tout éditer plus tard.",
          "Si quelque chose cloche, retourne en arrière. Sinon, on crée la campagne et on file directement à sa page.",
        ][step]}
        onPrev={prev}
        onNext={() => isLast ? onCreated(data) : next()}
        nextDisabled={!canNext || extractingKw}
        isLast={isLast}
        nextLabel={isLast ? "Créer la campagne" : extractingKw ? "Extraction…" : "Suivant"}
      >
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="ch-label">Nom de la campagne</label>
              <input
                className="ch-input"
                autoFocus
                value={data.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="ex. Lead Dev — Doctolib"
              />
              <div style={{ marginTop: 5, fontSize: 11, color: "var(--fg-3)" }}>
                Sert juste à t'y retrouver. Convention recommandée : <span className="mono">Rôle — Entreprise</span>.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div>
                <label className="ch-label">Entreprise cible</label>
                <input className="ch-input" value={data.company} onChange={(e) => set("company", e.target.value)} placeholder="Doctolib" />
              </div>
              <div>
                <label className="ch-label">Intitulé du poste</label>
                <input className="ch-input" value={data.role} onChange={(e) => set("role", e.target.value)} placeholder="Senior Software Engineer" />
              </div>
            </div>

            <div>
              <label className="ch-label">Langue de génération</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {[
                  { v: "fr", t: "Français", sub: "CV et LM en FR" },
                  { v: "en", t: "English",  sub: "CV and cover letters in EN" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set("language", o.v)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      backgroundColor: data.language === o.v ? "var(--accent-bg)" : "var(--bg-0)",
                      border: data.language === o.v ? "1px solid var(--accent)" : "1px solid var(--border-m)",
                      borderRadius: "var(--r-md)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{o.t}</span>
                      <span className="ch-badge mono">{o.v.toUpperCase()}</span>
                      {data.language === o.v && <span style={{ marginLeft: "auto", color: "var(--accent-2)" }}><I.check size={14} /></span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4 }}>{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="ch-label">Statut initial</label>
              <select className="ch-select" value={data.status} onChange={(e) => set("status", e.target.value)} style={{ maxWidth: 260 }}>
                <option value="DRAFT">Brouillon (par défaut)</option>
                <option value="SENT">Déjà envoyée</option>
                <option value="INTERVIEWING">Déjà en entretien</option>
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ch-label">Description du poste</label>
              <textarea
                className="ch-textarea"
                rows={12}
                value={data.jd}
                onChange={(e) => set("jd", e.target.value)}
                placeholder="Colle le texte complet de l'annonce. Plus c'est dense, mieux le scoring ATS sera calibré."
                style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "var(--fg-3)" }}>
                <span>{data.jd.trim().length < 50 ? `${50 - data.jd.trim().length} caractères minimum` : "✓ assez de matière"}</span>
                <span className="mono">{data.jd.length} caractères · {data.jd.split(/\s+/).filter(Boolean).length} mots</span>
              </div>
            </div>

            <div style={{
              padding: "10px 12px",
              background: "var(--bg-0)",
              border: "1px solid var(--border-s)",
              borderRadius: "var(--r-md)",
              display: "flex", gap: 10, alignItems: "flex-start",
              fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55,
            }}>
              <span style={{ color: "var(--accent-2)" }}><I.sparkle /></span>
              <div>
                À la sortie de cette étape, le LLM (mode <span className="mono">local</span>) extrait les hard skills, soft skills et signaux d'expérience. Le résultat est mis en cache au niveau de la campagne, invalidé seulement si tu changes la JD.
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div>
                <label className="ch-label">Contact (optionnel)</label>
                <input className="ch-input" value={data.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Marie Lefèvre" />
              </div>
              <div>
                <label className="ch-label">Email (optionnel)</label>
                <input className="ch-input" type="email" value={data.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="m.lefevre@doctolib.com" />
              </div>
            </div>
            <div>
              <label className="ch-label">Notes</label>
              <textarea
                className="ch-textarea"
                rows={6}
                value={data.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Tout ce qu'il faut te rappeler : référence, contexte du contact, points d'attention pour l'entretien…"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="ch-card" style={{ padding: 0 }}>
              {[
                { k: "Campagne", v: data.name || <span style={{ color: "var(--fg-3)" }}>(sans nom)</span> },
                { k: "Entreprise", v: <strong style={{ color: "var(--fg-1)" }}>{data.company}</strong> },
                { k: "Poste", v: data.role },
                { k: "Langue génération", v: <span className="mono" style={{ textTransform: "uppercase" }}>{data.language}</span> },
                { k: "Statut initial", v: data.status },
                { k: "JD", v: <span className="mono" style={{ fontSize: 11.5 }}>{data.jd.split(/\s+/).filter(Boolean).length} mots</span> },
                data.contactName && { k: "Contact", v: `${data.contactName}${data.contactEmail ? ` · ${data.contactEmail}` : ""}` },
                data.notes && { k: "Notes", v: <span className="mono" style={{ fontSize: 11.5 }}>{data.notes.length} caractères</span> },
              ].filter(Boolean).map((it, i) => (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(110px, 180px) 1fr",
                  padding: "11px 16px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border-s)",
                  fontSize: 13,
                }}>
                  <span style={{ color: "var(--fg-3)" }}>{it.k}</span>
                  <span style={{ color: "var(--fg-1)" }}>{it.v}</span>
                </div>
              ))}
            </div>

            {keywords && (
              <div className="ch-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ color: "var(--accent-2)" }}><I.sparkle /></span>
                  <h3 style={{ fontSize: 13 }}>Mots-clés ATS extraits</h3>
                  <span style={{ flex: 1 }} />
                  <span className="ch-badge success">{keywords.length} keywords</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="ch-badge mono"
                      style={i < 4 ? { backgroundColor: "var(--accent-bg)", color: "var(--accent-2)", borderColor: "transparent" } : {}}
                    >{kw.k}</span>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--fg-3)" }}>
                  Cachés au niveau de la campagne pour scorer chaque génération sans rappeler le LLM.
                </div>
              </div>
            )}

            <div style={{
              padding: 12,
              background: "var(--info-bg)",
              borderRadius: "var(--r-md)",
              display: "flex", gap: 10,
              fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55,
            }}>
              <span style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }}><I.dot /></span>
              <span>
                Une fois la campagne créée, tu pourras lancer une première génération de CV ou de LM depuis sa page. Tout reste éditable.
              </span>
            </div>
          </div>
        )}
      </WizardStep>
    </div>
  );
}

window.PageCampaignNew = PageCampaignNew;
