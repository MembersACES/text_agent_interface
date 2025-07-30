import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
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
