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
