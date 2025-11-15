import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../libs/authMiddleware";

const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

interface ProductOption {
  id: string;
  value: string;
  label: string;
}

interface DefectPatternsResponse {
  success: boolean;
  data: {
    productOptions: ProductOption[];
    // Future fields can be added here
    // leakageOptions?: LeakageOption[]
    // defectTypeOptions?: DefectTypeOption[]
    // etc.
  };
  raw?: unknown; // Raw response for debugging
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<DefectPatternsResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");
    const projectId = searchParams.get("projectId");

    // Validate required parameters
    if (!issueId || !projectId) {
      return NextResponse.json(
        { error: "Both issueId and projectId are required" },
        { status: 400 }
      );
    }

    // Get token from session cookie
    const auth = requireAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    console.log(
      `🔗 Fetching defect patterns for issueId: ${issueId}, projectId: ${projectId}`
    );
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer " + auth.token);
    myHeaders.append("Content-Type", "application/json");

    // Call Jira API for defect patterns
    const response = await fetch(
      `${JIRA_BASE_URL}/rest/customfield/1.0/defect-pattern?issueId=${issueId}&projectId=${projectId}`,
      {
        method: "GET",
        headers: myHeaders,
      }
    );

    console.log(`📡 Defect patterns response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Failed to fetch defect patterns: ${response.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: "Failed to fetch defect patterns", details: errorText },
        { status: response.status }
      );
    }

    const defectPatterns = await response.json();
    console.log(`✅ Successfully fetched defect patterns data`);

    // Extract product options from the nested structure: result.map.Product.options
    let productOptions: ProductOption[] = [];
    try {
      if (defectPatterns?.map?.Product?.options) {
        const optionsObject = defectPatterns.map.Product.options;
        // Convert object to array of {id, value, label} format
        productOptions = Object.entries(optionsObject).map(([id, label]) => ({
          id,
          value: id, // The key is the value
          label: label as string, // The value is the display text
        }));
        console.log(`📦 Extracted ${productOptions.length} product options`);
      } else {
        console.log(`⚠️ Product options not found in expected structure`);
      }
    } catch (error) {
      console.error(`❌ Error extracting product options:`, error);
    }

    return NextResponse.json({
      success: true,
      data: {
        productOptions: productOptions,
        // Future fields will be added here
      },
      raw: defectPatterns, // Include raw response for debugging
    });
  } catch (error) {
    console.error("❌ Defect patterns fetch error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
