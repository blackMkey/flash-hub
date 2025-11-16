// Jira API proxy to handle CORS issues
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../libs/authMiddleware";
import { createJiraHeaders } from "../libs/jiraHeaders";

const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

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

  try {
    const body = await request.json();

    // Use browser-like headers to bypass Cloudflare protection
    const headers = createJiraHeaders(auth.token);

    const response = await fetch(jiraUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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
