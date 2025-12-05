# Requirements Document

## Introduction

This specification addresses two critical improvements to the Vakkya widget:

1. **Conversational Flow Fix** - The widget currently shows forms immediately when the voice button is clicked, bypassing the intended agent-driven flow. The agent should greet users, understand intent, and activate forms only when appropriate.

2. **UI/UX Redesign** - Transform the widget from a simple voice button + form overlay into a modern chat-style interface that displays conversation transcriptions, integrates form inputs inline within the chat flow, and provides a cohesive, aesthetic experience.

The goal is a widget that feels like a natural conversation with visual feedback, where forms blend seamlessly into the dialogue rather than appearing as separate overlays.

## Glossary

- **Widget**: The embeddable JavaScript component providing voice and chat UI on customer websites
- **Voice_Agent**: The Python-based backend service handling STT, LLM, and TTS processing
- **Chat_Panel**: The expandable UI panel showing conversation history and form inputs
- **Transcription**: Real-time text display of user speech (STT) and agent responses
- **Inline_Form_Input**: Form fields rendered within the chat flow as message bubbles
- **Data_Channel**: LiveKit data channel for bidirectional widget-agent communication
- **RAG_Mode**: Retrieval-Augmented Generation mode for answering questions from documents
- **Soft_UI**: Design aesthetic with rounded corners, pastel colors, and subtle depth

## Requirements

### Requirement 1: Remove Automatic Form Display

**User Story:** As a website visitor, I want the voice agent to greet me and understand what I need before showing any forms, so that the interaction feels like a natural conversation.

#### Acceptance Criteria

1. WHEN the Widget connects to a LiveKit session THEN the Widget SHALL NOT automatically display any form UI
2. WHEN forms are fetched during connection THEN the Widget SHALL store the schemas internally without rendering them
3. WHEN the voice session starts THEN the Voice_Agent SHALL greet the user and wait for their response
4. WHEN the user expresses intent THEN the Voice_Agent SHALL determine if a form is appropriate before activating one

### Requirement 2: Agent-Controlled Form Activation

**User Story:** As a website visitor, I want the agent to explain what information it needs and why before starting a form, so that I understand the purpose of the questions.

#### Acceptance Criteria

1. WHEN the Voice_Agent determines a form is needed THEN the Voice_Agent SHALL explain the form's purpose to the user
2. WHEN the Voice_Agent activates a form THEN the Voice_Agent SHALL send a form_activate message via Data_Channel
3. WHEN the Widget receives a form_activate message THEN the Widget SHALL begin rendering Inline_Form_Inputs in the Chat_Panel
4. WHEN the user declines to provide information THEN the Voice_Agent SHALL continue the conversation without the form
5. WHEN multiple forms could match user intent THEN the Voice_Agent SHALL ask the user to choose

### Requirement 3: Chat-Style Widget Interface

**User Story:** As a website visitor, I want to see a chat panel that shows what I said and what the agent said, so that I can follow the conversation visually and reduce confusion.

#### Acceptance Criteria

1. WHEN the user clicks the voice button THEN the Widget SHALL expand into a Chat_Panel showing conversation history
2. WHEN the user speaks THEN the Widget SHALL display the Transcription as a user message bubble in real-time
3. WHEN the Voice_Agent responds THEN the Widget SHALL display the agent's text as an agent message bubble
4. WHEN the conversation is ongoing THEN the Widget SHALL auto-scroll to show the latest messages
5. WHEN the user closes the Chat_Panel THEN the Widget SHALL collapse back to the voice button

### Requirement 4: Inline Form Inputs in Chat Flow

**User Story:** As a website visitor, I want form questions to appear as part of the conversation, so that filling out information feels like chatting rather than completing a separate form.

#### Acceptance Criteria

1. WHEN the Voice_Agent asks a form question THEN the Widget SHALL render an Inline_Form_Input below the agent's question message
2. WHEN the user types in an Inline_Form_Input THEN the Widget SHALL send the value to the Voice_Agent via Data_Channel
3. WHEN the user speaks an answer THEN the Widget SHALL display the extracted value in the Inline_Form_Input for confirmation
4. WHEN a value is confirmed THEN the Widget SHALL show a completed state and the Voice_Agent SHALL proceed to the next field
5. WHEN all fields are collected THEN the Widget SHALL display a summary card within the chat flow

### Requirement 5: Modern Aesthetic Design (Soft UI)

**User Story:** As a website owner, I want the widget to have a modern, aesthetic design that blends well with any website, so that it enhances rather than detracts from my site's appearance.

#### Acceptance Criteria

1. WHEN the Widget renders THEN the Widget SHALL use a Soft_UI design with rounded corners (12-16px radius) on all elements
2. WHEN displaying colors THEN the Widget SHALL use a pastel color palette with soft blues, light grays, and muted accents
3. WHEN showing depth THEN the Widget SHALL use subtle shadows and light elevation rather than harsh borders
4. WHEN displaying message bubbles THEN the Widget SHALL differentiate user and agent messages with distinct but harmonious colors
5. WHEN showing interactive elements THEN the Widget SHALL provide smooth hover and focus states with gentle transitions

### Requirement 6: Basic Widget Customization

**User Story:** As a website owner, I want to customize essential widget colors to match my brand, so that the widget feels native to my site.

#### Acceptance Criteria

1. WHEN embedding the Widget THEN the website owner SHALL be able to configure a primary accent color via data attribute
2. WHEN embedding the Widget THEN the website owner SHALL be able to configure light or dark mode via data attribute
3. WHEN custom colors are provided THEN the Widget SHALL apply them to accent elements while maintaining readability
4. WHEN no customization is provided THEN the Widget SHALL use sensible default colors (soft blue accent)

### Requirement 7: Voice Status and Feedback

**User Story:** As a website visitor, I want to see visual feedback when I'm speaking and when the agent is responding, so that I know the system is working.

#### Acceptance Criteria

1. WHEN the user is speaking THEN the Widget SHALL show an animated waveform or pulse indicator
2. WHEN the Voice_Agent is speaking THEN the Widget SHALL show a speaking indicator on the agent's message
3. WHEN the system is processing THEN the Widget SHALL show a subtle loading state
4. WHEN the microphone is muted or there's an error THEN the Widget SHALL display a clear status indicator

### Requirement 8: Submission and Continuation Flow

**User Story:** As a website visitor, I want the agent to confirm my submission and let me continue asking questions, so that I can get additional help without starting over.

#### Acceptance Criteria

1. WHEN all form fields are collected THEN the Voice_Agent SHALL present a verbal summary and the Widget SHALL show a summary card
2. WHEN the user approves submission THEN the Voice_Agent SHALL announce "I'm submitting your information now" before submitting
3. WHEN submission succeeds THEN the Widget SHALL show a success message in the chat and the Voice_Agent SHALL offer to continue helping
4. WHEN the user asks a question after form completion THEN the Voice_Agent SHALL answer using RAG_Mode
5. WHEN the user wants to fill another form THEN the Voice_Agent SHALL allow starting a new form within the same session

