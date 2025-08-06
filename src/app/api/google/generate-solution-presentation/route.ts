import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, selected_solutions, business_info, user_token } = body;

    // Get the backend API URL from environment
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";
    
    const response = await fetch(`${backendUrl}/api/google/generate-solution-presentation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user_token}`,
      },
      body: JSON.stringify({
        title,
        selected_solutions,
        business_info,
        user_token,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Backend API Error:", result);
      return NextResponse.json(
        { error: result.detail || result.error || "Failed to generate presentation" },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error generating presentation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 