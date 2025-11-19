// Unified Jira Store - stores credentials, configuration, and auth state in localStorage
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  avatarUrls?: {
    "48x48": string;
  };
}

export interface JiraStore {
  // Credentials (stored client-side)
  token: string;

  // User info
  user: JiraUser | null;

  // Auth verification
  lastVerified: string | null; // ISO date string, expires after 3 days

  // Hydration state
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Actions
  setCredentials: (token: string, user: JiraUser) => void;
  setLastVerified: (date: Date) => void;
  clearAuth: () => void;
  isAuthValid: () => boolean;
  getDaysSinceVerification: () => number | null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export const useJiraStore = create<JiraStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        token: "",
        user: null,
        lastVerified: null,
        hasHydrated: false,

        // Set hydration state
        setHasHydrated: (state: boolean) => {
          set({ hasHydrated: state }, false, "jira/setHasHydrated");
        },

        // Set credentials with user info
        setCredentials: (token: string, user: JiraUser) => {
          set({ token, user }, false, "jira/setCredentials");
        },

        // Set last verified timestamp
        setLastVerified: (date: Date) => {
          set(
            { lastVerified: date.toISOString() },
            false,
            "jira/setLastVerified"
          );
        },

        // Clear all auth data
        clearAuth: () => {
          set(
            {
              token: "",
              user: null,
              lastVerified: null,
            },
            false,
            "jira/clearAuth"
          );
        },

        // Check if auth is still valid (within 3 days)
        isAuthValid: () => {
          const { lastVerified, token } = get();

          if (!lastVerified || !token) {
            return false;
          }

          const verifiedDate = new Date(lastVerified);
          const now = new Date();
          const diffMs = now.getTime() - verifiedDate.getTime();

          return diffMs < THREE_DAYS_MS;
        },

        // Get days since last verification
        getDaysSinceVerification: () => {
          const { lastVerified } = get();

          if (!lastVerified) {
            return null;
          }

          const verifiedDate = new Date(lastVerified);
          const now = new Date();
          const diffMs = now.getTime() - verifiedDate.getTime();
          const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

          return diffDays;
        },
      }),
      {
        name: "jira-storage", // localStorage key
        partialize: (state) => ({
          // Only persist these fields
          token: state.token,
          user: state.user,
          lastVerified: state.lastVerified,
        }),
        onRehydrateStorage: () => (state) => {
          // Called when store has been rehydrated from localStorage
          state?.setHasHydrated(true);
        },
      }
    ),
    { name: "JiraStore" }
  )
);
