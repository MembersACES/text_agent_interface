/**
 * Human-readable text from API error JSON (FastAPI `detail`, app `message`, etc.).
 */
export function formatBackendErrorBody(data: unknown): string {
  if (data == null || typeof data !== "object") {
    return "Request failed.";
  }
  const d = data as Record<string, unknown>;
  const message = d.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  const detail = d.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const msg = o.msg;
        const loc = o.loc;
        const path =
          Array.isArray(loc) && loc.length
            ? String(loc.filter((x) => x !== "body" && x !== "form").join("."))
            : "";
        const text = typeof msg === "string" ? msg : JSON.stringify(item);
        return path ? `${path}: ${text}` : text;
      }
      return String(item);
    });
    const joined = parts.filter(Boolean).join("; ");
    return joined || "Validation error.";
  }
  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return "Request failed.";
}
