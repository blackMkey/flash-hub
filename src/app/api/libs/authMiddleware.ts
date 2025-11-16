// Middleware to extract and validate authentication from session
import type { NextRequest } from "next/server";
import { sessionStore } from "./sessionStore";

const COOKIE_NAME = "auth_session";

export function getJiraTokenFromRequest(request: NextRequest): string | null {
  // Get session ID from HttpOnly cookie
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  // Get Jira auth from session store
  const jiraAuth = sessionStore.getServiceAuth(sessionId, "jira");

  if (!jiraAuth) {
    return null;
  }

  return jiraAuth.token;
}

export function getAzureAuthFromRequest(request: NextRequest): {
  pat: string;
  org: string;
} | null {
  // Get session ID from HttpOnly cookie
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  // Get Azure auth from session store
  const azureAuth = sessionStore.getServiceAuth(sessionId, "azure");

  if (!azureAuth) {
    return null;
  }

  return azureAuth;
}

export function requireJiraAuth(
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

export function requireAzureAuth(
  request: NextRequest
): { pat: string; org: string } | { error: string; status: number } {
  const azureAuth = getAzureAuthFromRequest(request);

  if (!azureAuth) {
    return {
      error: "Authentication required. Please provide your Azure credentials.",
      status: 401,
    };
  }

  return azureAuth;
}

// Legacy alias for backward compatibility
export const requireAuth = requireJiraAuth;
