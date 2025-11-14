/**
 * Utility functions for formatting dates for Jira API
 */

/**
 * Format date to Jira date format: dd/MMM/yy
 * Example: 28/Oct/25
 */
export function formatJiraDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear().toString().slice(-2)
  
  return `${day}/${month}/${year}`
}

/**
 * Format date to Jira datetime format: dd/MMM/yy H:mm
 * Example: 27/Oct/25 14:30
 */
export function formatJiraDateTime(date: Date): string {
  const dateStr = formatJiraDate(date)
  const hours = date.getHours().toString()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${dateStr} ${hours}:${minutes}`
}

/**
 * Parse a date string and return formatted Jira date
 * Accepts various input formats and returns dd/MMM/yy
 */
export function parseAndFormatJiraDate(dateInput: string): string {
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format')
  }
  return formatJiraDate(date)
}

/**
 * Parse a datetime string and return formatted Jira datetime
 * Accepts various input formats and returns dd/MMM/yy H:mm
 */
export function parseAndFormatJiraDateTime(dateInput: string): string {
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format')
  }
  return formatJiraDateTime(date)
}

/**
 * Get current date in Jira format
 */
export function getCurrentJiraDate(): string {
  return formatJiraDate(new Date())
}

/**
 * Get current datetime in Jira format
 */
export function getCurrentJiraDateTime(): string {
  return formatJiraDateTime(new Date())
}

/**
 * Add days to a date and return in Jira format
 */
export function addDaysToJiraDate(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return formatJiraDate(date)
}

/**
 * Validate time tracking format (e.g., "3w 4d 12h", "24h", "2d")
 */
export function validateTimeTrackingFormat(timeStr: string): boolean {
  // Allow formats like: 3w, 4d, 12h, 3w 4d, 3w 4d 12h, etc.
  const timeRegex = /^(\d+[wdhm]\s*)+$/
  return timeRegex.test(timeStr.trim())
}