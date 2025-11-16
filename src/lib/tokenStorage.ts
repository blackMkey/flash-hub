export const TokenStorage = {
  // Store Jira token securely on server (creates session cookie)
  async saveJiraToken(token: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ service: "jira", token }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();

        console.error("Failed to save Jira token:", error);

        return false;
      }

      return true;
    } catch (error) {
      console.error("Error saving Jira token:", error);

      return false;
    }
  },

  // Store Azure credentials securely on server (creates session cookie)
  async saveAzureAuth(pat: string, org: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ service: "azure", pat, org }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();

        console.error("Failed to save Azure credentials:", error);

        return false;
      }

      return true;
    } catch (error) {
      console.error("Error saving Azure credentials:", error);

      return false;
    }
  },

  // Clear Jira session
  async clearJiraToken(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      await fetch("/api/token?service=jira", {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error clearing Jira token:", error);
    }
  },

  // Clear Azure session
  async clearAzureAuth(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      await fetch("/api/token?service=azure", {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error clearing Azure credentials:", error);
    }
  },

  // Clear all sessions
  async clearAll(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      await fetch("/api/token", {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error clearing all sessions:", error);
    }
  },
};
