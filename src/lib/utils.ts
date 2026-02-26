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

export function getCanvaApiBaseUrl() {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "";
}