import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAllowedEmailDomain } from "@/lib/allowed-email-domains";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAllowedEmailDomain(session.user?.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const res = await fetch("https://script.google.com/macros/s/AKfycbz4i4oTpzLQlnYxRq4xYw07RIG6S6AigbiK7NWpPrLu5BBYcQ7NjEDkKgOkvarWZJMc/exec", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to call GAS", message: error.message },
      { status: 500 }
    );
  }
}
