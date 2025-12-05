# Requirements Document

## Introduction

This specification defines Conversational Forms V2 - an enhanced, dynamic form collection system that transforms rigid form-filling into natural conversational inquiries. The system enables voice agents to intelligently collect information through context-aware dialogue, with support for multiple forms/workflows, confirmation loops, and seamless transitions between form collection and general conversation (RAG mode).

The key differentiator from V1 is that the **agent drives the conversation**, not the form structure. Forms become tools the agent uses when appropriate, rather than rigid scripts to follow.

## Glossary

- **Conversational_Forms_System**: The complete system comprising widget, voice agent, and API that enables dynamic form-based data collection through natural conversation
- **Form_Schema**: A definition of fields to collect, including field types, validation rules, and trigger conditions
- **Workflow**: A sequence of one or more forms with conditional logic and branching
- **Trigger_Phrase**: Natural language patterns that indicate user intent to start a specific form or workflow
- **Confirmation_Loop**: A dialogue pattern where the agent confirms extracted values with the user before proceeding
- **Submission_Summary**: A complete recap of all collected data presented to the user before final submission
- **Graceful_Degradation**: The system's ability to continue functioning when components fail, with appropriate fallbacks
- **Field_Extraction**: The process of parsing user speech/text to extract typed values (email, phone, etc.)
- **RAG_Mode**: Retrieval-Augmented Generation mode for answering questions from uploaded documents

## Requirements

### Requirement 1: Lazy Form Loading

**User Story:** As a website visitor, I want the voice widget to load quickly without fetching unnecessary data, so that I have a fast initial experience.

#### Acceptance Criteria

1. WHEN the widget initializes THEN the Conversational_Forms_System SHALL NOT fetch form schemas until a voice session begins
2. WHEN a user clicks the voice button THEN the Conversational_Forms_System SHALL fetch available forms for the project in parallel with LiveKit connection
3. WHEN form fetching fails THEN the Conversational_Forms_System SHALL continue the session in RAG-only mode and log the error
4. WHEN forms are fetched successfully THEN the Conversational_Forms_System SHALL cache the schemas for the session duration

### Requirement 2: Multi-Form and Workflow Support

**User Story:** As a business owner, I want to configure multiple forms and workflows for different user intents, so that my voice agent can handle various inquiry types.

#### Acceptance Criteria

1. WHEN a project has multiple forms THEN the Conversational_Forms_System SHALL make all forms available to the agent as selectable tools
2. WHEN a user expresses intent matching a form's trigger phrases THEN the Conversational_Forms_System SHALL activate that specific form
3. WHEN no clear intent is detected THEN the Conversational_Forms_System SHALL allow the agent to ask clarifying questions or suggest available options
4. WHEN a form is activated THEN the Conversational_Forms_System SHALL notify the widget to display the corresponding form UI
5. WHEN multiple forms could match user intent THEN the Conversational_Forms_System SHALL have the agent ask the user to choose

### Requirement 3: Agent-Driven Form Activation

**User Story:** As a website visitor, I want the voice agent to naturally guide me through providing information, so that the interaction feels like a conversation rather than filling out a form.

#### Acceptance Criteria

1. WHEN a conversation begins THEN the Conversational_Forms_System SHALL allow the agent to greet the user and understand their intent before activating any form
2. WHEN the agent determines a form is needed THEN the Conversational_Forms_System SHALL have the agent explain what information will be collected and why
3. WHEN the user declines to provide information THEN the Conversational_Forms_System SHALL gracefully continue the conversation without the form
4. WHEN the user asks an unrelated question mid-form THEN the Conversational_Forms_System SHALL answer using RAG and offer to continue the form afterward
5. WHEN the agent activates a form THEN the Conversational_Forms_System SHALL send the form schema to the widget via data channel

### Requirement 4: Dynamic Field Collection with Confirmation

**User Story:** As a website visitor, I want the agent to confirm what it heard before moving on, so that my information is captured accurately.

#### Acceptance Criteria

1. WHEN the agent extracts a value from user speech THEN the Conversational_Forms_System SHALL have the agent confirm the extracted value with the user
2. WHEN the user confirms the value is correct THEN the Conversational_Forms_System SHALL store the value and proceed to the next field
3. WHEN the user indicates the value is incorrect THEN the Conversational_Forms_System SHALL clear the value and re-ask the question
4. WHEN the user provides a correction THEN the Conversational_Forms_System SHALL extract the new value and confirm again
5. WHEN the user types a value via keyboard THEN the Conversational_Forms_System SHALL skip voice confirmation and accept the typed value directly
6. WHEN field extraction fails after 3 attempts THEN the Conversational_Forms_System SHALL offer keyboard input as a fallback

### Requirement 5: Hybrid Voice and Keyboard Input

**User Story:** As a website visitor, I want to choose between speaking or typing my answers, so that I can use whichever method is more convenient for each field.

#### Acceptance Criteria

1. WHEN a form field is active THEN the Conversational_Forms_System SHALL display both voice indicator and text input simultaneously
2. WHEN the user types in the input field THEN the Conversational_Forms_System SHALL accept the keyboard input and advance to the next field
3. WHEN the user speaks an answer THEN the Conversational_Forms_System SHALL extract the value, display it in the input field, and await confirmation
4. WHEN the user submits via keyboard THEN the Conversational_Forms_System SHALL sync the value to the agent's form state
5. WHEN the user speaks while typing THEN the Conversational_Forms_System SHALL prioritize the most recent complete input

### Requirement 6: Explicit Submission with Summary

**User Story:** As a website visitor, I want to review all my information before it's submitted, so that I can catch any errors.

#### Acceptance Criteria

1. WHEN all required fields are collected THEN the Conversational_Forms_System SHALL have the agent present a complete summary of the collected data
2. WHEN presenting the summary THEN the Conversational_Forms_System SHALL read each field name and value clearly
3. WHEN the user approves the summary THEN the Conversational_Forms_System SHALL submit the form data to the API
4. WHEN the user requests changes THEN the Conversational_Forms_System SHALL allow editing specific fields without restarting the entire form
5. WHEN submission succeeds THEN the Conversational_Forms_System SHALL have the agent confirm success and offer to continue helping
6. WHEN submission fails THEN the Conversational_Forms_System SHALL inform the user, retry automatically, and offer manual alternatives if retries fail

### Requirement 7: Graceful Error Handling and Recovery

**User Story:** As a website visitor, I want the voice agent to handle errors smoothly, so that my experience is never broken.

#### Acceptance Criteria

1. WHEN the voice connection drops mid-form THEN the Conversational_Forms_System SHALL preserve collected data and attempt reconnection
2. WHEN reconnection succeeds THEN the Conversational_Forms_System SHALL resume from the last confirmed field
3. WHEN the API is unreachable THEN the Conversational_Forms_System SHALL queue the submission locally and retry when connectivity returns
4. WHEN field validation fails THEN the Conversational_Forms_System SHALL explain the validation error in natural language and re-ask
5. WHEN an unexpected error occurs THEN the Conversational_Forms_System SHALL log the error, apologize to the user, and offer to start fresh or continue in RAG mode
6. IF the widget loses connection to the agent THEN the Conversational_Forms_System SHALL show a reconnecting state and preserve form progress

### Requirement 8: Seamless Mode Transitions

**User Story:** As a website visitor, I want to ask questions and provide information in the same conversation, so that I don't have to start separate sessions.

#### Acceptance Criteria

1. WHEN a form is completed THEN the Conversational_Forms_System SHALL transition to RAG mode and continue the conversation
2. WHEN the user asks a question during form collection THEN the Conversational_Forms_System SHALL pause the form, answer using RAG, and offer to resume
3. WHEN the user wants to abandon a form THEN the Conversational_Forms_System SHALL confirm abandonment and transition to RAG mode
4. WHEN transitioning between modes THEN the Conversational_Forms_System SHALL maintain conversation context and history
5. WHEN the user returns to a paused form THEN the Conversational_Forms_System SHALL resume from the last completed field

### Requirement 9: Form Schema Configuration

**User Story:** As a business owner, I want to configure forms with trigger phrases and descriptions, so that the agent knows when and how to use each form.

#### Acceptance Criteria

1. WHEN creating a form THEN the Conversational_Forms_System SHALL allow configuration of trigger phrases that activate the form
2. WHEN creating a form THEN the Conversational_Forms_System SHALL allow a description explaining the form's purpose to the agent
3. WHEN creating a form THEN the Conversational_Forms_System SHALL allow configuration of a greeting message for when the form starts
4. WHEN creating a form THEN the Conversational_Forms_System SHALL allow configuration of a completion message for after submission
5. WHEN editing a form THEN the Conversational_Forms_System SHALL validate that trigger phrases do not conflict with other forms in the project

### Requirement 10: Real-Time Widget-Agent Synchronization

**User Story:** As a website visitor, I want the visual form and voice agent to stay in sync, so that I always see what the agent is asking about.

#### Acceptance Criteria

1. WHEN the agent asks a question THEN the Conversational_Forms_System SHALL highlight the corresponding field in the widget UI
2. WHEN the agent confirms a value THEN the Conversational_Forms_System SHALL display the confirmed value in the widget UI
3. WHEN the user types a value THEN the Conversational_Forms_System SHALL notify the agent of the input via data channel
4. WHEN the agent moves to a new field THEN the Conversational_Forms_System SHALL animate the transition in the widget UI
5. WHEN displaying the submission summary THEN the Conversational_Forms_System SHALL show a visual summary card in the widget

### Requirement 11: Conversation Logging and Analytics

**User Story:** As a business owner, I want to see complete conversation logs including form interactions, so that I can understand user behavior and improve my forms.

#### Acceptance Criteria

1. WHEN a form is activated THEN the Conversational_Forms_System SHALL log the activation event with form ID and trigger reason
2. WHEN a field value is confirmed THEN the Conversational_Forms_System SHALL log the field name, value, and number of attempts
3. WHEN a form is submitted THEN the Conversational_Forms_System SHALL log the complete submission with all field values
4. WHEN a form is abandoned THEN the Conversational_Forms_System SHALL log the abandonment point and reason if available
5. WHEN viewing conversation history THEN the Conversational_Forms_System SHALL display form interactions inline with regular conversation turns

