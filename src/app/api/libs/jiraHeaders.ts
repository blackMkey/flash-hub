// Shared utility for creating Jira API headers with browser-like properties
// This helps bypass Cloudflare bot detection

export function createJiraHeaders(token: string): Headers {
  const headers = new Headers();

  // Authentication
  headers.append("Authorization", `Bearer ${token}`);

  // Content negotiation
  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  // Browser-like headers to pass Cloudflare protection
  headers.append(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
  );
  headers.append("Accept-Language", "en-US,en;q=0.9");
  headers.append("Accept-Encoding", "gzip, deflate, br");
  headers.append("Connection", "keep-alive");
  headers.append("Cache-Control", "no-cache");
  headers.append("Pragma", "no-cache");

  return headers;
}
