import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AzureComment,
  type AzureWorkItem,
  fetchAzureWorkItems,
  type FetchWorkItemsParams,
  verifyAzureAuth,
} from "./azureFetchers";

// Re-export types for convenience
export type { AzureComment, AzureWorkItem, FetchWorkItemsParams };

// ============= REACT QUERY HOOKS =============

/**
 * Hook to fetch Azure DevOps work items
 */
export const useAzureWorkItems = (
  params: FetchWorkItemsParams | null,
  enabled = true
) => {
  return useQuery({
    queryKey: ["azureWorkItems", params],
    queryFn: () => fetchAzureWorkItems(params!),
    enabled: enabled && !!params?.project && !!params?.areaPath,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("authentication")) {
        return false; // Don't retry on auth errors
      }

      return failureCount < 2;
    },
  });
};

/**
 * Hook to verify Azure DevOps authentication
 */
export const useVerifyAzureAuth = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organization,
      pat,
    }: {
      organization: string;
      pat: string;
    }) => verifyAzureAuth(organization, pat),
    onSuccess: () => {
      // Invalidate work items cache on successful auth
      queryClient.invalidateQueries({ queryKey: ["azureWorkItems"] });
    },
  });
};
