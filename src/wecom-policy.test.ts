import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedRead, isAllowedWrite } from "./wecom-policy.js";
import { isVersionAtLeast, isWeComAuthenticated, parseWeComVersion } from "./wecom-cli.js";

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
