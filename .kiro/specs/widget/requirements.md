# Requirements Document - Widget (Simplified MVP)

## Introduction

The Widget is an embeddable voice interface implemented as a single JavaScript file. It uses Shadow DOM for style isolation, lazy-loads LiveKit SDK, and provides a minimal voice UI with waveform visualization. This MVP version focuses on core functionality without advanced features like CNR content extraction or detailed behavior tracking.

## Glossary

- **Widget**: The embeddable JavaScript component providing voice interaction UI
- **Widget Token**: Authentication token identifying the project
- **LiveKit**: Real-time communication platform for voice transport
- **Shadow DOM**: Web standard for style isolation
- **Data Channel**: LiveKit feature for sending page URL
- **Waveform**: Visual representation of audio
- **VAD**: Voice Activity Detection

## Requirements

### Requirement 1

**User Story:** As a website owner, I want to embed the voice widget with a single script tag, so that I can add voice interaction easily.

#### Acceptance Criteria

1. WHEN a website includes the widget script tag with data-token attribute THEN the Widget SHALL initialize automatically on page load

### Requirement 2

**User Story:** As a website visitor, I want to start a voice conversation by clicking a button, so that I can ask questions.

#### Acceptance Criteria

1. WHEN the page loads THEN the Widget SHALL display a floating button in the bottom-right corner
2. WHEN a user clicks the button THEN the Widget SHALL expand to show the voice interface
3. WHEN the voice interface opens THEN the Widget SHALL request microphone permission
4. IF microphone permission is denied THEN the Widget SHALL display an error message
5. WHEN microphone permission is granted THEN the Widget SHALL connect to LiveKit

### Requirement 3

**User Story:** As a website visitor, I want to see visual feedback during voice interaction, so that I know the system is working.

#### Acceptance Criteria

1. WHEN the user is speaking or agent is responding THEN the Widget SHALL display an animated waveform
2. WHEN audio is processed THEN the Widget SHALL use Canvas API for waveform visualization

### Requirement 4

**User Story:** As a website visitor, I want the voice agent to know what page I'm on, so that it can provide relevant answers.

#### Acceptance Criteria

1. WHEN a voice session starts THEN the Widget SHALL send the current page URL via LiveKit data channel

### Requirement 5

**User Story:** As a website visitor, I want to control the voice session, so that I can end the conversation.

#### Acceptance Criteria

1. WHEN the user clicks the close button THEN the Widget SHALL disconnect from LiveKit and collapse to button state
4. WHEN the user closes the browser tab THEN the Widget SHALL disconnect from LiveKit gracefully

### Requirement 6

**User Story:** As a website owner, I want the widget to handle errors gracefully, so that my website remains functional.

#### Acceptance Criteria

1. IF the widget token is invalid THEN the Widget SHALL display an error message
2. IF LiveKit connection fails THEN the Widget SHALL display an error message
3. IF the microphone fails THEN the Widget SHALL display an error message
5. THE Widget SHALL never crash the host page due to widget errors

### Requirement 7

**User Story:** As a website owner, I want the widget to be lightweight, so that it doesn't slow down my page.

#### Acceptance Criteria

1. THE Widget SHALL have a total bundle size of less than 100KB gzipped
2. THE Widget SHALL load LiveKit SDK only when the user clicks the button (lazy loading)
3. THE Widget SHALL not block page rendering during initialization
5. THE Widget SHALL be cached with 1 hour TTL
