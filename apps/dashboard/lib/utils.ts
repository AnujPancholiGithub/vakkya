import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date as relative time string.
 * - Within 24 hours: "Xh ago" or "Xm ago"
 * - Yesterday: "Yesterday"
 * - Older: "Nov 28" format
 * - Future dates: returns the short date format
 * - Invalid dates: returns "Invalid date"
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const inputDate = typeof date === 'string' ? new Date(date) : date

  // Handle invalid dates
  if (isNaN(inputDate.getTime())) {
    return 'Invalid date'
  }

  const diffMs = now.getTime() - inputDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  // Future dates - show short date format
  if (diffMs < 0) {
    return inputDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Less than 1 hour ago
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`
  }

  // Less than 24 hours ago
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  // Check if yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (
    inputDate.getDate() === yesterday.getDate() &&
    inputDate.getMonth() === yesterday.getMonth() &&
    inputDate.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday'
  }

  // Older than yesterday - show short date
  return inputDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Truncates text to maxLength characters with ellipsis.
 * - Empty string returns empty string
 * - String shorter than maxLength returns original string
 * - String longer than maxLength returns truncated string ending with "..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text
  }
  if (maxLength <= 3) {
    return '...'.slice(0, maxLength)
  }
  return text.slice(0, maxLength - 3) + '...'
}

export type FileTypeIcon = 'pdf' | 'txt' | 'md' | 'file'

/**
 * Maps file extensions to icon identifiers.
 * Returns 'file' for unknown extensions.
 */
export function getFileTypeIcon(filename: string): FileTypeIcon {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'txt':
      return 'txt'
    case 'md':
      return 'md'
    default:
      return 'file'
  }
}

/**
 * Derives setup step from document count and conversation count.
 * Returns step index:
 * - 0: create (project exists, so this is always complete when viewing)
 * - 1: upload (no documents yet)
 * - 2: embed (has documents, no conversations)
 * - 3: complete (has conversations)
 */
export function getSetupStep(project: { documentCount: number; conversationCount: number }): number {
  if (project.conversationCount > 0) {
    return 3 // complete
  }
  if (project.documentCount > 0) {
    return 2 // embed
  }
  return 1 // upload
}

export type SetupStatus = 'incomplete' | 'ready' | 'active'

/**
 * Derives setup status for project card badge display.
 * - 'incomplete': documentCount is 0 OR conversationCount is 0
 * - 'active': has both documents and conversations
 * - 'ready': has documents but no conversations (widget ready to use)
 */
export function getSetupStatus(project: { documentCount: number; conversationCount: number }): SetupStatus {
  if (project.documentCount === 0) {
    return 'incomplete'
  }
  if (project.conversationCount === 0) {
    return 'ready'
  }
  return 'active'
}

/**
 * Checks if setup is complete (has both documents and conversations)
 */
export function isSetupComplete(project: { documentCount: number; conversationCount: number }): boolean {
  return project.documentCount > 0 && project.conversationCount > 0
}
