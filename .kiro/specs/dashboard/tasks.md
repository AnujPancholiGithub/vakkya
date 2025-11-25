# Implementation Plan - Dashboard (MVP)

- [x] 1. Set up Next.js 15 project structure and core dependencies
  - Status: ✅ Complete
  - Initialized Next.js 15 with App Router in apps/dashboard
  - Installed React 19, TypeScript 5.7, Tailwind CSS 4
  - Installed @tanstack/react-query v5 for state management
  - Installed react-hook-form, zod for forms
  - Installed shadcn/ui components (Button, Input, Label, Card), lucide-react
  - Configured TypeScript, Vitest for testing
  - Set up Tailwind CSS 4 with @theme directive
  - Created API client and React Query hooks
  - All 11 tests passing
  - _Requirements: All requirements depend on this foundation_

- [x] 2. Implement shared Zod schemas and types
  - Create packages/schemas with shared types
  - Define User, Project, Document, Conversation types
  - Define form validation schemas (createProject, documentUpload)
  - Define API request/response types
  - Export all schemas for use in dashboard and API
  - _Requirements: 2.3, 4.3, 7.2, 7.3_

- [x] 3. Implement simple authentication
  - Status: ✅ Complete
  - Created (auth)/login page with email/password form
  - Created (auth)/register page with email/password form
  - Implemented login/signup API calls with token storage (localStorage + cookie)
  - Created middleware.ts for auth protection on /projects routes
  - Added logout functionality
  - All 20 tests passing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.1 Write minimal unit test for authentication
  - Status: ✅ Complete
  - 9 auth tests: login, signup, getToken, isAuthenticated, logout
  - _Requirements: 1.1, 1.2_

- [x] 4. Create API client and React Query setup
  - Status: ✅ Complete (done in task 1)
  - Created lib/api-client.ts with fetch wrappers and error handling
  - Configured React Query provider in app/providers.tsx
  - Created lib/queries.ts with all hooks (projects, documents, conversations)
  - All 20 tests passing
  - _Requirements: 2.1, 2.3, 2.5, 4.1, 4.4, 4.6, 6.1, 7.2, 7.3_

- [x] 5. Implement dashboard layout and navigation
  - Status: ✅ Complete
  - Created (dashboard)/layout.tsx with header navigation
  - Added Projects nav link and Logout button
  - Styled with Tailwind CSS
  - _Requirements: 9.1, 9.2_

- [x] 6. Build projects list page
  - Status: ✅ Complete
  - Created (dashboard)/projects/page.tsx
  - Fetches projects using useProjects hook
  - Displays project cards with name and date
  - Create Project button opens dialog
  - Loading and empty states handled
  - Click navigates to project detail
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 7. Implement create project dialog
  - Status: ✅ Complete
  - Created CreateProjectDialog with react-hook-form + zod
  - Form validates project name (1-100 chars)
  - Calls useCreateProject mutation
  - Shows widget token with copy button on success
  - Toast notifications for success/error
  - _Requirements: 2.2, 2.3_

- [ ] 8. Build project detail page with tabs
  - Create (dashboard)/projects/[id]/page.tsx
  - Fetch project data using useProject hook
  - Display project name
  - Show widget token with copy button
  - Display embed code snippet with copy button
  - Implement tabs: Documents, Conversations
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ] 8.1 Write minimal unit test for project detail
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

- [ ] 16. Write basic unit tests
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
