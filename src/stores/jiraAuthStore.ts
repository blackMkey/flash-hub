// Auth Store - manages authentication state, token, and user info
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { TokenStorage } from "@/lib/tokenStorage";
import type { User } from "@/services/jiraFetchers";

export interface AuthState {
  // State
  isConnected: boolean;
  user: User | null;
  isLoading: boolean;
  hasCheckedExistingAuth: boolean;
  error: string | null;

  // Async Actions
  saveToken: (originalToken: string) => Promise<boolean>;
  clearAuth: () => Promise<void>;
  checkExistingAuth: () => Promise<void>;
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
        saveToken: async (originalToken: string): Promise<boolean> => {
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

            return false;
          }
        },

        // Clear authentication
        clearAuth: async () => {
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
        },

        // Check existing authentication on app start
        checkExistingAuth: async () => {
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
            } else {
              // Session invalid or expired
              set(
                { isConnected: false, user: null, isLoading: false },
                false,
                "auth/checkExistingAuth/failed"
              );
            }
          } catch (error) {
            console.error("Failed to check existing auth:", error);
            set({ isConnected: false, user: null, isLoading: false });
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
