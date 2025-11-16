import { type NextRequest, NextResponse } from "next/server";
import { getAzureAuthFromRequest } from "../../libs/authMiddleware";

export async function POST(request: NextRequest) {
  try {
    // Get Azure credentials from session
    const azureAuth = getAzureAuthFromRequest(request);

    if (!azureAuth) {
      return NextResponse.json(
        { error: "Azure authentication required" },
        { status: 401 }
      );
    }

    const { pat, org } = azureAuth;

    // Create Basic Auth token
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
