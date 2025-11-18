# Implementation Plan - Dashboard (MVP)

- [ ] 1. Set up Next.js 15 project structure and core dependencies
  - Initialize Next.js 15 with App Router in apps/dashboard
  - Install core dependencies: React 19, TypeScript 5.7, Tailwind CSS 4
  - Install state management: @tanstack/react-query v5
  - Install form libraries: react-hook-form, zod
  - Install UI libraries: shadcn/ui components, lucide-react
  - Configure TypeScript, ESLint, and Prettier
  - Set up Tailwind CSS with @theme directive
  - Create monorepo shared packages structure (schemas, config)
  - _Requirements: All requirements depend on this foundation_

- [ ] 2. Implement shared Zod schemas and types
  - Create packages/schemas with shared types
  - Define User, Project, Document, Conversation types
  - Define form validation schemas (createProject, documentUpload)
  - Define API request/response types
  - Export all schemas for use in dashboard and API
  - _Requirements: 2.3, 4.3, 7.2, 7.3_

- [ ] 3. Implement simple authentication
  - Create (auth)/login page with email/password form
  - Create (auth)/register page with email/password form
  - Implement login API call and store token in localStorage
  - Create middleware.ts for auth protection
  - Add logout functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 3.1 Write minimal unit test for authentication
  - Test login form submission
  - Test unauthenticated redirect
  - _Requirements: 1.1, 1.2_

- [ ] 4. Create API client and React Query setup
  - Implement API client with fetch wrappers in lib/api-client.ts
  - Add basic error handling and response parsing
  - Configure React Query provider with default options
  - Implement query hooks in lib/queries.ts (projects, documents, conversations)
  - Implement mutation hooks (create, delete operations)
  - _Requirements: 2.1, 2.3, 2.5, 4.1, 4.4, 4.6, 6.1, 7.2, 7.3_

- [ ] 5. Implement dashboard layout and navigation
  - Create (dashboard)/layout.tsx with simple navigation
  - Add navigation links (Projects, Logout)
  - Style with Tailwind CSS
  - _Requirements: 9.1, 9.2_

- [ ] 6. Build projects list page
  - Create (dashboard)/page.tsx for projects list
  - Fetch projects using useProjects hook
  - Display project cards with name
  - Add "Create Project" button
  - Handle loading and empty states
  - Implement click navigation to project detail
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 7. Implement create project dialog
  - Create CreateProjectDialog component with react-hook-form
  - Add form field: project name
  - Implement Zod validation with error display
  - Call useCreateProject mutation on submit
  - Display widget token on success
  - Show success toast notification
  - Close dialog and refresh projects list
  - _Requirements: 2.2, 2.3_

- [ ] 8. Build project detail page with tabs
  - Create (dashboard)/projects/[id]/page.tsx
  - Fetch project data using useProject hook
  - Display project name
  - Show widget token with copy button
  - Display embed code snippet with copy button
  - Implement tabs: Documents, Conversations
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ]* 8.1 Write minimal unit test for project detail
  - Test token display
  - Test copy to clipboard
  - _Requirements: 3.1, 3.2_

- [ ] 9. Implement documents tab with upload
  - Create DocumentsTab component
  - Fetch documents using useDocuments hook
  - Display documents table with filename, status, date
  - Implement file upload with input field
  - Validate file type (PDF, TXT, MD) and size (≤10MB)
  - Show simple status (Uploading → Processing → Completed/Failed)
  - Call useUploadDocument mutation
  - Add delete button with confirmation dialog
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 10. Implement document status display
  - Create status badge component
  - Map status values to UI (Uploading, Processing, Completed, Failed)
  - Display error messages for failed documents
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Build conversations tab
  - Create ConversationsTab component
  - Fetch conversations using useConversations hook
  - Display conversations list with timestamp, session ID
  - Implement click navigation to conversation detail
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 12. Implement conversation detail page
  - Create (dashboard)/projects/[id]/conversations/[conversationId]/page.tsx
  - Fetch conversation detail using useConversation hook
  - Display conversation metadata (timestamp, session ID)
  - Render all turns with user queries and agent responses
  - Style conversation bubbles (user vs agent)
  - Add timestamps for each turn
  - _Requirements: 6.4_

- [ ] 13. Implement toast notification system
  - Set up sonner for toast notifications
  - Create toast utility functions (success, error)
  - Configure toast styling
  - Make toasts dismissible
  - _Requirements: 3.3, 7.4, 10.1_

- [ ] 14. Implement basic error handling
  - Create simple error fallback component
  - Add error boundary to dashboard layout
  - Map common errors to user-friendly messages
  - Show error toast on API failures
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 15. Implement delete project functionality
  - Add delete button to project detail
  - Create delete confirmation dialog
  - Call useDeleteProject mutation
  - Redirect to projects list on success
  - Show success toast notification
  - _Requirements: 2.5_

- [ ]* 16. Write basic unit tests
  - Test project creation flow
  - Test document upload validation
  - Test navigation between pages
  - Test conversation display
  - _Requirements: 2.2, 4.3, 6.4_

- [ ] 17. Configure environment variables and deployment
  - Create .env.local template with required variables
  - Document all environment variables
  - Configure Cloudflare Pages build settings
  - Set up production environment variables
  - Test deployment to Cloudflare Pages
  - _Requirements: All requirements depend on proper deployment_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
