/* feedback.jsx — shared interaction feedback layer.
   Loaded AFTER signature.jsx (React hooks in scope), used everywhere.

   Exposes on window:
     toast(message, { type, duration })       → transient notification
     confirmAction({ title, body, confirmLabel, cancelLabel, danger }) → Promise<bool>
     copyText(text, label?)                    → clipboard + toast
     downloadText(filename, content, mime?)    → real Blob download + toast
     downloadCSV(filename, rows)               → rows = array of arrays
   And <FeedbackHost/> (mounted once inside App) renders the toast stack + confirm modal.
*/

// ---- imperative API (event-bridged to the mounted host) ----------

function toast(message, opts = {}) {
  window.dispatchEvent(new CustomEvent("ch:toast", { detail: { message, ...opts } }));
}

function confirmAction(opts = {}) {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent("ch:confirm", { detail: { opts, resolve } }));
  });
}

async function copyText(text, label) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast(label || "Copié dans le presse-papier", { type: "success" });
  } catch (e) {
    toast("Impossible de copier", { type: "error" });
  }
}

function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Téléchargement : " + filename, { type: "success" });
  } catch (e) {
    toast("Téléchargement impossible", { type: "error" });
  }
}

function downloadCSV(filename, rows) {
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(";")).join("\r\n");
  downloadText(filename, "\uFEFF" + csv, "text/csv;charset=utf-8");
}

// ---- the mounted host ---------------------------------------------

function FeedbackHost() {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null); // { opts, resolve } | null

  useEffect(() => {
    let idc = 0;
    const onToast = (e) => {
      const id = ++idc + "_" + Date.now();
      const { message, type = "info", duration = 2600 } = e.detail || {};
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), duration);
    };
    const onConfirm = (e) => setConfirm(e.detail);
    window.addEventListener("ch:toast", onToast);
    window.addEventListener("ch:confirm", onConfirm);
    return () => {
      window.removeEventListener("ch:toast", onToast);
      window.removeEventListener("ch:confirm", onConfirm);
    };
  }, []);

  const closeConfirm = (val) => {
    if (confirm && confirm.resolve) confirm.resolve(val);
    setConfirm(null);
  };

  const dot = (type) =>
    type === "success" ? "var(--success)" :
    type === "error" ? "var(--danger)" :
    type === "warning" ? "var(--warning)" : "var(--accent-2)";

  const icon = (type) =>
    type === "success" ? <I.check size={15} /> :
    type === "error" ? <I.alertTriangle size={14} /> :
    type === "warning" ? <I.alertTriangle size={14} /> : <I.dot size={14} />;

  return (
    <>
      {/* Toast stack */}
      <div style={FB.toastWrap} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="ch-toast" style={FB.toast}>
            <span style={{ color: dot(t.type), display: "inline-flex", flexShrink: 0 }}>{icon(t.type)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div style={FB.modalRoot} onClick={() => closeConfirm(false)}>
          <div style={FB.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
              {confirm.opts.danger && (
                <span style={{
                  width: 32, height: 32, borderRadius: "var(--r-md)",
                  background: "var(--danger-bg)", color: "var(--danger)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <I.alertTriangle size={16} />
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, marginBottom: 6 }}>{confirm.opts.title || "Confirmer ?"}</h3>
                {confirm.opts.body && (
                  <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>{confirm.opts.body}</p>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="ch-btn ghost" onClick={() => closeConfirm(false)}>
                {confirm.opts.cancelLabel || "Annuler"}
              </button>
              <button
                className={`ch-btn ${confirm.opts.danger ? "danger" : "primary"}`}
                onClick={() => closeConfirm(true)}
                autoFocus
              >
                {confirm.opts.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const FB = {
  toastWrap: {
    position: "fixed",
    top: 68,
    right: 16,
    zIndex: 80,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    pointerEvents: "none",
    maxWidth: "min(360px, calc(100vw - 32px))",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    background: "var(--bg-2)",
    border: "1px solid var(--border-m)",
    borderRadius: "var(--r-md)",
    boxShadow: "var(--shadow-md)",
    fontSize: 13,
    color: "var(--fg-1)",
    pointerEvents: "auto",
  },
  modalRoot: {
    position: "fixed",
    inset: 0,
    zIndex: 90,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    animation: "ch-page-fade 120ms ease",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    background: "var(--bg-2)",
    border: "1px solid var(--border-m)",
    borderRadius: "var(--r-lg)",
    boxShadow: "var(--shadow-lg)",
    padding: 20,
  },
};

// Inject toast entry animation once.
(function injectFeedbackStyles() {
  if (document.getElementById("__feedback-styles")) return;
  const s = document.createElement("style");
  s.id = "__feedback-styles";
  s.textContent = `
    @keyframes ch-toast-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
    .ch-toast { animation: ch-toast-in 160ms cubic-bezier(0.4,0,0.2,1); }
  `;
  document.head.appendChild(s);
})();

Object.assign(window, { toast, confirmAction, copyText, downloadText, downloadCSV, FeedbackHost });
