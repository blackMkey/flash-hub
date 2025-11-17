import { type NextRequest, NextResponse } from "next/server";
import { getAzureAuthFromRequest } from "../../libs/authMiddleware";

interface WorkItemsRequestBody {
  project: string;
  areaPath: string;
  startDate: string;
  endDate: string;
}
interface WorkItemResponse {
  id: string;
  title: string;
  state: string;
  assignedTo: string;
  createdDate: string;
  priority: number;
  comments: Array<{
    text: string;
    createdDate: string;
    createdBy: string;
  }>;
  workaroundDueDate: string;
  solutionDueDate: string;
  hasWorkaround?: boolean;
  hasSolution?: boolean;
}
const PRIORITY_MAPPING: { [key: string]: number } = {
  Low: 4,
  Medium: 3,
  High: 2,
  Critical: 1,
};
const WORK_AROUND_KEY = "workaround";
const SOLUTION_KEY = "solution";
const priorityRules: Record<
  number,
  { urgent?: boolean; workaround: number; solution: number }
> = {
  1: {
    // if urgent, both workaround and solution should be immediate
    // if not urgent, we can address issue on business days basis
    urgent: true,
    workaround: 4 * 60 * 60, // 4 hours in seconds
    solution: 24 * 60 * 60, // 1 day in seconds
  },
  2: {
    workaround: 24 * 60 * 60, // 1 day in seconds
    solution: 2 * 24 * 60 * 60, // 2 days in seconds
  },
  3: {
    workaround: 3 * 24 * 60 * 60, // 3 days in seconds
    solution: 5 * 24 * 60 * 60, // 5 days in seconds
  },
  4: {
    workaround: 5 * 24 * 60 * 60, // 5 days in seconds
    solution: 10 * 24 * 60 * 60, // 10 days in seconds
  },
};

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

    const body: WorkItemsRequestBody = await request.json();
    const { project, areaPath, startDate, endDate } = body;

    // Validate required fields
    if (!org || !project || !areaPath || !startDate || !endDate) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Convert datetime-local format to Azure DevOps date-only format (YYYY-MM-DD)
    const formatDate = (dateStr: string) =>
      new Date(dateStr).toISOString().split("T")[0];

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // Create Basic Auth token
    const token = Buffer.from(`:${pat}`).toString("base64");

    // Build WIQL query
    const wiqlQuery = {
      query: `
        SELECT [System.Id], [System.Title], [System.State], [System.AreaPath], [System.CreatedDate], [Microsoft.VSTS.Common.Priority]
        FROM WorkItems
        WHERE
          [System.TeamProject] = '${project}' AND
          [System.AreaPath] = '${areaPath}' AND
          [System.CreatedDate] >= '${formattedStartDate}' AND
          [System.CreatedDate] <= '${formattedEndDate}' AND
          [System.State] NOT IN ('Removed', 'Cancelled', 'Duplicated', 'Can not reproduce', 'Done')
        ORDER BY [System.CreatedDate] DESC
      `,
    };

    // Step 1: Execute WIQL query to get work item IDs
    const wiqlUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/wiql?api-version=6.0`;
    const wiqlResponse = await fetch(wiqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(wiqlQuery),
    });

    if (!wiqlResponse.ok) {
      const errorText = await wiqlResponse.text();

      return NextResponse.json(
        { error: `Failed to execute WIQL query: ${errorText}` },
        { status: wiqlResponse.status }
      );
    }

    const wiqlData = await wiqlResponse.json();

    const workItemIds = wiqlData.workItems?.map((item: { id: number }) =>
      item.id.toString()
    );

    if (!workItemIds || workItemIds.length === 0) {
      return NextResponse.json({ workItems: [] });
    }

    // Step 2: Fetch work item details in batch (up to 200 items per request)
    const batchSize = 200;
    const workItems: WorkItemResponse[] = [];

    for (let i = 0; i < workItemIds.length; i += batchSize) {
      const batch = workItemIds.slice(i, i + batchSize);
      const ids = batch.join(",");

      // Use batch API to fetch multiple work items at once
      const batchUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems?ids=${ids}&api-version=6.0`;
      const batchResponse = await fetch(batchUrl, {
        headers: {
          Authorization: `Basic ${token}`,
        },
      });

      if (batchResponse.ok) {
        const batchData = await batchResponse.json();

        for (const item of batchData.value || []) {
          const fields = item.fields || {};

          workItems.push({
            id: item.id.toString(),
            title: fields["System.Title"] || "",
            state: fields["System.State"] || "",
            assignedTo: fields["System.AssignedTo"]?.displayName || "",
            createdDate: fields["System.CreatedDate"] || "",
            priority: priorityInNumber(fields["Custom.Priority1"] || ""),
            comments: [], // Will be populated in next step,
            workaroundDueDate: "",
            solutionDueDate: "",
          });
        }
      }
    }

    // Step 3: Fetch comments for each work item
    await Promise.all(
      workItems.map(async (workItem) => {
        const commentUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/workItems/${workItem.id}/comments?api-version=7.0-preview.3`;
        const commentResponse = await fetch(commentUrl, {
          headers: {
            Authorization: `Basic ${token}`,
          },
        });

        if (commentResponse.ok) {
          const commentData = await commentResponse.json();
          const { workaroundDueDate, solutionDueDate } = calculateDueDate(
            workItem.createdDate,
            workItem.priority
          );

          workItem.workaroundDueDate = workaroundDueDate.toISOString();
          workItem.solutionDueDate = solutionDueDate.toISOString();

          workItem.comments = (commentData.comments || []).map(
            (c: {
              text: string;
              createdDate: string;
              createdBy?: { displayName: string };
            }) => {
              if (!c.text.trim()) {
                return null;
              }
              const textLower = c.text.toLowerCase();

              if (
                textLower.includes(WORK_AROUND_KEY) &&
                workItem.hasWorkaround !== true
              ) {
                workItem.hasWorkaround = true;
              }
              if (
                textLower.includes(SOLUTION_KEY) &&
                workItem.hasSolution !== true
              ) {
                workItem.hasSolution = true;
              }

              return {
                text: c.text || "",
                createdDate: c.createdDate || "",
                createdBy: c.createdBy?.displayName || "Unknown",
              };
            }
          );
        }
      })
    );

    return NextResponse.json({ workItems });
  } catch (error) {
    console.error("Error fetching Azure work items:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch work items",
      },
      { status: 500 }
    );
  }
}

const priorityInNumber = (field: string): number => {
  return PRIORITY_MAPPING[field] || 4;
};

const calculateDueDate = (
  createDateStr: string,
  priority: number
): {
  workaroundDueDate: Date;
  solutionDueDate: Date;
} => {
  const rules =
    priorityRules[priority as keyof typeof priorityRules] || priorityRules[4];
  const createDate = new Date(createDateStr);

  if (rules.urgent) {
    // For urgent issues, add seconds directly (24/7 basis)
    const workaroundDueDate = new Date(
      createDate.getTime() + rules.workaround * 1000
    );
    const solutionDueDate = new Date(
      createDate.getTime() + rules.solution * 1000
    );

    return { workaroundDueDate, solutionDueDate };
  } else {
    // For non-urgent issues, calculate based on business days (Monday-Friday)
    const workaroundDueDate = addBusinessSeconds(createDate, rules.workaround);
    const solutionDueDate = addBusinessSeconds(createDate, rules.solution);

    return { workaroundDueDate, solutionDueDate };
  }
};

// Helper function to add seconds considering only business days
const addBusinessSeconds = (startDate: Date, secondsToAdd: number): Date => {
  // Convert seconds to business days (assuming 8-hour workday)
  const secondsPerWorkday = 8 * 60 * 60; // 8 hours
  const totalBusinessDays = Math.ceil(secondsToAdd / secondsPerWorkday);

  const currentDate = new Date(startDate);
  let businessDaysAdded = 0;

  // Move to the next business day if created on weekend
  while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Add business days
  while (businessDaysAdded < totalBusinessDays) {
    currentDate.setDate(currentDate.getDate() + 1);

    // Skip weekends
    const dayOfWeek = currentDate.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysAdded++;
    }
  }

  return currentDate;
};
