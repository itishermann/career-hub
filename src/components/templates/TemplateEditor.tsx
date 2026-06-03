"use client";

import { Badge, Button, Group, Loader, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ChevronLeft, Download, FileText, Save } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { renderTypstSvg } from "@/lib/typst-browser";
import {
  fillTemplatePlaceholders,
  hasPlaceholders,
} from "@/lib/typst-placeholders";
import { updateTemplate } from "@/server/actions/templates";

/**
 * Dual-pane Typst template editor: source on the left, LIVE preview on the
 * right. The preview renders client-side to SVG via typst.ts (WASM, no server
 * round-trip) and re-renders on a debounce as you type. A "PDF serveur" button
 * fetches the authoritative tagged PDF from /api/templates/preview. Save
 * persists a new template version.
 */
export function TemplateEditor({
  name,
  type,
  version,
  atsCompliant,
  description,
  initialSource,
}: {
  name: string;
  type: "CV" | "COVER_LETTER";
  version: number;
  atsCompliant: boolean;
  description: string | null;
  initialSource: string;
}) {
  const [source, setSource] = useState(initialSource);
  const [pending, startTransition] = useTransition();
  const [svg, setSvg] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [serverPdf, setServerPdf] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const firstRender = useRef(true);
  const dirty = source !== initialSource;

  // Live client-side preview: re-render to SVG on a debounce as the source
  // changes. The first render lazily fetches the ~27 MB compiler WASM.
  useEffect(() => {
    let cancelled = false;
    if (firstRender.current) {
      setStatus({ ok: true, msg: "Initialisation du moteur Typst (WASM)…" });
    }
    const handle = setTimeout(
      async () => {
        setRendering(true);
        const t0 = performance.now();
        try {
          const out = await renderTypstSvg(fillTemplatePlaceholders(source));
          if (cancelled) return;
          setSvg(out);
          setStatus({
            ok: true,
            msg: `Rendu en ${Math.round(performance.now() - t0)} ms`,
          });
          firstRender.current = false;
        } catch (e) {
          if (cancelled) return;
          setStatus({
            ok: false,
            msg: e instanceof Error ? e.message : "Erreur de rendu Typst",
          });
        } finally {
          if (!cancelled) setRendering(false);
        }
      },
      firstRender.current ? 150 : 500,
    );
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [source]);

  // Authoritative tagged PDF (PDF/UA-friendly) from the native server compiler.
  async function openServerPdf() {
    setServerPdf(true);
    try {
      const res = await fetch("/api/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: fillTemplatePlaceholders(source) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank", "noopener");
      } else {
        const j = (await res
          .json()
          .catch(() => ({ error: "Compilation échouée" }))) as {
          error?: string;
        };
        setStatus({ ok: false, msg: j.error ?? "Compilation serveur échouée" });
      }
    } catch (e) {
      setStatus({
        ok: false,
        msg: e instanceof Error ? e.message : "Erreur réseau",
      });
    } finally {
      setServerPdf(false);
    }
  }

  function save() {
    startTransition(async () => {
      try {
        const r = await updateTemplate({ name, typstSource: source });
        notifications.show({
          color: "green",
          message: `Enregistré (v${r.version}).`,
        });
      } catch (e) {
        notifications.show({
          color: "red",
          message: e instanceof Error ? e.message : "Échec",
        });
      }
    });
  }

  function exportTyp() {
    const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.typ`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1500, margin: "0 auto" }}>
      <Group gap="md" mb="lg" wrap="wrap">
        <Button
          component={Link}
          href="/templates"
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<ChevronLeft size={14} />}
        >
          Templates
        </Button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <span className="mono" style={{ fontSize: 20, fontWeight: 600 }}>
              {name}
            </span>
            <Badge variant="light" color="magenta" size="sm">
              {type === "CV" ? "CV" : "LM"}
            </Badge>
            <Badge variant="default" size="sm" className="mono">
              v{version}
            </Badge>
            {atsCompliant && (
              <Badge variant="light" color="green" size="sm">
                ATS
              </Badge>
            )}
          </Group>
          {description && (
            <Text size="xs" c="dimmed" mt={2}>
              {description}
            </Text>
          )}
        </div>
        <Button
          variant="default"
          size="sm"
          leftSection={<Download size={14} />}
          onClick={exportTyp}
        >
          Exporter
        </Button>
        <Button
          color="magenta"
          size="sm"
          leftSection={<Save size={14} />}
          onClick={save}
          loading={pending}
          disabled={!dirty}
        >
          Enregistrer
        </Button>
      </Group>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {/* Editor */}
        <div style={paneStyle}>
          <Group gap={8} px="md" py="xs" style={paneHeader}>
            <span
              className="mono"
              style={{ fontSize: 12, color: "var(--ch-fg-2)" }}
            >
              {name}.typ
            </span>
            <span style={{ flex: 1 }} />
            {dirty && (
              <span style={{ fontSize: 11, color: "var(--ch-warning)" }}>
                modifié
              </span>
            )}
            <Button
              size="compact-xs"
              variant="default"
              leftSection={<FileText size={12} />}
              onClick={openServerPdf}
              loading={serverPdf}
            >
              PDF serveur
            </Button>
          </Group>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              minHeight: 600,
              resize: "none",
              border: "none",
              outline: "none",
              padding: 16,
              background: "var(--ch-bg-1)",
              color: "var(--ch-fg-1)",
              fontFamily: "var(--ch-font-mono)",
              fontSize: 12.5,
              lineHeight: 1.6,
              tabSize: 2,
            }}
          />
          <div
            style={{
              padding: "6px 14px",
              borderTop: "1px solid var(--ch-border-s)",
              background: "var(--ch-bg-0)",
              fontSize: 11,
              fontFamily: "var(--ch-font-mono)",
              color: status
                ? status.ok
                  ? "var(--ch-success)"
                  : "var(--ch-danger)"
                : "var(--ch-fg-3)",
              maxHeight: 96,
              overflow: "auto",
            }}
          >
            <span style={{ whiteSpace: "pre-wrap" }}>
              {status ? status.msg : "Prêt · moteur live typst.ts"}
            </span>
          </div>
        </div>

        {/* Live preview (client-side SVG via typst.ts WASM) */}
        <div style={{ ...paneStyle, background: "var(--ch-bg-0)" }}>
          <Group gap={8} px="md" py="xs" style={paneHeader}>
            <span style={{ fontSize: 12, color: "var(--ch-fg-3)" }}>
              Aperçu live
            </span>
            {rendering && <Loader size={12} color="magenta" />}
            {hasPlaceholders(source) && (
              <Badge size="xs" variant="light" color="gray">
                données d'exemple
              </Badge>
            )}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10.5, color: "var(--ch-fg-3)" }}>
              SVG · navigateur
            </span>
          </Group>
          {svg ? (
            <div
              style={{
                flex: 1,
                minHeight: 600,
                overflow: "auto",
                padding: 16,
                background: "#fff",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{ width: "100%", maxWidth: 720 }}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG produced locally by the typst.ts WASM compiler from the user's own template
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 600,
                display: "grid",
                placeItems: "center",
                color: "var(--ch-fg-3)",
                fontSize: 13,
                textAlign: "center",
                padding: 24,
              }}
            >
              <div>
                {rendering
                  ? "Initialisation du moteur Typst…"
                  : "L'aperçu se met à jour automatiquement."}
                <div style={{ fontSize: 11, marginTop: 8, maxWidth: 320 }}>
                  Les jetons <span className="mono">#PLACEHOLDER_*#</span> sont
                  remplacés par des données d'exemple pour l'aperçu.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const paneStyle: React.CSSProperties = {
  border: "1px solid var(--ch-border-s)",
  borderRadius: 8,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  background: "var(--ch-bg-1)",
};
const paneHeader: React.CSSProperties = {
  borderBottom: "1px solid var(--ch-border-s)",
  background: "var(--ch-bg-0)",
};
