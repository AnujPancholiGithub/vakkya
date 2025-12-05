# Implementation Plan: Form UX Polish

## Phase 1: Widget Sticky Input Container

- [x] 1. Create sticky input container component
  - [x] 1.1 Add sticky input container to chat-panel.js
    - Create container element positioned above voice bar
    - Add CSS for sticky positioning (position: sticky, bottom: 60px)
    - Include progress indicator, field label, input, and pending confirmation UI
    - _Requirements: 2.1, 6.4_
  - [x] 1.2 Implement showStickyInput/hideStickyInput methods
    - Show when form is active and field is uncollected
    - Hide when in summary mode or no form active
    - _Requirements: 2.4, 2.5_
  - [ ]* 1.3 Write property test for sticky container visibility
    - **Property 4: Sticky Container Visibility**
    - **Validates: Requirements 2.1, 2.4, 2.5**
  - [ ]* 1.4 Write property test for scroll independence
    - **Property 5: Sticky Input Scroll Independence**
    - **Validates: Requirements 2.2**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2: One Input at a Time Display

- [x] 3. Refactor form input rendering for single active field
  - [x] 3.1 Update chat-panel.js to render only active field input
    - Remove rendering of all form-input messages as editable inputs
    - Only render active field in sticky container
    - _Requirements: 1.1, 1.4_
  - [x] 3.2 Create answer card component for completed fields
    - Compact display: "✓ {label}: {value}"
    - No input controls or edit buttons
    - Add to chat history when field is confirmed
    - _Requirements: 1.3, 3.1, 3.2, 3.4_
  - [x] 3.3 Update form state manager for active field tracking
    - Add getActiveField(), getCompletedFields(), getProgress() methods
    - Add isFieldActive(fieldName) helper
    - _Requirements: 4.1_
  - [ ]* 3.4 Write property test for single active input
    - **Property 1: Single Active Input Display**
    - **Validates: Requirements 1.1, 1.2, 1.4**
  - [ ]* 3.5 Write property test for answer card content
    - **Property 2: Completed Field Card Content**
    - **Validates: Requirements 1.3, 3.2, 3.4**

- [x] 4. Implement field progression logic
  - [x] 4.1 Update confirmAnswer to add answer card and advance
    - On confirm: add answer card to chat, hide current input, show next
    - Animate transition between fields
    - _Requirements: 1.2, 4.2_
  - [x] 4.2 Implement summary transition check
    - After each confirmation, check if all required fields collected
    - Transition to summary mode when complete
    - _Requirements: 1.5, 4.4_
  - [ ]* 4.3 Write property test for field progression
    - **Property 6: Field Progression on Confirm**
    - **Validates: Requirements 4.2**
  - [ ]* 4.4 Write property test for summary transition
    - **Property 3: Summary Transition on Completion**
    - **Validates: Requirements 1.5, 4.4**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Agent Field Synchronization

- [x] 6. Update voice agent for sequential field collection
  - [x] 6.1 Ensure agent tracks current field index
    - Agent must ask about fields in order
    - Send field_focus message when asking about a field
    - _Requirements: 4.1, 4.3_
  - [x] 6.2 Update form_capability.py to send field_focus messages
    - Send field_focus with fieldName and fieldIndex when transitioning
    - Ensure widget receives focus message before agent speaks
    - _Requirements: 4.3_
  - [x] 6.3 Handle out-of-order value acceptance
    - If user provides value for non-current field, still accept it
    - Store value and continue with current field flow
    - _Requirements: 4.5_
  - [ ]* 6.4 Write property test for field focus sync
    - **Property 7: Field Focus Message Sync**
    - **Validates: Requirements 4.3**
  - [ ]* 6.5 Write property test for out-of-order acceptance
    - **Property 8: Out-of-Order Value Acceptance**
    - **Validates: Requirements 4.5**

- [x] 7. Update widget to handle field_focus messages
  - [x] 7.1 Add field_focus handler in data-channel-protocol.js
    - Update activeFieldIndex and activeFormField on message
    - Trigger sticky input update
    - _Requirements: 4.3_
  - [x] 7.2 Add field_completed handler
    - Add answer card to chat when agent confirms field
    - Advance to next field
    - _Requirements: 1.2, 3.1_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Visual Feedback & Pending Confirmation

- [x] 9. Implement progress indicator
  - [x] 9.1 Add progress indicator to sticky input container
    - Display "Question {current} of {total}"
    - Update on field transitions
    - _Requirements: 6.4_
  - [ ]* 9.2 Write property test for progress accuracy
    - **Property 14: Progress Indicator Accuracy**
    - **Validates: Requirements 6.4**

- [x] 10. Implement pending confirmation in sticky input
  - [x] 10.1 Show extracted value with confirm/reject in sticky container
    - Display "I heard: {value}" with Confirm/Reject buttons
    - Highlight input field with pending value
    - _Requirements: 6.2_
  - [ ]* 10.2 Write property test for pending confirmation UI
    - **Property 12: Pending Confirmation UI**
    - **Validates: Requirements 6.2**

- [x] 11. Implement validation error display
  - [x] 11.1 Add error message display below sticky input
    - Show validation error message when field fails validation
    - Clear error on new input
    - _Requirements: 6.3_
  - [ ]* 11.2 Write property test for validation error display
    - **Property 13: Validation Error Display**
    - **Validates: Requirements 6.3**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Async Submission

- [ ] 13. Implement async submission flow
  - [ ] 13.1 Update submitForm to be fully async
    - Return Promise immediately
    - Update UI state without blocking
    - _Requirements: 5.1_
  - [ ] 13.2 Add submission state indicators
    - Loading spinner on submit button during submission
    - Success state with checkmark on completion
    - Error state with message and retry button on failure
    - _Requirements: 5.2, 5.3, 5.4_
  - [ ] 13.3 Integrate with submission queue for offline support
    - Queue submission when offline
    - Show "Queued for submission" message
    - Retry when online event fires
    - _Requirements: 5.5_
  - [ ]* 13.4 Write property test for async non-blocking
    - **Property 9: Async Submission Non-Blocking**
    - **Validates: Requirements 5.1**
  - [ ]* 13.5 Write property test for submission state indicators
    - **Property 10: Submission State Indicators**
    - **Validates: Requirements 5.2, 5.3, 5.4**
  - [ ]* 13.6 Write property test for offline queue
    - **Property 11: Offline Queue Behavior**
    - **Validates: Requirements 5.5**

- [ ] 14. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Summary

| Phase | Focus | Key Properties |
|-------|-------|----------------|
| 1 | Sticky Input Container | 4, 5 |
| 2 | One Input at a Time | 1, 2, 3, 6 |
| 3 | Agent Field Sync | 7, 8 |
| 4 | Visual Feedback | 12, 13, 14 |
| 5 | Async Submission | 9, 10, 11 |

**Total Tasks:** 14 top-level tasks, ~30 subtasks
**Property Tests:** 14 properties covered

