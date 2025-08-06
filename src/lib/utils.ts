import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBaseUrl(): string {
  // Use local backend in development, production backend in production
  return process.env.NODE_ENV === "development"
    ? "http://localhost:8000"  // Your local FastAPI server
    : "https://text-agent-backend-672026052958.australia-southeast2.run.app";
  
  // Temporarily use production backend for testing
  // return "https://text-agent-backend-672026052958.australia-southeast2.run.app";
}

export function getCanvaApiBaseUrl() {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "";
}