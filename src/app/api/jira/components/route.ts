import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../libs/authMiddleware";

const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get token from session cookie
    const auth = requireAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    console.log(`📦 Fetching components for project ID: ${projectId}`);
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer " + auth.token);
    myHeaders.append("Content-Type", "application/json");

    const response = await fetch(
      `${JIRA_BASE_URL}/rest/api/2/component/page?projectIds=${projectId}`,
      {
        method: "GET",
        headers: myHeaders,
      }
    );

    console.log(`📡 Components response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Failed to fetch components: ${response.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: "Failed to fetch components" },
        { status: response.status }
      );
    }

    const componentsData = await response.json();
    console.log(
      `✅ Successfully fetched ${componentsData.values?.length || 0} components`
    );

    return NextResponse.json({
      success: true,
      components: componentsData.values || [],
    });
  } catch (error) {
    console.error("❌ Components fetch error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
