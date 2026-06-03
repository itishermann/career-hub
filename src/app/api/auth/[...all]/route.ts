import { toNextJsHandler } from "better-auth/next-js";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";

const handlers = toNextJsHandler(auth);

// When AUTH_ENABLED=false (dev only), return an explicit 503 so callers can
// branch on it cleanly. We do NOT return 200 here because that would silently
// look like a successful magic-link send. Production hard-fails earlier in
// env.ts so this branch is unreachable in prod regardless.
function disabledResponse() {
  return new Response(
    JSON.stringify({
      authDisabled: true,
      ok: false,
      hint: "AUTH_ENABLED=false in this environment — set AUTH_ENABLED=true and configure SMTP to use magic-link auth.",
    }),
    { status: 503, headers: { "content-type": "application/json" } },
  );
}

export async function GET(req: Request) {
  if (!env.AUTH_ENABLED) return disabledResponse();
  return handlers.GET(req);
}

export async function POST(req: Request) {
  if (!env.AUTH_ENABLED) return disabledResponse();
  return handlers.POST(req);
}
