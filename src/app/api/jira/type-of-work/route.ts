import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../libs/authMiddleware";
import { createJiraHeaders } from "../../libs/jiraHeaders";

const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const issueKey = searchParams.get("issueKey");

    if (!projectId || !issueKey) {
      return NextResponse.json(
        { error: "Project ID and issue key are required" },
        { status: 400 }
      );
    }

    // Get token from session cookie
    const auth = requireAuth(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const headers = createJiraHeaders(auth.token);

    const response = await fetch(
      `${JIRA_BASE_URL}/rest/customfield/1.0/constraint/get-tow-by-product?projectId=${projectId}&issueKey=${issueKey}&issueType=Sub-task`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        `❌ Failed to fetch type of work: ${response.status} - ${errorText}`
      );

      return NextResponse.json(
        { error: "Failed to fetch type of work options" },
        { status: response.status }
      );
    }

    const typeOfWorkData = await response.json();

    return NextResponse.json({
      success: true,
      typeOfWork: typeOfWorkData,
    });
  } catch (error) {
    console.error("❌ Type of work fetch error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
