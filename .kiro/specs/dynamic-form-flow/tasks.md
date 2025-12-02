# Implementation Plan: Dynamic Form Flow & Chat UI

## Phase 1: Remove Automatic Form Display

- [x] 1. Fix automatic form display on connection
  - [x] 1.1 Remove onFormAvailable callback trigger in livekit-manager.js
    - Remove the automatic `onFormAvailableCallback(activeForm)` call in connect()
    - Keep forms stored internally for agent access
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Remove handleFormAvailable auto-display in widget.js
    - Remove or modify `handleFormAvailable` to not call `showFormUI`
    - Forms should only display via `handleFormActivate` (agent message)
    - _Requirements: 1.1_
  - [ ]* 1.3 Write property test for no automatic form display
    - **Property 1: No Automatic Form Display**
    - **Validates: Requirements 1.1, 1.2**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2: Chat Panel Foundation

- [x] 3. Create chat panel component
  - [x] 3.1 Create chat-panel.js with basic structure
    - Expandable panel with header, message list, input bar
    - State: isExpanded, messages[], voiceStatus
    - _Requirements: 3.1, 3.5_
  - [x] 3.2 Create chat-styles.js with CSS design tokens
    - Soft UI variables: colors, radii, shadows, transitions
    - Light and dark theme support
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [x] 3.3 Implement expand/collapse animation
    - Smooth transition from button to panel
    - _Requirements: 3.1, 3.5_
  - [ ]* 3.4 Write property test for chat panel expansion
    - **Property 3: Chat Panel Expansion**
    - **Validates: Requirements 3.1, 3.5**

- [ ] 4. Implement message rendering
  - [ ] 4.1 Create user message bubble component
    - Distinct styling for user messages
    - Support for "transcribing" state
    - _Requirements: 3.2, 5.4_
  - [ ] 4.2 Create agent message bubble component
    - Distinct styling for agent messages
    - Support for "speaking" indicator
    - _Requirements: 3.3, 5.4, 7.2_
  - [ ] 4.3 Implement auto-scroll on new messages
    - Scroll to bottom when messages added
    - _Requirements: 3.4_
  - [ ]* 4.4 Write property test for user transcription display
    - **Property 4: User Transcription Display**
    - **Validates: Requirements 3.2**
  - [ ]* 4.5 Write property test for agent message display
    - **Property 5: Agent Message Display**
    - **Validates: Requirements 3.3**
  - [ ]* 4.6 Write property test for auto-scroll
    - **Property 6: Chat Auto-Scroll**
    - **Validates: Requirements 3.4**
  - [ ]* 4.7 Write property test for message differentiation
    - **Property 11: Message Bubble Differentiation**
    - **Validates: Requirements 5.4**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Voice Input Integration

- [ ] 6. Create voice input bar component
  - [ ] 6.1 Integrate waveform renderer into chat panel
    - Reuse existing waveform.js
    - Display in voice input bar area
    - _Requirements: 7.1_
  - [ ] 6.2 Add voice status indicators
    - Listening, processing, speaking states
    - Animated indicators for each state
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 6.3 Add mic button with status feedback
    - Visual feedback for mic state
    - Error indicator for mic issues
    - _Requirements: 7.4_
  - [ ]* 6.4 Write property test for voice status indicators
    - **Property 13: Voice Status Indicators**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [ ] 7. Implement transcription display
  - [ ] 7.1 Add user transcription handling
    - Display user speech as message bubbles
    - Real-time update during transcription
    - _Requirements: 3.2_
  - [ ] 7.2 Add agent response display
    - Display agent text as message bubbles
    - Show speaking indicator during TTS
    - _Requirements: 3.3, 7.2_
  - [ ] 7.3 Update data channel protocol for transcriptions
    - Add agent_message, agent_speaking_start/end messages
    - Handle user_transcription messages
    - _Requirements: 3.2, 3.3_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Inline Form Inputs

- [ ] 9. Create inline form input components
  - [ ] 9.1 Create inline text input component
    - Renders within chat flow
    - Supports string, email, phone, number types
    - _Requirements: 4.1, 4.2_
  - [ ] 9.2 Create inline select component
    - For enum field types
    - Dropdown within chat bubble style
    - _Requirements: 4.1_
  - [ ] 9.3 Create inline textarea component
    - For text field type
    - Expandable within chat
    - _Requirements: 4.1_
  - [ ] 9.4 Add pending confirmation state
    - Show extracted value with confirm/reject
    - Visual distinction for pending state
    - _Requirements: 4.3_
  - [ ]* 9.5 Write property test for inline form rendering
    - **Property 7: Inline Form Input Rendering**
    - **Validates: Requirements 4.1**

- [ ] 10. Implement form input interactions
  - [ ] 10.1 Handle keyboard input submission
    - Send keyboard_input via data channel
    - Update local state
    - _Requirements: 4.2_
  - [ ] 10.2 Handle voice value extraction display
    - Show extracted value in input
    - Display confirmation UI
    - _Requirements: 4.3_
  - [ ] 10.3 Handle confirmation/rejection
    - Update input state on confirm
    - Clear and re-ask on reject
    - _Requirements: 4.4_
  - [ ]* 10.4 Write property test for keyboard input sync
    - **Property 8: Keyboard Input Data Channel Sync**
    - **Validates: Requirements 4.2**
  - [ ]* 10.5 Write property test for voice value display
    - **Property 9: Voice Value Display in Input**
    - **Validates: Requirements 4.3**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Summary and Submission

- [ ] 12. Create summary card component
  - [ ] 12.1 Create summary card for chat flow
    - Display all collected answers
    - Edit button per field
    - Approve/submit button
    - _Requirements: 4.5, 8.1_
  - [ ] 12.2 Add submission states
    - Submitting, success, error states
    - Visual feedback for each
    - _Requirements: 8.2, 8.3_
  - [ ]* 12.3 Write property test for summary card
    - **Property 10: Summary Card in Chat**
    - **Validates: Requirements 4.5, 8.1**

- [ ] 13. Implement submission flow
  - [ ] 13.1 Handle submission approval
    - Send submission_approved via data channel
    - Show submitting state
    - _Requirements: 8.2_
  - [ ] 13.2 Display success message in chat
    - Add success message to chat
    - Show completion state
    - _Requirements: 8.3_
  - [ ] 13.3 Handle submission errors
    - Display error in chat
    - Allow retry
    - _Requirements: 8.3_
  - [ ]* 13.4 Write property test for submission announcement
    - **Property 14: Submission Announcement**
    - **Validates: Requirements 8.2**
  - [ ]* 13.5 Write property test for success message
    - **Property 15: Success Message in Chat**
    - **Validates: Requirements 8.3**

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6: Customization Support

- [ ] 15. Implement widget customization
  - [ ] 15.1 Add data attribute parsing in config.js
    - Parse data-accent-color, data-theme, data-position
    - Validate color values
    - _Requirements: 6.1, 6.2_
  - [ ] 15.2 Apply custom accent color
    - Set CSS custom property from config
    - Apply to accent elements
    - _Requirements: 6.1, 6.3_
  - [ ] 15.3 Implement theme switching
    - Light/dark theme via data attribute
    - Apply theme class to host element
    - _Requirements: 6.2_
  - [ ] 15.4 Set default values
    - Soft blue accent (#3B82F6)
    - Light theme default
    - _Requirements: 6.4_
  - [ ]* 15.5 Write property test for customization
    - **Property 12: Customization Application**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: Integration and Cleanup

- [ ] 17. Integrate chat panel with widget
  - [ ] 17.1 Replace voice-ui with chat panel in widget.js
    - Update showVoiceUI to show chat panel
    - Connect all event handlers
    - _Requirements: 3.1_
  - [ ] 17.2 Update form activation flow
    - Only show form inputs via handleFormActivate
    - Remove legacy form-ui overlay
    - _Requirements: 2.2, 2.3_
  - [ ]* 17.3 Write property test for form activation
    - **Property 2: Form Activation via Data Channel**
    - **Validates: Requirements 2.2, 2.3**

- [ ] 18. Update voice agent for chat messages
  - [ ] 18.1 Add agent_message sending in entrypoint.py
    - Send agent responses as chat messages
    - Include speaking state indicators
    - _Requirements: 3.3_
  - [ ] 18.2 Ensure greeting before form activation
    - Agent greets user on session start
    - Explains form purpose before activation
    - _Requirements: 1.3, 2.1_

- [ ] 19. Final cleanup
  - [ ] 19.1 Remove deprecated form-ui.js overlay code
    - Keep inline form components
    - Remove standalone form overlay
  - [ ] 19.2 Remove deprecated voice-ui.js
    - Functionality moved to chat panel
  - [ ] 19.3 Update bundle and verify size
    - Ensure under 100KB gzipped
    - Remove unused code

- [ ] 20. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Summary

| Phase | Focus | Key Properties |
|-------|-------|----------------|
| 1 | Remove Auto Form Display | 1 |
| 2 | Chat Panel Foundation | 3, 4, 5, 6, 11 |
| 3 | Voice Input Integration | 13 |
| 4 | Inline Form Inputs | 7, 8, 9 |
| 5 | Summary and Submission | 10, 14, 15 |
| 6 | Customization Support | 12 |
| 7 | Integration and Cleanup | 2 |

**Total Tasks:** 20 top-level tasks, ~50 subtasks
**Property Tests:** 15 properties covered

