/**
 * A clean environment for spawning `claude` from the app.
 *
 * If the app server happens to run inside a Claude Code session, the child
 * inherits session vars that couple it to the parent's SSE/IPC channel, which
 * makes a nested `claude` hang on long calls. Strip them so the provider always
 * spawns an independent process. (In normal deployment these aren't set — no-op.)
 * Auth (keychain / credentials file / CLAUDE_CODE_OAUTH_TOKEN) is preserved.
 */
const SESSION_VARS = [
  "CLAUDECODE",
  "CLAUDE_CODE_SSE_PORT",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_CODE_TMPDIR",
];

export function cleanClaudeEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || SESSION_VARS.includes(key)) continue;
    out[key] = value;
  }
  return out;
}
