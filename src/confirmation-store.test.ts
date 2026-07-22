import assert from "node:assert/strict";
import test from "node:test";
import { ConfirmationStore } from "./confirmation-store.js";

test("confirmation operations are single-use", () => {
  const store = new ConfirmationStore();
  const pending = store.create("msg", "send_message", { text: { content: "hello" } }, "Send hello");
  assert.equal(store.take(pending.id)?.summary, "Send hello");
  assert.equal(store.take(pending.id), undefined);
});

test("confirmation operations can be cancelled", () => {
  const store = new ConfirmationStore();
  const pending = store.create("todo", "delete_todo", { id: "1" }, "Delete todo 1");
  assert.equal(store.cancel(pending.id), true);
  assert.equal(store.take(pending.id), undefined);
});
