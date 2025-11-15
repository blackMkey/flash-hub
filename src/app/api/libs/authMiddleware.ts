// Middleware to extract and validate Jira token from session
import type { NextRequest } from "next/server";
import { sessionStore } from "./sessionStore";

const COOKIE_NAME = "jira_session";

export function getJiraTokenFromRequest(request: NextRequest): string | null {
  // Get session ID from HttpOnly cookie
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionId) {
    console.log("❌ No session cookie found");

    return null;
  }

  // Get token from session store
  const token = sessionStore.getToken(sessionId);

  if (!token) {
    console.log("❌ Session invalid or expired");

    return null;
  }

  return token;
}

export function requireAuth(
  request: NextRequest
): { token: string } | { error: string; status: number } {
  const token = getJiraTokenFromRequest(request);

  if (!token) {
    return {
      error: "Authentication required. Please provide your Jira token.",
      status: 401,
    };
  }

  return { token };
}
