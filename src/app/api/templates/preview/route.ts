import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth-helpers";
import { compileTypst, isTypstAvailable } from "@/server/typst/compile";

/**
 * Compile arbitrary Typst source to a PDF for the template editor preview.
 * Returns the PDF inline on success, or a 422 with the compiler error so the
 * editor can show it in the status bar.
 */
export async function POST(req: Request) {
  await requireUser();
  if (!(await isTypstAvailable())) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Compilateur Typst natif indisponible sur cette plateforme (prébuild @myriaddreamin/typst-ts-node-compiler manquant).",
      },
      { status: 503 },
    );
  }
  let source: string;
  try {
    const body = (await req.json()) as { source?: string };
    source = body.source ?? "";
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON invalide" },
      { status: 400 },
    );
  }
  if (source.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "Source vide" },
      { status: 400 },
    );
  }

  const result = await compileTypst({
    source,
    outputName: `preview-${Date.now()}`,
    bucket: "previews",
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 422 },
    );
  }
  return new Response(new Uint8Array(result.pdfBytes), {
    headers: { "content-type": "application/pdf", "cache-control": "no-store" },
  });
}
