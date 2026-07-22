import { chmod, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extract } from "tar";

const version = "0.1.9";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = resolve(root, "plugins", "tencent-connectors", "runtime", "native");
const targets = [
  ["win32-x64", "@wecom/cli-win32-x64", "wecom-cli.exe"],
  ["darwin-x64", "@wecom/cli-darwin-x64", "wecom-cli"],
  ["darwin-arm64", "@wecom/cli-darwin-arm64", "wecom-cli"],
  ["linux-x64", "@wecom/cli-linux-x64", "wecom-cli"],
  ["linux-arm64", "@wecom/cli-linux-arm64", "wecom-cli"]
];

await mkdir(runtimeRoot, { recursive: true });

for (const [index, [platformKey, packageName, nativeName]] of targets.entries()) {
  if (index > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000));
  const packageSlug = packageName.split("/")[1];
  const tarballUrl = `https://registry.npmjs.org/${packageName}/-/${packageSlug}-${version}.tgz`;
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "codex-tencent-connectors-"));
  const archivePath = resolve(temporaryDirectory, "runtime.tgz");

  try {
    const response = await fetch(tarballUrl);
    if (!response.ok) throw new Error(`Failed to download ${packageName}: HTTP ${response.status}`);
    await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
    await extract({ file: archivePath, cwd: temporaryDirectory });

    const targetDirectory = resolve(runtimeRoot, platformKey);
    await mkdir(targetDirectory, { recursive: true });
    const nativeTarget = resolve(targetDirectory, nativeName);
    await copyFile(resolve(temporaryDirectory, "package", "bin", nativeName), nativeTarget);
    if (platformKey !== "win32-x64") await chmod(nativeTarget, 0o755);
    await copyFile(resolve(temporaryDirectory, "package", "LICENSE"), resolve(targetDirectory, "LICENSE.txt"));
    console.log(`Synced ${packageName}@${version} -> ${platformKey}`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
