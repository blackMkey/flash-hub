// Token session API - handles server-side token storage with HttpOnly cookies
// Supports both Jira and Azure authentication
import { type NextRequest, NextResponse } from "next/server";
import { sessionStore } from "../libs/sessionStore";

const COOKIE_NAME = "auth_session";
const COOKIE_MAX_AGE = 4 * 60 * 60; // 4 hours in seconds

interface JiraTokenRequest {
  service: "jira";
  token: string;
}

interface AzureTokenRequest {
  service: "azure";
  pat: string;
  org: string;
}

type TokenRequest = JiraTokenRequest | AzureTokenRequest;

export async function POST(request: NextRequest) {
  try {
    const body: TokenRequest = await request.json();

    // Validate service type
    if (!body.service || !["jira", "azure"].includes(body.service)) {
      return NextResponse.json(
        { error: "Service must be 'jira' or 'azure'" },
        { status: 400 }
      );
    }

    // Get existing session ID or create new
    const existingSessionId = request.cookies.get(COOKIE_NAME)?.value;
    let sessionId: string;

    if (body.service === "jira") {
      // Validate Jira token
      if (!body.token || typeof body.token !== "string") {
        return NextResponse.json(
          { error: "Token is required and must be a string" },
          { status: 400 }
        );
      }

      if (body.token.trim().length === 0) {
        return NextResponse.json(
          { error: "Token cannot be empty" },
          { status: 400 }
        );
      }

      // Store Jira token in session
      sessionId = sessionStore.setServiceAuth(existingSessionId, "jira", {
        token: body.token.trim(),
      });
    } else {
      // Validate Azure credentials
      if (!body.pat || typeof body.pat !== "string") {
        return NextResponse.json(
          { error: "PAT is required and must be a string" },
          { status: 400 }
        );
      }

      if (!body.org || typeof body.org !== "string") {
        return NextResponse.json(
          { error: "Organization is required and must be a string" },
          { status: 400 }
        );
      }

      if (body.pat.trim().length === 0 || body.org.trim().length === 0) {
        return NextResponse.json(
          { error: "PAT and Organization cannot be empty" },
          { status: 400 }
        );
      }

      // Store Azure credentials in session
      sessionId = sessionStore.setServiceAuth(existingSessionId, "azure", {
        pat: body.pat.trim(),
        org: body.org.trim(),
      });
    }

    // Set HttpOnly cookie with session ID
    const response = NextResponse.json({
      success: true,
      message: `${
        body.service === "jira" ? "Jira" : "Azure"
      } credentials stored securely`,
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

// DELETE endpoint to logout/clear specific service or entire session
export function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get("service") as "jira" | "azure" | null;

    const sessionId = request.cookies.get(COOKIE_NAME)?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: true, message: "No active session" },
        { status: 200 }
      );
    }

    if (service && ["jira", "azure"].includes(service)) {
      // Clear specific service auth, keep other services
      sessionStore.clearServiceAuth(sessionId, service);

      return NextResponse.json({
        success: true,
        message: `${service === "jira" ? "Jira" : "Azure"} session cleared`,
      });
    } else {
      // Clear entire session
      sessionStore.deleteSession(sessionId);

      const response = NextResponse.json({
        success: true,
        message: "All sessions cleared",
      });

      // Clear the cookie
      response.cookies.delete(COOKIE_NAME);

      return response;
    }
  } catch (error) {
    console.error("❌ Session deletion failed:", error);

    return NextResponse.json(
      { error: "Failed to clear session" },
      { status: 500 }
    );
  }
}
