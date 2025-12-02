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

- [x] 6. Create form state manager module
  - [x] 6.1 Create form-state-manager.js
    - Implement FormStateManager interface from design
    - State: currentForm, currentFieldIndex, answers, pendingConfirmation, mode
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 6.2 Implement state persistence to localStorage
    - saveToStorage, restoreFromStorage, clearStorage
    - 24-hour expiration for saved state
    - _Requirements: 7.1, 7.2_
  - [x] 6.3 Write property test for state persistence
    - **Property 14: Connection Recovery State Preservation**
    - **Validates: Requirements 7.1**

- [x] 7. Implement confirmation flow in state manager
  - [x] 7.1 Add confirmation state handling
    - setPendingConfirmation, confirmAnswer, rejectAnswer
    - Track attempt count per field
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 7.2 Implement keyboard bypass logic
    - Skip confirmation for keyboard inputs
    - _Requirements: 4.5_
  - [x] 7.3 Implement extraction fallback trigger
    - After 3 failed attempts, set fallbackToKeyboard flag
    - _Requirements: 4.6_
  - [x] 7.4 Write property test for confirmation state machine
    - **Property 7: Confirmation State Machine**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  - [x] 7.5 Write property test for keyboard bypass
    - **Property 8: Keyboard Bypass Confirmation**
    - **Validates: Requirements 4.5**
  - [x] 7.6 Write property test for extraction fallback
    - **Property 9: Extraction Fallback After Failures**
    - **Validates: Requirements 4.6**

- [x] 8. Implement input priority resolution
  - [x] 8.1 Add timestamp tracking to inputs
    - Track when voice and keyboard inputs arrive
    - Use most recent complete input
    - _Requirements: 5.5_
  - [x] 8.2 Write property test for input priority
    - **Property 10: Input Priority Resolution**
    - **Validates: Requirements 5.5**

- [x] 9. Checkpoint - Ensure all tests pass
  - ✅ All 529 tests passing (schemas: 40, api: 215, widget: 221, dashboard: 53)

---

## Phase 3: Data Channel Protocol

- [x] 10. Define and implement data channel protocol
  - [x] 10.1 Create data-channel-protocol.js in widget
    - Define message types (WidgetToAgentMessage, AgentToWidgetMessage)
    - Serialize/deserialize functions
    - _Requirements: 3.5, 10.1, 10.2, 10.3_
  - [x] 10.2 Add publishData method to livekit-manager.js
    - Send typed messages to agent via data channel
    - _Requirements: 10.3_
  - [x] 10.3 Add message handler for agent messages
    - Handle form_activate, field_focus, value_extracted, etc.
    - _Requirements: 10.1, 10.2_
  - [x] 10.4 Write property test for widget-agent sync
    - **Property 21: Widget-Agent State Sync**
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [x] 11. Implement form activation sync
  - [x] 11.1 Handle form_activate message in widget
    - Receive schema from agent, activate form UI
    - _Requirements: 2.4, 3.5_
  - [x] 11.2 Write property test for form activation sync
    - **Property 6: Form Activation Widget Sync**
    - **Validates: Requirements 2.4, 3.5**

- [x] 12. Checkpoint - Ensure all tests pass
  - ✅ All 579 tests passing (schemas: 40, api: 215, widget: 271, dashboard: 53)

---

## Phase 4: Widget Lazy Loading & Form UI Updates

- [x] 13. Implement lazy form loading
  - [x] 13.1 Remove form fetch from widget init
    - Only fetch forms when voice session starts
    - _Requirements: 1.1_
    - ✅ Forms only fetched in connect(), not on manager creation
  - [x] 13.2 Add parallel form fetch on button click
    - Fetch forms alongside LiveKit connection
    - _Requirements: 1.2_
    - ✅ Promise.all fetches forms in parallel with LiveKit SDK loading
  - [x] 13.3 Implement form schema caching
    - Cache schemas for session duration
    - _Requirements: 1.4_
    - ✅ formSchemaCache Map with 30-minute expiration
  - [x] 13.4 Implement graceful degradation on fetch failure
    - Continue in RAG mode if forms fail to load
    - _Requirements: 1.3_
    - ✅ Returns empty array on failure, logs warning, continues session
  - [x] 13.5 Write property test for lazy loading
    - **Property 1: Lazy Loading Guarantee**
    - **Validates: Requirements 1.1**
    - ✅ 3 tests verifying no fetch on init
  - [x] 13.6 Write property test for caching
    - **Property 2: Form Schema Caching**
    - **Validates: Requirements 1.4**
    - ✅ 4 tests verifying cache behavior
  - [x] 13.7 Write property test for graceful degradation
    - **Property 3: Graceful Degradation on Fetch Failure**
    - **Validates: Requirements 1.3**
    - ✅ 6 tests verifying graceful degradation

- [x] 14. Update form UI for confirmation flow
  - [x] 14.1 Add confirmation UI state to form-ui.js
    - Show extracted value with confirm/reject buttons
    - Display attempt counter and fallback hint
    - _Requirements: 4.1, 4.6_
    - ✅ Pending confirmation UI with "I heard:" label, value, utterance, Yes/No buttons
    - ✅ Attempt counter display (Attempt X of 3)
    - ✅ Keyboard fallback hint after 3 failed attempts
  - [x] 14.2 Add summary view to form UI
    - Display all collected answers before submission
    - Allow editing individual fields
    - _Requirements: 6.1, 6.4_
    - ✅ Summary view with all field values and per-field Edit buttons
    - ✅ editFieldFromSummary() clears only selected field, preserves others
    - ✅ Submission error banner with optional retry button
  - [x] 14.3 Write unit tests for confirmation UI
    - ✅ 15 new tests for confirmation flow, summary view, and error handling

- [x] 15. Implement local submission queue
  - [x] 15.1 Create submission-queue.js
    - Queue submissions when API unreachable
    - Retry when connectivity returns
    - _Requirements: 7.3_
    - ✅ createSubmissionQueue() with enqueue, retry, persistence
    - ✅ Exponential backoff (1s, 5s, 30s) with max 3 retries
    - ✅ localStorage persistence for recovery
  - [x] 15.2 Write property test for local queue
    - **Property 16: Local Queue on API Failure**
    - **Validates: Requirements 7.3**
    - ✅ 21 tests for queue operations, API failure handling, persistence

- [x] 16. Checkpoint - Ensure all tests pass
  - ✅ All 634 tests passing (schemas: 40, api: 215, widget: 326, dashboard: 53)

---

## Phase 5: Voice Agent FormCapabilityV2

- [x] 17. Create FormCapabilityV2 class
  - [x] 17.1 Create form_capability_v2.py
    - Implement FormState enum and FormContext dataclass
    - State machine: INACTIVE → ACTIVE → COLLECTING → CONFIRMING → SUMMARY → SUBMITTING → COMPLETED
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1_
    - ✅ FormStateEnum with 7 states, FormContext dataclass with full state tracking
    - ✅ State machine transitions implemented in handle() method
  - [x] 17.2 Implement can_handle with trigger phrase matching
    - Match user input against form trigger phrases
    - Return confidence score
    - _Requirements: 2.2_
    - ✅ _match_trigger_phrase() with case-insensitive matching
    - ✅ Returns 0.95 confidence on match, 1.0 for active form
  - [x] 17.3 Write property test for trigger phrase activation
    - **Property 5: Trigger Phrase Activation**
    - **Validates: Requirements 2.2**
    - ✅ 5 tests for trigger phrase matching (exact, case-insensitive, different forms, no match)

- [x] 18. Implement confirmation flow in agent
  - [x] 18.1 Add confirmation prompt generation
    - Generate natural confirmation for extracted values
    - Handle yes/no/correction responses
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
    - ✅ _generate_confirmation_prompt() creates natural confirmation
    - ✅ _handle_confirming() processes yes/no/correction
  - [x] 18.2 Implement re-ask on rejection
    - Clear pending value, return to COLLECTING
    - _Requirements: 4.3_
    - ✅ Rejection clears pending_value and returns to COLLECTING
  - [x] 18.3 Implement validation re-ask
    - On validation failure, explain error and re-ask
    - _Requirements: 7.4_
    - ✅ Failed extraction increments attempt_count and re-asks
  - [x] 18.4 Write property test for validation re-ask
    - **Property 17: Validation Re-ask**
    - **Validates: Requirements 7.4**
    - ✅ TestProperty17ValidationReask tests invalid email re-ask

- [x] 19. Implement summary and submission flow
  - [x] 19.1 Add summary generation
    - Generate human-readable summary of all answers
    - _Requirements: 6.1_
    - ✅ _generate_summary() creates readable summary
  - [x] 19.2 Implement edit-specific-field flow
    - Allow editing one field without restarting
    - _Requirements: 6.4_
    - ✅ _handle_edit_request() clears only specified field
  - [x] 19.3 Implement submission with retry
    - Submit to API with 3 retries and exponential backoff
    - _Requirements: 6.6_
    - ✅ _handle_submitting() submits to API, returns to SUMMARY on failure
  - [x] 19.4 Write property test for summary generation
    - **Property 11: Summary Generation on Completion**
    - **Validates: Requirements 6.1**
    - ✅ TestProperty11SummaryGeneration tests summary after last field
  - [x] 19.5 Write property test for edit without restart
    - **Property 12: Edit Without Restart**
    - **Validates: Requirements 6.4**
    - ✅ TestProperty12EditWithoutRestart tests field preservation
  - [x] 19.6 Write property test for submission retry
    - **Property 13: Submission Retry Logic**
    - **Validates: Requirements 6.6**
    - ✅ TestFormSubmission tests success and failure paths

- [x] 20. Checkpoint - Ensure all tests pass
  - ✅ All 925 tests passing (schemas: 40, api: 215, voice-agent: 291, widget: 326, dashboard: 53)

---

## Phase 6: Mode Transitions & Recovery

- [x] 21. Implement mode transitions in agent
  - [x] 21.1 Add form pause/resume for RAG detours
    - Pause form when user asks unrelated question
    - Resume from last field when returning
    - _Requirements: 3.4, 8.2, 8.5_
    - ✅ Added PAUSED state to FormStateEnum
    - ✅ pause() and resume() methods in FormContext
    - ✅ _is_rag_question() detects unrelated questions
    - ✅ _pause_for_rag() pauses form and returns low confidence for RAG
    - ✅ _handle_paused() handles resume commands
  - [x] 21.2 Add form abandonment handling
    - Confirm abandonment, transition to RAG mode
    - _Requirements: 8.3_
    - ✅ _request_abandonment_confirmation() asks for confirmation
    - ✅ _handle_abandonment_response() processes yes/no
    - ✅ Preserves collected answers count in confirmation message
  - [x] 21.3 Add post-completion transition
    - After submission, transition to RAG mode
    - _Requirements: 8.1_
    - ✅ Already implemented in _handle_completed()
  - [x] 21.4 Write property test for mode transitions
    - **Property 18: Mode Transition Context Preservation**
    - **Validates: Requirements 8.4**
    - ✅ 11 tests: pause/resume state preservation, RAG question detection, resume commands, abandonment confirmation

- [x] 22. Implement connection recovery
  - [x] 22.1 Add reconnection handling in widget
    - Detect disconnect, preserve state, attempt reconnect
    - _Requirements: 7.1, 7.6_
    - ✅ Automatic reconnection with 3 retries (1s, 3s, 5s delays)
    - ✅ Token data caching for reconnection
    - ✅ Reconnecting UI state via 'connecting' status
    - ✅ Cancel reconnection on explicit disconnect
  - [x] 22.2 Add state restoration on reconnect
    - Restore form state from localStorage
    - Resume from last confirmed field
    - _Requirements: 7.2_
    - ✅ Form state manager integrated with widget
    - ✅ restoreFromStorage() called on reconnection
    - ✅ Form UI recreated with restored state
    - ✅ handleReconnection() method in widget
  - [x] 22.3 Write property test for reconnection resume
    - **Property 15: Reconnection Resume**
    - **Validates: Requirements 7.2**
    - ✅ 3 tests for reconnection capability and state preservation

- [x] 23. Checkpoint - Ensure all tests pass
  - ✅ All 939 tests passing (schemas: 40, api: 215, voice-agent: 302, widget: 329, dashboard: 53)
  - ✅ Phase 6 (Mode Transitions & Recovery) complete

---

## Phase 7: Dashboard Updates

- [x] 24. Update form editor for V2 fields
  - [x] 24.1 Add trigger phrases input to FormEditorDialog
    - Multi-value input for trigger phrases
    - _Requirements: 9.1_
    - ✅ Trigger phrases input with add button and Enter key support
    - ✅ Removable phrase tags with X button
  - [x] 24.2 Add description textarea
    - Help text for agent understanding
    - _Requirements: 9.2_
    - ✅ Description textarea with 500 char limit
  - [x] 24.3 Add greeting/completion message inputs
    - Custom messages for form start/end
    - _Requirements: 9.3, 9.4_
    - ✅ Greeting and completion message textareas with 500 char limits
  - [x] 24.4 Add webhook secret input
    - Optional secret for HMAC signing
    - _Requirements: 3 (from V1)_
    - ✅ Password input for webhook secret
  - [x] 24.5 Write unit tests for form editor updates
    - ✅ 14 unit tests covering all V2 fields

- [x] 25. Add form events to conversation view
  - [x] 25.1 Update conversation detail page
    - Display form events inline with conversation turns
    - Show form activation, field collection, submission
    - _Requirements: 11.5_
    - ✅ GET /conversations/:id/form-events API endpoint
    - ✅ useFormEvents query hook
    - ✅ Timeline merges turns and form events chronologically
    - ✅ FormEventBadge component with icons for each event type
  - [x] 25.2 Write unit tests for conversation view updates
    - ✅ 3 tests for form-events endpoint (success, auth required, 404)

- [x] 26. Checkpoint - Ensure all tests pass
  - ✅ All 956 tests passing (schemas: 40, api: 218, voice-agent: 302, widget: 329, dashboard: 67)
  - ✅ Phase 7 (Dashboard Updates) complete

---

## Phase 8: Multi-Form Support & Agent Integration

- [x] 27. Implement multi-form availability
  - [x] 27.1 Update agent to receive all forms
    - Fetch all active forms on session start
    - Make available as selectable tools
    - _Requirements: 2.1_
    - ✅ _get_available_forms() fetches all active forms for project
    - ✅ All forms available via AVAILABLE_FORMS_KEY in context metadata
  - [x] 27.2 Add form selection logic
    - Agent can choose form based on intent
    - Agent can ask user to choose if ambiguous
    - _Requirements: 2.3, 2.5_
    - ✅ _find_all_matching_forms() detects multiple trigger phrase matches
    - ✅ _handle_form_selection() handles user form choice
    - ✅ _generate_form_selection_prompt() asks user to choose between forms
    - ✅ _generate_available_forms_prompt() suggests options when no clear intent
  - [x] 27.3 Write property test for multi-form availability
    - **Property 4: Multi-Form Availability**
    - **Validates: Requirements 2.1**
    - ✅ 17 tests: all forms available, each activatable, multiple match handling, selection flow

- [x] 28. Integrate FormCapabilityV2 with orchestrator
  - [x] 28.1 Register FormCapabilityV2 in entrypoint.py
    - Add to capabilities list with appropriate priority
    - _Requirements: Architecture_
    - ✅ FormCapabilityV2 imported and exported from capabilities module
    - ✅ send_widget_message() helper function added for agent→widget messages
  - [x] 28.2 Add data channel message handling
    - Handle keyboard_input, field_confirmed, field_rejected from widget
    - _Requirements: 10.3_
    - ✅ Enhanced on_data_received handler for all widget message types
    - ✅ Handles: page_context, keyboard_input, field_confirmed, field_rejected, form_abandoned, submission_approved, edit_requested
    - ✅ Backward compatible with legacy page context format
  - [x] 28.3 Send form messages to widget
    - Send form_activate, field_focus, value_extracted, etc.
    - _Requirements: 10.1, 10.2_
    - ✅ send_widget_message() sends JSON messages via data channel
    - ✅ 12 new tests added for data channel message handling

- [x] 29. Final Checkpoint - Ensure all tests pass
  - ✅ All 984 tests passing (schemas: 40, api: 218, voice-agent: 330, widget: 329, dashboard: 67)
  - ✅ All 22 correctness properties validated
  - ✅ Conversational Forms V2 feature complete

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
