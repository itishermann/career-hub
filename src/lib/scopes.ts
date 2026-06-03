// Canonical MCP scopes. Imported by the token issuer (Server Action) and the
// token-creation UI. Any string outside this set is rejected at create time;
// the MCP route enforces strict membership at call time (no wildcard).
export const KNOWN_SCOPES = [
  "profile:read",
  "profile:write",
  "campaigns:read",
  "campaigns:write",
  "generations:read",
  "generations:write",
  "journal:read",
  "journal:write",
  "templates:read",
] as const;

export type KnownScope = (typeof KNOWN_SCOPES)[number];
