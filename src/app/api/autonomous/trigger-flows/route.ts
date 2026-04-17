import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const TRIGGER_FLOW_WEBHOOK_URL =
  "https://membersaces.app.n8n.cloud/webhook/aces-autonomous-agent/trigger-flow";

/**
 * Proxies to n8n so the browser avoids CORS; requires a signed-in portal user.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = {
      triggered_by: (session.user as { email?: string | null })?.email ?? null,
      triggered_at: new Date().toISOString(),
    };

    const webhookRes = await fetch(TRIGGER_FLOW_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await webhookRes.text();
    let webhookData: unknown = null;
    try {
      webhookData = responseText ? JSON.parse(responseText) : null;
    } catch {
      webhookData = { raw: responseText };
    }

    if (!webhookRes.ok) {
      return NextResponse.json(
        {
          error: `Webhook returned ${webhookRes.status}`,
          webhook_response: webhookData,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, webhook_response: webhookData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to trigger flows";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
