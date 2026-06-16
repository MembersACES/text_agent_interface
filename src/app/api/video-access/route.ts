import { NextResponse } from "next/server";

/**
 * Whether testimonial / marketing video creation is enabled in this environment.
 * Reads a server env var so Cloud Run can toggle it without a new Next.js build.
 * Set ENABLE_VIDEO=true to enable; anything else (or unset) disables it.
 */
export async function GET() {
  return NextResponse.json({ allowed: process.env.ENABLE_VIDEO === "true" });
}
