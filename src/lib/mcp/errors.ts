/**
 * Consistent error codes for every MCP tool response.
 * Errors are returned as `[CODE] message` text plus a structured
 * `{ error: { code, message, hint } }` payload so assistants can react.
 */
export type McpErrorCode =
  | "UNAUTHENTICATED"
  | "ACCESS_REVOKED"
  | "RATE_LIMITED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export type McpToolError = {
  content: { type: "text"; text: string }[];
  structuredContent: { error: { code: string; message: string; hint: string | null } };
  isError: true;
};

export function toolError(code: McpErrorCode, message: string, hint?: string): McpToolError {
  return {
    content: [{ type: "text", text: `[${code}] ${message}${hint ? ` ${hint}` : ""}` }],
    structuredContent: { error: { code, message, hint: hint ?? null } },
    isError: true,
  };
}

export function unauthenticatedError(): McpToolError {
  return toolError(
    "UNAUTHENTICATED",
    "You are not signed in to GavelLab.",
    "Reconnect this assistant and approve access with your GavelLab account.",
  );
}

export function revokedError(): McpToolError {
  return toolError(
    "ACCESS_REVOKED",
    "A GavelLab admin revoked this assistant's access.",
    "Ask an admin to restore it, or reconnect to request access again.",
  );
}

export function rateLimitError(limit: number): McpToolError {
  return toolError(
    "RATE_LIMITED",
    `Too many requests: the limit is ${limit} tool calls per minute.`,
    "Wait a minute before trying again.",
  );
}

export function notFoundError(what: string): McpToolError {
  return toolError("NOT_FOUND", `${what} was not found, or you do not have access to it.`);
}

/** Translates a database failure into a friendly, coded tool error. */
export function databaseError(
  error: { message: string; code?: string | null },
  what: string,
): McpToolError {
  const code = error.code ?? "";
  if (code === "42501" || code === "PGRST301" || /row-level security|permission denied/i.test(error.message)) {
    return toolError(
      "PERMISSION_DENIED",
      `Your GavelLab account is not allowed to ${what}.`,
      "Judges can only read active events and manage their own scores.",
    );
  }
  if (code === "23503") {
    return toolError(
      "INVALID_INPUT",
      `Could not ${what}: one of the ids does not match an existing record.`,
      "Check the event, submission and criterion ids.",
    );
  }
  if (code === "22P02") {
    return toolError("INVALID_INPUT", `Could not ${what}: an id was not a valid identifier.`);
  }
  return toolError("DATABASE_ERROR", `Could not ${what}.`, error.message);
}

/** Successful response: pretty JSON text plus the same structured payload. */
export function toolSuccess(payload: Record<string, unknown>, text?: string) {
  return {
    content: [{ type: "text" as const, text: text ?? JSON.stringify(payload) }],
    structuredContent: payload as Record<string, never>,
  };
}
