import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { arch, platform } from "node:os";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const pluginRoot = resolve("plugins", "tencent-connectors");
const nativeName = platform() === "win32" ? "wecom-cli.exe" : "wecom-cli";
const nativePath = resolve(pluginRoot, "runtime", "native", `${platform()}-${arch()}`, nativeName);
assert.ok(
  existsSync(nativePath),
  `Missing native WeCom runtime for ${platform()}-${arch()}`
);
const nativeVersion = spawnSync(nativePath, ["--version"], { encoding: "utf8", shell: false });
assert.equal(nativeVersion.status, 0, nativeVersion.stderr || `Failed to execute ${nativePath}`);
assert.match(nativeVersion.stdout, /wecom-cli\s+0\.1\.9/);
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
