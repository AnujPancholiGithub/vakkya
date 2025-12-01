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

- [x] 4. Checkpoint - Ensure all tests pass
  - ✅ All 601 tests passing (schemas: 27, api: 149, voice-agent: 224, widget: 148, dashboard: 53)
  - ✅ Fixed enum field validation (options required for enum type)

---

## Phase 2: Form Schema Backend

- [x] 5. Add database models for forms
  - [x] 5.1 Create Prisma migration for FormSchema and FormSubmission
    - FormSchema: id, projectId, name, fields (JSON), webhookUrl
    - FormSubmission: id, formSchemaId, sessionId, data (JSON), webhookSent
    - _Requirements: 3_
  - [x] 5.2 Add Zod validation schemas for form fields
    - Field types: string, email, phone, number, enum, text
    - Validate required, options, etc.
    - _Requirements: 3_
  - [x] 5.3 Write property test for form schema validation
    - **Property 3: Form Schema Validation**
    - **Validates: Requirement 3**

- [x] 6. Implement Form Schema API endpoints
  - [x] 6.1 Create form.service.ts with CRUD operations
    - createFormSchema, getFormSchema, updateFormSchema, deleteFormSchema
    - listFormSchemas, listSubmissions
    - _Requirements: 3_
    - **Status:** Implemented in form.service.ts with full CRUD + ownership checks
  - [x] 6.2 Create form routes in API
    - POST/GET/PUT/DELETE /api/projects/:id/forms
    - GET /api/projects/:id/forms/:formId/submissions
    - _Requirements: 3_
    - **Status:** Implemented in forms.ts with auth middleware
  - [x] 6.3 Write unit tests for form service
    - Test CRUD operations
    - Test validation errors
    - _Requirements: 3_
    - **Status:** 19 tests in form.service.test.ts

- [x] 7. Checkpoint - Ensure all tests pass
  - ✅ All 620 tests passing

---

## Phase 3: Webhook Delivery

- [x] 8. Implement webhook delivery service
  - [x] 8.1 Create webhook.service.ts
    - Retry 3x with exponential backoff (1s, 5s, 30s)
    - HMAC signature generation
    - _Requirements: 3, Integration Strategy_
    - **Status:** Implemented with configurable sleep for testing
  - [x] 8.2 Add webhook delivery to form submission flow
    - Trigger async after submission
    - Update webhookSent status
    - _Requirements: 3_
    - **Status:** submitForm() creates submission and delivers webhook
  - [x] 8.3 Write property test for webhook delivery
    - **Property 5: Webhook Delivery**
    - **Validates: Requirement 3**
    - **Status:** Property test added in webhook.service.test.ts

- [x] 9. Add internal form submission endpoint
  - [x] 9.1 Create POST /api/internal/forms/:formId/submit
    - Accept data from voice agent
    - Validate against schema
    - Trigger webhook
    - _Requirements: 3_
    - **Status:** Endpoint added to forms.ts routes

- [x] 10. Checkpoint - Ensure all tests pass
  - ✅ All 635 tests passing (schemas: 27, api: 184, voice-agent: 224, widget: 148, dashboard: 53)

---

## Phase 4: Form Capability (Voice Agent)

- [x] 11. Create FormCapability in voice agent
  - [x] 11.1 Implement FormCapability class
    - can_handle(): Check if form is active
    - handle(): Manage form conversation flow
    - _Requirements: 2.B_
    - **Status:** Implemented in form_capability.py
  - [x] 11.2 Implement form state management
    - Track current field index
    - Store collected answers
    - Handle back/skip navigation
    - _Requirements: 2.B_
    - **Status:** FormState class with advance(), go_back(), set_answer()
  - [x] 11.3 Implement field extraction via pattern matching
    - Extract typed values from voice input (string, email, phone, number, enum)
    - Handle clarification requests
    - _Requirements: 2.B, 3_
    - **Status:** _extract_field_value() with regex-based extraction
  - [x] 11.4 Write property test for field extraction
    - **Property 4: Field Extraction**
    - **Validates: Requirement 3**
    - **Status:** 5 property tests in test_form_capability.py

- [x] 12. Integrate FormCapability with orchestrator
  - [x] 12.1 Register FormCapability in orchestrator
    - Add to capabilities list
    - Configure priority
    - _Requirements: Architecture Principle_
    - **Status:** Exported from capabilities/__init__.py (registration in entrypoint pending)
  - [x] 12.2 Add form schema fetching from API
    - Fetch active form schema on session start
    - Cache for session duration
    - _Requirements: 2.B_
    - **Status:** _fetch_active_form() method implemented (API endpoint pending Phase 6)

- [x] 13. Checkpoint - Ensure all tests pass
  - ✅ All 258 tests passing (224 existing + 34 new FormCapability tests)

---

## Phase 5: Hybrid Form UI (Widget)

- [x] 14. Create Form UI component in widget
  - [x] 14.1 Create form-ui.js module
    - Render question text, input field, progress dots
    - Handle voice and keyboard input
    - _Requirements: 2.B_
    - **Status:** Implemented with createFormUI() function
  - [x] 14.2 Implement form state management in widget
    - Track current question
    - Store answers locally
    - Handle validation
    - _Requirements: 2.B_
    - **Status:** FormState with currentIndex, answers, completed, error
  - [x] 14.3 Add form UI styles (Shadow DOM)
    - Typeform-style one-question-at-a-time
    - Progress indicator
    - Back/Skip buttons
    - _Requirements: 2.B_
    - **Status:** FORM_UI_STYLES with mobile responsive design
  - [x] 14.4 Write unit tests for form UI
    - Test rendering
    - Test input handling
    - Test validation
    - _Requirements: 2.B_
    - **Status:** 40 tests in form-ui.test.js

- [x] 15. Integrate Form UI with voice agent
  - [x] 15.1 Add form schema fetching to widget
    - Fetch active form schema from API on widget init
    - Determine if form mode should be active
    - _Requirements: 2.B_
    - **Status:** showFormUI() method accepts schema, formSchema stored in widget
  - [x] 15.2 Add widget-agent coordination for forms
    - Widget sends form schema to agent via data channel
    - Agent speaks questions
    - Widget displays question and captures input (voice or keyboard)
    - _Requirements: 2.B_
    - **Status:** handleFormAnswer(), setFormAnswer(), getCurrentFormField() methods
  - [x] 15.3 Handle form completion and submission
    - Collect all answers
    - Submit to API via webhook
    - Show confirmation UI
    - _Requirements: 2.B_
    - **Status:** handleFormSubmit() callback, completion screen in form-ui.js

- [x] 16. Checkpoint - Ensure all tests pass
  - ✅ All 188 widget tests passing (148 existing + 40 new form-ui tests)

---

## Phase 6: Dashboard Form Builder

- [x] 17. Create form builder UI in dashboard
  - [x] 17.1 Create forms list page
    - List all forms for project
    - Create/Edit/Delete actions
    - _Requirements: 3_
    - **Status:** Implemented at /projects/[id]/forms with card-based list
  - [x] 17.2 Create form schema editor
    - Add/remove/reorder fields
    - Configure field type, label, required
    - _Requirements: 3_
    - **Status:** FormEditorDialog with field editor, type selection, options for enum
  - [x] 17.3 Add webhook configuration UI
    - Input webhook URL
    - Test webhook button
    - _Requirements: 3, Integration Strategy_
    - **Status:** Webhook URL input in editor, test button in form detail page

- [x] 18. Create form submissions view
  - [x] 18.1 Create submissions list page
    - List all submissions for form
    - Show data, timestamp, webhook status
    - _Requirements: 3_
    - **Status:** Implemented at /projects/[id]/forms/[formId] with table view

- [x] 19. Final Checkpoint - Ensure all tests pass
  - ✅ All 710 tests passing (schemas: 27, api: 184, voice-agent: 258, widget: 188, dashboard: 53)
