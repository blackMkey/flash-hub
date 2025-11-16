// Auth Store - manages authentication state, token, and user info
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { TokenStorage } from "@/lib/tokenStorage";
import type { User } from "@/services/jiraFetchers";

export interface messageProps {
  title: string;
  description: string;
}
export interface AuthState {
  // State
  isConnected: boolean;
  user: User | null;
  isLoading: boolean;
  hasCheckedExistingAuth: boolean;
  error: string | null;

  // Async Actions
  saveToken: (
    originalToken: string,
    onSuccess?: (message: messageProps) => void,
    onError?: (message: messageProps) => void
  ) => Promise<boolean>;
  clearAuth: (callback?: (message: messageProps) => void) => Promise<void>;
  checkExistingAuth: (
    onSuccess?: (message: messageProps) => void,
    onError?: (message: messageProps) => void
  ) => Promise<void>;
}

export const useJiraAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        isConnected: false,
        user: null,
        isLoading: false,
        hasCheckedExistingAuth: false,
        error: null,

        // Save token and fetch user info in one flow
        saveToken: async (
          originalToken: string,
          onSuccess?: (message: messageProps) => void,
          onError?: (message: messageProps) => void
        ): Promise<boolean> => {
          try {
            set(
              { isLoading: true, error: null },
              false,
              "auth/saveToken/start"
            );

            // Save token to server session (creates HttpOnly cookie)
            const success = await TokenStorage.saveJiraToken(
              originalToken.trim()
            );

            if (!success) {
              throw new Error("Failed to save token");
            }

            // Fetch user info immediately after successful token save
            const response = await fetch(
              `/api/jira?endpoint=${encodeURIComponent("myself")}`,
              {
                method: "GET",
                credentials: "include",
              }
            );

            if (!response.ok) {
              throw new Error("Failed to authenticate with Jira");
            }

            const user = await response.json();

            // Add email based on username
            if (user.name) {
              user.emailAddress = user.name.toLowerCase() + "@fpt.com";
            }

            set(
              {
                isConnected: true,
                user,
                isLoading: false,
                error: null,
              },
              false,
              "auth/saveToken/success"
            );

            if (onSuccess) {
              onSuccess({
                title: "Authorization successful",
                description: "Successfully connected to Jira",
              });
            }

            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to save token";

            set(
              {
                error: errorMessage,
                isLoading: false,
                isConnected: false,
                user: null,
              },
              false,
              "auth/saveToken/error"
            );

            if (onError) {
              onError({
                title: "Authorization failed",
                description: errorMessage,
              });
            }

            return false;
          }
        },

        // Clear authentication
        clearAuth: async (callback?: (message: messageProps) => void) => {
          await TokenStorage.clearJiraToken();
          set(
            {
              isConnected: false,
              user: null,
              error: null,
              hasCheckedExistingAuth: false,
            },
            false,
            "auth/clearAuth"
          );
          if (callback) {
            callback({
              title: "Disconnected",
              description: "Successfully disconnected from Jira",
            });
          }
        },

        // Check existing authentication on app start
        checkExistingAuth: async (
          onSuccess?: (message: messageProps) => void,
          onError?: (message: messageProps) => void
        ) => {
          const state = get();

          // Skip if already checked during this session
          if (state.hasCheckedExistingAuth) {
            return;
          }

          try {
            set(
              { isLoading: true, error: null, hasCheckedExistingAuth: true },
              false,
              "auth/checkExistingAuth/start"
            );

            // Fetch user info to check session validity
            const response = await fetch(
              `/api/jira?endpoint=${encodeURIComponent("myself")}`,
              {
                method: "GET",
                credentials: "include",
              }
            );

            if (response.ok) {
              const user = await response.json();

              // Add email based on username
              if (user.name) {
                user.emailAddress = user.name.toLowerCase() + "@fpt.com";
              }

              set(
                {
                  isConnected: true,
                  user,
                  isLoading: false,
                },
                false,
                "auth/checkExistingAuth/success"
              );
              if (onSuccess) {
                onSuccess({
                  title: "Authorization successful",
                  description: "Successfully connected to Jira",
                });
              }
            } else {
              // Session invalid or expired
              set(
                { isConnected: false, user: null, isLoading: false },
                false,
                "auth/checkExistingAuth/failed"
              );
            }
          } catch (error) {
            set({ isConnected: false, user: null, isLoading: false });
            if (onError) {
              onError({
                title: "Authorization failed",
                description:
                  error instanceof Error
                    ? error.message
                    : "No valid Jira session found",
              });
            }
          }
        },
      }),
      {
        name: "jira-auth", // localStorage key
        partialize: (state) => ({
          user: state.user,
        }), // Only persist user info
      }
    ),
    {
      name: "AuthStore", // DevTools name
      serialize: true, // Better serialization for complex objects
    }
  )
);
