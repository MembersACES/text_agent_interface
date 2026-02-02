import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBaseUrl(): string {
  // For server-side (Next.js API routes), check environment variables first
  if (typeof window === 'undefined') {
    // Server-side: check environment variables
    // But only use them if they point to a backend (not localhost:3000)
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_API_URL;
    if (envUrl && !envUrl.includes('localhost:3000') && !envUrl.includes('localhost:3001')) {
      return envUrl;
    }
    // Check if we're in dev environment (Vercel preview or local)
    if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_URL?.includes('acesagentinterfacedev')) {
      return 'https://text-agent-backend-dev-672026052958.australia-southeast2.run.app';
    }
    // Production uses production backend
    if (process.env.NODE_ENV === "production") {
      return "https://text-agent-backend-672026052958.australia-southeast2.run.app";
    }
    // Local development uses local backend
    return "http://localhost:8000";
  }
  
  // Client-side: check if we're on the dev frontend URL
  if (window.location.hostname.includes('acesagentinterfacedev')) {
    return 'https://text-agent-backend-dev-672026052958.australia-southeast2.run.app';
  }
  
  // Use local backend in development, production backend in production
  return process.env.NODE_ENV === "development"
    ? "http://localhost:8000"  // Your local FastAPI server
    : "https://text-agent-backend-672026052958.australia-southeast2.run.app";
}

export function getCanvaApiBaseUrl() {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "";
}