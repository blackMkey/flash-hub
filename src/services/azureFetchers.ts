export interface AzureComment {
  text: string;
  createdDate: string;
  createdBy: string;
}

export interface AzureWorkItem {
  id: string;
  title: string;
  state: string;
  assignedTo: string;
  areaPath: string;
  createdDate: string;
  priority: number;
  comments: AzureComment[];
  workaroundDueDate: string;
  solutionDueDate: string;
  hasWorkaround?: boolean;
  hasSolution?: boolean;
}

export interface FetchWorkItemsParams {
  project: string;
  areaPath: string;
  startDate: string;
  endDate: string;
}

export interface FetchWorkItemsResponse {
  workItems: AzureWorkItem[];
}

// ============= FETCHER FUNCTIONS =============

/**
 * Fetch work items from Azure DevOps
 */
export const fetchAzureWorkItems = async (
  params: FetchWorkItemsParams,
  org: string,
  pat: string
): Promise<FetchWorkItemsResponse> => {
  const response = await fetch("/api/azure/work-items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pat}`,
      "X-Azure-Organization": org,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(errorData.error || "Failed to fetch work items");
  }

  return response.json();
};

/**
 * Verify Azure DevOps authentication
 */
export const verifyAzureAuth = async (
  organization: string,
  pat: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch("/api/azure/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pat}`,
      "X-Azure-Organization": organization,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(errorData.error || "Failed to verify Azure credentials");
  }

  return response.json();
};
