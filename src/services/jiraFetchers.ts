export interface User {
  name?: string;
  displayName?: string;
  emailAddress?: string;
  accountId?: string;
  [key: string]: unknown; // Allow additional properties from Jira API
}

export interface Component {
  id: string;
  name: string;
}

export interface TypeOfWorkOption {
  value: string;
  label: string;
}

export interface JiraEpic {
  id: string;
  key: string;
  summary: string;
  description?: string;
  project: {
    key: string;
    name: string;
    id: string;
  };
  status: {
    name: string;
    colorName: string;
  };
  priority: {
    name: string;
    iconUrl?: string;
  };
  assignee?: {
    displayName: string;
    emailAddress: string;
    avatarUrls?: {
      "16x16"?: string;
      "24x24"?: string;
      "32x32"?: string;
      "48x48"?: string;
    };
  };
  reporter?: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  updated: string;
  storyPoints?: number;
  subtasks: Array<{
    id: string;
    key: string;
    summary: string;
    status: {
      name: string;
    };
  }>;
  progress?: {
    percent: number;
    total: number;
    progress: number;
  };
}

export interface CreateSubtaskPayload {
  parentKey: string;
  projectKey: string;
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

interface JiraSubtask {
  id: string;
  key: string;
  fields?: {
    summary?: string;
    status?: {
      name: string;
      statusCategory?: {
        key: string;
      };
    };
  };
  self: string;
}

// Helper function to calculate progress
const calculateProgress = (
  subtasks: JiraSubtask[]
): { percent: number; total: number; progress: number } => {
  if (!subtasks.length) {
    return { percent: 0, total: 0, progress: 0 };
  }

  const total = subtasks.length;
  const completed = subtasks.filter(
    (subtask) => subtask.fields?.status?.statusCategory?.key === "done"
  ).length;

  const percent = Math.round((completed / total) * 100);

  return {
    percent,
    total,
    progress: completed,
  };
};

// Fetch epic by key
export const fetchEpicByKey = async (epicKey: string): Promise<JiraEpic> => {
  const response = await fetch(
    `/api/jira?endpoint=${encodeURIComponent(
      `issue/${epicKey}?expand=names,schema`
    )}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include", // Important: include session cookies
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || `Failed to fetch epic: ${response.status}`
    );
  }

  const issue = await response.json();

  if (!issue || issue.fields?.issuetype?.name !== "Epic") {
    throw new Error(
      `Issue ${epicKey} is not an Epic. It's a ${issue.fields?.issuetype?.name}`
    );
  }

  // Transform the issue data to JiraEpic format
  const fields = issue.fields;

  return {
    id: issue.id,
    key: issue.key,
    summary: fields.summary || "",
    description: fields.description || "",
    project: {
      key: fields.project?.key || "",
      name: fields.project?.name || "",
      id: fields.project?.id || "",
    },
    status: {
      name: fields.status?.name || "Unknown",
      colorName: fields.status?.statusCategory?.colorName || "default",
    },
    priority: {
      name: fields.priority?.name || "Medium",
      iconUrl: fields.priority?.iconUrl,
    },
    assignee: fields.assignee
      ? {
          displayName: fields.assignee.displayName,
          emailAddress: fields.assignee.emailAddress,
          avatarUrls: fields.assignee.avatarUrls,
        }
      : undefined,
    reporter: fields.reporter
      ? {
          displayName: fields.reporter.displayName,
          emailAddress: fields.reporter.emailAddress,
        }
      : undefined,
    created: fields.created,
    updated: fields.updated,
    storyPoints: fields.customfield_10016 || fields.storyPoints,
    subtasks:
      fields.subtasks?.map((subtask: JiraSubtask) => ({
        id: subtask.id,
        key: subtask.key,
        summary: subtask.fields?.summary || "",
        status: {
          name: subtask.fields?.status?.name || "Unknown",
        },
        self: subtask.self,
      })) || [],
    progress: calculateProgress(fields.subtasks || []),
  };
};

// Fetch components for a project
export const fetchComponents = async (
  projectId: string
): Promise<Component[]> => {
  const response = await fetch(`/api/jira/components?projectId=${projectId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch components: ${response.status}`);
  }

  const data = await response.json();
  return data.components || [];
};

// Fetch type of work options
export const fetchTypeOfWork = async (
  projectId: string,
  issueKey: string
): Promise<TypeOfWorkOption[]> => {
  const response = await fetch(
    `/api/jira/type-of-work?projectId=${projectId}&issueKey=${issueKey}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch type of work: ${response.status}`);
  }

  const data = await response.json();

  if (Array.isArray(data.typeOfWork?.cfTypeOfWorkData)) {
    return data.typeOfWork.cfTypeOfWorkData.map(
      (option: { id: string; text: string }) => ({
        value: option.id,
        label: option.text,
      })
    );
  }

  return [];
};

// Note: testConnection and isAuthenticated removed
// Authentication is now handled directly in authStore with single API call

// Create subtask
export const createSubtask = async (payload: CreateSubtaskPayload) => {
  const response = await fetch("/api/jira/create-subtask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create subtask");
  }

  return response.json();
};

// Defect Pattern interface for product options
export interface DefectPattern {
  id: string;
  value: string;
  label?: string;
  [key: string]: unknown; // Allow additional properties
}

// Product Options response structure
export interface ProductOptionsResponse {
  success: boolean;
  data: {
    productOptions: DefectPattern[];
    // Future fields can be added here
  };
  raw?: unknown; // Raw response for debugging
}

// Fetch defect patterns (product options)
export const fetchDefectPatterns = async (
  issueId: string,
  projectId: string
): Promise<DefectPattern[]> => {
  const response = await fetch(
    `/api/jira/defect-patterns?issueId=${issueId}&projectId=${projectId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch defect patterns");
  }

  const result: ProductOptionsResponse = await response.json();
  return result.data?.productOptions || [];
};

// Bulk subtask creation interface
export interface BulkCreateResult {
  successful: Array<{
    index: number;
    subtask: {
      id: string;
      key: string;
      self: string;
    };
    key: string;
    summary: string;
  }>;
  failed: Array<{
    index: number;
    summary: string;
    error: string;
  }>;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
}

// Create multiple subtasks using Jira's bulk API
export const createSubtasksBulk = async (
  parentKey: string,
  projectKey: string,
  subtasks: Array<{
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
  }>
): Promise<BulkCreateResult> => {
  const response = await fetch("/api/jira/create-subtasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      parentKey,
      projectKey,
      subtasks,
    }),
  });

  if (response.status >= 500) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create subtasks in bulk");
  }

  const result = await response.json();
  return result.result;
};

// Create multiple subtasks from template data
export const createSubtasksFromTemplate = async (
  parentKey: string,
  projectKey: string,
  subtasksData: Array<{
    summary: string;
    description: string;
    componentId: string;
    productId: string;
    typeOfWork: string;
    plannedStart: string;
    dueDate: string;
    originalEstimate: string;
    remainingEstimate: string;
    assignee: string;
  }>
): Promise<BulkCreateResult> => {
  const successful: BulkCreateResult["successful"] = [];
  const failed: BulkCreateResult["failed"] = [];

  // Process subtasks one by one to avoid overwhelming the API
  for (let i = 0; i < subtasksData.length; i++) {
    const subtaskData = subtasksData[i];

    try {
      // Create the payload with defaults for required fields
      const payload: CreateSubtaskPayload = {
        parentKey,
        projectKey,
        componentId: subtaskData.componentId || "",
        summary: subtaskData.summary,
        description: subtaskData.description || "",
        assignee: subtaskData.assignee || "",
        productId: subtaskData.productId || "",
        typeOfWork: subtaskData.typeOfWork || "",
        plannedStart: subtaskData.plannedStart || "",
        dueDate: subtaskData.dueDate || "",
        originalEstimate: subtaskData.originalEstimate || "",
        remainingEstimate:
          subtaskData.remainingEstimate || subtaskData.originalEstimate || "",
      };

      const result = await createSubtask(payload);

      successful.push({
        index: i,
        subtask: result,
        key: result.key || `SUB-${i}`,
        summary: subtaskData.summary,
      });

      // Small delay between requests to be nice to the API
      if (i < subtasksData.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      failed.push({
        index: i,
        summary: subtaskData.summary,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    successful,
    failed,
    totalProcessed: subtasksData.length,
    totalSuccessful: successful.length,
    totalFailed: failed.length,
  };
};

/**
 * Fetch epic details to get parent key for multi-epic mode
 */
export const fetchEpicParentKey = async (epicKey: string): Promise<string> => {
  const response = await fetch("/api/jira/epic-parent-keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      epicKeys: [epicKey],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || `Failed to fetch epic parent key: ${response.status}`
    );
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(
      `Failed to fetch parent key for epic ${epicKey}: ${result.errors[0].error}`
    );
  }

  if (!result.parentKeyMap || !result.parentKeyMap[epicKey]) {
    throw new Error(`Epic ${epicKey} not found or inaccessible`);
  }

  return result.parentKeyMap[epicKey];
};

/**
 * Fetch parent keys for multiple epics in batch
 */
export const fetchEpicParentKeys = async (
  epicKeys: string[]
): Promise<Record<string, string>> => {
  const response = await fetch("/api/jira/epic-parent-keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      epicKeys,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || `Failed to fetch epic parent keys: ${response.status}`
    );
  }

  const result = await response.json();

  // Check if there are any errors
  if (result.errors && result.errors.length > 0) {
    const failedEpics = result.errors.map(
      (err: { epicKey: string; error: string }) => err.epicKey
    );
    throw new Error(
      `Failed to fetch parent keys for epics: ${failedEpics.join(", ")}`
    );
  }

  return result.parentKeyMap || {};
};
