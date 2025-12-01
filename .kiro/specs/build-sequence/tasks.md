# Implementation Plan - Build Sequence

This is the master execution plan for building Vakkya. Follow these phases in order.

**Note:** This document provides a high-level overview. For detailed task execution, refer to individual service specs:
- `.kiro/specs/api-server/tasks.md`
- `.kiro/specs/voice-agent/tasks.md`
- `.kiro/specs/widget/tasks.md`
- `.kiro/specs/dashboard/tasks.md`
- `.kiro/specs/voice-forms/tasks.md`

---

## Completed Phases (MVP)

### ✅ Phase 0: Foundation
- Monorepo structure, Prisma + pgvector, shared schemas, env templates
- **Tests:** 10 passing

### ✅ Phase 1: API Server Core
- JWT auth, project CRUD, document upload, RAG processing, conversations, health checks, security middleware, logging
- **Tests:** 149 passing

### ✅ Phase 2: Voice Agent Minimal
- LiveKit Agents setup, data models, entrypoint, session management, data channel, error handling, logging, validation
- **Tests:** 150 passing

### ✅ Phase 3: Widget Minimal
- Vite setup, Shadow DOM, button component, voice UI, audio processor, LiveKit manager, error handling
- **Tests:** 143 passing
- **Bundle:** 5.1KB gzipped

### ✅ Phase 4: Voice Agent RAG Integration
- RAG service, Agent with search_knowledge tool, conversation logging to API, Railway deployment config
- **Tests:** 186 passing

### ✅ Phase 5: Dashboard
- Next.js 15, auth pages, project management, document upload, conversations view, toast notifications, error handling
- **Tests:** 20 passing

### ✅ Phase 6: Deployment & Final Validation
- API Server → Railway
- Voice Agent → Railway
- Dashboard → Vercel
- Widget → Cloudflare R2
- End-to-end production test verified

**Total MVP Tests:** ~648 passing

---

## Phase 7: Voice Forms (Use Case B)

**Overview:** Add conversational forms capability - Typeform-style voice + keyboard input with webhook delivery to CRMs.

**Detailed tasks:** `.kiro/specs/voice-forms/tasks.md`

### 7.1 Foundation - Voice FAQ Improvements (Voice Forms Phase 1)

- [x] 7.1.1 Add page context to widget
  - **Execute:** Voice Forms task 1 (subtasks 1.1-1.2)
  - _Requirements: 1.1, 2.A_
  - **Completed:** Context collector already in livekit-manager.js, added property tests

- [x] 7.1.2 Implement capability orchestrator in voice agent
  - **Execute:** Voice Forms task 2 (subtasks 2.1-2.4)
  - _Requirements: Architecture Principle_

- [x] 7.1.3 Improve RAG responses
  - **Execute:** Voice Forms task 3 (subtasks 3.1-3.2)
  - _Requirements: 2.A_
  - **Completed:** Added similarity-based confidence, "I don't know" fallback, FAQ-optimized prompts

- [x] 7.1.4 Checkpoint
  - **Execute:** Voice Forms task 4
  - ✅ All 601 tests passing
  - ✅ Fixed enum field validation bug

### 7.2 Form Schema Backend (Voice Forms Phase 2)

- [x] 7.2.1 Add database models for forms
  - **Execute:** Voice Forms task 5 (subtasks 5.1-5.3)
  - _Requirements: 3_
  - ✅ Prisma migration created (FormSchema, FormSubmission)
  - ✅ Zod validation schemas added (formFieldSchema, createFormSchemaSchema, etc.)
  - ✅ 25 property tests added to packages/schemas

- [x] 7.2.2 Implement Form Schema API endpoints
  - **Execute:** Voice Forms task 6 (subtasks 6.1-6.3)
  - _Requirements: 3_
  - ✅ form.service.ts with CRUD operations
  - ✅ form routes (POST/GET/PUT/DELETE /projects/:id/forms)
  - ✅ 19 unit tests passing

- [x] 7.2.3 Checkpoint
  - **Execute:** Voice Forms task 7
  - ✅ All 620 tests passing (schemas: 27, api: 168, voice-agent: 224, widget: 148, dashboard: 53)

### 7.3 Webhook Delivery (Voice Forms Phase 3)

- [x] 7.3.1 Implement webhook delivery service
  - **Execute:** Voice Forms task 8 (subtasks 8.1-8.3)
  - _Requirements: 3, Integration Strategy_
  - ✅ webhook.service.ts with retry logic (1s, 5s, 30s) and HMAC signatures
  - ✅ Property test for webhook delivery

- [x] 7.3.2 Add internal form submission endpoint
  - **Execute:** Voice Forms task 9 (subtask 9.1)
  - _Requirements: 3_
  - ✅ POST /internal/forms/:formId/submit endpoint

- [x] 7.3.3 Checkpoint
  - **Execute:** Voice Forms task 10
  - ✅ All 635 tests passing (schemas: 27, api: 184, voice-agent: 224, widget: 148, dashboard: 53)

### 7.4 Form Capability - Voice Agent (Voice Forms Phase 4)

- [x] 7.4.1 Create FormCapability in voice agent
  - **Execute:** Voice Forms task 11 (subtasks 11.1-11.4)
  - _Requirements: 2.B_
  - ✅ FormCapability implemented with form state management
  - ✅ Field extraction for string, email, phone, number, enum types
  - ✅ Navigation support (back, skip)
  - ✅ Form submission to API endpoint
  - ✅ 34 property tests added

- [x] 7.4.2 Integrate FormCapability with orchestrator
  - **Execute:** Voice Forms task 12 (subtasks 12.1-12.2)
  - _Requirements: Architecture Principle, 2.B_
  - ✅ FormCapability exported from capabilities module
  - ✅ Ready for orchestrator registration (will be done in entrypoint integration)

- [x] 7.4.3 Checkpoint
  - **Execute:** Voice Forms task 13
  - ✅ All 258 tests passing (224 existing + 34 new)

### 7.5 Hybrid Form UI - Widget (Voice Forms Phase 5)

- [x] 7.5.1 Create Form UI component in widget
  - **Execute:** Voice Forms task 14 (subtasks 14.1-14.4)
  - _Requirements: 2.B_
  - ✅ form-ui.js with Typeform-style one-question-at-a-time UI
  - ✅ Support for all field types (string, email, phone, number, enum, text)
  - ✅ Progress dots, back/skip navigation
  - ✅ Voice + keyboard input support
  - ✅ 40 unit tests added

- [x] 7.5.2 Integrate Form UI with voice agent
  - **Execute:** Voice Forms task 15 (subtasks 15.1-15.3)
  - _Requirements: 2.B_
  - ✅ showFormUI(), handleFormSubmit(), handleFormAnswer() methods
  - ✅ setFormAnswer(), getCurrentFormField() for voice coordination
  - ✅ Form state cleanup in handleClose()

- [x] 7.5.3 Checkpoint
  - **Execute:** Voice Forms task 16
  - ✅ All 188 widget tests passing

### 7.6 Dashboard Form Builder (Voice Forms Phase 6)

- [x] 7.6.1 Create form builder UI in dashboard
  - **Execute:** Voice Forms task 17 (subtasks 17.1-17.3)
  - _Requirements: 3_
  - ✅ Forms list page at /projects/[id]/forms
  - ✅ FormEditorDialog with field editor (all types: string, email, phone, number, enum, text)
  - ✅ Webhook URL configuration with test button

- [x] 7.6.2 Create form submissions view
  - **Execute:** Voice Forms task 18 (subtask 18.1)
  - _Requirements: 3_
  - ✅ Form detail page at /projects/[id]/forms/[formId]
  - ✅ Submissions table with data preview, timestamp, webhook status

- [x] 7.6.3 Final Checkpoint
  - **Execute:** Voice Forms task 19
  - ✅ All 710 tests passing (schemas: 27, api: 184, voice-agent: 258, widget: 188, dashboard: 53)
  - ✅ Voice Forms feature complete



---

## Phase 8: Conversational Forms V2 (Enhanced Dynamic Forms)

**Overview:** Transform rigid form-filling into dynamic, agent-driven conversational inquiries with multi-form support, confirmation loops, and graceful error recovery.

**Detailed tasks:** `.kiro/specs/conversational-forms-v2/tasks.md`

### 8.1 Database Schema & API Foundation (V2 Phase 1)

- [ ] 8.1.1 Extend database schema for V2 forms
  - **Execute:** Conversational Forms V2 task 1 (subtasks 1.1-1.5)
  - Add description, triggerPhrases, greetingMessage, completionMessage, webhookSecret, isActive
  - Add FormEvent table for analytics
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 11.1-11.4_

- [ ] 8.1.2 Implement trigger phrase conflict detection
  - **Execute:** Conversational Forms V2 task 2 (subtasks 2.1-2.2)
  - _Requirements: 9.5_

- [ ] 8.1.3 Implement form event logging service
  - **Execute:** Conversational Forms V2 task 3 (subtasks 3.1-3.2)
  - _Requirements: 11.1-11.4_

- [ ] 8.1.4 Update form API endpoints for V2
  - **Execute:** Conversational Forms V2 task 4 (subtasks 4.1-4.3)
  - _Requirements: 2.1, 9.1-9.4_

- [ ] 8.1.5 Checkpoint
  - **Execute:** Conversational Forms V2 task 5

### 8.2 Widget Form State Manager (V2 Phase 2)

- [ ] 8.2.1 Create form state manager module
  - **Execute:** Conversational Forms V2 task 6 (subtasks 6.1-6.3)
  - State persistence, confirmation flow
  - _Requirements: 4.1-4.5, 7.1-7.2_

- [ ] 8.2.2 Implement confirmation flow in state manager
  - **Execute:** Conversational Forms V2 task 7 (subtasks 7.1-7.6)
  - Keyboard bypass, extraction fallback
  - _Requirements: 4.1-4.6_

- [ ] 8.2.3 Implement input priority resolution
  - **Execute:** Conversational Forms V2 task 8 (subtasks 8.1-8.2)
  - _Requirements: 5.5_

- [ ] 8.2.4 Checkpoint
  - **Execute:** Conversational Forms V2 task 9

### 8.3 Data Channel Protocol (V2 Phase 3)

- [ ] 8.3.1 Define and implement data channel protocol
  - **Execute:** Conversational Forms V2 task 10 (subtasks 10.1-10.4)
  - Widget ↔ Agent bidirectional sync
  - _Requirements: 3.5, 10.1-10.3_

- [ ] 8.3.2 Implement form activation sync
  - **Execute:** Conversational Forms V2 task 11 (subtasks 11.1-11.2)
  - _Requirements: 2.4, 3.5_

- [ ] 8.3.3 Checkpoint
  - **Execute:** Conversational Forms V2 task 12

### 8.4 Widget Lazy Loading & Form UI Updates (V2 Phase 4)

- [ ] 8.4.1 Implement lazy form loading
  - **Execute:** Conversational Forms V2 task 13 (subtasks 13.1-13.7)
  - Parallel fetch, caching, graceful degradation
  - _Requirements: 1.1-1.4_

- [ ] 8.4.2 Update form UI for confirmation flow
  - **Execute:** Conversational Forms V2 task 14 (subtasks 14.1-14.3)
  - Confirmation UI, summary view
  - _Requirements: 4.1, 4.6, 6.1, 6.4_

- [ ] 8.4.3 Implement local submission queue
  - **Execute:** Conversational Forms V2 task 15 (subtasks 15.1-15.2)
  - _Requirements: 7.3_

- [ ] 8.4.4 Checkpoint
  - **Execute:** Conversational Forms V2 task 16

### 8.5 Voice Agent FormCapabilityV2 (V2 Phase 5)

- [ ] 8.5.1 Create FormCapabilityV2 class
  - **Execute:** Conversational Forms V2 task 17 (subtasks 17.1-17.3)
  - State machine, trigger phrase matching
  - _Requirements: 2.2, 4.1-4.4, 6.1_

- [ ] 8.5.2 Implement confirmation flow in agent
  - **Execute:** Conversational Forms V2 task 18 (subtasks 18.1-18.4)
  - Re-ask on rejection, validation re-ask
  - _Requirements: 4.1-4.4, 7.4_

- [ ] 8.5.3 Implement summary and submission flow
  - **Execute:** Conversational Forms V2 task 19 (subtasks 19.1-19.6)
  - Edit without restart, retry logic
  - _Requirements: 6.1, 6.4, 6.6_

- [ ] 8.5.4 Checkpoint
  - **Execute:** Conversational Forms V2 task 20

### 8.6 Mode Transitions & Recovery (V2 Phase 6)

- [ ] 8.6.1 Implement mode transitions in agent
  - **Execute:** Conversational Forms V2 task 21 (subtasks 21.1-21.4)
  - Pause/resume, abandonment, post-completion
  - _Requirements: 3.4, 8.1-8.5_

- [ ] 8.6.2 Implement connection recovery
  - **Execute:** Conversational Forms V2 task 22 (subtasks 22.1-22.3)
  - State restoration on reconnect
  - _Requirements: 7.1, 7.2, 7.6_

- [ ] 8.6.3 Checkpoint
  - **Execute:** Conversational Forms V2 task 23

### 8.7 Dashboard Updates (V2 Phase 7)

- [ ] 8.7.1 Update form editor for V2 fields
  - **Execute:** Conversational Forms V2 task 24 (subtasks 24.1-24.5)
  - Trigger phrases, description, messages, webhook secret
  - _Requirements: 9.1-9.4_

- [ ] 8.7.2 Add form events to conversation view
  - **Execute:** Conversational Forms V2 task 25 (subtasks 25.1-25.2)
  - _Requirements: 11.5_

- [ ] 8.7.3 Checkpoint
  - **Execute:** Conversational Forms V2 task 26

### 8.8 Multi-Form Support & Agent Integration (V2 Phase 8)

- [ ] 8.8.1 Implement multi-form availability
  - **Execute:** Conversational Forms V2 task 27 (subtasks 27.1-27.3)
  - All forms available to agent, selection logic
  - _Requirements: 2.1, 2.3, 2.5_

- [ ] 8.8.2 Integrate FormCapabilityV2 with orchestrator
  - **Execute:** Conversational Forms V2 task 28 (subtasks 28.1-28.3)
  - Data channel message handling
  - _Requirements: 10.1-10.3_

- [ ] 8.8.3 Final Checkpoint
  - **Execute:** Conversational Forms V2 task 29
  - All 22 correctness properties validated
  - Full integration test: multi-form, confirmation, recovery
