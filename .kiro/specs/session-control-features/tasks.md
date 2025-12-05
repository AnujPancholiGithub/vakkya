# Implementation Plan

- [x] 1. Database and API Configuration
  - [x] 1.1 Add session control fields to Project schema
    - Add `initiationMode` (String, default "agent_first") and `autoTerminate` (Boolean, default true) to Project model in Prisma
    - Run migration to update database
    - _Requirements: 6.1_
  - [x] 1.2 Update token validation endpoint to include session config
    - Modify `/validate-token` response to include `sessionConfig` object with `initiationMode` and `autoTerminate`
    - _Requirements: 6.2, 6.3_
  - [x] 1.3 Write property test for configuration defaults and round trip
    - **Property 1: Initiation Mode Default**
    - **Property 6: Configuration Persistence Round Trip**
    - **Validates: Requirements 1.4, 6.3, 6.4**

- [-] 2. Widget Data Channel Protocol Updates
  - [x] 2.1 Add new message types to data channel protocol
    - Add `mute_status_changed` and `user_ended_session` to Widget→Agent types
    - Add `session_end` to Agent→Widget types with reason and optional message fields
    - Add message factory functions: `createMuteStatusMessage()`, `createUserEndedSessionMessage()`
    - _Requirements: 2.3, 3.5, 4.3_
  - [ ]* 2.2 Write property test for valid termination reasons
    - **Property 2: Valid Termination Reasons**
    - **Validates: Requirements 2.2, 2.6**

- [x] 3. Widget Mute/Unmute Feature
  - [x] 3.1 Add mute state management to LiveKit manager
    - Add `isMuted` state variable and `getMuted()` getter
    - Implement `setMuted(muted)` function that mutes/unmutes `localAudioTrack`
    - Send `mute_status_changed` message via data channel on state change
    - _Requirements: 3.2, 3.3, 3.5_
  - [x] 3.2 Add mute toggle button to chat panel UI
    - Add mute/unmute button in voice bar next to waveform (44x44px minimum)
    - Show visual state with appropriate icon (mic vs mic-off with distinct color)
    - Wire up click handler to toggle mute state
    - Muted state should override other voice status indicators
    - _Requirements: 3.1, 3.4, 3.6, 5.5_
  - [ ]* 3.3 Write property test for mute toggle state and notification
    - **Property 3: Mute Toggle State Consistency**
    - **Property 4: Mute Notification Delivery**
    - **Validates: Requirements 3.2, 3.3, 3.5**

- [x] 4. Widget Session End Enhancement
  - [x] 4.1 Implement user-initiated session end with notification
    - Modify close button handler to send `user_ended_session` before disconnect
    - Ensure message is published before cleanup begins
    - Return widget to initial collapsed state after cleanup
    - _Requirements: 4.2, 4.3, 4.4_
  - [x] 4.2 Handle agent-initiated session end
    - Add handler for `session_end` message in agent message callback
    - Display closing message overlay for 3 seconds based on reason
    - Trigger cleanup after message display
    - _Requirements: 2.3, 2.4_
  - [ ]* 4.3 Write property test for session end message ordering
    - **Property 5: Session End Message Ordering**
    - **Validates: Requirements 4.3**

- [x] 5. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Voice Agent Configuration Support
  - [x] 6.1 Extend AgentConfig model with session control fields
    - Add `initiation_mode: str = "agent_first"` and `auto_terminate: bool = True` to AgentConfig dataclass
    - Update `_extract_project_metadata()` to parse these fields from room metadata
    - _Requirements: 1.5_
  - [x] 6.2 Implement conversation initiation mode handling
    - Check `initiation_mode` after session starts
    - For "agent_first": use existing greeting behavior (already default)
    - For "user_first": modify agent instructions to wait for user speech
    - _Requirements: 1.2, 1.3_

- [x] 7. Voice Agent Session Termination
  - [x] 7.1 Add end_session tool to core capability
    - Create `end_session(reason: str)` function tool in CoreCapability
    - Validate reason against allowed values, fallback to "error" if invalid
    - Send `session_end` message to widget via data channel with reason
    - Log termination event for analytics
    - _Requirements: 2.1, 2.2, 2.5, 2.6_
  - [x] 7.2 Handle mute status messages from widget
    - Add handler for `mute_status_changed` in data channel receiver
    - Store mute state in session context for agent awareness
    - _Requirements: 3.5, 3.7_
  - [x] 7.3 Handle user_ended_session message
    - Add handler for `user_ended_session` in data channel receiver
    - Log session end with "user_requested" reason
    - _Requirements: 4.3_

- [x] 8. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Integration Testing
  - [ ] 9.1 Wire up configuration flow end-to-end
    - Verify config flows from API → Widget → Agent via room metadata
    - Test both initiation modes work correctly
    - Test mute/unmute flow end-to-end
    - Test session termination from both widget and agent sides
    - _Requirements: 1.5, 6.2_

- [ ] 10. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
