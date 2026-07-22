import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { arch, homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { CliResult, JsonObject, WeComAuthSession } from "./types.js";

const require = createRequire(import.meta.url);
const AUTH_URL_PATTERN = /https:\/\/work\.weixin\.qq\.com\/[^\s"']+/;
export const MINIMUM_WECOM_VERSION = "0.1.9";
const AUTH_SESSION_TTL_MS = 5 * 60 * 1000;
let authProcess: ChildProcessWithoutNullStreams | undefined;
let authSession: WeComAuthSession | undefined;

export function weComPlatformKey(
  currentPlatform: NodeJS.Platform = platform(),
  currentArch: string = arch()
): string | undefined {
  const key = `${currentPlatform}-${currentArch}`;
  return new Set(["win32-x64", "darwin-x64", "darwin-arm64", "linux-x64", "linux-arm64"]).has(key)
    ? key
    : undefined;
}

function candidatePaths(): string[] {
  const candidates: string[] = [];
  if (process.env.WECOM_CLI_PATH) candidates.push(process.env.WECOM_CLI_PATH);

  const runtimeDir = dirname(fileURLToPath(import.meta.url));
  const platformKey = weComPlatformKey();
  const nativeName = platform() === "win32" ? "wecom-cli.exe" : "wecom-cli";
  if (platformKey) candidates.push(join(runtimeDir, "native", platformKey, nativeName));
  candidates.push(join(runtimeDir, nativeName));

  if (platform() === "win32") {
    candidates.push(
      join(
        homedir(),
        ".workbuddy",
        "binaries",
        "node",
        "cli-connector-packages",
        "node_modules",
        "@wecom",
        "cli",
        "node_modules",
        "@wecom",
        "cli-win32-x64",
        "bin",
        "wecom-cli.exe"
      )
    );
  }

  try {
    const packagePath = require.resolve("@wecom/cli/package.json");
    const packageDir = dirname(packagePath);
    const platformPackage = platformKey?.replace(/^(win32|darwin|linux)-/, "cli-$1-");
    if (platformPackage) {
      candidates.push(join(packageDir, "node_modules", "@wecom", platformPackage, "bin", nativeName));
      candidates.push(join(dirname(packageDir), platformPackage, "bin", nativeName));
    }
  } catch {
    // The doctor command reports a missing optional CLI dependency.
  }

  return candidates;
}

export function resolveWeComExecutable(): string | undefined {
  return candidatePaths().find((candidate) => existsSync(candidate));
}

function commandEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...(process.env.WECOM_CLI_CONFIG_DIR
      ? { WECOM_CLI_CONFIG_DIR: process.env.WECOM_CLI_CONFIG_DIR }
      : {}),
    ...(process.env.WECOM_CLI_TMP_DIR ? { WECOM_CLI_TMP_DIR: process.env.WECOM_CLI_TMP_DIR } : {})
  };
}

export function parseWeComVersion(output: string): string | undefined {
  return output.match(/(?:wecom-cli\s+)?(\d+\.\d+\.\d+)/i)?.[1];
}

export function isVersionAtLeast(version: string, minimum = MINIMUM_WECOM_VERSION): boolean {
  const current = version.split(".").map(Number);
  const required = minimum.split(".").map(Number);
  for (let index = 0; index < Math.max(current.length, required.length); index += 1) {
    const difference = (current[index] ?? 0) - (required[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

export async function runWeCom(
  args: string[],
  timeoutMs = 120_000
): Promise<CliResult> {
  const executable = resolveWeComExecutable();
  if (!executable) {
    return {
      success: false,
      exitCode: -1,
      stdout: "",
      stderr: "wecom-cli was not found. Rebuild the plugin or set WECOM_CLI_PATH."
    };
  }

  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      env: commandEnv()
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        resolve({ success: false, exitCode: -1, stdout, stderr: `${stderr}\nCommand timed out.`.trim(), data: { timedOut: true } });
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve({ success: false, exitCode: -1, stdout, stderr: error.message });
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      const trimmed = stdout.trim();
      let data: unknown;
      if (trimmed) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          data = undefined;
        }
      }
      resolve({
        success: code === 0,
        exitCode: code ?? -1,
        stdout: trimmed,
        stderr: stderr.trim(),
        data
      });
    });
  });
}

export async function callWeCom(
  category: string,
  operation: string,
  input: JsonObject
): Promise<CliResult> {
  return runWeCom([category, operation, JSON.stringify(input)]);
}

export function isWeComAuthenticated(result: CliResult): boolean {
  if (!result.success) return false;
  if (/^unauthorized\s*$/i.test(result.stdout.trim())) return false;
  return /"id"\s*:\s*"/.test(`${result.stdout}\n${result.stderr}`);
}

export function getWeComAuthSession(): WeComAuthSession | undefined {
  return authSession ? structuredClone(authSession) : undefined;
}

export function cancelWeComAuth(): boolean {
  if (!authProcess) return false;
  const cancelled = authProcess.kill();
  if (cancelled) {
    authProcess = undefined;
    authSession = { ...authSession!, status: "failed", message: "Authorization was cancelled." };
  }
  return cancelled;
}

export async function startWeComAuth(
  options: { openBrowser?: boolean; discoveryTimeoutMs?: number } = {}
): Promise<CliResult & { authSession?: WeComAuthSession }> {
  const openBrowser = options.openBrowser ?? true;
  const discoveryTimeoutMs = options.discoveryTimeoutMs ?? 15_000;
  if (authProcess && authSession && ["starting", "waiting_for_scan"].includes(authSession.status)) {
    return { success: true, exitCode: 0, stdout: "", stderr: "", authSession: getWeComAuthSession() };
  }

  const executable = resolveWeComExecutable();
  if (!executable) {
    return {
      success: false,
      exitCode: -1,
      stdout: "",
      stderr: "wecom-cli was not found. Rebuild the plugin or set WECOM_CLI_PATH."
    };
  }

  const startedAt = Date.now();
  authSession = {
    status: "starting",
    browserOpenRequested: openBrowser,
    startedAt,
    expiresAt: startedAt + AUTH_SESSION_TTL_MS
  };

  return new Promise((resolve) => {
    const args = ["init", "--noninteractive", ...(openBrowser ? [] : ["--no-open"])];
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      env: commandEnv()
    });
    authProcess = child;
    let stdout = "";
    let stderr = "";
    let discoverySettled = false;

    const finishDiscovery = (result: CliResult & { authSession?: WeComAuthSession }): void => {
      if (discoverySettled) return;
      discoverySettled = true;
      resolve(result);
    };
    const inspect = (): void => {
      const authUrl = `${stdout}\n${stderr}`.match(AUTH_URL_PATTERN)?.[0];
      if (authUrl) {
        authSession = { ...authSession!, status: "waiting_for_scan", authUrl };
        finishDiscovery({
          success: true,
          exitCode: 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          authSession: getWeComAuthSession()
        });
      }
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      inspect();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      inspect();
    });
    child.on("error", (error) => {
      authProcess = undefined;
      authSession = { ...authSession!, status: "failed", message: error.message };
      finishDiscovery({ success: false, exitCode: -1, stdout, stderr: error.message, authSession: getWeComAuthSession() });
    });
    child.on("close", (code) => {
      authProcess = undefined;
      const success = code === 0;
      authSession = {
        ...authSession!,
        status: success ? "authenticated" : "failed",
        message: success ? "Authorization completed." : (stderr.trim() || stdout.trim() || "Authorization failed.")
      };
      finishDiscovery({
        success,
        exitCode: code ?? -1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        authSession: getWeComAuthSession()
      });
    });
    setTimeout(() => {
      if (!discoverySettled && authSession?.status === "starting") {
        child.kill();
        authSession = { ...authSession, status: "failed", message: "No authorization URL was emitted." };
        finishDiscovery({
          success: false,
          exitCode: -1,
          stdout,
          stderr: `${stderr}\nNo authorization URL was emitted.`.trim(),
          authSession: getWeComAuthSession()
        });
      }
    }, discoveryTimeoutMs);
  });
}
