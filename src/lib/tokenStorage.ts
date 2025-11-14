// Token management utility for localStorage operations
const STORAGE_KEY = 'jira_flash_token'
const TIMESTAMP_KEY = 'jira_flash_timestamp'
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export const TokenStorage = {
  // Save encoded token with timestamp
  saveEncodedToken(encodedToken: string): void {
    if (typeof window === 'undefined') return
    
    const timestamp = Date.now()
    
    localStorage.setItem(STORAGE_KEY, encodedToken)
    localStorage.setItem(TIMESTAMP_KEY, timestamp.toString())
  },

  // Get encoded token if valid and not expired
  getEncodedToken(): string | null {
    if (typeof window === 'undefined') return null
    
    const encodedToken = localStorage.getItem(STORAGE_KEY)
    const timestampStr = localStorage.getItem(TIMESTAMP_KEY)
    
    if (!encodedToken || !timestampStr) return null
    
    // Check if token is expired
    const timestamp = parseInt(timestampStr)
    const now = Date.now()
    
    if (now - timestamp > SESSION_TIMEOUT) {
      this.clearToken()
      return null
    }
    
    return encodedToken
  },
  
  // Clear token and timestamp
  clearToken(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TIMESTAMP_KEY)
  },
  
  // Check if token exists and is valid
  hasValidToken(): boolean {
    return this.getEncodedToken() !== null
  },
  
  // Get time until token expires (in hours)
  getTimeUntilExpiry(): number {
    if (typeof window === 'undefined') return 0
    
    const timestampStr = localStorage.getItem(TIMESTAMP_KEY)
    if (!timestampStr) return 0
    
    const timestamp = parseInt(timestampStr)
    const now = Date.now()
    const elapsed = now - timestamp
    const remaining = SESSION_TIMEOUT - elapsed
    
    return Math.max(0, Math.floor(remaining / (60 * 60 * 1000)))
  }
}