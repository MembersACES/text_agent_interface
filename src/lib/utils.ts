import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBaseUrl(requestHost?: string): string {
  // Server-side (Next.js API routes): use request host so dev frontend → dev backend
  if (typeof window === 'undefined') {
    const host = requestHost ?? process.env.VERCEL_URL ?? '';
    if (host && host.includes('acesagentinterfacedev')) {
      return 'https://text-agent-backend-dev-672026052958.australia-southeast2.run.app';
    }
    // Env vars (BACKEND_API_URL or NEXT_PUBLIC_API_BASE_URL) override for server
    const envUrl = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL)?.trim();
    if (envUrl && envUrl.length > 0 && !envUrl.includes('localhost:3000') && !envUrl.includes('localhost:3001')) {
      return envUrl;
    }
    if (process.env.VERCEL_ENV === 'preview') {
      return 'https://text-agent-backend-dev-672026052958.australia-southeast2.run.app';
    }
    if (process.env.NODE_ENV === "production") {
      return "https://text-agent-backend-672026052958.australia-southeast2.run.app";
    }
    return "http://localhost:8000";
  }

  // Client-side: dev frontend → dev backend
  if (window.location.hostname.includes('acesagentinterfacedev')) {
    return 'https://text-agent-backend-dev-672026052958.australia-southeast2.run.app';
  }
  return process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://text-agent-backend-672026052958.australia-southeast2.run.app";
}

/**
 * Base URL for autonomous sequence API (`/api/autonomous/*`).
 * When unset, uses the main CRM API (monolith). Set `NEXT_PUBLIC_AUTONOMOUS_API_BASE_URL`
 * when sequences run on a dedicated service (same path prefix).
 */
export function getAutonomousApiBaseUrl(requestHost?: string): string {
  const trim = (u: string) => u.replace(/\/$/, "");
  const publicUrl = process.env.NEXT_PUBLIC_AUTONOMOUS_API_BASE_URL?.trim();
  const serverOnly = process.env.AUTONOMOUS_API_URL?.trim();
  // Server (API routes, SSR): prefer AUTONOMOUS_API_URL so Cloud Run runtime env
  // reliably overrides NEXT_PUBLIC_* (which may not be present at runtime depending on build).
  if (typeof window === "undefined") {
    if (serverOnly) return trim(serverOnly);
    if (publicUrl) return trim(publicUrl);
    return getApiBaseUrl(requestHost);
  }
  // Browser: NEXT_PUBLIC_* is the supported override.
  if (publicUrl) return trim(publicUrl);
  return getApiBaseUrl(requestHost);
}

/**
 * Base URL for the autonomous *runner* service (`POST /run/run/{id}`, `POST /run/step/{id}`).
 * Intentionally does not fall back to the main CRM API — set one of the env vars below
 * to the Cloud Run service that implements those routes.
 */
export function getAutonomousRunnerApiBaseUrl(): string | null {
  const trim = (u: string) => u.replace(/\/$/, "");
  const runnerOnly = process.env.AUTONOMOUS_RUNNER_API_URL?.trim();
  if (runnerOnly) return trim(runnerOnly);
  const serverOnly = process.env.AUTONOMOUS_API_URL?.trim();
  if (serverOnly) return trim(serverOnly);
  const publicUrl = process.env.NEXT_PUBLIC_AUTONOMOUS_API_BASE_URL?.trim();
  if (publicUrl) return trim(publicUrl);
  return null;
}

export function getCanvaApiBaseUrl() {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "";
}

/** Format as Australian date dd/mm/yyyy. Accepts yyyy-mm-dd or ISO. */
export function formatDateAustralian(dateString?: string | null): string {
  if (!dateString || typeof dateString !== "string") return "";
  const s = dateString.trim();
  if (!s) return "";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
  } catch {
    return s;
  }
}

/** Format for display/input as dd-mm-yyyy. Accepts YYYY-MM-DD or ISO. */
export function formatDateDDMMYYYY(dateString?: string | null): string {
  if (!dateString || typeof dateString !== "string") return "";
  const s = dateString.trim();
  if (!s) return "";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day.toString().padStart(2, "0")}-${month.toString().padStart(2, "0")}-${year}`;
  } catch {
    return s;
  }
}

/** Parse user input dd-mm-yyyy or d-m-yyyy (or dd/mm/yyyy) to YYYY-MM-DD for API. Returns "" if invalid. */
export function parseDateDDMMYYYYToISO(input: string | undefined | null): string {
  if (input == null || typeof input !== "string") return "";
  const s = input.trim();
  if (!s) return "";
  const parts = s.split(/[-/]/);
  if (parts.length !== 3) return "";
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  let y = parseInt(parts[2], 10);
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return "";
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  const month = m.toString().padStart(2, "0");
  const day = d.toString().padStart(2, "0");
  const year = y.toString();
  const iso = `${year}-${month}-${day}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== d || date.getUTCMonth() + 1 !== m) return "";
  return iso;
}