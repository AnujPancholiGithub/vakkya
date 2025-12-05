# Requirements Document

## Introduction

This specification addresses a critical synchronization issue in the Conversational Forms system where the voice agent loses awareness of keyboard-submitted form inputs. Currently, when users type and submit form fields via the widget UI, the agent only becomes aware of these inputs when it explicitly calls the `check_keyboard_input` tool. This creates a disconnect where the agent continues asking for fields that have already been submitted, leading to a frustrating user experience.

The solution ensures real-time synchronization between widget keyboard inputs and the agent's form state, so the agent is immediately aware of all submitted values and can acknowledge them appropriately. Additionally, this spec ensures that completed form submissions are persisted to the database via the API server.

## Glossary

- **Conversational_Forms_System**: The complete system comprising widget, voice agent, and API that enables dynamic form-based data collection through natural conversation
- **Keyboard_Input**: A form field value entered by the user via typing in the widget UI rather than speaking
- **Form_State**: The current state of form collection including which fields have been collected and their values
- **Data_Channel**: The LiveKit data channel used for bidirectional communication between widget and voice agent
- **Agent_Awareness**: The voice agent's knowledge of the current form state, including all submitted field values
- **Field_Completion_Event**: An event triggered when a user submits a field value (via keyboard or voice confirmation)
- **Form_Submission**: The complete set of collected field values submitted to the API for persistence
- **Confirmed_Fields**: A dictionary tracking all fields that have been confirmed (via voice or keyboard) with their values

## Requirements

### Requirement 1: Immediate Agent Notification on Keyboard Submit

**User Story:** As a website visitor, I want the voice agent to immediately acknowledge when I type and submit a form field, so that I don't have to repeat information I've already provided.

#### Acceptance Criteria

1. WHEN a user submits a keyboard input for a form field THEN the Conversational_Forms_System SHALL immediately update the agent's form state with the submitted value
2. WHEN the agent's form state is updated with a keyboard input THEN the Conversational_Forms_System SHALL mark that field as confirmed in the agent's context
3. WHEN a field is marked as confirmed via keyboard THEN the Conversational_Forms_System SHALL prevent the agent from asking for that field again
4. WHEN multiple fields are submitted via keyboard in quick succession THEN the Conversational_Forms_System SHALL process each submission in order and update the agent's state accordingly

### Requirement 2: Agent Acknowledgment of Keyboard Inputs

**User Story:** As a website visitor, I want the voice agent to verbally acknowledge the information I've typed, so that I know my input was received.

#### Acceptance Criteria

1. WHEN a keyboard input is received for a field THEN the Conversational_Forms_System SHALL trigger the agent to acknowledge the received value
2. WHEN acknowledging a keyboard input THEN the Conversational_Forms_System SHALL have the agent mention the field name and value in natural language
3. WHEN the agent acknowledges a keyboard input THEN the Conversational_Forms_System SHALL have the agent proceed to the next uncollected field or summary

### Requirement 3: Form Completion Awareness

**User Story:** As a website visitor, I want the voice agent to know when I've completed all form fields via keyboard, so that it can proceed to the summary without asking redundant questions.

#### Acceptance Criteria

1. WHEN all required fields have been submitted via keyboard THEN the Conversational_Forms_System SHALL notify the agent that the form is complete
2. WHEN the form is complete THEN the Conversational_Forms_System SHALL have the agent present a summary of all collected values
3. WHEN the user says "I submitted" or similar phrases THEN the Conversational_Forms_System SHALL check the current form state and acknowledge all submitted fields

### Requirement 4: Bidirectional State Synchronization

**User Story:** As a website visitor, I want the visual form and voice agent to always show the same state, so that I'm never confused about what information has been collected.

#### Acceptance Criteria

1. WHEN a field is confirmed via voice THEN the Conversational_Forms_System SHALL update the widget UI to show the field as completed
2. WHEN a field is submitted via keyboard THEN the Conversational_Forms_System SHALL update the agent's internal form state to match
3. WHEN the agent queries the form state THEN the Conversational_Forms_System SHALL return the current state including all keyboard-submitted values
4. WHEN there is a state mismatch between widget and agent THEN the Conversational_Forms_System SHALL reconcile to the most recent confirmed values

### Requirement 5: Graceful Handling of Concurrent Inputs

**User Story:** As a website visitor, I want to be able to type answers while the agent is speaking, so that I can fill out the form at my own pace.

#### Acceptance Criteria

1. WHEN a user submits a keyboard input while the agent is speaking THEN the Conversational_Forms_System SHALL queue the input for processing
2. WHEN the agent finishes speaking THEN the Conversational_Forms_System SHALL process any queued keyboard inputs
3. WHEN processing queued inputs THEN the Conversational_Forms_System SHALL acknowledge each submitted field before continuing
4. WHEN the user submits a field the agent is currently asking about THEN the Conversational_Forms_System SHALL accept the keyboard input and skip the voice confirmation flow

### Requirement 6: Form Submission Persistence

**User Story:** As a business owner, I want completed form submissions to be saved to the database, so that I can access and process the collected data.

#### Acceptance Criteria

1. WHEN a form is successfully submitted THEN the Conversational_Forms_System SHALL persist the submission data to the database via the API server
2. WHEN persisting a submission THEN the Conversational_Forms_System SHALL include all confirmed field values, session ID, and timestamp
3. WHEN the API server receives a submission THEN the Conversational_Forms_System SHALL store it in the FormSubmission table with status "completed"
4. WHEN a submission is persisted THEN the Conversational_Forms_System SHALL trigger any configured webhooks for the form
5. IF the submission persistence fails THEN the Conversational_Forms_System SHALL retry up to 3 times before reporting failure to the user

### Requirement 7: Confirmed Fields State Management

**User Story:** As a developer, I want a centralized way to track confirmed field values, so that both voice and keyboard inputs are handled consistently.

#### Acceptance Criteria

1. WHEN a field is confirmed via voice THEN the Conversational_Forms_System SHALL store the field name and value in a confirmed_fields dictionary
2. WHEN a field is submitted via keyboard THEN the Conversational_Forms_System SHALL store the field name and value in the same confirmed_fields dictionary
3. WHEN the agent needs to know the form state THEN the Conversational_Forms_System SHALL provide the confirmed_fields dictionary with all collected values
4. WHEN checking if a field is already collected THEN the Conversational_Forms_System SHALL check the confirmed_fields dictionary rather than relying on LLM memory
