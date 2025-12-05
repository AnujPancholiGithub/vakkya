# Design Document: Dashboard UX Improvements

## Overview

This design document outlines the technical approach for implementing UI/UX improvements to the Vakkya Dashboard. The improvements focus on enhancing empty states, adding progress indicators, enriching project cards, implementing contextual tooltips, improving the document upload experience, and adding conversation previews.

All changes enhance existing components without introducing new routes, API endpoints, or external dependencies. The implementation uses the existing shadcn/ui component library and Tailwind CSS.

## Architecture

### Component Enhancement Strategy

The implementation follows an enhancement-first approach:

1. **Extend existing components** rather than creating new ones
2. **Add utility functions** for formatting and state derivation
3. **Use composition** to add new UI elements to existing layouts
4. **Leverage existing data** from React Query hooks without new API calls

### File Structure

```
apps/dashboard/
├── components/
│   ├── ui/
│   │   ├── tooltip.tsx          # Existing - enhance usage
│   │   ├── progress-steps.tsx   # NEW - reusable progress indicator
│   │   └── empty-state.tsx      # NEW - reusable empty state wrapper
│   ├── projects/
│   │   └── create-project-dialog.tsx  # Existing - no changes
│   ├── documents/
│   │   ├── documents-tab.tsx    # ENHANCE - add drag-drop, icons
│   │   └── document-status-badge.tsx  # ENHANCE - add tooltips
│   └── conversations/
│       └── conversations-tab.tsx # ENHANCE - add previews, metrics
├── lib/
│   └── utils.ts                 # ENHANCE - add formatting functions
└── app/(dashboard)/projects/
    ├── page.tsx                 # ENHANCE - empty state, card metrics
    └── [id]/page.tsx            # ENHANCE - progress indicator
```

## Components and Interfaces

### 1. Progress Steps Component

A reusable horizontal progress indicator for multi-step workflows.

```typescript
// components/ui/progress-steps.tsx

interface Step {
  id: string
  label: string
  description?: string
}

interface ProgressStepsProps {
  steps: Step[]
  currentStep: number  // 0-indexed
  completedSteps: number[]  // Array of completed step indices
}

export function ProgressSteps({ steps, currentStep, completedSteps }: ProgressStepsProps)
```

**Visual States:**
- Completed: Green checkmark, solid connector line
- Current: Primary color ring, pulsing dot
- Pending: Muted text, dashed connector line

### 2. Empty State Component

A wrapper component for consistent empty state styling.

```typescript
// components/ui/empty-state.tsx

interface EmptyStateProps {
  icon?: React.ReactNode
  illustration?: 'workflow' | 'documents' | 'conversations'
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon, illustration, title, description, action, secondaryAction }: EmptyStateProps)
```

### 3. Project Card Enhancement

Extend existing project cards with metrics display.

```typescript
// Types for enhanced project display
interface ProjectWithMetrics {
  id: string
  name: string
  createdAt: string
  documentCount: number
  conversationCount: number
  lastActivityAt?: string
  setupComplete: boolean
}

// Derived state function
function getProjectSetupStatus(project: ProjectWithMetrics): 'incomplete' | 'ready' | 'active'
```

### 4. Utility Functions

```typescript
// lib/utils.ts additions

// Relative time formatting
export function formatRelativeTime(date: Date | string): string
// Returns: "2h ago", "Yesterday", "Nov 28"

// Text truncation with ellipsis
export function truncateText(text: string, maxLength: number): string
// Returns: "How do I reset my..." for text > maxLength

// File type to icon mapping
export function getFileTypeIcon(filename: string): 'pdf' | 'txt' | 'md'

// Setup step derivation
export function getSetupStep(project: { documentCount: number, conversationCount: number }): number
// Returns: 0 (create), 1 (upload), 2 (embed), 3 (complete)
```

## Data Models

### Project Setup State

The setup progress is derived from existing project data without new API fields:

```typescript
type SetupStep = 'create' | 'upload' | 'embed' | 'complete'

function deriveSetupStep(project: Project, documents: Document[], conversations: Conversation[]): SetupStep {
  if (conversations.length > 0) return 'complete'
  if (documents.length > 0) return 'embed'
  return 'upload'
  // 'create' step is always complete if viewing project detail
}
```

### Document Status Tooltips

Map existing status values to user-friendly explanations:

```typescript
const STATUS_TOOLTIPS: Record<DocumentStatus, string> = {
  PENDING: 'Waiting to be processed',
  PROCESSING: 'Being chunked and embedded for RAG',
  COMPLETED: 'Ready - available for voice agent queries',
  FAILED: 'Processing failed - check file format and retry'
}
```

### Conversation Preview

Derive preview from existing turn data:

```typescript
interface ConversationPreview {
  id: string
  firstQuery: string  // Truncated to 60 chars
  turnCount: number
  startedAt: string
  relativeTime: string  // "2h ago" or "Nov 28"
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Empty State Documentation Link Presence
*For any* empty state component rendered in the dashboard, the component SHALL include a secondary link element pointing to documentation or help content.
**Validates: Requirements 1.5**

### Property 2: Progress Step State Consistency
*For any* project with a given document count and conversation count, the progress indicator SHALL correctly mark steps as completed (checkmark), current (highlighted), or pending (muted) based on the derived setup state.
**Validates: Requirements 2.2**

### Property 3: Project Card Metrics Display
*For any* project displayed as a card, the card SHALL render the document count and conversation count with their respective icons.
**Validates: Requirements 3.1**

### Property 4: Relative Time Formatting
*For any* timestamp, the formatRelativeTime function SHALL return a relative format string ("Xh ago", "Yesterday") for timestamps within 24 hours, and a short date format ("Nov 28") for older timestamps.
**Validates: Requirements 3.2, 6.4, 6.5**

### Property 5: Setup Status Badge Logic
*For any* project where documentCount is 0 OR conversationCount is 0, the project card SHALL display a setup status badge indicating incomplete setup.
**Validates: Requirements 3.3**

### Property 6: Document Status Tooltip Mapping
*For any* document status value (PENDING, PROCESSING, COMPLETED, FAILED), hovering over the status badge SHALL display the corresponding tooltip text from the STATUS_TOOLTIPS mapping.
**Validates: Requirements 4.4**

### Property 7: File Type Icon Mapping
*For any* document filename with extension .pdf, .txt, or .md, the getFileTypeIcon function SHALL return the corresponding icon identifier.
**Validates: Requirements 5.5**

### Property 8: Text Truncation with Ellipsis
*For any* string input to truncateText with length greater than maxLength, the function SHALL return a string of exactly maxLength characters ending with "...".
**Validates: Requirements 6.1**

## Error Handling

### Upload Errors
- Display specific error messages from API response
- Show retry button for transient failures
- Validate file type and size client-side before upload

### Data Loading States
- Show skeleton loaders during data fetch
- Display error states with retry actions
- Gracefully handle missing optional data (e.g., no lastActivityAt)

### Tooltip Accessibility
- Ensure tooltips are keyboard accessible
- Use appropriate ARIA attributes
- Provide sufficient color contrast

## Testing Strategy

### Dual Testing Approach

The implementation uses both unit tests and property-based tests:

**Unit Tests** verify specific examples:
- Empty state renders correct elements for each type
- Progress indicator shows correct step for known project states
- Tooltip content matches expected text

**Property-Based Tests** verify universal properties using fast-check:
- Relative time formatting produces valid output for any timestamp
- Text truncation always respects maxLength constraint
- File type icon mapping covers all supported extensions
- Setup step derivation is deterministic for any input combination

### Testing Framework

- **Unit Tests**: Vitest with React Testing Library
- **Property-Based Tests**: fast-check library
- **Test Location**: Co-located with source files as `*.test.ts` or `*.test.tsx`

### Property Test Configuration

Each property-based test will:
- Run a minimum of 100 iterations
- Use smart generators constrained to valid input spaces
- Include edge cases (empty strings, boundary dates, zero counts)

### Test Annotations

Each property-based test will be tagged with:
```typescript
// **Feature: dashboard-ux, Property {number}: {property_text}**
// **Validates: Requirements X.Y**
```
