import type { CliResult, ConnectorError } from "./types.js";

export function normalizeWeComError(result: CliResult): ConnectorError {
  const message = [result.stderr, result.stdout].filter(Boolean).join("\n") || "WeCom CLI request failed.";
  const lower = message.toLowerCase();

  if (result.exitCode === -1 && /not found/.test(lower)) {
    return { code: "CLI_NOT_INSTALLED", message };
  }
  if ((result.data as { timedOut?: boolean } | undefined)?.timedOut) {
    return { code: "TIMEOUT", message };
  }
  if (/unauthorized|not logged in|login required|auth required/.test(lower)) {
    return { code: "AUTH_REQUIRED", message };
  }
  if (/expired/.test(lower) && /auth|token|credential/.test(lower)) {
    return { code: "AUTH_EXPIRED", message };
  }
  if (/permission|forbidden|scope/.test(lower)) {
    return { code: "PERMISSION_DENIED", message };
  }
  if (/rate limit|too many requests|频率|限流/.test(lower)) {
    return { code: "RATE_LIMITED", message };
  }
  if (/not found|不存在/.test(lower)) {
    return { code: "NOT_FOUND", message };
  }
  if (/invalid|missing|required|参数/.test(lower)) {
    return { code: "INVALID_ARGUMENT", message };
  }
  return {
    code: "UPSTREAM_ERROR",
    message,
    details: { exitCode: result.exitCode }
  };
}
