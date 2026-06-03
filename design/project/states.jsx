/* states.jsx — shared empty / loading / error patterns
   Skel: skeleton primitives
   EmptyState: big calm illustration + CTA, used when there's nothing
   ErrorState: red alert + retry
   PageStatePicker: dev-only debug control surfaced via Tweaks
*/

// Skeleton primitive ----------------------------------------------
function Skel({ w = "100%", h = 12, r = 4, style }) {
  return (
    <span
      className="ch-skel"
      style={{
        display: "block",
        width: w, height: h,
        borderRadius: r,
        ...style,
      }}
    />
  );
}

// SkelText : a row of skel lines ----------------------------------
function SkelText({ lines = 3, lineHeight = 12, lastWidth = "60%", style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skel key={i} h={lineHeight} w={i === lines - 1 ? lastWidth : "100%"} />
      ))}
    </div>
  );
}

// EmptyState ------------------------------------------------------
function EmptyState({ icon, title, hint, action }) {
  return (
    <div style={ES.wrap}>
      <div style={ES.iconCircle}>{icon}</div>
      <h3 style={{ fontSize: 16, marginBottom: 6 }}>{title}</h3>
      {hint && (
        <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.55, marginBottom: 18, maxWidth: 380, textAlign: "center" }}>
          {hint}
        </p>
      )}
      {action}
    </div>
  );
}

const ES = {
  wrap: {
    padding: "48px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 320,
    textAlign: "center",
  },
  iconCircle: {
    width: 56, height: 56,
    borderRadius: "var(--r-lg)",
    background: "var(--bg-0)",
    border: "1px solid var(--border-s)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--fg-3)",
    marginBottom: 18,
  },
};

// ErrorState ------------------------------------------------------
function ErrorState({ title = "Quelque chose n'a pas fonctionné", detail, onRetry, code }) {
  return (
    <div style={{
      padding: "16px 18px",
      background: "var(--danger-bg)",
      border: "1px solid transparent",
      borderRadius: "var(--r-md)",
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
    }}>
      <span style={{ color: "var(--danger)", marginTop: 1, flexShrink: 0 }}>
        <I.alertTriangle size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", marginBottom: 4 }}>
          {title}
        </div>
        {detail && (
          <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.5 }}>
            {detail}
          </div>
        )}
        {code && (
          <pre style={{
            margin: "10px 0 0",
            padding: "8px 10px",
            background: "var(--bg-0)",
            border: "1px solid var(--border-s)",
            borderRadius: "var(--r-sm)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--fg-3)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>{code}</pre>
        )}
      </div>
      {onRetry && (
        <button className="ch-btn sm" onClick={onRetry} style={{ flexShrink: 0 }}>
          <I.refresh /> Réessayer
        </button>
      )}
    </div>
  );
}

// PageError -------------------------------------------------------
// Larger error layout, used when a whole page fails to load
function PageError({ title, detail, onRetry, code }) {
  return (
    <div style={{ padding: "32px 32px 0", maxWidth: 720, margin: "0 auto" }}>
      <ErrorState title={title} detail={detail} onRetry={onRetry} code={code} />
    </div>
  );
}

// ProfileSkeleton — used in Profile loading state ----------------
function ProfileSkeleton() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 26 }}>
        <Skel w={56} h={56} r={8} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skel w={220} h={20} />
          <Skel w={340} h={12} />
        </div>
        <Skel w={140} h={32} r={6} />
        <Skel w={160} h={32} r={6} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ch-card"><Skel w={160} h={12} style={{ marginBottom: 14 }} /><SkelText lines={4} /></div>
          <div className="ch-card">
            <Skel w={160} h={12} style={{ marginBottom: 14 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skel key={i} w="100%" h={78} r={6} />
              ))}
            </div>
          </div>
          <div className="ch-card"><Skel w={180} h={12} style={{ marginBottom: 14 }} /><SkelText lines={3} /></div>
        </div>
        <div className="ch-card">
          <Skel w={120} h={12} style={{ marginBottom: 14 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-s)", display: "flex", flexDirection: "column", gap: 6 }}>
              <Skel w="60%" h={14} />
              <Skel w="80%" h={12} />
              <Skel w="40%" h={10} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// CampaignSkeleton ------------------------------------------------
function CampaignSkeleton() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
        <Skel w={300} h={22} />
        <Skel w={460} h={12} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ch-card"><SkelText lines={8} lineHeight={11} /></div>
          <div className="ch-card">
            <Skel w={140} h={12} style={{ marginBottom: 16 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-s)" }}>
                <Skel w={38} h={18} r={999} />
                <Skel w="40%" h={14} />
                <div style={{ flex: 1 }} />
                <Skel w={60} h={14} />
                <Skel w={100} h={14} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ch-card"><Skel w={80} h={12} style={{ marginBottom: 14 }} /><SkelText lines={4} /></div>
          <div className="ch-card"><Skel w={80} h={12} style={{ marginBottom: 14 }} /><SkelText lines={3} /></div>
        </div>
      </div>
    </div>
  );
}

// GenerationSkeleton ----------------------------------------------
function GenerationSkeleton() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <Skel w={120} h={22} />
        <div style={{ flex: 1 }} />
        <Skel w={120} h={32} r={6} />
        <Skel w={160} h={32} r={6} />
      </div>
      <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
        {["Preview", "Code Typst", "Prompt utilisé", "Snapshot"].map((t, i) => (
          <Skel key={i} w={i === 2 ? 110 : 80} h={14} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div className="ch-card" style={{ minHeight: 600, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Skel w="60%" h={400} r={4} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ch-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Skel w={96} h={96} r={999} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skel w={60} h={10} />
              <Skel w="80%" h={12} />
              <Skel w="60%" h={12} />
            </div>
          </div>
          <div className="ch-card"><SkelText lines={5} /></div>
        </div>
      </div>
    </div>
  );
}

// JournalSkeleton -------------------------------------------------
function JournalSkeleton() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 880, margin: "0 auto" }}>
      <Skel w={180} h={22} style={{ marginBottom: 18 }} />
      <Skel w="100%" h={110} r={8} style={{ marginBottom: 18 }} />
      <Skel w="100%" h={36} r={6} style={{ marginBottom: 18 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="ch-card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <Skel w={80} h={10} />
            <Skel w={24} h={10} />
            <div style={{ flex: 1 }} />
            <Skel w={80} h={16} r={999} />
          </div>
          <SkelText lines={2 + (i % 2)} />
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  Skel, SkelText, EmptyState, ErrorState, PageError,
  ProfileSkeleton, CampaignSkeleton, GenerationSkeleton, JournalSkeleton,
});
