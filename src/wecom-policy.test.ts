import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedRead, isAllowedWrite } from "./wecom-policy.js";
import { isVersionAtLeast, isWeComAuthenticated, parseWeComVersion, weComPlatformKey } from "./wecom-cli.js";

test("read operations are allowlisted", () => {
  assert.equal(isAllowedRead("msg", "get_message"), true);
  assert.equal(isAllowedRead("msg", "send_message"), false);
});

test("WeCom version parsing and comparison enforce the minimum", () => {
  assert.equal(parseWeComVersion("wecom-cli 0.1.9"), "0.1.9");
  assert.equal(isVersionAtLeast("0.1.9"), true);
  assert.equal(isVersionAtLeast("0.2.0"), true);
  assert.equal(isVersionAtLeast("0.1.8"), false);
});

test("WeCom platform keys cover supported desktop and server targets", () => {
  assert.equal(weComPlatformKey("win32", "x64"), "win32-x64");
  assert.equal(weComPlatformKey("darwin", "arm64"), "darwin-arm64");
  assert.equal(weComPlatformKey("linux", "x64"), "linux-x64");
  assert.equal(weComPlatformKey("linux", "riscv64"), undefined);
});

test("write operations require prepare and confirm", () => {
  assert.equal(isAllowedWrite("msg", "send_message"), true);
  assert.equal(isAllowedWrite("msg", "get_message"), false);
});

test("WeCom auth status does not trust exit code alone", () => {
  assert.equal(isWeComAuthenticated({ success: true, exitCode: 0, stdout: "unauthorized", stderr: "" }), false);
  assert.equal(
    isWeComAuthenticated({ success: true, exitCode: 0, stdout: '{"id":"bot-1"}', stderr: "" }),
    true
  );
});
