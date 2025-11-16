// Azure Auth Store - manages Azure DevOps authentication state and config
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { TokenStorage } from "@/lib/tokenStorage";

export interface AzureConfig {
  pat: string;
  org: string;
}

export interface AzureUser {
  displayName: string;
  emailAddress: string;
  id: string;
}

export interface AzureAuthState {
  // State
  isConnected: boolean;
  user: AzureUser | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  savePat: (pat: string, org: string) => Promise<boolean>;
  clearAuth: () => Promise<void>;
  checkExistingAuth: () => Promise<void>;
}

export const useAzureAuthStore = create<AzureAuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial State
        isConnected: false,
        user: null,
        isLoading: false,
        error: null,

        // Save PAT and verify connection
        savePat: async (pat: string, org: string): Promise<boolean> => {
          try {
            set({ isLoading: true, error: null }, false, "azure/savePat/start");

            // Save PAT and org to server session (creates HttpOnly cookie)
            const success = await TokenStorage.saveAzureAuth(
              pat.trim(),
              org.trim()
            );

            if (!success) {
              throw new Error("Failed to save Azure credentials");
            }

            // Fetch user info immediately after successful save
            const response = await fetch("/api/azure/verify", {
              method: "POST",
              credentials: "include",
            });

            if (!response.ok) {
              throw new Error("Failed to authenticate with Azure");
            }

            const userData = await response.json();

            set(
              {
                isConnected: true,
                user: userData.user,
                isLoading: false,
                error: null,
              },
              false,
              "azure/savePat/success"
            );

            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to save Azure config";

            set(
              {
                error: errorMessage,
                isLoading: false,
                isConnected: false,
                user: null,
              },
              false,
              "azure/savePat/error"
            );

            return false;
          }
        },

        // Clear authentication
        clearAuth: async () => {
          await TokenStorage.clearAzureAuth();
          set(
            {
              isConnected: false,
              user: null,
              error: null,
            },
            false,
            "azure/clearAuth"
          );
        },

        // Check existing authentication on app start
        checkExistingAuth: async () => {
          try {
            set(
              { isLoading: true, error: null },
              false,
              "azure/checkExistingAuth/start"
            );

            // Check if session exists by fetching user info
            const response = await fetch("/api/azure/verify", {
              method: "POST",
              credentials: "include",
            });

            if (response.ok) {
              const userData = await response.json();

              set(
                {
                  isConnected: true,
                  user: userData.user,
                  isLoading: false,
                },
                false,
                "azure/checkExistingAuth/success"
              );
            } else {
              // Session invalid or expired
              set(
                {
                  isConnected: false,
                  user: null,
                  isLoading: false,
                },
                false,
                "azure/checkExistingAuth/failed"
              );
            }
          } catch (error) {
            console.error("Failed to check existing Azure auth:", error);
            set({
              isConnected: false,
              user: null,
              isLoading: false,
            });
          }
        },
      }),
      {
        name: "azure-auth",
        partialize: (state) => ({
          user: state.user,
        }),
      }
    ),
    {
      name: "AzureAuthStore",
      serialize: true,
    }
  )
);
