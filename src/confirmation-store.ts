import { randomUUID } from "node:crypto";
import type { JsonObject, PendingOperation } from "./types.js";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class ConfirmationStore {
  private readonly operations = new Map<string, PendingOperation>();

  create(category: string, operation: string, input: JsonObject, summary: string): PendingOperation {
    this.prune();
    const createdAt = Date.now();
    const pending: PendingOperation = {
      id: `op_${randomUUID()}`,
      category,
      operation,
      input: structuredClone(input),
      summary,
      createdAt,
      expiresAt: createdAt + DEFAULT_TTL_MS
    };
    this.operations.set(pending.id, pending);
    return pending;
  }

  take(id: string): PendingOperation | undefined {
    this.prune();
    const operation = this.operations.get(id);
    if (operation) this.operations.delete(id);
    return operation;
  }

  cancel(id: string): boolean {
    return this.operations.delete(id);
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, operation] of this.operations) {
      if (operation.expiresAt <= now) this.operations.delete(id);
    }
  }
}
