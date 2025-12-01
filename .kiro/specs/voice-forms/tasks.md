# Implementation Plan: Voice Forms

## Phase 1: Foundation - Voice FAQ Improvements

- [x] 1. Add page context to widget
  - [x] 1.1 Create context collector module in widget
    - Collect pageUrl, pageTitle, timestamp
    - Send via LiveKit data channel to agent
    - _Requirements: 1.1, 2.A_
    - **Status:** Already implemented in livekit-manager.js sendPageContext()
  - [x] 1.2 Write property test for context collection
    - **Property 1: Widget Initialization**
    - **Validates: Requirement 1**
    - **Status:** Added 5 property tests in livekit-manager.test.js

- [x] 2. Implement capability orchestrator in voice agent
  - [x] 2.1 Create Capability base class and interface
    - Abstract methods: can_handle(), handle()
    - _Requirements: Architecture Principle_
  - [x] 2.2 Create CapabilityOrchestrator class
    - Route to highest-confidence capability
    - Fallback response for unknown inputs
    - _Requirements: Architecture Principle_
  - [x] 2.3 Refactor existing RAG logic into RAGCapability
    - Move current RAG code into capability module
    - Implement can_handle() and handle()
    - _Requirements: 2.A_
  - [x] 2.4 Write unit tests for orchestrator
    - Test capability routing logic
    - Test fallback behavior
    - _Requirements: Architecture Principle_

- [x] 3. Improve RAG responses
  - [x] 3.1 Add "I don't know" fallback when RAG confidence is low
    - Check similarity score threshold (0.5)
    - Return graceful fallback message with uncertainty indicator
    - _Requirements: 2.A_
    - **Status:** Added LOW_SIMILARITY_THRESHOLD, _get_max_similarity(), low confidence detection
  - [x] 3.2 Improve RAG prompt template for FAQ-style answers
    - Concise, helpful responses
    - Include source context
    - _Requirements: 2.A_
    - **Status:** Improved agent instructions with FAQ-optimized prompts

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2: Form Schema Backend

- [ ] 5. Add database models for forms
  - [ ] 5.1 Create Prisma migration for FormSchema and FormSubmission
    - FormSchema: id, projectId, name, fields (JSON), webhookUrl
    - FormSubmission: id, formSchemaId, sessionId, data (JSON), webhookSent
    - _Requirements: 3_
  - [ ] 5.2 Add Zod validation schemas for form fields
    - Field types: string, email, phone, number, enum, text
    - Validate required, options, etc.
    - _Requirements: 3_
  - [ ] 5.3 Write property test for form schema validation
    - **Property 3: Form Schema Validation**
    - **Validates: Requirement 3**

- [ ] 6. Implement Form Schema API endpoints
  - [ ] 6.1 Create form.service.ts with CRUD operations
    - createFormSchema, getFormSchema, updateFormSchema, deleteFormSchema
    - listFormSchemas, listSubmissions
    - _Requirements: 3_
  - [ ] 6.2 Create form routes in API
    - POST/GET/PUT/DELETE /api/projects/:id/forms
    - GET /api/projects/:id/forms/:formId/submissions
    - _Requirements: 3_
  - [ ] 6.3 Write unit tests for form service
    - Test CRUD operations
    - Test validation errors
    - _Requirements: 3_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Webhook Delivery

- [ ] 8. Implement webhook delivery service
  - [ ] 8.1 Create webhook.service.ts
    - Retry 3x with exponential backoff (1s, 5s, 30s)
    - HMAC signature generation
    - _Requirements: 3, Integration Strategy_
  - [ ] 8.2 Add webhook delivery to form submission flow
    - Trigger async after submission
    - Update webhookSent status
    - _Requirements: 3_
  - [ ] 8.3 Write property test for webhook delivery
    - **Property 5: Webhook Delivery**
    - **Validates: Requirement 3**

- [ ] 9. Add internal form submission endpoint
  - [ ] 9.1 Create POST /api/internal/forms/:formId/submit
    - Accept data from voice agent
    - Validate against schema
    - Trigger webhook
    - _Requirements: 3_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Form Capability (Voice Agent)

- [ ] 11. Create FormCapability in voice agent
  - [ ] 11.1 Implement FormCapability class
    - can_handle(): Check if form is active
    - handle(): Manage form conversation flow
    - _Requirements: 2.B_
  - [ ] 11.2 Implement form state management
    - Track current field index
    - Store collected answers
    - Handle back/skip navigation
    - _Requirements: 2.B_
  - [ ] 11.3 Implement field extraction via LLM function calling
    - Extract typed values from voice input
    - Handle clarification requests
    - _Requirements: 2.B, 3_
  - [ ] 11.4 Write property test for field extraction
    - **Property 4: Field Extraction**
    - **Validates: Requirement 3**

- [ ] 12. Integrate FormCapability with orchestrator
  - [ ] 12.1 Register FormCapability in orchestrator
    - Add to capabilities list
    - Configure priority
    - _Requirements: Architecture Principle_
  - [ ] 12.2 Add form schema fetching from API
    - Fetch active form schema on session start
    - Cache for session duration
    - _Requirements: 2.B_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Hybrid Form UI (Widget)

- [ ] 14. Create Form UI component in widget
  - [ ] 14.1 Create form-ui.js module
    - Render question text, input field, progress dots
    - Handle voice and keyboard input
    - _Requirements: 2.B_
  - [ ] 14.2 Implement form state management in widget
    - Track current question
    - Store answers locally
    - Handle validation
    - _Requirements: 2.B_
  - [ ] 14.3 Add form UI styles (Shadow DOM)
    - Typeform-style one-question-at-a-time
    - Progress indicator
    - Back/Skip buttons
    - _Requirements: 2.B_
  - [ ] 14.4 Write unit tests for form UI
    - Test rendering
    - Test input handling
    - Test validation
    - _Requirements: 2.B_

- [ ] 15. Integrate Form UI with voice agent
  - [ ] 15.1 Add form schema fetching to widget
    - Fetch active form schema from API on widget init
    - Determine if form mode should be active
    - _Requirements: 2.B_
  - [ ] 15.2 Add widget-agent coordination for forms
    - Widget sends form schema to agent via data channel
    - Agent speaks questions
    - Widget displays question and captures input (voice or keyboard)
    - _Requirements: 2.B_
  - [ ] 15.3 Handle form completion and submission
    - Collect all answers
    - Submit to API via webhook
    - Show confirmation UI
    - _Requirements: 2.B_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6: Dashboard Form Builder

- [ ] 17. Create form builder UI in dashboard
  - [ ] 17.1 Create forms list page
    - List all forms for project
    - Create/Edit/Delete actions
    - _Requirements: 3_
  - [ ] 17.2 Create form schema editor
    - Add/remove/reorder fields
    - Configure field type, label, required
    - _Requirements: 3_
  - [ ] 17.3 Add webhook configuration UI
    - Input webhook URL
    - Test webhook button
    - _Requirements: 3, Integration Strategy_

- [ ] 18. Create form submissions view
  - [ ] 18.1 Create submissions list page
    - List all submissions for form
    - Show data, timestamp, webhook status
    - _Requirements: 3_

- [ ] 19. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
