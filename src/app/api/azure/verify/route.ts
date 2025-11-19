import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get PAT from Authorization Bearer header
    const authHeader = request.headers.get("authorization");
    const org = request.headers.get("x-azure-organization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Azure authentication required - Missing Bearer token" },
        { status: 401 }
      );
    }

    if (!org) {
      return NextResponse.json(
        { error: "Azure organization required in X-Azure-Organization header" },
        { status: 401 }
      );
    }

    const pat = authHeader.substring(7); // Remove "Bearer " prefix

    // Create Basic Auth token for Azure DevOps API
    const token = Buffer.from(`:${pat}`).toString("base64");

    // Verify PAT by checking if we can access the projects for this org
    const verifyUrl = `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`;
    const verifyResponse = await fetch(verifyUrl, {
      headers: {
        Authorization: `Basic ${token}`,
      },
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();

      console.error(
        `❌ Failed to verify Azure credentials: `,
        JSON.stringify(errorText)
      );

      return NextResponse.json(
        { error: `Invalid Azure PAT or insufficient permissions` },
        { status: 401 }
      );
    }

    // PAT is valid - return success with generic user info
    return NextResponse.json({
      user: {
        displayName: "Azure User",
        emailAddress: "",
        id: "verified",
      },
    });
  } catch (error) {
    console.error("Error verifying Azure credentials:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify Azure credentials",
      },
      { status: 500 }
    );
  }
}
