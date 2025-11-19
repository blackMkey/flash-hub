// Jira API proxy to handle CORS issues
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../libs/authMiddleware";
import { createJiraHeaders } from "../libs/jiraHeaders";

const JIRA_BASE_URL =
  process.env.JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing endpoint parameter" },
      { status: 400 }
    );
  }

  // Get token from session cookie
  const auth = requireAuth(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const jiraUrl = `${JIRA_BASE_URL}/rest/api/2/${endpoint}`;

  // Use browser-like headers to bypass Cloudflare protection
  const headers = createJiraHeaders(auth.token);

  try {
    const response = await fetch(jiraUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(`❌ Jira API Error: ${response.status} - ${errorText}`);

      return NextResponse.json(
        {
          error: `Jira API Error: ${response.status} - ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Proxy request failed:", error);

    return NextResponse.json(
      {
        error: "Failed to proxy request to Jira",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const endpoint = body.endpoint;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint parameter" },
        { status: 400 }
      );
    }

    // Try to get token from Authorization header first (new flow)
    const authHeader = request.headers.get("authorization");
    let token: string;

    if (authHeader?.startsWith("Bearer ")) {
      // New flow: token from header
      token = authHeader.substring(7);
    } else {
      // Old flow: token from session cookie
      const auth = requireAuth(request);

      if ("error" in auth) {
        return NextResponse.json(
          { error: auth.error },
          { status: auth.status }
        );
      }

      token = auth.token;
    }

    const jiraUrl = `${JIRA_BASE_URL}/rest/api/2/${endpoint}`;

    // Remove endpoint from body before forwarding
    const { endpoint: _, ...requestBody } = body;

    // Use browser-like headers to bypass Cloudflare protection
    const headers = createJiraHeaders(token);

    const response = await fetch(jiraUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(`❌ Jira API Error: ${response.status} - ${errorText}`);

      return NextResponse.json(
        {
          error: `Jira API Error: ${response.status} - ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Proxy POST request failed:", error);

    return NextResponse.json(
      {
        error: "Failed to proxy POST request to Jira",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
