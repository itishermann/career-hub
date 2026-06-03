"use client";

import { Button, TextInput } from "@mantine/core";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email || !/.+@.+\..+/.test(email)) {
      setError("Email invalide");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackURL: "/" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          authDisabled?: boolean;
        } | null;
        if (body?.authDisabled) {
          router.push("/");
          return;
        }
      }
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={ST.root}>
      <div style={ST.halo} />

      <div style={ST.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect
              x="2"
              y="2"
              width="20"
              height="20"
              rx="5"
              fill="var(--ch-accent)"
            />
            <path
              d="M8 14l3-3 3 3 3-3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                fontFamily: "var(--ch-font-head)",
                letterSpacing: "-0.01em",
              }}
            >
              career-hub
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ch-fg-3)" }}>
              self-hosted · <span className="mono">v0.4.2</span>
            </div>
          </div>
        </div>

        {!sent ? (
          <>
            <div>
              <h2 style={ST.headline}>{t("loginTitle")}</h2>
              <p style={ST.sub}>{t("loginSubtitle")}</p>
            </div>

            <form
              onSubmit={submit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <TextInput
                  type="email"
                  label={t("email")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.currentTarget.value);
                    setError(null);
                  }}
                  placeholder="jean.dupont@example.com"
                  size="md"
                  // biome-ignore lint/a11y/noAutofocus: login email is the primary action on a dedicated page
                  autoFocus
                  error={
                    error ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <AlertTriangle size={12} /> {error}
                      </span>
                    ) : undefined
                  }
                />
              </div>
              <Button
                type="submit"
                color="magenta"
                size="md"
                fullWidth
                loading={sending}
                leftSection={!sending ? <Send size={14} /> : undefined}
              >
                {t("sendMagicLink")}
              </Button>
            </form>

            <div style={ST.divider}>
              <span style={ST.line} />
              <span style={ST.dividerText}>ou</span>
              <span style={ST.line} />
            </div>

            <div style={ST.devBox}>
              <Zap
                size={14}
                color="var(--ch-fg-3)"
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--ch-fg-2)",
                    marginBottom: 2,
                  }}
                >
                  Mode développement
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ch-fg-3)",
                    lineHeight: 1.5,
                  }}
                >
                  <span className="mono">AUTH_ENABLED=false</span> dans{" "}
                  <span className="mono">.env</span> bypasse l'auth pour le dev
                  local.
                </div>
              </div>
              <Button
                variant="default"
                size="xs"
                onClick={() => router.push("/")}
                style={{ flexShrink: 0 }}
              >
                Entrer
              </Button>
            </div>
          </>
        ) : (
          <>
            <div style={ST.successIcon}>
              <Check size={22} />
            </div>
            <div>
              <h2 style={ST.headline}>Lien envoyé.</h2>
              <p style={ST.sub}>
                On a envoyé un lien de connexion à{" "}
                <strong className="mono" style={{ color: "var(--ch-fg-1)" }}>
                  {email}
                </strong>
                . Clique dessus depuis ta boîte pour entrer. Il expire dans 15
                minutes.
              </p>
            </div>

            <div style={ST.devBox}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--ch-fg-2)",
                    marginBottom: 2,
                  }}
                >
                  Tu ne reçois rien ?
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ch-fg-3)",
                    lineHeight: 1.5,
                  }}
                >
                  Vérifie tes spams. En self-hosted le SMTP custom peut être
                  lent (5-30s).
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="default"
                style={{ flex: 1 }}
                leftSection={<ChevronLeft size={14} />}
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Changer d'adresse
              </Button>
              <Button
                variant="default"
                style={{ flex: 1 }}
                leftSection={<RefreshCw size={14} />}
                onClick={() => submit()}
              >
                Renvoyer
              </Button>
            </div>

            <div
              style={{
                paddingTop: 16,
                borderTop: "1px solid var(--ch-border-s)",
                textAlign: "center",
              }}
            >
              <button
                type="button"
                onClick={() => router.push("/")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ch-fg-3)",
                  fontSize: 12,
                  fontFamily: "var(--ch-font-mono)",
                  cursor: "pointer",
                  textDecoration: "underline dotted",
                  textUnderlineOffset: 3,
                }}
              >
                [dev] Simuler le clic sur le lien
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <span
          className="mono"
          style={{ color: "var(--ch-fg-3)", fontSize: 11 }}
        >
          career-hub · self-hosted
        </span>
      </div>
    </div>
  );
}

const ST: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    width: "100%",
    background: "var(--ch-bg-0)",
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
    backgroundImage:
      "radial-gradient(circle, rgba(196,0,109,0.08) 0%, rgba(196,0,109,0) 60%)",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "var(--ch-bg-1)",
    border: "1px solid var(--ch-border-s)",
    borderRadius: 8,
    padding: 28,
    boxShadow: "var(--ch-shadow-md)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  headline: {
    fontSize: 20,
    fontWeight: 600,
    fontFamily: "var(--ch-font-head)",
    letterSpacing: "-0.01em",
    margin: "4px 0 6px",
  },
  sub: { fontSize: 13, color: "var(--ch-fg-2)", lineHeight: 1.55, margin: 0 },
  divider: { display: "flex", alignItems: "center", gap: 12 },
  line: { flex: 1, height: 1, background: "var(--ch-border-s)" },
  dividerText: {
    fontSize: 11,
    color: "var(--ch-fg-3)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  devBox: {
    padding: 12,
    background: "var(--ch-bg-0)",
    border: "1px solid var(--ch-border-s)",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    background: "var(--ch-success-bg)",
    color: "var(--ch-success)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
