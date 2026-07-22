#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const confirmed = args.has("--yes");
const useGitHub = !args.has("--local");
const marketplaceSource = useGitHub ? "Fortytwoo/codex-tencent-connectors" : root;
const pluginSelector = "tencent-connectors@codex-tencent-connectors";
const expectedVersion = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;

function resolveCodexCommand() {
  if (process.platform !== "win32") return { command: "codex", prefix: [] };

  const codexScript = (process.env.PATH ?? "")
    .split(delimiter)
    .map((entry) => join(entry, "node_modules", "@openai", "codex", "bin", "codex.js"))
    .find((candidate) => existsSync(candidate));
  if (codexScript) return { command: process.execPath, prefix: [codexScript] };
  return { command: "codex.exe", prefix: [] };
}

const codex = resolveCodexCommand();

function display(commandArgs) {
  return [codex.command, ...codex.prefix, ...commandArgs]
    .map((value) => (/\s/.test(value) ? JSON.stringify(value) : value))
    .join(" ");
}

function run(commandArgs, capture = false) {
  console.log(`> ${display(commandArgs)}`);
  if (dryRun) return { status: 0, stdout: "" };
  const result = spawnSync(codex.command, [...codex.prefix, ...commandArgs], {
    cwd: root,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: false,
    windowsHide: true
  });
  if (result.error) {
    console.error(`无法运行 Codex CLI：${result.error.message}`);
    return { status: 1, stdout: "" };
  }
  const capturedOutput = capture ? `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim() : "";
  if (capture && result.status !== 0 && result.stderr) console.error(result.stderr.trim());
  return { status: result.status ?? 1, stdout: capturedOutput };
}

function runMarketplaceAdd() {
  if (!dryRun) {
    const existing = run(["plugin", "marketplace", "list"], true);
    if (existing.status === 0 && existing.stdout.includes("codex-tencent-connectors")) {
      if (useGitHub) {
        console.log("Marketplace 已存在，正在刷新 GitHub 快照。");
        return run(["plugin", "marketplace", "upgrade", "codex-tencent-connectors"]);
      }
      if (existing.stdout.includes(root)) {
        console.log("Marketplace 已指向当前本地仓库，继续安装插件。");
        return { status: 0 };
      }
      console.error("同名 Marketplace 已指向其他来源。为避免覆盖用户配置，本地安装已停止；请改用默认 GitHub 安装，或由用户手动移除旧 Marketplace。");
      return { status: 1 };
    }
  }

  const result = run(["plugin", "marketplace", "add", marketplaceSource], true);
  if (dryRun || result.status === 0) return { status: 0 };

  const output = result.stdout.toLowerCase();
  if (output.includes("already") || output.includes("已存在")) {
    console.log("Marketplace 已存在；保留现有来源并继续安装插件。");
    return { status: 0 };
  }
  return result;
}

function installedVersion() {
  const result = run(["plugin", "list"], true);
  if (result.status !== 0) return undefined;
  const line = result.stdout.split(/\r?\n/).find((entry) => entry.includes(pluginSelector));
  return line?.match(/installed,\s+enabled\s+(\S+)/)?.[1];
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (Number(process.versions.node.split(".")[0]) < 20) {
  fail(`需要 Node.js 20 或更高版本，当前版本为 ${process.versions.node}。`);
} else if (!dryRun && !confirmed) {
  fail("安装会修改 Codex Marketplace 和插件配置。用户明确同意安装后，请重新执行并添加 --yes。可先使用 --dry-run 查看操作。");
} else {
  console.log(`安装来源：${useGitHub ? "GitHub" : "当前本地仓库"}`);
  console.log(`目标插件：${pluginSelector}`);
  console.log(`目标版本：${expectedVersion}`);

  const marketplace = runMarketplaceAdd();
  if (marketplace.status !== 0) {
    fail("Marketplace 注册失败，未继续安装插件。");
  } else {
    const currentVersion = dryRun ? undefined : installedVersion();
    const plugin =
      currentVersion === expectedVersion
        ? (console.log(`插件 ${expectedVersion} 已安装，跳过重复写入。`), { status: 0 })
        : run(["plugin", "add", pluginSelector]);
    if (plugin.status !== 0) {
      fail("插件安装失败。");
    } else if (!dryRun) {
      const pluginList = run(["plugin", "list"], true);
      const missingPlugin = pluginList.status !== 0 || !pluginList.stdout.includes(pluginSelector);
      const missingMcp = ["wecom", "qq-mail", "tencent-docs"].filter(
        (name) => run(["mcp", "get", name], true).status !== 0
      );

      if (missingPlugin || missingMcp.length > 0) {
        fail(
          `安装后的验证失败：${missingPlugin ? "未找到插件" : ""}${
            missingPlugin && missingMcp.length ? "；" : ""
          }${missingMcp.length ? `未找到 MCP：${missingMcp.join(", ")}` : ""}`
        );
      } else {
        console.log("安装和验证成功。请重启 Codex。");
        console.log("可选授权命令：");
        console.log("  codex mcp login qq-mail");
        console.log("  codex mcp login tencent-docs");
        console.log("企业微信请在重启后让 Codex 调用 wecom_start_auth，并由用户自行扫码。");
      }
    }
  }
}
