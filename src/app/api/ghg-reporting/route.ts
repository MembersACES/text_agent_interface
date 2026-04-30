import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { business_name, wip_document_id } = (await req.json()) as {
      business_name?: string;
      wip_document_id?: string;
    };

    if (!business_name?.trim()) {
      return NextResponse.json(
        { error: "Missing required field: business_name" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      business_name: business_name.trim(),
      sheet_name: "GHG reporting",
    };

    if (wip_document_id?.trim()) {
      payload.wip_document_id = wip_document_id.trim();
    }

    const upstream = await fetch(
      "https://membersaces.app.n8n.cloud/webhook/pull_descrepancy_advocacy_WIP",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const text = await upstream.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Failed to load GHG reporting data",
          details: data,
        },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ data: Array.isArray(data) ? data : [] });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load GHG reporting data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
