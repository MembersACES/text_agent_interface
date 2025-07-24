import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
}

export function getCanvaApiBaseUrl() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return "http://localhost:3000"; // Next.js local API routes
  }

  return process.env.NEXT_PUBLIC_CANVA_API_BASE_URL || "";
}