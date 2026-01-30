import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBaseUrl(): string {
  // For server-side (Next.js API routes), check environment variables first
  if (typeof window === 'undefined') {
    // Server-side: check environment variables
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    if (process.env.BACKEND_API_URL) {
      return process.env.BACKEND_API_URL;
    }
    // Check if we're in dev environment (Vercel preview or local)
    if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_URL?.includes('acesagentinterfacedev')) {
      return 'https://text-agent-backend-dev-672026052958.australia-southeast2.run.app';
    }
    // Production uses production backend
    if (process.env.NODE_ENV === "production") {
      return "https://text-agent-backend-672026052958.australia-southeast2.run.app";
    }
    // Development uses dev backend
    return "https://text-agent-backend-dev-672026052958.australia-southeast2.run.app";
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