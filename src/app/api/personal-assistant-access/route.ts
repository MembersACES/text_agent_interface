import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isEmailInPersonalAssistantAllowlist } from "@/lib/personal-assistant-allowlist";

/**
 * Returns whether the current user may access the Personal Assistant page.
 * Reads a server env var so Cloud Run can update access without a new Next.js build.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ allowed: false });
  }

  const allowed = isEmailInPersonalAssistantAllowlist(session.user.email);
  return NextResponse.json({ allowed });
}
