import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Component,
  createSubtask,
  type CreateSubtaskPayload,
  type DefectPattern,
  fetchComponents,
  fetchDefectPatterns,
  fetchEpicByKey,
  fetchTypeOfWork,
  type JiraEpic,
  type TypeOfWorkOption,
  type User,
} from "./jiraFetchers";

// Re-export types and functions for convenience
export type {
  User,
  Component,
  TypeOfWorkOption,
  DefectPattern,
  JiraEpic,
  CreateSubtaskPayload,
};

// ============= REACT QUERY HOOKS =============

// Hook to verify Jira authentication - calls Jira directly
export const useVerifyJiraAuth = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const JIRA_BASE_URL = "https://insight.fsoft.com.vn/jira9";
      const jiraUrl = `${JIRA_BASE_URL}/rest/api/2/myself`;

      // Create browser-like headers to bypass Cloudflare
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      };

      const response = await fetch(jiraUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to verify Jira authentication");
      }

      const user = await response.json();

      // Add email based on username if not present
      if (user.name && !user.emailAddress) {
        user.emailAddress = user.name.toLowerCase() + "@fpt.com";
      }

      return user;
    },
  });
};

// Hook to fetch epic by key
export const useEpic = (epicKey: string | null) => {
  return useQuery({
    queryKey: ["epic", epicKey],
    queryFn: () => fetchEpicByKey(epicKey!),
    enabled: !!epicKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("not an Epic")) {
        return false; // Don't retry if it's not an Epic
      }

      return failureCount < 2;
    },
  });
};

// Hook to fetch components
export const useComponents = (projectId: string | null) => {
  return useQuery({
    queryKey: ["components", projectId],
    queryFn: () => fetchComponents(projectId!),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes (components don't change often)
  });
};

// Hook to fetch type of work options
export const useTypeOfWork = (
  projectId: string | null,
  issueKey: string | null
) => {
  return useQuery({
    queryKey: ["typeOfWork", projectId, issueKey],
    queryFn: () => fetchTypeOfWork(projectId!, issueKey!),
    enabled: !!projectId && !!issueKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 429 rate limit errors
      if (error instanceof Error && error.message.includes("429")) {
        return false;
      }

      return failureCount < 2;
    },
  });
};

// Hook to fetch defect patterns (product options)
export const useDefectPatterns = (
  issueId: string | null,
  projectId: string | null
) => {
  return useQuery({
    queryKey: ["defectPatterns", issueId, projectId],
    queryFn: () => fetchDefectPatterns(issueId!, projectId!),
    enabled: !!issueId && !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes (defect patterns don't change often)
    retry: (failureCount, error) => {
      // Don't retry on 404 or 403 errors
      if (
        error instanceof Error &&
        (error.message.includes("404") || error.message.includes("403"))
      ) {
        return false;
      }

      return failureCount < 2;
    },
  });
};

// Hook to create subtask
export const useCreateSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubtask,
    onSuccess: (data, variables) => {
      // Invalidate and refetch epic data after creating subtask
      queryClient.invalidateQueries({
        queryKey: ["epic", variables.parentKey],
      });

      // You could also optimistically update the epic's subtasks here
      // queryClient.setQueryData(['epic', variables.parentKey], (oldData) => {
      //   // Add the new subtask to the epic's subtasks array
      //   return { ...oldData, subtasks: [...oldData.subtasks, newSubtask] }
      // })
    },
    onError: (error) => {
      console.error("Failed to create subtask:", error);
    },
  });
};
