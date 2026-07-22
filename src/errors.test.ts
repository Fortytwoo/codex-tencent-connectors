import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWeComError } from "./errors.js";

test("normalizes common WeCom failures", () => {
  assert.equal(
    normalizeWeComError({ success: false, exitCode: 1, stdout: "unauthorized", stderr: "" }).code,
    "AUTH_REQUIRED"
  );
  assert.equal(
    normalizeWeComError({ success: false, exitCode: -1, stdout: "", stderr: "Command timed out.", data: { timedOut: true } }).code,
    "TIMEOUT"
  );
  assert.equal(
    normalizeWeComError({ success: false, exitCode: -1, stdout: "", stderr: "wecom-cli was not found" }).code,
    "CLI_NOT_INSTALLED"
  );
});
