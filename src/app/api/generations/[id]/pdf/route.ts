import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const gen = await db.generation.findFirst({ where: { id, userId: user.id } });
  if (!gen?.outputPdfPath) {
    return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  }
  try {
    const bytes = await readFile(gen.outputPdfPath);
    return new Response(bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${gen.type.toLowerCase()}-${gen.id}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
