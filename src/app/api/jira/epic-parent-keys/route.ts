import { NextRequest, NextResponse } from "next/server";
import { decodeToken } from "../../libs/tokenManager";

const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { epicKeys } = body;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!epicKeys || !Array.isArray(epicKeys) || epicKeys.length === 0) {
      return NextResponse.json(
        { error: "Epic keys array is required" },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decodedToken = decodeToken(token);

    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer " + decodedToken);
    myHeaders.append("Content-Type", "application/json");

    const parentKeyMap: Record<string, string> = {};
    const errors: Array<{ epicKey: string; error: string }> = [];

    // Fetch parent keys for each epic
    for (const epicKey of epicKeys) {
      try {
        console.log(`🔍 Fetching epic details for: ${epicKey}`);

        const response = await fetch(
          `${JIRA_BASE_URL}/rest/api/2/issue/${epicKey}?fields=key,project`,
          {
            method: "GET",
            headers: myHeaders,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `❌ Failed to fetch epic ${epicKey}: ${response.status} - ${errorText}`
          );
          errors.push({
            epicKey,
            error: `HTTP ${response.status}: ${errorText || 'Unknown error'}`
          });
          continue;
        }

        const epic = await response.json();
        
        // For epic subtasks, the parent key is the epic key itself
        parentKeyMap[epicKey] = epic.key;
        
        console.log(`✅ Successfully fetched parent key for ${epicKey}: ${epic.key}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error fetching epic ${epicKey}:`, error);
        errors.push({
          epicKey,
          error: errorMessage
        });
      }
    }

    console.log(`📊 Parent key mapping results: ${Object.keys(parentKeyMap).length} successful, ${errors.length} failed`);

    return NextResponse.json({
      success: true,
      parentKeyMap,
      errors,
      summary: {
        total: epicKeys.length,
        successful: Object.keys(parentKeyMap).length,
        failed: errors.length
      }
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