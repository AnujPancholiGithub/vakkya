# Design Document - Dashboard (Simplified MVP)

## Overview

The Dashboard is a Next.js 15 application using App Router that provides a simple web interface for managing Vakkya projects. It handles authentication, project management, document uploads, and conversation viewing. This MVP uses simple forms, React Query for state management, and is deployed on Cloudflare Pages.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────┐
│      Cloudflare Pages               │
│  ┌───────────────────────────────┐  │
│  │   Next.js 15 App Router       │  │
│  │  - Server Components          │  │
│  │  - Client Components          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              │ HTTPS/REST
              ▼
┌─────────────────────────────────────┐
│      API Server (Fastify)           │
└─────────────────────────────────────┘
```

### Directory Structure

```
apps/dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Projects list
│   │   └── projects/
│   │       └── [id]/
│   │           ├── page.tsx     # Project detail
│   │           ├── documents/
│   │           └── conversations/
│   └── layout.tsx
├── components/
│   ├── ui/                      # shadcn/ui
│   ├── projects/
│   ├── documents/
│   └── conversations/
└── lib/
    ├── api-client.ts
    ├── queries.ts
    └── utils.ts
```

## Components and Interfaces

### Core Components

#### 1. Authentication Components

**LoginPage** - Email/password login form
**RegisterPage** - Email/password registration form

#### 2. Project Management

**ProjectsListPage** - Display all user projects
**CreateProjectDialog** - Form to create new project
**ProjectDetailPage** - Project overview with tabs

#### 3. Document Management

**DocumentsTab** - List documents with upload
**DocumentUploadZone** - File upload with validation
**DocumentList** - Table with status indicators

#### 4. Conversation Logs

**ConversationsTab** - List of conversations
**ConversationDetailPage** - Full conversation transcript

#### 5. Settings

**SettingsTab** - Form for project configuration

### API Client Interface

```typescript
interface ApiClient {
  // Projects
  getProjects(): Promise<Project[]>
  getProject(id: string): Promise<Project>
  createProject(data: CreateProjectInput): Promise<Project>
  updateProject(id: string, data: UpdateProjectInput): Promise<Project>
  deleteProject(id: string): Promise<void>
  
  // Documents
  getDocuments(projectId: string): Promise<Document[]>
  uploadDocument(projectId: string, file: File): Promise<Document>
  deleteDocument(projectId: string, documentId: string): Promise<void>
  
  // Conversations
  getConversations(projectId: string): Promise<Conversation[]>
  getConversation(projectId: string, conversationId: string): Promise<ConversationDetail>
}
```

### React Query Hooks

```typescript
// Projects
useProjects(): UseQueryResult<Project[]>
useProject(id: string): UseQueryResult<Project>
useCreateProject(): UseMutationResult<Project, CreateProjectInput>
useUpdateProject(id: string): UseMutationResult<Project, UpdateProjectInput>
useDeleteProject(): UseMutationResult<void, string>

// Documents
useDocuments(projectId: string): UseQueryResult<Document[]>
useUploadDocument(projectId: string): UseMutationResult<Document, File>
useDeleteDocument(projectId: string): UseMutationResult<void, string>

// Conversations
useConversations(projectId: string): UseQueryResult<Conversation[]>
useConversation(projectId: string, conversationId: string): UseQueryResult<ConversationDetail>
```

## Data Models

```typescript
interface User {
  id: string
  email: string
}

interface Project {
  id: string
  userId: string
  name: string
  token: string
  createdAt: Date
}

interface Document {
  id: string
  projectId: string
  filename: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  createdAt: Date
}

interface Conversation {
  id: string
  projectId: string
  sessionId: string
  turnCount: number
  startedAt: Date
}

interface ConversationTurn {
  id: string
  conversationId: string
  userQuery: string
  agentResponse: string
  timestamp: Date
}

interface ConversationDetail extends Conversation {
  turns: ConversationTurn[]
}
```

### Form Schemas

```typescript
const createProjectSchema = z.object({
  name: z.string().min(1).max(100)
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional()
})

const documentUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, 'File must be less than 10MB')
    .refine(
      file => ['application/pdf', 'text/plain', 'text/markdown'].includes(file.type),
      'File must be PDF, TXT, or MD'
    )
})
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: User-owned data display
*For any* user viewing their projects, only items owned by that user should be displayed.
**Validates: Requirements 2.1**

### Property 2: Form submission triggers API calls
*For any* valid form submission, the dashboard should call the corresponding API endpoint.
**Validates: Requirements 2.3, 7.2**

### Property 3: Navigation consistency
*For any* clickable item, clicking should navigate to the correct detail page.
**Validates: Requirements 2.4, 6.3**

### Property 4: Token display accuracy
*For any* project, the displayed widget token should match the project's actual token.
**Validates: Requirements 3.1, 3.4**

### Property 5: Clipboard operations
*For any* copy button click, the correct content should be copied to clipboard.
**Validates: Requirements 3.2, 3.5**

### Property 6: File validation before upload
*For any* selected file, validation should occur before upload.
**Validates: Requirements 4.3**

### Property 7: Upload completion updates list
*For any* successful upload, the document should appear in the list.
**Validates: Requirements 4.5**

### Property 8: Delete confirmation flow
*For any* delete action, a confirmation dialog should appear first.
**Validates: Requirements 2.5, 4.6**

### Property 9: Document status rendering
*For any* document, the displayed status should match the document's current status.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 10: Conversation data completeness
*For any* displayed conversation, all required fields should be present.
**Validates: Requirements 6.2**

### Property 11: Conversation detail completeness
*For any* conversation detail view, all turns should be displayed.
**Validates: Requirements 6.4**

### Property 12: Success feedback on save
*For any* successful save operation, a success toast should appear.
**Validates: Requirements 3.3, 7.3**

### Property 13: Error toast on API failure
*For any* failed API call, an error toast should be displayed.
**Validates: Requirements 10.1**

### Property 14: Auth failure redirect
*For any* authentication failure, redirect to sign-in page.
**Validates: Requirements 10.2**

### Property 15: Network error retry option
*For any* network error, a retry button should be displayed.
**Validates: Requirements 10.3**

### Property 16: Validation error highlighting
*For any* form with validation errors, invalid fields should be highlighted.
**Validates: Requirements 10.4**

## Error Handling

### Client-Side Error Handling

**API Call Failures:**
- React Query handles retry logic (3 attempts)
- Failed mutations trigger error toasts
- Network errors show retry button

**Authentication Errors:**
- Middleware intercepts unauthenticated requests
- Redirects to sign-in page

**Validation Errors:**
- Zod schema validation on form submission
- react-hook-form displays field-level errors

**File Upload Errors:**
- Client-side validation before upload
- Server errors mapped to user-friendly messages

### Error Display Strategy

**Toast Notifications (sonner):**
- Success: Green toast, 3-second duration
- Error: Red toast, 5-second duration
- Dismissible by user

**Inline Errors:**
- Form field errors below input
- Document processing errors in status column

**Error Boundaries:**
- React Error Boundary wraps major sections
- Fallback UI with reload button

## Testing Strategy

### Unit Testing

**Framework:** Vitest with React Testing Library

**Coverage:**
- Component rendering
- User interactions
- Form submissions
- Authentication redirects

### Property-Based Testing

**Framework:** fast-check

**Configuration:** Minimum 100 iterations

**Tests:**
- Property 1: User-owned data display
- Property 6: File validation
- Property 9: Status rendering

### Integration Testing

- Mock API responses using MSW
- Mock authentication state
- Test component integration

## Performance Considerations

### Bundle Size Optimization

- Next.js automatic code splitting
- Dynamic imports for heavy components
- Tree-shaking unused components
- Target: <200KB gzipped

### Data Fetching Optimization

**React Query:**
- Stale time: 30 seconds
- Cache time: 5 minutes
- Automatic background refetching
- Optimistic updates

### Rendering Performance

- Use Server Components for static content
- Minimize client component size
- Debounce search inputs (300ms)

## Security Considerations

### Authentication & Authorization

- JWT tokens in httpOnly cookies
- Automatic token refresh
- Server validates user owns resources

### Input Sanitization

- Zod schema validation
- File upload validation
- XSS prevention via React escaping

### Secure Communication

- All API calls over HTTPS
- No sensitive data in URL parameters
- No sensitive data in localStorage

## Deployment Strategy

### Cloudflare Pages Configuration

**Build Settings:**
- Framework: Next.js
- Build command: `pnpm build`
- Output directory: `.next`
- Node version: 24.x

**Environment Variables:**
- `NEXT_PUBLIC_API_URL`: API server URL

### Preview Deployments

- Automatic preview for every PR
- Connected to staging API

### Production Deployment

- Deploy on merge to main
- Automatic rollback on failure
- Zero-downtime deployments
