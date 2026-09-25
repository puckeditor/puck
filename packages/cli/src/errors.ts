export type ErrorCode =
  | "PUCK-CLI-INTERNAL"
  | "PUCK-CLI-INVALID-ARGS"
  | "PUCK-CLI-UNKNOWN-COMMAND"
  | "PUCK-CLI-UNKNOWN-CAPABILITY"
  | "PUCK-CLI-CWD-NOT-FOUND"
  | "PUCK-CLI-INVALID-API-KEY"
  | "PUCK-CLI-API-KEY-REJECTED"
  | "PUCK-CLI-INVALID-APP-NAME"
  | "PUCK-CLI-NO-PACKAGE-JSON"
  | "PUCK-CLI-INVALID-PACKAGE-JSON"
  | "PUCK-CLI-UNSUPPORTED-FRAMEWORK"
  | "PUCK-CLI-UNSUPPORTED-FRAMEWORK-VERSION"
  | "PUCK-CLI-UNSUPPORTED-ROUTER"
  | "PUCK-CLI-AMBIGUOUS-FRAMEWORK"
  | "PUCK-CLI-FRAMEWORK-MISMATCH"
  | "PUCK-CLI-WORKSPACE-TARGET-NOT-FOUND"
  | "PUCK-CLI-TYPESCRIPT-REQUIRED"
  | "PUCK-CLI-TARGET-DIR-NOT-EMPTY"
  | "PUCK-CLI-FILE-CHANGED"
  | "PUCK-CLI-WRITE-FAILED"
  | "PUCK-CLI-INSTALL-FAILED"
  | "PUCK-CLI-PACKAGE-MANAGER-NOT-FOUND"
  | "PUCK-CLI-CLOUD-UNREACHABLE"
  | "PUCK-CLI-CONNECT-FAILED"
  | "PUCK-CLI-DOC-NOT-FOUND"
  | "PUCK-CLI-CANCELLED";

export const EXIT_CODES = {
  success: 0,
  internal: 1,
  usage: 2,
  unsupported: 3,
  filesystem: 4,
  packageManager: 5,
  doctorFailed: 6,
  cloud: 7,
  actionRequired: 10,
  partial: 11,
  cancelled: 130,
} as const;

const exitCodeByError: Record<ErrorCode, number> = {
  "PUCK-CLI-INTERNAL": EXIT_CODES.internal,
  "PUCK-CLI-INVALID-ARGS": EXIT_CODES.usage,
  "PUCK-CLI-UNKNOWN-COMMAND": EXIT_CODES.usage,
  "PUCK-CLI-UNKNOWN-CAPABILITY": EXIT_CODES.usage,
  "PUCK-CLI-CWD-NOT-FOUND": EXIT_CODES.usage,
  "PUCK-CLI-INVALID-API-KEY": EXIT_CODES.usage,
  "PUCK-CLI-API-KEY-REJECTED": EXIT_CODES.usage,
  "PUCK-CLI-INVALID-APP-NAME": EXIT_CODES.usage,
  "PUCK-CLI-NO-PACKAGE-JSON": EXIT_CODES.unsupported,
  "PUCK-CLI-INVALID-PACKAGE-JSON": EXIT_CODES.unsupported,
  "PUCK-CLI-UNSUPPORTED-FRAMEWORK": EXIT_CODES.unsupported,
  "PUCK-CLI-UNSUPPORTED-FRAMEWORK-VERSION": EXIT_CODES.unsupported,
  "PUCK-CLI-UNSUPPORTED-ROUTER": EXIT_CODES.unsupported,
  "PUCK-CLI-AMBIGUOUS-FRAMEWORK": EXIT_CODES.unsupported,
  "PUCK-CLI-FRAMEWORK-MISMATCH": EXIT_CODES.unsupported,
  "PUCK-CLI-WORKSPACE-TARGET-NOT-FOUND": EXIT_CODES.unsupported,
  "PUCK-CLI-TYPESCRIPT-REQUIRED": EXIT_CODES.unsupported,
  "PUCK-CLI-TARGET-DIR-NOT-EMPTY": EXIT_CODES.filesystem,
  "PUCK-CLI-FILE-CHANGED": EXIT_CODES.filesystem,
  "PUCK-CLI-WRITE-FAILED": EXIT_CODES.filesystem,
  "PUCK-CLI-INSTALL-FAILED": EXIT_CODES.packageManager,
  "PUCK-CLI-PACKAGE-MANAGER-NOT-FOUND": EXIT_CODES.packageManager,
  "PUCK-CLI-CLOUD-UNREACHABLE": EXIT_CODES.cloud,
  "PUCK-CLI-CONNECT-FAILED": EXIT_CODES.cloud,
  "PUCK-CLI-DOC-NOT-FOUND": EXIT_CODES.usage,
  "PUCK-CLI-CANCELLED": EXIT_CODES.cancelled,
};

export const exitCodeForError = (code: ErrorCode) => exitCodeByError[code];

export interface CliErrorPayload {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class CliError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }

  toPayload(): CliErrorPayload {
    return { code: this.code, message: this.message, details: this.details };
  }
}
