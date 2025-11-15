import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../libs/authMiddleware";

const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

interface SubtaskPayload {
  fields: {
    project: { key: string };
    parent: { key: string };
    summary: string;
    issuetype: { id: string };
    description?: string;
    assignee?: { name: string };
    reporter?: { name: string };
    components: Array<{ id: string }>;
    customfield_10220: string; // Product (changed to string)
    customfield_12506: string; // Type Of Work (changed to string)
    customfield_10212: string; // Planned Start, format: ISO datetime eg: "2011-07-05T11:05:00.000+0000"
    duedate: string; // Due Date, format: ISO date eg: "2011-03-11"
    timetracking: {
      originalEstimate: string;
      remainingEstimate: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      parentKey,
      projectKey,
      summary,
      description,
      assignee,
      reporter,
      componentId,
      productId,
      typeOfWork,
      plannedStart,
      dueDate,
      originalEstimate,
      remainingEstimate,
    } = body;

    if (
      !parentKey ||
      !summary ||
      !projectKey ||
      !componentId ||
      !productId ||
      !typeOfWork ||
      !plannedStart ||
      !dueDate ||
      !originalEstimate ||
      !remainingEstimate
    ) {
      return NextResponse.json(
        {
          error:
            "Parent key, project key, summary, component, product, type of work, planned start, due date, original estimate, and remaining estimate are required",
        },
        { status: 400 }
      );
    }

    // Get token from session cookie
    const auth = requireAuth(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const myHeaders = new Headers();

    myHeaders.append("Authorization", "Bearer " + auth.token);
    myHeaders.append("Content-Type", "application/json");

    // Get project issue types using the correct endpoint
    const metaResponse = await fetch(
      `${JIRA_BASE_URL}/rest/api/2/issue/createmeta/${projectKey}/issuetypes`,
      {
        method: "GET",
        headers: myHeaders,
      }
    );

    console.log(`📡 Issue types response status: ${metaResponse.status}`);

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();

      console.error(
        `❌ Failed to fetch issue types: ${metaResponse.status} - ${errorText}`
      );

      return NextResponse.json(
        { error: "Failed to fetch project issue types" },
        { status: metaResponse.status }
      );
    }

    const issueTypesData = await metaResponse.json();

    // Find subtask issue type
    let subtaskTypeId = null;

    for (const issueType of issueTypesData.values || []) {
      if (issueType.subtask === true) {
        subtaskTypeId = issueType.id;
        break;
      }
    }

    console.log(`🎯 Found subtask type ID: ${subtaskTypeId}`);

    if (!subtaskTypeId) {
      return NextResponse.json(
        { error: "No subtask issue type found in project" },
        { status: 400 }
      );
    }

    // Convert date formats for Jira
    console.log(
      `📅 Converting dates - Original plannedStart: ${plannedStart}, dueDate: ${dueDate}`
    );

    // Convert HTML datetime-local to Jira ISO format with +0000 timezone
    // plannedStart comes from HTML input as "2025-10-28T14:30", convert to "2025-10-28T14:30:00.000+0000"
    const plannedStartDate = new Date(plannedStart);
    const formattedPlannedStart = plannedStartDate
      .toISOString()
      .replace("Z", "+0000");

    // Convert HTML date to ISO date format for Jira
    // dueDate comes from HTML input as "2025-10-28", keep as ISO date
    const formattedDueDate = dueDate;

    console.log(
      `📅 Converted dates - plannedStart: ${formattedPlannedStart}, dueDate: ${formattedDueDate}`
    );

    // Prepare subtask creation payload
    const subtaskPayload: SubtaskPayload = {
      fields: {
        project: {
          key: projectKey,
        },
        parent: {
          key: parentKey,
        },
        summary: summary,
        issuetype: {
          id: subtaskTypeId,
        },
        components: [{ id: componentId }],
        customfield_10220: productId, // Product as string
        customfield_12506: typeOfWork, // Type Of Work as string
        customfield_10212: formattedPlannedStart, // ISO datetime format
        duedate: formattedDueDate, // ISO date format
        timetracking: {
          originalEstimate: originalEstimate,
          remainingEstimate: remainingEstimate,
        },
      },
    };

    // Add optional fields
    if (description) {
      subtaskPayload.fields.description = description;
    }

    if (assignee) {
      subtaskPayload.fields.assignee = {
        name: assignee,
      };
    }

    if (reporter) {
      subtaskPayload.fields.reporter = {
        name: reporter,
      };
    }

    // Create the subtask
    console.log(`🚀 Creating subtask with summary: "${summary}"`);
    console.log("📦 Payload:", JSON.stringify(subtaskPayload, null, 2));

    const createResponse = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subtaskPayload),
    });

    console.log(`📡 Create subtask response status: ${createResponse.status}`);

    if (!createResponse.ok) {
      const errorData = await createResponse.json();

      console.error(
        `❌ Failed to create subtask: ${createResponse.status}`,
        errorData
      );

      return NextResponse.json(
        { error: "Failed to create subtask", details: errorData },
        { status: createResponse.status }
      );
    }

    const createdSubtask = await createResponse.json();

    console.log(`✅ Successfully created subtask: ${createdSubtask.key}`);

    return NextResponse.json({
      success: true,
      subtask: {
        id: createdSubtask.id,
        key: createdSubtask.key,
        self: createdSubtask.self,
      },
    });
  } catch (error) {
    console.error("❌ Create subtask error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
