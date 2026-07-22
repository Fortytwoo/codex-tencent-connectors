import { chmod, mkdir, copyFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { platform, arch } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeDir = resolve(root, "plugins", "tencent-connectors", "runtime");
const require = createRequire(import.meta.url);

await mkdir(runtimeDir, { recursive: true });
await rm(resolve(runtimeDir, "server.mjs.map"), { force: true });
await build({
  entryPoints: [resolve(root, "src", "server.ts")],
  outfile: resolve(runtimeDir, "server.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: false
});

await copyFile(resolve(root, "README.md"), resolve(root, "plugins", "tencent-connectors", "README.md"));

const packageName = {
  "win32-x64": "@wecom/cli-win32-x64",
  "darwin-x64": "@wecom/cli-darwin-x64",
  "darwin-arm64": "@wecom/cli-darwin-arm64",
  "linux-x64": "@wecom/cli-linux-x64",
  "linux-arm64": "@wecom/cli-linux-arm64"
}[`${platform()}-${arch()}`];

if (!packageName) throw new Error(`Unsupported WeCom CLI platform: ${platform()}-${arch()}`);
const packageJson = require.resolve(`${packageName}/package.json`);
const nativeName = platform() === "win32" ? "wecom-cli.exe" : "wecom-cli";
const platformDir = resolve(runtimeDir, "native", `${platform()}-${arch()}`);
await mkdir(platformDir, { recursive: true });
const nativeTarget = resolve(platformDir, nativeName);
await copyFile(resolve(dirname(packageJson), "bin", nativeName), nativeTarget);
if (platform() !== "win32") await chmod(nativeTarget, 0o755);
await copyFile(resolve(dirname(packageJson), "LICENSE"), resolve(platformDir, "LICENSE.txt"));
