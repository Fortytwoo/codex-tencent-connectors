#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ConfirmationStore } from "./confirmation-store.js";
import { normalizeWeComError } from "./errors.js";
import {
  callWeCom,
  cancelWeComAuth,
  getWeComAuthSession,
  isWeComAuthenticated,
  runWeCom,
  startWeComAuth
} from "./wecom-cli.js";
import { isAllowedRead, isAllowedWrite, listPolicy } from "./wecom-policy.js";

const confirmations = new ConfirmationStore();
const server = new McpServer({ name: "codex-tencent-connectors-wecom", version: "0.1.0" });

function text(value: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {})
  };
}

function wecomResult(result: Awaited<ReturnType<typeof runWeCom>>) {
  return result.success ? text(result.data ?? result) : text(normalizeWeComError(result), true);
}

server.tool("wecom_auth_status", "Check whether the local WeCom CLI is authenticated.", {}, async () => {
  const result = await runWeCom(["auth", "show"], 15_000);
  const authenticated = isWeComAuthenticated(result);
  if (!result.success) return text(normalizeWeComError(result), true);
  return text({ authenticated, status: authenticated ? "authenticated" : "authorization_required" });
});

server.tool(
  "wecom_start_auth",
  "Start WeCom QR authorization, opening the default browser by default and returning the URL as a fallback.",
  { open_browser: z.boolean().default(true) },
  async ({ open_browser }) => {
    const result = await startWeComAuth({ openBrowser: open_browser });
    if (!result.success) return text(normalizeWeComError(result), true);
    return text(result.authSession);
  }
);

server.tool("wecom_auth_session", "Check the current WeCom browser authorization session.", {}, async () =>
  text(getWeComAuthSession() ?? { status: "not_started" })
);

server.tool("wecom_cancel_auth", "Cancel the current WeCom browser authorization session.", {}, async () =>
  text({ cancelled: cancelWeComAuth() })
);

server.tool("wecom_policy", "List the allowlisted WeCom CLI operations exposed by this adapter.", {}, async () =>
  text(listPolicy())
);

server.tool(
  "wecom_call_read",
  "Call an allowlisted read-only WeCom CLI operation.",
  {
    category: z.string().min(1),
    operation: z.string().min(1),
    input: z.record(z.unknown()).default({})
  },
  async ({ category, operation, input }) => {
    if (!isAllowedRead(category, operation)) {
      return text({ code: "OPERATION_NOT_ALLOWED", category, operation, policy: listPolicy() }, true);
    }
    const result = await callWeCom(category, operation, input);
    return wecomResult(result);
  }
);

server.tool(
  "wecom_prepare_operation",
  "Prepare an allowlisted state-changing WeCom operation. This never executes the operation.",
  {
    category: z.string().min(1),
    operation: z.string().min(1),
    input: z.record(z.unknown()).default({}),
    summary: z.string().min(1).max(2000)
  },
  async ({ category, operation, input, summary }) => {
    if (!isAllowedWrite(category, operation)) {
      return text({ code: "OPERATION_NOT_ALLOWED", category, operation, policy: listPolicy() }, true);
    }
    const pending = confirmations.create(category, operation, input, summary);
    return text({
      status: "confirmation_required",
      operation_id: pending.id,
      category: pending.category,
      operation: pending.operation,
      input: pending.input,
      summary: pending.summary,
      expires_at: new Date(pending.expiresAt).toISOString()
    });
  }
);

server.tool(
  "wecom_confirm_operation",
  "Execute a previously prepared WeCom operation after explicit user confirmation.",
  { operation_id: z.string().min(1) },
  async ({ operation_id }) => {
    const pending = confirmations.take(operation_id);
    if (!pending) {
      return text({ code: "OPERATION_NOT_FOUND_OR_EXPIRED", operation_id }, true);
    }
    const result = await callWeCom(pending.category, pending.operation, pending.input);
    return wecomResult(result);
  }
);

server.tool(
  "wecom_cancel_operation",
  "Cancel a prepared WeCom operation without executing it.",
  { operation_id: z.string().min(1) },
  async ({ operation_id }) => text({ cancelled: confirmations.cancel(operation_id), operation_id })
);

await server.connect(new StdioServerTransport());
