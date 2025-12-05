# Requirements Document

## Introduction

This document specifies requirements for enhanced session control features in the Vakkya voice widget. These features give project owners control over conversation initiation behavior and provide users with better session management capabilities including mute/unmute and manual session termination.

## Glossary

- **Session**: A voice conversation between a user and the AI agent, established via LiveKit room connection
- **Widget**: The embeddable JavaScript component that renders the voice interface on customer websites
- **Agent**: The AI-powered voice assistant that processes user speech and generates responses
- **Project Owner**: The developer/business owner who configures the widget via the dashboard
- **Conversation Initiation Mode**: Setting that determines whether the agent or user speaks first
- **Session Termination**: The process of ending a voice session and disconnecting from LiveKit
- **Mute State**: When the user's microphone is disabled but the session remains active

## Requirements

### Requirement 1: Conversation Initiation Mode

**User Story:** As a project owner, I want to configure whether the agent speaks first or waits for the user, so that I can customize the conversation experience for my use case.

#### Acceptance Criteria

1. WHEN a project owner accesses project settings THEN the Dashboard SHALL display a toggle or dropdown to select conversation initiation mode with values "agent_first" or "user_first"
2. WHEN initiation mode is set to "agent_first" and a user connects THEN the Agent SHALL automatically speak a greeting within 2 seconds of connection
3. WHEN initiation mode is set to "user_first" and a user connects THEN the Agent SHALL remain silent until the user speaks first
4. WHEN no initiation mode is configured THEN the System SHALL default to "agent_first" behavior
5. WHEN the widget receives project configuration THEN the Widget SHALL pass the initiation mode to the voice agent via room metadata
6. WHEN initiation mode is "user_first" THEN the Widget SHALL display a visual prompt indicating the user should speak first

### Requirement 2: Agent-Initiated Session Termination

**User Story:** As a project owner, I want the agent to automatically end sessions when appropriate, so that resources are freed and conversations have clear endings.

#### Acceptance Criteria

1. WHEN the agent determines a conversation is complete THEN the Agent SHALL have the ability to terminate the session programmatically using an end_session tool
2. WHEN the agent terminates a session THEN the Agent SHALL provide a termination reason from a predefined set: "conversation_complete", "user_inactive", "form_submitted", "user_requested", "error"
3. WHEN the agent terminates a session THEN the Widget SHALL receive a "session_end" message via data channel with the termination reason and optional closing message
4. WHEN the widget receives a session_end message THEN the Widget SHALL display an appropriate closing message based on the reason for 3 seconds before cleanup
5. WHEN a session is terminated THEN the System SHALL log the termination reason for analytics
6. WHEN an invalid termination reason is provided THEN the Agent SHALL use "error" as the fallback reason

### Requirement 3: User Mute/Unmute Control

**User Story:** As a user, I want to mute and unmute my microphone during a conversation, so that I can have privacy when needed without ending the session.

#### Acceptance Criteria

1. WHEN the chat panel is displayed THEN the Widget SHALL show a mute/unmute toggle button in the voice bar area with minimum 44x44px touch target
2. WHEN the user clicks the mute button THEN the Widget SHALL stop sending audio to the agent by disabling the local audio track
3. WHEN the user clicks the unmute button THEN the Widget SHALL resume sending audio to the agent by enabling the local audio track
4. WHEN the microphone is muted THEN the Widget SHALL display a visual muted state indicator with a crossed-out microphone icon and distinct color
5. WHEN the microphone state changes THEN the Widget SHALL send a "mute_status_changed" message to the agent via data channel
6. WHILE the microphone is muted THEN the Widget SHALL continue to receive and play agent audio responses
7. WHEN the agent receives a mute notification THEN the Agent SHALL acknowledge the mute state in its context

### Requirement 4: User-Initiated Session End

**User Story:** As a user, I want to end the voice session manually, so that I have control over when the conversation ends.

#### Acceptance Criteria

1. WHEN the chat panel is displayed THEN the Widget SHALL show a clearly visible close button in the header with minimum 44x44px touch target
2. WHEN the user clicks the close button THEN the Widget SHALL disconnect from LiveKit and release microphone resources
3. WHEN the user ends a session THEN the Widget SHALL send a "user_ended_session" message to the agent before disconnecting
4. WHEN a session is ended by the user THEN the Widget SHALL animate back to the initial collapsed button state with smooth transition
5. WHEN a session is ended during form collection THEN the System SHALL preserve any confirmed form data in local storage for potential recovery

### Requirement 5: Voice Status Visual Feedback

**User Story:** As a user, I want clear visual feedback about the voice session state, so that I know when to speak and when the agent is processing or responding.

#### Acceptance Criteria

1. WHEN the widget is idle THEN the Widget SHALL display a neutral mic button state
2. WHEN the widget is listening THEN the Widget SHALL display a pulsing animation or waveform visualization with "Listening..." status text
3. WHEN the agent is processing THEN the Widget SHALL display a "Thinking..." status with animated dots
4. WHEN the agent is speaking THEN the Widget SHALL display a "Speaking..." status with waveform visualization
5. WHEN the user is muted THEN the Widget SHALL display a distinct muted icon state that overrides other states

### Requirement 6: Configuration Storage and Retrieval

**User Story:** As a system, I need to store and retrieve session control configurations, so that settings persist across sessions and deployments.

#### Acceptance Criteria

1. WHEN a project is created or updated THEN the API SHALL store conversation initiation mode and auto-termination settings in the database
2. WHEN a widget connects THEN the API SHALL include session control configuration in the token validation response
3. WHEN configuration is not explicitly set THEN the System SHALL use sensible defaults: initiation_mode="agent_first", auto_terminate=true
4. WHEN configuration is saved and then retrieved THEN the System SHALL return identical values (round-trip consistency)
