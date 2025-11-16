// In-memory session store for authentication tokens (Jira & Azure)
// Works well with AWS Amplify's session affinity

type ServiceType = "jira" | "azure";

interface SessionData {
  jira?: {
    token: string;
  };
  azure?: {
    pat: string;
    org: string;
  };
}

interface Session {
  data: SessionData;
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
  createSession(): string {
    const sessionId = this.generateSessionId();

    this.sessions.set(sessionId, {
      data: {},
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    });
    console.log(
      `✅ Session created: ${sessionId} (Total sessions: ${this.sessions.size})`
    );

    return sessionId;
  }

  // Get or create session
  private getOrCreateSession(sessionId?: string): {
    sessionId: string;
    session: Session;
  } {
    if (sessionId) {
      const session = this.sessions.get(sessionId);

      if (session) {
        const now = Date.now();

        if (now - session.lastAccessed <= this.SESSION_TIMEOUT) {
          session.lastAccessed = now;

          return { sessionId, session };
        }

        // Expired, delete it
        this.sessions.delete(sessionId);
      }
    }

    // Create new session
    const newSessionId = this.createSession();
    const newSession = this.sessions.get(newSessionId)!;

    return { sessionId: newSessionId, session: newSession };
  }

  // Set service credentials
  setServiceAuth(
    sessionId: string | undefined,
    service: ServiceType,
    credentials: SessionData[ServiceType]
  ): string {
    const { sessionId: finalSessionId, session } =
      this.getOrCreateSession(sessionId);

    if (service === "jira") {
      session.data.jira = credentials as SessionData["jira"];
      console.log(`✅ Jira auth saved to session: ${finalSessionId}`);
    } else {
      session.data.azure = credentials as SessionData["azure"];
      console.log(`✅ Azure auth saved to session: ${finalSessionId}`);
    }

    return finalSessionId;
  }

  // Get service credentials
  getServiceAuth<T extends ServiceType>(
    sessionId: string,
    service: T
  ): SessionData[T] | null {
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

    return (session.data[service] as SessionData[T]) || null;
  }

  // Legacy method for backward compatibility
  getToken(sessionId: string): string | null {
    const jiraAuth = this.getServiceAuth(sessionId, "jira");

    return jiraAuth?.token || null;
  }

  // Clear specific service auth
  clearServiceAuth(sessionId: string, service: ServiceType): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    delete session.data[service];
    console.log(`🗑️  ${service} auth cleared from session: ${sessionId}`);

    // If session is empty, delete it
    if (Object.keys(session.data).length === 0) {
      return this.deleteSession(sessionId);
    }

    return true;
  }

  // Delete entire session
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
