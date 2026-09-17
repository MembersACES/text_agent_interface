import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import PdfMerger from "pdf-merger-js";
import { authOptions } from "@/lib/auth";
import { isAllowedEmailDomain } from "@/lib/allowed-email-domains";

type MergePdfsBody = {
  pdf_urls?: string[];
};

const ALLOWED_FETCH_HOST_SUFFIXES = [
  "canva.com",
  "canva-apps.com",
  "googleusercontent.com",
  "storage.googleapis.com",
  "drive.google.com",
  "docs.google.com",
] as const;

function hostnameAllowed(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host || host.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return false;
  }
  return ALLOWED_FETCH_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function assertAllowedHttpsUrl(raw: string, base?: string): URL {
  let parsed: URL;
  try {
    parsed = base ? new URL(raw, base) : new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("disallowed_url");
  }
  if (parsed.username || parsed.password) {
    throw new Error("disallowed_url");
  }
  if (!hostnameAllowed(parsed.hostname)) {
    throw new Error("disallowed_url");
  }
  return parsed;
}

async function fetchAllowedPdf(url: string): Promise<Response> {
  let current = assertAllowedHttpsUrl(url).toString();
  for (let hop = 0; hop < 5; hop += 1) {
    const res = await fetch(current, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error("invalid_redirect");
      }
      current = assertAllowedHttpsUrl(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("too_many_redirects");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAllowedEmailDomain(session.user?.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { pdf_urls } = (await req.json()) as MergePdfsBody;

    if (!Array.isArray(pdf_urls) || pdf_urls.length === 0) {
      return NextResponse.json(
        { error: "No PDF URLs provided." },
        { status: 400 }
      );
    }

    const merger = new PdfMerger();

    for (let i = 0; i < pdf_urls.length; i++) {
      const url = pdf_urls[i];
      if (typeof url !== "string" || !url.trim()) {
        return NextResponse.json(
          { error: `Invalid PDF URL at index ${i}` },
          { status: 400 }
        );
      }

      let parsed: URL;
      try {
        parsed = assertAllowedHttpsUrl(url);
      } catch {
        return NextResponse.json(
          { error: `PDF URL host is not allowed at index ${i}` },
          { status: 400 }
        );
      }

      const res = await fetchAllowedPdf(parsed.toString());
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF at index ${i}` },
          { status: 500 }
        );
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await merger.add(buffer);
    }

    const mergedBuffer = await merger.saveAsBuffer();
    const body = Uint8Array.from(mergedBuffer as ArrayLike<number>);

    return new NextResponse(body as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="merged_strategy.pdf"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "disallowed_url" || message === "invalid_url" || message === "invalid_redirect" || message === "too_many_redirects") {
      return NextResponse.json({ error: "PDF URL host is not allowed" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
