// In-memory session store for Jira tokens
// Works well with AWS Amplify's session affinity

interface Session {
  token: string;
  createdAt: number;
  lastAccessed: number;
}

class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Start cleanup timer
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    }
  }

  // Generate secure session ID
  generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  // Create new session
  createSession(token: string): string {
    const sessionId = this.generateSessionId();

    this.sessions.set(sessionId, {
      token,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    });
    console.log(
      `✅ Session created: ${sessionId} (Total sessions: ${this.sessions.size})`
    );

    return sessionId;
  }

  // Get token by session ID
  getToken(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.log(`❌ Session not found: ${sessionId}`);

      return null;
    }

    // Check if expired
    const now = Date.now();

    if (now - session.lastAccessed > this.SESSION_TIMEOUT) {
      console.log(`⏰ Session expired: ${sessionId}`);
      this.sessions.delete(sessionId);

      return null;
    }

    // Update last accessed time
    session.lastAccessed = now;

    return session.token;
  }

  // Delete session
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      console.log(`🗑️  Session deleted: ${sessionId}`);
    }

    return deleted;
  }

  // Cleanup expired sessions
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `🧹 Cleaned up ${cleanedCount} expired sessions. Remaining: ${this.sessions.size}`
      );
    }
  }

  // Get session count (for monitoring)
  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Export singleton instance
export const sessionStore = new SessionStore();
