import { type NextRequest, NextResponse } from "next/server";

interface SendNotificationRequest {
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get Teams webhook URL from environment variable
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            "Teams webhook URL not configured. Please set TEAMS_WEBHOOK_URL in .env.local",
        },
        { status: 500 }
      );
    }

    // Send to Power Automate with attachments array for adaptive cards
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              version: "1.4",
              body: [
                {
                  type: "TextBlock",
                  text: "SLA Overdue Alert",
                  weight: "Bolder",
                  size: "Large",
                  color: "Attention",
                },
                {
                  type: "TextBlock",
                  text: message,
                  wrap: true,
                },
              ],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        { error: `Failed to send to Teams: ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending Teams notification:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send notification",
      },
      { status: 500 }
    );
  }
}
