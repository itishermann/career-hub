/**
 * MCP server — minimal JSON-RPC handler.
 *
 * Speaks a subset of the MCP protocol enough for Claude Desktop and Claude
 * Code to:
 *   - list available tools
 *   - call profile_get_consolidated / experience_list / journal_list /
 *     generation_list / generate_cv / generate_lm / ats_score
 *
 * Authentication: bearer token from src/server/actions/tokens.ts (matches the
 * `ApiToken.tokenHash` rows). Tokens carry scopes that gate the tool list.
 *
 * NB: this is a pragmatic implementation that handles the subset of MCP
 * required for our use cases without pulling in the full @modelcontextprotocol/
 * sdk session-management machinery, which would require a more invasive
 * integration with Next.js streaming.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { LocaleSchema } from "@/lib/i18n";
import { db } from "@/server/db";
import { verifyBearer } from "@/server/actions/tokens";

type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  scope: string;
  handler: (input: unknown, userId: string) => Promise<unknown>;
};

const TOOLS: Tool[] = [
  {
    name: "profile_get_consolidated",
    description: "Returns the user's consolidated profile (identity, sections, experiences, skills, education, projects).",
    inputSchema: {
      type: "object",
      properties: { language: { type: "string", enum: ["fr", "en"] } },
    },
    scope: "profile:read",
    handler: async (input, userId) => {
      const language = LocaleSchema.parse((input as { language?: string }).language ?? "fr");
      const [identity, sections, experiences, skills, education, projects] = await Promise.all([
        db.profileIdentity.findUnique({ where: { userId } }),
        db.profileSection.findMany({ where: { userId, isCurrent: true } }),
        db.experience.findMany({
          where: { userId },
          orderBy: [{ endDate: { sort: "desc", nulls: "first" } }, { startDate: "desc" }],
        }),
        db.skill.findMany({ where: { userId } }),
        db.education.findMany({ where: { userId }, orderBy: { startDate: "desc" } }),
        db.project.findMany({ where: { userId }, orderBy: { year: "desc" } }),
      ]);
      return { language, identity, sections, experiences, skills, education, projects };
    },
  },
  {
    name: "campaign_list",
    description: "List campaigns owned by the authenticated user.",
    inputSchema: { type: "object", properties: {} },
    scope: "campaigns:read",
    handler: async (_input, userId) =>
      db.campaign.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
  },
  {
    name: "generation_list",
    description: "List generations (CV / LM) owned by the user.",
    inputSchema: {
      type: "object",
      properties: { campaignId: { type: "string" }, limit: { type: "number" } },
    },
    scope: "generations:read",
    handler: async (input, userId) => {
      const i = z
        .object({ campaignId: z.string().optional(), limit: z.number().int().min(1).max(200).optional() })
        .parse(input ?? {});
      return db.generation.findMany({
        where: { userId, campaignId: i.campaignId },
        orderBy: { createdAt: "desc" },
        take: i.limit ?? 50,
      });
    },
  },
  {
    name: "journal_list",
    description: "List journal entries.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
    scope: "journal:read",
    handler: async (input, userId) => {
      const i = z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(input ?? {});
      return db.journalEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: i.limit ?? 100,
        select: { id: true, content: true, language: true, reconciled: true, createdAt: true },
      });
    },
  },
  {
    name: "template_list",
    description: "List installed CV / LM templates.",
    inputSchema: { type: "object", properties: {} },
    scope: "templates:read",
    handler: async () =>
      db.template.findMany({
        select: { name: true, type: true, supportedLanguages: true, templateLanguage: true },
      }),
  },
];

function badRequest(id: unknown, message: string, code = -32600) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 400 });
}

export async function POST(req: Request) {
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" } },
      { status: 401 },
    );
  }

  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest(null, "Invalid JSON-RPC body");
  }
  const { jsonrpc, id, method, params } = body;
  if (jsonrpc !== "2.0" || !method) return badRequest(id ?? null, "Invalid JSON-RPC envelope");

  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "career-hub", version: "0.1.0" },
      },
    });
  }

  if (method === "tools/list") {
    const visible = TOOLS.filter((t) => auth.scopes.length === 0 || auth.scopes.includes(t.scope));
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: visible.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    });
  }

  if (method === "tools/call") {
    const parsed = z
      .object({
        name: z.string(),
        arguments: z.unknown().optional(),
      })
      .safeParse(params);
    if (!parsed.success) return badRequest(id, "Invalid tools/call params");
    const tool = TOOLS.find((t) => t.name === parsed.data.name);
    if (!tool) {
      return NextResponse.json(
        { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${parsed.data.name}` } },
        { status: 404 },
      );
    }
    if (auth.scopes.length > 0 && !auth.scopes.includes(tool.scope)) {
      return NextResponse.json(
        { jsonrpc: "2.0", id, error: { code: -32002, message: `Missing scope: ${tool.scope}` } },
        { status: 403 },
      );
    }
    try {
      const result = await tool.handler(parsed.data.arguments ?? {}, auth.userId);
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
      });
    } catch (err) {
      return NextResponse.json(
        { jsonrpc: "2.0", id, error: { code: -32000, message: (err as Error).message } },
        { status: 500 },
      );
    }
  }

  return badRequest(id, `Unsupported method: ${method}`, -32601);
}

export async function GET() {
  return NextResponse.json({
    name: "career-hub MCP",
    transport: "http+json-rpc",
    auth: "bearer (Authorization: Bearer chk_…)",
    methods: ["initialize", "tools/list", "tools/call"],
    tools: TOOLS.map((t) => t.name),
  });
}
