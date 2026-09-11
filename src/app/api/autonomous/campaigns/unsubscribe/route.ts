import { NextRequest, NextResponse } from "next/server";
import { getAutonomousApiBaseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function proxyUnsubscribe(req: NextRequest) {
  const incoming = new URL(req.url);
  const target = `${getAutonomousApiBaseUrl()}/api/autonomous/campaigns/unsubscribe${incoming.search}`;
  const init: RequestInit = {
    method: req.method,
    redirect: "manual",
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
    const contentType = req.headers.get("content-type");
    if (contentType) {
      init.headers = { "content-type": contentType };
    }
  }
  const upstream = await fetch(target, init);
  const body = await upstream.arrayBuffer();
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
  headers.set("content-type", contentType);
  headers.set("cache-control", "no-store");
  return new NextResponse(body, {
    status: upstream.status,
    headers,
  });
}

export function GET(req: NextRequest) {
  return proxyUnsubscribe(req);
}

export function POST(req: NextRequest) {
  return proxyUnsubscribe(req);
}
