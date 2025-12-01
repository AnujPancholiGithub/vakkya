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

- [ ] 7.1.4 Checkpoint
  - **Execute:** Voice Forms task 4
  - Ensure all tests pass

### 7.2 Form Schema Backend (Voice Forms Phase 2)

- [ ] 7.2.1 Add database models for forms
  - **Execute:** Voice Forms task 5 (subtasks 5.1-5.3)
  - _Requirements: 3_

- [ ] 7.2.2 Implement Form Schema API endpoints
  - **Execute:** Voice Forms task 6 (subtasks 6.1-6.3)
  - _Requirements: 3_

- [ ] 7.2.3 Checkpoint
  - **Execute:** Voice Forms task 7
  - Ensure all tests pass

### 7.3 Webhook Delivery (Voice Forms Phase 3)

- [ ] 7.3.1 Implement webhook delivery service
  - **Execute:** Voice Forms task 8 (subtasks 8.1-8.3)
  - _Requirements: 3, Integration Strategy_

- [ ] 7.3.2 Add internal form submission endpoint
  - **Execute:** Voice Forms task 9 (subtask 9.1)
  - _Requirements: 3_

- [ ] 7.3.3 Checkpoint
  - **Execute:** Voice Forms task 10
  - Ensure all tests pass

### 7.4 Form Capability - Voice Agent (Voice Forms Phase 4)

- [ ] 7.4.1 Create FormCapability in voice agent
  - **Execute:** Voice Forms task 11 (subtasks 11.1-11.4)
  - _Requirements: 2.B_

- [ ] 7.4.2 Integrate FormCapability with orchestrator
  - **Execute:** Voice Forms task 12 (subtasks 12.1-12.2)
  - _Requirements: Architecture Principle, 2.B_

- [ ] 7.4.3 Checkpoint
  - **Execute:** Voice Forms task 13
  - Ensure all tests pass

### 7.5 Hybrid Form UI - Widget (Voice Forms Phase 5)

- [ ] 7.5.1 Create Form UI component in widget
  - **Execute:** Voice Forms task 14 (subtasks 14.1-14.4)
  - _Requirements: 2.B_

- [ ] 7.5.2 Integrate Form UI with voice agent
  - **Execute:** Voice Forms task 15 (subtasks 15.1-15.3)
  - _Requirements: 2.B_

- [ ] 7.5.3 Checkpoint
  - **Execute:** Voice Forms task 16
  - Ensure all tests pass

### 7.6 Dashboard Form Builder (Voice Forms Phase 6)

- [ ] 7.6.1 Create form builder UI in dashboard
  - **Execute:** Voice Forms task 17 (subtasks 17.1-17.3)
  - _Requirements: 3_

- [ ] 7.6.2 Create form submissions view
  - **Execute:** Voice Forms task 18 (subtask 18.1)
  - _Requirements: 3_

- [ ] 7.6.3 Final Checkpoint
  - **Execute:** Voice Forms task 19
  - Ensure all tests pass
  - Voice Forms feature complete

