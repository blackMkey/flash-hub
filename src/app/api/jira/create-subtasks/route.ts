import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../libs/authMiddleware";
import { createJiraHeaders } from "../../libs/jiraHeaders";

const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_DOMAIN || "https://insight.fsoft.com.vn/jira9";

interface BulkSubtaskItem {
  summary: string;
  description?: string;
  assignee?: string;
  reporter?: string;
  componentId: string;
  productId: string;
  typeOfWork: string;
  plannedStart: string;
  dueDate: string;
  originalEstimate: string;
  remainingEstimate: string;
}

interface BulkSubtaskPayload {
  parentKey: string;
  projectKey: string;
  subtasks: BulkSubtaskItem[];
}

interface JiraIssueFields {
  project: { key: string };
  parent: { key: string };
  summary: string;
  issuetype: { id: string };
  description?: string;
  assignee?: { name: string };
  reporter?: { name: string };
  components: Array<{ id: string }>;
  customfield_10220: string; // Product
  customfield_12506: string; // Type Of Work
  customfield_10212: string; // Planned Start
  duedate: string; // Due Date
  timetracking: {
    originalEstimate: string;
    remainingEstimate: string;
  };
}

interface JiraBulkIssueRequest {
  issueUpdates: Array<{
    fields: JiraIssueFields;
  }>;
}

// interface BulkCreateSuccessItem {
//   index: number;
//   subtask: {
//     id: string;
//     key: string;
//     self: string;
//   };
//   key: string;
//   summary: string;
// }

// interface BulkCreateFailedItem {
//   index: number;
//   summary: string;
//   error: string;
// }

// interface JiraBulkIssue {
//   id: string;
//   key: string;
//   self: string;
// }

// interface JiraBulkError {
//   status: number;
//   failedElementNumber: number;
//   elementErrors?: {
//     errorMessages: Array<string>;
//     errors: { [key: string]: string };
//   };
//   message?: string;
// }

export async function POST(request: NextRequest) {
  try {
    const body: BulkSubtaskPayload = await request.json();
    const { parentKey, projectKey, subtasks } = body;

    if (
      !parentKey ||
      !projectKey ||
      !subtasks ||
      !Array.isArray(subtasks) ||
      subtasks.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Parent key, project key, and subtasks array are required",
        },
        { status: 400 }
      );
    }

    // Get token from session cookie
    const auth = requireAuth(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const headers = createJiraHeaders(auth.token);

    // Get project issue types to find subtask type
    const metaResponse = await fetch(
      `${JIRA_BASE_URL}/rest/api/2/issue/createmeta/${projectKey}/issuetypes`,
      {
        method: "GET",
        headers,
      }
    );

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

    if (!subtaskTypeId) {
      return NextResponse.json(
        { error: "No subtask issue type found in project" },
        { status: 400 }
      );
    }

    // Prepare bulk create payload
    const issueUpdates = subtasks.map((subtask, index) => {
      // Validate required fields for each subtask
      if (
        !subtask.summary ||
        !subtask.componentId ||
        !subtask.productId ||
        !subtask.typeOfWork ||
        !subtask.plannedStart ||
        !subtask.dueDate ||
        !subtask.originalEstimate ||
        !subtask.remainingEstimate
      ) {
        throw new Error(`Subtask at index ${index} is missing required fields`);
      }

      // Convert dates
      const plannedStartDate = new Date(subtask.plannedStart);
      const formattedPlannedStart = plannedStartDate
        .toISOString()
        .replace("Z", "+0000");

      const formattedDueDate = subtask.dueDate;

      const fields: JiraIssueFields = {
        project: {
          key: projectKey,
        },
        parent: {
          key: parentKey,
        },
        summary: subtask.summary,
        issuetype: {
          id: subtaskTypeId,
        },
        components: [{ id: subtask.componentId }],
        customfield_10220: subtask.productId, // Product
        customfield_12506: subtask.typeOfWork, // Type Of Work
        customfield_10212: formattedPlannedStart, // Planned Start
        duedate: formattedDueDate, // Due Date
        timetracking: {
          originalEstimate: subtask.originalEstimate,
          remainingEstimate: subtask.remainingEstimate,
        },
      };

      // Add optional fields
      if (subtask.description) {
        fields.description = subtask.description;
      }

      if (subtask.assignee) {
        fields.assignee = {
          name: subtask.assignee,
        };
      }

      if (subtask.reporter) {
        fields.reporter = {
          name: subtask.reporter,
        };
      }

      return { fields };
    });

    const bulkPayload: JiraBulkIssueRequest = {
      issueUpdates,
    };

    return NextResponse.json(
      {
        error: "Internal server error",
        result: "Unknown error",
        body: JSON.stringify(bulkPayload, null, 2),
        bulkPayload,
      },
      { status: 500 }
    );
    // Create subtasks using bulk API
    // const bulkResponse = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/bulk`, {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${decodedToken}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(bulkPayload),
    // });

    // console.log(`📡 Bulk create response status: ${bulkResponse.status}`);

    // const bulkResult = await bulkResponse.json();
    // console.log(`✅ Bulk create result:`, JSON.stringify(bulkResult, null, 2));

    // // Process the bulk response
    // const successful: BulkCreateSuccessItem[] = [];
    // const failed: BulkCreateFailedItem[] = [];

    // if (bulkResult.issues) {
    //   bulkResult.issues.forEach((issue: JiraBulkIssue, index: number) => {
    //     if (issue.key) {
    //       successful.push({
    //         index,
    //         subtask: {
    //           id: issue.id,
    //           key: issue.key,
    //           self: issue.self,
    //         },
    //         key: issue.key,
    //         summary: subtasks[index].summary,
    //       });
    //     }
    //   });
    // }

    // if (bulkResult.errors) {
    //   bulkResult.errors.forEach((error: JiraBulkError) => {
    //     const failedIndex = error.failedElementNumber;
    //     const errorMessages = [];

    //     // Collect error messages from different sources
    //     if (error.elementErrors?.errorMessages) {
    //       errorMessages.push(...error.elementErrors.errorMessages);
    //     }

    //     if (error.elementErrors?.errors) {
    //       const fieldErrors = Object.entries(error.elementErrors.errors).map(
    //         ([field, message]) => `${field}: ${message}`
    //       );
    //       errorMessages.push(...fieldErrors);
    //     }

    //     if (error.message) {
    //       errorMessages.push(error.message);
    //     }

    //     // Fallback error message
    //     const finalErrorMessage =
    //       errorMessages.length > 0
    //         ? errorMessages.join("; ")
    //         : `HTTP ${error.status}: Unknown error`;

    //     failed.push({
    //       index: failedIndex,
    //       summary: subtasks[failedIndex]?.summary || `Subtask ${failedIndex}`,
    //       error: finalErrorMessage,
    //     });
    //   });
    // }

    // console.log(
    //   `✅ Successfully created ${successful.length} subtasks, ${failed.length} failed`
    // );
    // if (!bulkResponse.ok) {
    //   console.error(
    //     `❌ Failed to create subtasks in bulk: ${bulkResponse.status}`
    //   );
    //   return NextResponse.json(
    //     {
    //       error: "Failed to create subtasks in bulk",
    //       result: {
    //         successful,
    //         failed,
    //         totalProcessed: subtasks.length,
    //         totalSuccessful: successful.length,
    //         totalFailed: failed.length,
    //       },
    //     },
    //     { status: bulkResponse.status }
    //   );
    // } else {
    //   return NextResponse.json(
    //     {
    //       success: true,
    //       result: {
    //         successful,
    //         failed,
    //         totalProcessed: subtasks.length,
    //         totalSuccessful: successful.length,
    //         totalFailed: failed.length,
    //       },
    //     },
    //     { status: bulkResponse.status }
    //   );
    // }
  } catch (error) {
    console.error("❌ Fail to connect to Jira API", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        result: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
