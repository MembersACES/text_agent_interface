import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isEmailInInvoicingAllowlist } from "@/lib/invoicing-allowlist";

/**
 * Returns whether the current user may access the Invoicing page.
 * This intentionally reads a server env var so Cloud Run can update access without
 * requiring a new Next.js build (unlike NEXT_PUBLIC_* embedded in the client).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ allowed: false });
  }

  const allowed = isEmailInInvoicingAllowlist(session.user.email);
  return NextResponse.json({ allowed });
}
