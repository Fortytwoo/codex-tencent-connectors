#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isVersionAtLeast,
  isWeComAuthenticated,
  MINIMUM_WECOM_VERSION,
  parseWeComVersion,
  resolveWeComExecutable,
  runWeCom,
  startWeComAuth
} from "./wecom-cli.js";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const marketplaceName = "codex-tencent-connectors";
const pluginSelector = `tencent-connectors@${marketplaceName}`;

function runCodex(args: string[]): number {
  let executable = "codex";
  let commandArgs = args;
  if (process.platform === "win32") {
    const codexScript = (process.env.PATH ?? "")
      .split(delimiter)
      .map((entry) => join(entry, "node_modules", "@openai", "codex", "bin", "codex.js"))
      .find((candidate) => existsSync(candidate));
    if (!codexScript) {
      console.error("Failed to locate the Codex CLI npm installation on PATH.");
      return 1;
    }
    executable = process.execPath;
    commandArgs = [codexScript, ...args];
  }
  const result = spawnSync(executable, commandArgs, { stdio: "inherit", shell: false, windowsHide: true });
  if (result.error) {
    console.error(`Failed to run Codex CLI: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

async function doctor(): Promise<number> {
  const checks: Array<[string, boolean, string]> = [];
  checks.push(["Node.js >= 20", Number(process.versions.node.split(".")[0]) >= 20, process.versions.node]);
  checks.push(["Plugin manifest", existsSync(join(projectRoot, "plugins", "tencent-connectors", ".codex-plugin", "plugin.json")), projectRoot]);
  checks.push(["Plugin MCP config", existsSync(join(projectRoot, "plugins", "tencent-connectors", ".mcp.json")), projectRoot]);

  const executable = resolveWeComExecutable();
  checks.push(["wecom-cli executable", Boolean(executable), executable ?? "not found"]);
  if (executable) {
    const version = await runWeCom(["--version"], 10_000);
    const parsedVersion = parseWeComVersion(`${version.stdout}\n${version.stderr}`);
    const supported = Boolean(version.success && parsedVersion && isVersionAtLeast(parsedVersion));
    checks.push([
      `wecom-cli >= ${MINIMUM_WECOM_VERSION}`,
      supported,
      parsedVersion ?? (version.stdout || version.stderr || "unknown version")
    ]);
    const auth = await runWeCom(["auth", "show"], 10_000);
    const authenticated = isWeComAuthenticated(auth);
    checks.push(["WeCom authorization", authenticated, authenticated ? "authenticated" : "authorization required"]);
  }

  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? "[OK]" : "[WARN]"} ${name}: ${detail}`);
  }
  return checks.some(([, ok]) => !ok) ? 1 : 0;
}

function install(): number {
  const marketplace = runCodex(["plugin", "marketplace", "add", projectRoot]);
  if (marketplace !== 0) return marketplace;
  const plugin = runCodex(["plugin", "add", pluginSelector]);
  if (plugin === 0) {
    console.log("Tencent Connectors installed. Restart Codex, then run OAuth login when prompted:");
    console.log("  codex mcp login qq-mail");
    console.log("  codex mcp login tencent-docs");
  }
  return plugin;
}

function remove(): number {
  return runCodex(["plugin", "remove", pluginSelector]);
}

const command = process.argv[2] ?? "help";
if (command === "doctor") {
  process.exitCode = await doctor();
} else if (command === "mcp") {
  const child = spawnSync(process.execPath, [join(here, "server.js")], { stdio: "inherit" });
  process.exitCode = child.status ?? 1;
} else if (command === "install") {
  process.exitCode = install();
} else if (command === "remove") {
  process.exitCode = remove();
} else if (command === "auth") {
  const result = await startWeComAuth({ openBrowser: true });
  if (result.success) {
    console.log("The WeCom authorization page was opened in your default browser.");
    console.log(`Fallback URL: ${result.authSession?.authUrl ?? "waiting for authorization URL"}`);
  } else {
    console.error(result.stderr || "Failed to start WeCom authorization.");
    process.exitCode = 1;
  }
} else {
  console.log("Usage: codex-tencent-connectors <doctor|install|remove|auth|mcp>");
}
