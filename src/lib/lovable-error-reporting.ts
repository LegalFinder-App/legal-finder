type RuntimeErrorContext = Record<string, unknown>;

declare global {
  interface Window {
    __appRuntimeErrorReporter?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
      context?: RuntimeErrorContext;
    }) => void;
  }
}

export function reportRuntimeError(error: unknown, context: RuntimeErrorContext = {}) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  window.__appRuntimeErrorReporter?.({
    message,
    stack: error instanceof Error ? error.stack : undefined,
    filename: window.location.pathname,
    context,
  });
}
