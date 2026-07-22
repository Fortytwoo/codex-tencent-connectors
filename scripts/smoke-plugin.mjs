import assert from "node:assert/strict";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const pluginRoot = resolve("plugins", "tencent-connectors");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(pluginRoot, "runtime", "server.mjs")],
  cwd: pluginRoot,
  stderr: "pipe"
});
const client = new Client({ name: "tencent-connectors-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = new Set(tools.map((tool) => tool.name));
  for (const expected of [
    "wecom_auth_status",
    "wecom_start_auth",
    "wecom_auth_session",
    "wecom_cancel_auth",
    "wecom_policy",
    "wecom_call_read",
    "wecom_prepare_operation",
    "wecom_confirm_operation",
    "wecom_cancel_operation"
  ]) {
    assert.ok(names.has(expected), `Missing MCP tool: ${expected}`);
  }
  console.log(`MCP smoke test passed with ${tools.length} tools.`);
} finally {
  await client.close();
}
