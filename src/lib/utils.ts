import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use environment variable or fallback
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
  }
  // Server-side: use environment variable or fallback
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
}
