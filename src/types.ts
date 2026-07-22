export type JsonObject = Record<string, unknown>;

export interface CliResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  data?: unknown;
}

export type ConnectorErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_EXPIRED"
  | "PERMISSION_DENIED"
  | "CONFIRMATION_REQUIRED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "AMBIGUOUS_MATCH"
  | "INVALID_ARGUMENT"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "CLI_NOT_INSTALLED"
  | "CLI_VERSION_UNSUPPORTED";

export interface ConnectorError {
  code: ConnectorErrorCode;
  message: string;
  details?: unknown;
}

export interface PendingOperation {
  id: string;
  category: string;
  operation: string;
  input: JsonObject;
  summary: string;
  createdAt: number;
  expiresAt: number;
}

export interface WeComAuthSession {
  status: "starting" | "waiting_for_scan" | "authenticated" | "failed";
  authUrl?: string;
  browserOpenRequested: boolean;
  startedAt: number;
  expiresAt: number;
  message?: string;
}
