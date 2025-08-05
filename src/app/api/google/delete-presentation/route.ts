import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { presentation_id, user_token } = body;

    // Get the backend API URL from environment
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";
    
    const response = await fetch(`${backendUrl}/api/google/delete-presentation`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user_token}`,
      },
      body: JSON.stringify({
        presentation_id,
        google_token: user_token,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Backend API Error:", result);
      return NextResponse.json(
        { error: result.detail || result.error || "Failed to delete presentation" },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting presentation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 