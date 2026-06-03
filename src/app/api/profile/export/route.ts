import { NextResponse } from "next/server";
import { exportProfileToMarkdown } from "@/server/export/markdown";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const language = (url.searchParams.get("lang") === "en" ? "en" : "fr") as "fr" | "en";
    const md = await exportProfileToMarkdown(language);
    return new Response(md, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="profile-${language}.md"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
