// Jira API proxy to handle CORS issues
import { NextRequest, NextResponse } from "next/server";
import { decodeToken } from "../libs/tokenManager";
const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing endpoint parameter" },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { error: "Missing authorization token" },
      { status: 401 }
    );
  }

  const jiraUrl = `${JIRA_BASE_URL}/rest/api/2/${endpoint}`;
  const decodedToken = decodeToken(token);

  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer " + decodedToken);
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
  myHeaders.append("Accept-Encoding", "gzip, deflate, br, zstd");
  myHeaders.append("Accept-Language", "en-US,en;q=0.5");
  myHeaders.append("Alt-Used", "insight.fsoft.com.vn");
  myHeaders.append("Connection", "keep-alive");
  myHeaders.append("Host", "insight.fsoft.com.vn");
  myHeaders.append("Priority", "u=0, i");
  myHeaders.append("Sec-Fetch-Dest", "document");
  myHeaders.append("Sec-Fetch-Mode", "navigate");
  myHeaders.append("Sec-Fetch-Site", "none");
  myHeaders.append("Sec-Fetch-User", "?1");
  myHeaders.append("TE", "trailers");
  myHeaders.append("Upgrade-Insecure-Requests", "1");
  myHeaders.append("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0");
  try {
    console.log(`🔗 Proxying request to: ${jiraUrl}`);

    const response = await fetch(jiraUrl, {
      method: "GET",
      headers: myHeaders,
    });

    console.log(`📡 Jira response status: ${response.status}`);

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
    console.log(`✅ Successfully proxied Jira request`);

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
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing endpoint parameter" },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { error: "Missing authorization token" },
      { status: 401 }
    );
  }

  const jiraUrl = `${JIRA_BASE_URL}/rest/api/2/${endpoint}`;

  try {
    const body = await request.json();
    const decodedToken = decodeToken(token);

    console.log(`🔗 Proxying POST request to: ${jiraUrl}`);

    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer " + decodedToken);
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    myHeaders.append("Accept-Encoding", "gzip, deflate, br, zstd");
    myHeaders.append("Accept-Language", "en-US,en;q=0.5");
    myHeaders.append("Alt-Used", "insight.fsoft.com.vn");
    myHeaders.append("Connection", "keep-alive");
    myHeaders.append("Host", "insight.fsoft.com.vn");
    myHeaders.append("Priority", "u=0, i");
    myHeaders.append("Sec-Fetch-Dest", "document");
    myHeaders.append("Sec-Fetch-Mode", "navigate");
    myHeaders.append("Sec-Fetch-Site", "none");
    myHeaders.append("Sec-Fetch-User", "?1");
    myHeaders.append("TE", "trailers");
    myHeaders.append("Upgrade-Insecure-Requests", "1");
    myHeaders.append("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0");

    const response = await fetch(jiraUrl, {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify(body),
    });

    console.log(`📡 Jira response status: ${response.status}`);

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
    console.log(`✅ Successfully proxied POST Jira request`);

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
