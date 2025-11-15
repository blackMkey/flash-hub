// Token session API - handles server-side token storage with HttpOnly cookies
import { type NextRequest, NextResponse } from "next/server";
import { sessionStore } from "../libs/sessionStore";

const COOKIE_NAME = "jira_session";
const COOKIE_MAX_AGE = 4 * 60 * 60; // 4 hours in seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token is required and must be a string" },
        { status: 400 }
      );
    }

    if (token.trim().length === 0) {
      return NextResponse.json(
        { error: "Token cannot be empty" },
        { status: 400 }
      );
    }

    console.log("🔐 Creating session for token...");

    // Create session and store token server-side
    const sessionId = sessionStore.createSession(token.trim());

    console.log("✅ Session created successfully");

    // Set HttpOnly cookie with session ID
    const response = NextResponse.json({
      success: true,
      message: "Token stored securely",
    });

    response.cookies.set(COOKIE_NAME, sessionId, {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("❌ Session creation failed:", error);

    return NextResponse.json(
      {
        error: "Failed to create session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to logout/clear session
export function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(COOKIE_NAME)?.value;

    if (sessionId) {
      sessionStore.deleteSession(sessionId);
    }

    const response = NextResponse.json({
      success: true,
      message: "Session cleared",
    });

    // Clear the cookie
    response.cookies.delete(COOKIE_NAME);

    return response;
  } catch (error) {
    console.error("❌ Session deletion failed:", error);

    return NextResponse.json(
      { error: "Failed to clear session" },
      { status: 500 }
    );
  }
}
