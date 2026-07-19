export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  console.error("React error boundary caught an error", {
    error,
    route: window.location.pathname,
    ...context,
  });
}