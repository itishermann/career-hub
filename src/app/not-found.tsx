import "./globals.css";

// Root not-found boundary. Required because the i18n root layout
// (src/app/layout.tsx) is a pass-through with no <html>/<body> — those live in
// src/app/[locale]/layout.tsx. Non-localized render paths (the implicit
// /_not-found route, and notFound() thrown for invalid locales in the locale
// layout) bypass the locale layout, so this boundary must render its own
// document tags. See next-intl docs: environments/error-files.
export default function NotFound() {
  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          margin: 0,
          background: "var(--ch-bg-0)",
          color: "var(--ch-fg-1)",
          fontFamily: "var(--ch-font-ui)",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 48, margin: 0, fontFamily: "var(--ch-font-head)" }}>404</h1>
          <p style={{ color: "var(--ch-fg-2)", marginTop: 8 }}>
            Page introuvable · Page not found
          </p>
          <a href="/fr" style={{ color: "var(--ch-accent-2)", display: "inline-block", marginTop: 16 }}>
            Retour à l’accueil · Back home
          </a>
        </div>
      </body>
    </html>
  );
}
