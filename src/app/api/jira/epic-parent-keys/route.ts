import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../libs/authMiddleware";
import { createJiraHeaders } from "../../libs/jiraHeaders";

const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { epicKeys } = body;

    if (!epicKeys || !Array.isArray(epicKeys) || epicKeys.length === 0) {
      return NextResponse.json(
        { error: "Epic keys array is required" },
        { status: 400 }
      );
    }

    // Get token from session cookie
    const auth = requireAuth(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const headers = createJiraHeaders(auth.token);

    const parentKeyMap: Record<string, string> = {};
    const errors: Array<{ epicKey: string; error: string }> = [];

    // Fetch parent keys for each epic
    for (const epicKey of epicKeys) {
      try {
        const response = await fetch(
          `${JIRA_BASE_URL}/rest/api/2/issue/${epicKey}?fields=key,project`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();

          console.error(
            `❌ Failed to fetch epic ${epicKey}: ${response.status} - ${errorText}`
          );
          errors.push({
            epicKey,
            error: `HTTP ${response.status}: ${errorText || "Unknown error"}`,
          });
          continue;
        }

        const epic = await response.json();

        // For epic subtasks, the parent key is the epic key itself
        parentKeyMap[epicKey] = epic.key;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        console.error(`❌ Error fetching epic ${epicKey}:`, error);
        errors.push({
          epicKey,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      parentKeyMap,
      errors,
      summary: {
        total: epicKeys.length,
        successful: Object.keys(parentKeyMap).length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error("❌ Failed to fetch epic parent keys", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
