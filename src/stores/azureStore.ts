// Unified Azure Store - stores credentials, configuration, and auth state in localStorage
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface AzureStore {
  // Credentials (stored client-side)
  pat: string;
  org: string;

  // Configuration
  project: string;
  areaPath: string;

  // Auth verification
  lastVerified: string | null; // ISO date string, expires after 3 days

  // Hydration state
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Actions
  setCredentials: (pat: string, org: string) => void;
  setProject: (project: string) => void;
  setAreaPath: (areaPath: string) => void;
  setLastVerified: (date: Date) => void;
  clearAuth: () => void;
  isAuthValid: () => boolean;
  getDaysSinceVerification: () => number | null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export const useAzureStore = create<AzureStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        pat: "",
        org: "",
        project: "",
        areaPath: "",
        lastVerified: null,
        hasHydrated: false,

        // Set hydration state
        setHasHydrated: (state: boolean) => {
          set({ hasHydrated: state }, false, "azure/setHasHydrated");
        },

        // Set credentials and clear old verification
        setCredentials: (pat: string, org: string) => {
          set({ pat, org }, false, "azure/setCredentials");
        },

        // Set project name
        setProject: (project: string) => {
          set({ project }, false, "azure/setProject");
        },

        // Set area path
        setAreaPath: (areaPath: string) => {
          set({ areaPath }, false, "azure/setAreaPath");
        },

        // Set last verified timestamp
        setLastVerified: (date: Date) => {
          set(
            { lastVerified: date.toISOString() },
            false,
            "azure/setLastVerified"
          );
        },

        // Clear all auth data
        clearAuth: () => {
          set(
            {
              pat: "",
              org: "",
              lastVerified: null,
            },
            false,
            "azure/clearAuth"
          );
        },

        // Check if auth is still valid (within 3 days)
        isAuthValid: () => {
          const { lastVerified, pat, org } = get();

          if (!lastVerified || !pat || !org) {
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
        name: "azure-storage", // localStorage key
        partialize: (state) => ({
          // Only persist these fields
          pat: state.pat,
          org: state.org,
          project: state.project,
          areaPath: state.areaPath,
          lastVerified: state.lastVerified,
        }),
        onRehydrateStorage: () => (state) => {
          // Called when store has been rehydrated from localStorage
          state?.setHasHydrated(true);
        },
      }
    ),
    { name: "AzureStore" }
  )
);
