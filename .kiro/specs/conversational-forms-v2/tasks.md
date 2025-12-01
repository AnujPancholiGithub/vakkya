# Implementation Plan: Conversational Forms V2

## Phase 1: Database Schema & API Foundation

- [x] 1. Extend database schema for V2 forms
  - [x] 1.1 Create Prisma migration for FormSchema V2 fields
    - Add description, triggerPhrases, greetingMessage, completionMessage, webhookSecret, isActive
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 1.2 Create Prisma migration for FormEvent table
    - Track form lifecycle events (activated, field_collected, submitted, abandoned)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 1.3 Create Prisma migration for FormSubmission enhancements
    - Add conversationId, webhookAttempts, status fields
    - _Requirements: 6.6, 11.3_
  - [x] 1.4 Update Zod schemas in packages/schemas
    - Add validation for new fields, trigger phrase arrays
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 1.5 Write property test for form schema validation
    - **Property 19: Form Schema Validation**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 2. Implement trigger phrase conflict detection
  - [x] 2.1 Add conflict detection to form.service.ts
    - Check trigger phrases against other forms in project
    - Return validation error on conflict
    - _Requirements: 9.5_
  - [x] 2.2 Write property test for conflict detection
    - **Property 20: Trigger Phrase Conflict Detection**
    - **Validates: Requirements 9.5**

- [x] 3. Implement form event logging service
  - [x] 3.1 Create form-event.service.ts
    - logFormActivation, logFieldCollected, logFormSubmitted, logFormAbandoned
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 3.2 Write property test for event logging
    - **Property 22: Event Logging Completeness**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

- [x] 4. Update form API endpoints for V2
  - [x] 4.1 Update POST/PUT /projects/:id/forms for new fields
    - Accept description, triggerPhrases, greetingMessage, completionMessage
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 4.2 Add GET /projects/:id/forms/all endpoint
    - Return all active forms with trigger phrases for agent
    - _Requirements: 2.1_
  - [x] 4.3 Write unit tests for updated endpoints

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2: Widget Form State Manager

- [ ] 6. Create form state manager module
  - [ ] 6.1 Create form-state-manager.js
    - Implement FormStateManager interface from design
    - State: currentForm, currentFieldIndex, answers, pendingConfirmation, mode
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 6.2 Implement state persistence to localStorage
    - saveToStorage, restoreFromStorage, clearStorage
    - 24-hour expiration for saved state
    - _Requirements: 7.1, 7.2_
  - [ ] 6.3 Write property test for state persistence
    - **Property 14: Connection Recovery State Preservation**
    - **Validates: Requirements 7.1**

- [ ] 7. Implement confirmation flow in state manager
  - [ ] 7.1 Add confirmation state handling
    - setPendingConfirmation, confirmAnswer, rejectAnswer
    - Track attempt count per field
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 7.2 Implement keyboard bypass logic
    - Skip confirmation for keyboard inputs
    - _Requirements: 4.5_
  - [ ] 7.3 Implement extraction fallback trigger
    - After 3 failed attempts, set fallbackToKeyboard flag
    - _Requirements: 4.6_
  - [ ] 7.4 Write property test for confirmation state machine
    - **Property 7: Confirmation State Machine**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  - [ ] 7.5 Write property test for keyboard bypass
    - **Property 8: Keyboard Bypass Confirmation**
    - **Validates: Requirements 4.5**
  - [ ] 7.6 Write property test for extraction fallback
    - **Property 9: Extraction Fallback After Failures**
    - **Validates: Requirements 4.6**

- [ ] 8. Implement input priority resolution
  - [ ] 8.1 Add timestamp tracking to inputs
    - Track when voice and keyboard inputs arrive
    - Use most recent complete input
    - _Requirements: 5.5_
  - [ ] 8.2 Write property test for input priority
    - **Property 10: Input Priority Resolution**
    - **Validates: Requirements 5.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Data Channel Protocol

- [ ] 10. Define and implement data channel protocol
  - [ ] 10.1 Create data-channel-protocol.js in widget
    - Define message types (WidgetToAgentMessage, AgentToWidgetMessage)
    - Serialize/deserialize functions
    - _Requirements: 3.5, 10.1, 10.2, 10.3_
  - [ ] 10.2 Add publishData method to livekit-manager.js
    - Send typed messages to agent via data channel
    - _Requirements: 10.3_
  - [ ] 10.3 Add message handler for agent messages
    - Handle form_activate, field_focus, value_extracted, etc.
    - _Requirements: 10.1, 10.2_
  - [ ] 10.4 Write property test for widget-agent sync
    - **Property 21: Widget-Agent State Sync**
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ] 11. Implement form activation sync
  - [ ] 11.1 Handle form_activate message in widget
    - Receive schema from agent, activate form UI
    - _Requirements: 2.4, 3.5_
  - [ ] 11.2 Write property test for form activation sync
    - **Property 6: Form Activation Widget Sync**
    - **Validates: Requirements 2.4, 3.5**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Widget Lazy Loading & Form UI Updates

- [ ] 13. Implement lazy form loading
  - [ ] 13.1 Remove form fetch from widget init
    - Only fetch forms when voice session starts
    - _Requirements: 1.1_
  - [ ] 13.2 Add parallel form fetch on button click
    - Fetch forms alongside LiveKit connection
    - _Requirements: 1.2_
  - [ ] 13.3 Implement form schema caching
    - Cache schemas for session duration
    - _Requirements: 1.4_
  - [ ] 13.4 Implement graceful degradation on fetch failure
    - Continue in RAG mode if forms fail to load
    - _Requirements: 1.3_
  - [ ] 13.5 Write property test for lazy loading
    - **Property 1: Lazy Loading Guarantee**
    - **Validates: Requirements 1.1**
  - [ ] 13.6 Write property test for caching
    - **Property 2: Form Schema Caching**
    - **Validates: Requirements 1.4**
  - [ ] 13.7 Write property test for graceful degradation
    - **Property 3: Graceful Degradation on Fetch Failure**
    - **Validates: Requirements 1.3**

- [ ] 14. Update form UI for confirmation flow
  - [ ] 14.1 Add confirmation UI state to form-ui.js
    - Show extracted value with confirm/reject buttons
    - Display attempt counter and fallback hint
    - _Requirements: 4.1, 4.6_
  - [ ] 14.2 Add summary view to form UI
    - Display all collected answers before submission
    - Allow editing individual fields
    - _Requirements: 6.1, 6.4_
  - [ ] 14.3 Write unit tests for confirmation UI

- [ ] 15. Implement local submission queue
  - [ ] 15.1 Create submission-queue.js
    - Queue submissions when API unreachable
    - Retry when connectivity returns
    - _Requirements: 7.3_
  - [ ] 15.2 Write property test for local queue
    - **Property 16: Local Queue on API Failure**
    - **Validates: Requirements 7.3**

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Voice Agent FormCapabilityV2

- [ ] 17. Create FormCapabilityV2 class
  - [ ] 17.1 Create form_capability_v2.py
    - Implement FormState enum and FormContext dataclass
    - State machine: INACTIVE → ACTIVE → COLLECTING → CONFIRMING → SUMMARY → SUBMITTING → COMPLETED
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1_
  - [ ] 17.2 Implement can_handle with trigger phrase matching
    - Match user input against form trigger phrases
    - Return confidence score
    - _Requirements: 2.2_
  - [ ] 17.3 Write property test for trigger phrase activation
    - **Property 5: Trigger Phrase Activation**
    - **Validates: Requirements 2.2**

- [ ] 18. Implement confirmation flow in agent
  - [ ] 18.1 Add confirmation prompt generation
    - Generate natural confirmation for extracted values
    - Handle yes/no/correction responses
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 18.2 Implement re-ask on rejection
    - Clear pending value, return to COLLECTING
    - _Requirements: 4.3_
  - [ ] 18.3 Implement validation re-ask
    - On validation failure, explain error and re-ask
    - _Requirements: 7.4_
  - [ ] 18.4 Write property test for validation re-ask
    - **Property 17: Validation Re-ask**
    - **Validates: Requirements 7.4**

- [ ] 19. Implement summary and submission flow
  - [ ] 19.1 Add summary generation
    - Generate human-readable summary of all answers
    - _Requirements: 6.1_
  - [ ] 19.2 Implement edit-specific-field flow
    - Allow editing one field without restarting
    - _Requirements: 6.4_
  - [ ] 19.3 Implement submission with retry
    - Submit to API with 3 retries and exponential backoff
    - _Requirements: 6.6_
  - [ ] 19.4 Write property test for summary generation
    - **Property 11: Summary Generation on Completion**
    - **Validates: Requirements 6.1**
  - [ ] 19.5 Write property test for edit without restart
    - **Property 12: Edit Without Restart**
    - **Validates: Requirements 6.4**
  - [ ] 19.6 Write property test for submission retry
    - **Property 13: Submission Retry Logic**
    - **Validates: Requirements 6.6**

- [ ] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6: Mode Transitions & Recovery

- [ ] 21. Implement mode transitions in agent
  - [ ] 21.1 Add form pause/resume for RAG detours
    - Pause form when user asks unrelated question
    - Resume from last field when returning
    - _Requirements: 3.4, 8.2, 8.5_
  - [ ] 21.2 Add form abandonment handling
    - Confirm abandonment, transition to RAG mode
    - _Requirements: 8.3_
  - [ ] 21.3 Add post-completion transition
    - After submission, transition to RAG mode
    - _Requirements: 8.1_
  - [ ] 21.4 Write property test for mode transitions
    - **Property 18: Mode Transition Context Preservation**
    - **Validates: Requirements 8.4**

- [ ] 22. Implement connection recovery
  - [ ] 22.1 Add reconnection handling in widget
    - Detect disconnect, preserve state, attempt reconnect
    - _Requirements: 7.1, 7.6_
  - [ ] 22.2 Add state restoration on reconnect
    - Restore form state from localStorage
    - Resume from last confirmed field
    - _Requirements: 7.2_
  - [ ] 22.3 Write property test for reconnection resume
    - **Property 15: Reconnection Resume**
    - **Validates: Requirements 7.2**

- [ ] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: Dashboard Updates

- [ ] 24. Update form editor for V2 fields
  - [ ] 24.1 Add trigger phrases input to FormEditorDialog
    - Multi-value input for trigger phrases
    - _Requirements: 9.1_
  - [ ] 24.2 Add description textarea
    - Help text for agent understanding
    - _Requirements: 9.2_
  - [ ] 24.3 Add greeting/completion message inputs
    - Custom messages for form start/end
    - _Requirements: 9.3, 9.4_
  - [ ] 24.4 Add webhook secret input
    - Optional secret for HMAC signing
    - _Requirements: 3 (from V1)_
  - [ ] 24.5 Write unit tests for form editor updates

- [ ] 25. Add form events to conversation view
  - [ ] 25.1 Update conversation detail page
    - Display form events inline with conversation turns
    - Show form activation, field collection, submission
    - _Requirements: 11.5_
  - [ ] 25.2 Write unit tests for conversation view updates

- [ ] 26. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 8: Multi-Form Support & Agent Integration

- [ ] 27. Implement multi-form availability
  - [ ] 27.1 Update agent to receive all forms
    - Fetch all active forms on session start
    - Make available as selectable tools
    - _Requirements: 2.1_
  - [ ] 27.2 Add form selection logic
    - Agent can choose form based on intent
    - Agent can ask user to choose if ambiguous
    - _Requirements: 2.3, 2.5_
  - [ ] 27.3 Write property test for multi-form availability
    - **Property 4: Multi-Form Availability**
    - **Validates: Requirements 2.1**

- [ ] 28. Integrate FormCapabilityV2 with orchestrator
  - [ ] 28.1 Register FormCapabilityV2 in entrypoint.py
    - Add to capabilities list with appropriate priority
    - _Requirements: Architecture_
  - [ ] 28.2 Add data channel message handling
    - Handle keyboard_input, field_confirmed, field_rejected from widget
    - _Requirements: 10.3_
  - [ ] 28.3 Send form messages to widget
    - Send form_activate, field_focus, value_extracted, etc.
    - _Requirements: 10.1, 10.2_

- [ ] 29. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Summary

| Phase | Focus | Key Properties |
|-------|-------|----------------|
| 1 | Database & API | 19, 20, 22 |
| 2 | Widget State Manager | 7, 8, 9, 10, 14 |
| 3 | Data Channel Protocol | 6, 21 |
| 4 | Widget Lazy Loading | 1, 2, 3, 16 |
| 5 | Voice Agent FormCapabilityV2 | 5, 11, 12, 13, 17 |
| 6 | Mode Transitions & Recovery | 15, 18 |
| 7 | Dashboard Updates | - |
| 8 | Multi-Form & Integration | 4 |

**Total Tasks:** 29 top-level tasks, ~70 subtasks
**Property Tests:** 22 properties covered
