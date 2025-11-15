// Token management utility - server-side sessions with HttpOnly cookies
// Token stored securely on server, never exposed to client

export const TokenStorage = {
  // Store token securely on server (creates session cookie)
  async saveToken(token: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to save token:", error);
        return false;
      }

      console.log("✅ Token stored securely");
      return true;
    } catch (error) {
      console.error("Error saving token:", error);
      return false;
    }
  },

  // Clear server session (logout)
  async clearToken(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      await fetch("/api/token", {
        method: "DELETE",
        credentials: "include",
      });
      console.log("🚪 Logged out");
    } catch (error) {
      console.error("Error clearing token:", error);
    }
  },
};
