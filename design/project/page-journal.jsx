/* page-journal.jsx — Timeline + search + new-entry input + facts drawer */

const MOCK_JOURNAL = [
  {
    id: "j1", lang: "fr", reconciled: false, factsCount: 3,
    when: "il y a 2 heures",
    body: "Sprint review Doctrine. **Le moteur de recherche** hold p95 320ms en prod depuis 10 jours, on ferme l'epic. À noter pour le CV : c'est mesurable et reproductible (dashboards Grafana en attestation). Mentorat de Yasmine porte ses fruits — elle a livré l'event-driven RFC seule cette semaine.",
  },
  {
    id: "j2", lang: "fr", reconciled: false, factsCount: 2,
    when: "hier",
    body: "Entretien chez Doctolib (RH, 45min). Marie sympa, process clair en 4 étapes. Ils insistent sur Kafka — j'ai esquivé en parlant d'event-driven chez Algolia mais faudra approfondir pour le tech. Stack confirmée : TS + Ruby. Astreinte hebdo, on-call payée.",
  },
  {
    id: "j3", lang: "en", reconciled: true, factsCount: 0,
    when: "il y a 3 jours",
    body: "Long session on Postgres tuning — finally cracked the GIN index size issue on the search corpus. Wrote up internal RFC, kept it short (3 pages, no tables). Useful template for future RFCs.",
  },
  {
    id: "j4", lang: "fr", reconciled: false, factsCount: 1,
    when: "il y a 4 jours",
    body: "Refusé une offre Back Market (Senior Engineer, Paris). Tech intéressante mais l'équipe trop grande pour mon goût, et le remote pas vraiment full. Note pour les prochains : ajouter \"taille d'équipe ≤ 25\" dans mes critères.",
  },
  {
    id: "j5", lang: "fr", reconciled: true, factsCount: 0,
    when: "il y a 5 jours",
    body: "Lunch avec Romain (ex-Padok). Il bosse maintenant à Doctolib, équipe Plateforme. M'a référé sur le poste Senior. Process en interne : référence chez le manager direct.",
  },
  {
    id: "j6", lang: "fr", reconciled: true, factsCount: 0,
    when: "il y a 1 semaine",
    body: "Mis à jour le repo `infra-cookbook` (module Terraform open-source). 218 stars maintenant, +18 en un mois. Compteur à mentionner dans le CV / pitch — c'est rare qu'un side-project techno ait cette traction.",
  },
  {
    id: "j7", lang: "en", reconciled: false, factsCount: 4,
    when: "il y a 1 semaine",
    body: "Quick post-mortem on the Algolia indexing refactor (looking back, almost 2 years ago now). Real numbers: pipeline went from 14min p95 to 8min p95, on 6× more docs. That's a -42% wall-clock with capacity to spare. Worth a punchier bullet on the CV — current phrasing undersells it.",
  },
  {
    id: "j8", lang: "fr", reconciled: true, factsCount: 0,
    when: "il y a 2 semaines",
    body: "Réflexion sur le format CV : la version 2-colonnes que j'utilisais avant passe mal sur les ATS (Workday surtout). À remplacer définitivement par sobre-fr-ats.",
  },
];

const FACTS_PENDING = [
  {
    id: "f1", entryId: "j1", type: "achievement",
    summary: "Maintenir p95 320ms en prod sur 10 jours sur le moteur de recherche Doctrine",
    extractedAt: "il y a 1 heure",
    target: "Experience · Doctrine",
  },
  {
    id: "f2", entryId: "j1", type: "achievement",
    summary: "Mentorat efficace : Yasmine a livré une RFC event-driven en autonomie",
    extractedAt: "il y a 1 heure",
    target: "Experience · Doctrine",
  },
  {
    id: "f3", entryId: "j2", type: "preference",
    summary: "Préférence : équipes de taille ≤ 25 personnes",
    extractedAt: "il y a 5 heures",
    target: "Section · preferences",
  },
  {
    id: "f4", entryId: "j2", type: "skill_gap",
    summary: "Skill gap signalé : Kafka — à approfondir avant le tech Doctolib",
    extractedAt: "il y a 5 heures",
    target: "Section · anti_patterns",
  },
  {
    id: "f5", entryId: "j7", type: "achievement_quantified",
    summary: "Algolia indexing pipeline : 14min → 8min p95 (sur 6× plus de docs)",
    extractedAt: "il y a 8 jours",
    target: "Experience · Algolia",
  },
  {
    id: "f6", entryId: "j7", type: "achievement",
    summary: "Refonte du pipeline d'indexation Algolia (référence à mettre en avant dans le pitch senior)",
    extractedAt: "il y a 8 jours",
    target: "Section · pitch",
  },
];

function PageJournal({ locale, pageState = "filled" }) {
  const isMobile = useIsMobile();
  const [searchMode, setSearchMode] = useState("semantic"); // "semantic" | "text"
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | unreconciled
  const [newOpen, setNewOpen] = useState(false);
  const [newLang, setNewLang] = useState(locale);
  const [newContent, setNewContent] = useState("");
  const [draftsKept, setDraftsKept] = useState({});
  const [factsOpen, setFactsOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  // Trigger fake semantic search whenever query/mode changes (debounced)
  useEffect(() => {
    if (!query) { setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => setSearching(false), searchMode === "semantic" ? 600 : 220);
    return () => clearTimeout(t);
  }, [query, searchMode]);

  const baseEntries = (pageState === "empty") ? [] : MOCK_JOURNAL;
  const [entries, setEntries] = useState(baseEntries);
  useEffect(() => { setEntries((pageState === "empty") ? [] : MOCK_JOURNAL); }, [pageState]);
  const filtered = entries.filter((e) => {
    if (filter === "unreconciled" && e.reconciled) return false;
    if (!query) return true;
    return e.body.toLowerCase().includes(query.toLowerCase());
  });

  const saveEntry = () => {
    const body = newContent.trim();
    if (!body) return;
    const entry = { id: "j_" + Date.now(), when: "à l'instant", lang: newLang, body, reconciled: false };
    setEntries((list) => [entry, ...list]);
    toast("Entrée ajoutée — extraction LLM en arrière-plan", { type: "success" });
    setNewContent("");
    setNewOpen(false);
  };

  const editEntry = (entry) => {
    setNewLang(entry.lang);
    setNewContent(entry.body);
    setNewOpen(true);
    setEntries((list) => list.filter((x) => x.id !== entry.id));
    toast("Entrée chargée dans l'éditeur", { type: "info" });
  };

  const deleteEntry = async (entry) => {
    const ok = await confirmAction({
      title: "Supprimer cette entrée ?",
      body: "L'entrée et les faits non réconciliés associés seront supprimés. Action irréversible.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    setEntries((list) => list.filter((x) => x.id !== entry.id));
    toast("Entrée supprimée", { type: "success" });
  };
  const pendingCount = FACTS_PENDING.length;
  const pendingByEntry = FACTS_PENDING.reduce((acc, f) => {
    (acc[f.entryId] ||= 0); acc[f.entryId] += 1; return acc;
  }, {});

  if (pageState === "loading") return <JournalSkeleton />;
  if (pageState === "error") {
    return (
      <PageError
        title="Impossible de charger le journal"
        detail="L'index sémantique n'a pas répondu. Vérifie que ton endpoint LLM local est joignable."
        code="HTTP 503 · http://192.168.1.42:11434/v1/embeddings · timeout après 8s"
        onRetry={() => {}}
      />
    );
  }

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 920, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Journal</h1>
          <div style={{ color: "var(--fg-3)", fontSize: 12.5 }}>
            Note à chaud, le système extrait les faits utiles plus tard.
          </div>
        </div>
        <button
          className={`ch-btn ${pendingCount ? "" : "ghost"}`}
          onClick={() => setFactsOpen(true)}
          style={pendingCount ? {
            background: "var(--warning-bg)",
            color: "var(--warning)",
            borderColor: "transparent",
          } : {}}
        >
          <I.brain />
          Faits à réconcilier
          {pendingCount > 0 && (
            <span style={{
              padding: "0 6px",
              background: "var(--warning)",
              color: "white",
              borderRadius: 999,
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              fontWeight: 600,
            }}>{pendingCount}</span>
          )}
        </button>
      </div>

      {/* New entry input ----------------------------- */}
      <div style={{
        background: "var(--bg-1)",
        border: newOpen ? "1px solid var(--accent)" : "1px solid var(--border-s)",
        borderRadius: "var(--r-lg)",
        marginBottom: 18,
        transition: "border-color 150ms",
        overflow: "hidden",
      }}>
        {!newOpen ? (
          <button
            onClick={() => setNewOpen(true)}
            style={{
              width: "100%",
              padding: "14px 16px",
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "var(--fg-3)",
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <span style={{ color: "var(--fg-3)" }}><I.plus /></span>
            <span>Ajouter une entrée…</span>
            <div style={{ flex: 1 }} />
            <span className="ch-kbd">N</span>
          </button>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 6, padding: "8px 8px 6px", borderBottom: "1px solid var(--border-s)", alignItems: "center", background: "var(--bg-0)" }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)", padding: "0 6px" }}>Langue</span>
              {["fr", "en"].map((l) => (
                <button
                  key={l}
                  onClick={() => setNewLang(l)}
                  style={{
                    padding: "3px 8px",
                    background: newLang === l ? "var(--bg-1)" : "transparent",
                    border: newLang === l ? "1px solid var(--border-m)" : "1px solid transparent",
                    borderRadius: "var(--r-sm)",
                    color: newLang === l ? "var(--fg-1)" : "var(--fg-3)",
                    fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)",
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{newContent.length} car.</span>
            </div>
            <textarea
              autoFocus
              className="ch-textarea"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={newLang === "fr" ? "Note du jour…  Markdown accepté." : "Today's note…  Markdown accepted."}
              rows={4}
              style={{ border: "none", borderRadius: 0, background: "transparent", boxShadow: "none", padding: "12px 14px", lineHeight: 1.55 }}
            />
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px",
              borderTop: "1px solid var(--border-s)",
              background: "var(--bg-0)",
            }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                Une extraction LLM tournera en arrière-plan après sauvegarde.
              </span>
              <div style={{ flex: 1 }} />
              <button
                className="ch-btn ghost sm"
                onClick={() => { setNewOpen(false); setNewContent(""); }}
              >Annuler</button>
              <button
                className="ch-btn primary sm"
                disabled={!newContent.trim()}
                onClick={saveEntry}
              >
                <I.check /> Enregistrer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search bar ---------------------------------- */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 18,
      }}>
        <div style={{
          flex: 1,
          display: "flex", alignItems: "center",
          background: "var(--bg-1)",
          border: "1px solid var(--border-m)",
          borderRadius: "var(--r-md)",
          height: "var(--row-h)",
          paddingLeft: 10,
          gap: 6,
        }}>
          <span style={{ color: "var(--fg-3)" }}>
            {searching
              ? <span className="ch-spin" style={{ display: "inline-flex" }}><I.loader /></span>
              : <I.search />}
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchMode === "semantic"
              ? "Recherche sémantique  (« ce sur quoi je me suis cassé les dents en mai »…)"
              : "Recherche textuelle exacte…"}
            style={{
              flex: 1, border: "none", background: "transparent",
              outline: "none", color: "var(--fg-1)", fontSize: 13,
            }}
          />
          {query && (
            <button className="ch-btn ghost icon sm" onClick={() => setQuery("")}>
              <I.x />
            </button>
          )}
        </div>

        {/* Search mode segmented */}
        <div style={{
          display: "inline-flex",
          background: "var(--bg-1)",
          border: "1px solid var(--border-m)",
          borderRadius: "var(--r-md)",
          padding: 2,
          height: "var(--row-h)",
        }}>
          {[
            { v: "semantic", l: "Sémantique", i: <I.brain size={12} /> },
            { v: "text",     l: "Texte",      i: <I.search size={12} /> },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setSearchMode(o.v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "0 10px",
                background: searchMode === o.v ? "var(--bg-2)" : "transparent",
                border: "none",
                color: searchMode === o.v ? "var(--fg-1)" : "var(--fg-3)",
                fontSize: 11.5, fontWeight: 500,
                borderRadius: 4,
                whiteSpace: "nowrap",
              }}
            >
              {o.i}
              {o.l}
            </button>
          ))}
        </div>

        {/* Filter */}
        <select
          className="ch-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: "auto", height: "var(--row-h)" }}
        >
          <option value="all">Tous</option>
          <option value="unreconciled">À traiter</option>
        </select>
      </div>

      {searchMode === "semantic" && (
        <div style={{
          padding: "8px 12px",
          marginBottom: 14,
          background: "var(--info-bg)",
          borderRadius: "var(--r-md)",
          fontSize: 11.5,
          color: "var(--fg-2)",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <span style={{ color: "var(--info)" }}><I.dot /></span>
          <span>Recherche sémantique via embeddings <span className="mono">nomic-embed-text</span> · disponible en mode LLM local uniquement.</span>
        </div>
      )}

      {/* Entries list -------------------------------- */}
      {entries.length === 0 ? (
        <div className="ch-card" style={{ padding: 0 }}>
          <EmptyState
            icon={<I.book size={22} />}
            title="Pas encore d'entrée"
            hint="Le journal est ton lieu pour noter à chaud — succès, blocages, références, idées. Le système extraira les faits utiles plus tard, sans rien forcer."
            action={
              <button className="ch-btn primary" onClick={() => setNewOpen(true)}>
                <I.plus /> Ajouter ma première entrée
              </button>
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 && query && (
            <div style={{
              padding: 18, textAlign: "center", fontSize: 13, color: "var(--fg-3)",
              border: "1px dashed var(--border-m)", borderRadius: "var(--r-md)",
            }}>
              Aucune entrée ne correspond à <span className="mono" style={{ color: "var(--fg-2)" }}>« {query} »</span>.
            </div>
          )}
          {filtered.map((e) => (
            <JournalEntryCard key={e.id} entry={e} factsCount={pendingByEntry[e.id] || 0} highlight={query}
              onEdit={() => editEntry(e)} onDelete={() => deleteEntry(e)} onViewFacts={() => setFactsOpen(true)} />
          ))}
        </div>
      )}

      {factsOpen && (
        <FactsDrawer
          onClose={() => setFactsOpen(false)}
        />
      )}
    </div>
  );
}

function JournalEntryCard({ entry, factsCount, highlight, onEdit, onDelete, onViewFacts }) {
  const [expanded, setExpanded] = useState(false);
  // simple markdown : **bold** + highlight matching query
  const renderBody = () => {
    let body = entry.body;
    if (highlight) {
      const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
      body = body.replace(re, "\u0000$1\u0001");
    }
    const parts = body.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return <strong key={i} style={{ color: "var(--fg-1)", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
      }
      const hl = p.split(/[\u0000\u0001]/g);
      return hl.map((seg, j) =>
        j % 2 === 1
          ? <mark key={`${i}-${j}`} style={{ background: "var(--accent-bg-strong)", color: "var(--accent-2)", padding: "0 2px", borderRadius: 2 }}>{seg}</mark>
          : <React.Fragment key={`${i}-${j}`}>{seg}</React.Fragment>
      );
    });
  };

  return (
    <div className="ch-card" style={{
      padding: "var(--pad-card)",
      cursor: "pointer",
      borderColor: expanded ? "var(--border-m)" : "var(--border-s)",
      transition: "border-color 150ms",
    }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11.5, color: "var(--fg-3)" }}>
        <span className="mono nowrap" style={{ flexShrink: 0 }}>{entry.when}</span>
        <span className="ch-badge mono" style={{ fontSize: 10.5 }}>{entry.lang.toUpperCase()}</span>
        <div style={{ flex: 1 }} />
        {entry.reconciled ? (
          <span className="ch-badge success" style={{ whiteSpace: "nowrap" }}><I.check size={10} /> Réconciliée</span>
        ) : factsCount > 0 ? (
          <span className="ch-badge warning" style={{ whiteSpace: "nowrap" }}>
            {factsCount}&nbsp;fait{factsCount > 1 ? "s" : ""}&nbsp;à&nbsp;traiter
          </span>
        ) : (
          <span className="ch-badge info" style={{ whiteSpace: "nowrap" }}>extraction…</span>
        )}
      </div>
      <div style={{
        fontSize: 13.5,
        color: "var(--fg-2)",
        lineHeight: 1.55,
        ...(expanded ? {} : {
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }),
      }}>
        {renderBody()}
      </div>
      {expanded && (
        <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-s)" }} onClick={(e) => e.stopPropagation()}>
          <button className="ch-btn ghost sm" onClick={onEdit}><I.edit /> Éditer</button>
          {factsCount > 0 && (
            <button className="ch-btn ghost sm" style={{ color: "var(--accent-2)" }} onClick={onViewFacts}>
              <I.brain /> Voir les {factsCount} fait{factsCount > 1 ? "s" : ""}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="ch-btn ghost sm danger" style={{ color: "var(--fg-3)" }} onClick={onDelete}>
            <I.trash />
          </button>
        </div>
      )}
    </div>
  );
}

function FactsDrawer({ onClose }) {
  const [facts, setFacts] = useState(FACTS_PENDING);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.45)",
      display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(560px, 100vw)",
        background: "var(--bg-1)",
        borderLeft: "1px solid var(--border-m)",
        boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border-s)", gap: 10 }}>
          <span style={{ color: "var(--accent-2)" }}><I.brain /></span>
          <h3 style={{ fontSize: 14 }}>Faits extraits à réconcilier</h3>
          <span className="ch-badge mono">{facts.length}</span>
          <div style={{ flex: 1 }} />
          <button className="ch-btn ghost icon sm" onClick={onClose}><I.x /></button>
        </div>
        <div style={{
          padding: "10px 18px",
          fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55,
          borderBottom: "1px solid var(--border-s)",
          background: "var(--bg-0)",
        }}>
          Le LLM a repéré ces éléments dans tes entrées récentes. Applique-les sur ton profil, édite, ou rejette — rien ne s'écrit sans ton accord.
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {facts.map((f) => (
            <div key={f.id} style={{
              padding: 14,
              background: "var(--bg-0)",
              border: "1px solid var(--border-s)",
              borderRadius: "var(--r-md)",
            }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span className={`ch-badge ${
                  f.type === "achievement" || f.type === "achievement_quantified" ? "success"
                  : f.type === "preference" ? "info"
                  : f.type === "skill_gap" ? "warning" : ""}`}>{f.type}</span>
                <span className="ch-badge mono">{f.target}</span>
                <div style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{f.extractedAt}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-1)", marginBottom: 10, lineHeight: 1.5 }}>{f.summary}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="ch-btn primary sm" onClick={() => { setFacts(facts.filter((x) => x.id !== f.id)); toast(`Appliqu\u00e9 sur ${f.target}`, { type: "success" }); }}>
                  <I.check /> Appliquer
                </button>
                <button className="ch-btn sm" onClick={() => toast("\u00c9dition du fait", { type: "info" })}><I.edit /> Éditer</button>
                <div style={{ flex: 1 }} />
                <button className="ch-btn ghost sm" style={{ color: "var(--fg-3)" }} onClick={() => { setFacts(facts.filter((x) => x.id !== f.id)); toast("Fait rejet\u00e9", { type: "info" }); }}>
                  <I.x /> Rejeter
                </button>
              </div>
            </div>
          ))}
          {facts.length === 0 && (
            <EmptyState
              icon={<I.check size={20} style={{ color: "var(--success)" }} />}
              title="Tout est à jour"
              hint="Plus aucun fait à traiter. Reviens jeter un œil après ta prochaine entrée."
            />
          )}
        </div>
      </div>
    </div>
  );
}

window.PageJournal = PageJournal;
