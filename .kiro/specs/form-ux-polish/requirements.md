# Requirements Document

## Introduction

This specification defines UX improvements for the Conversational Forms feature to deliver a Typeform-style one-question-at-a-time experience. The current implementation shows all form inputs simultaneously and loses them during chat scrolling. This update ensures a focused, sequential form collection experience with sticky input visibility and reliable async submission.

The key improvements are:
1. **One input at a time** - Only show the current field being collected
2. **Sticky form input** - Keep the active input visible regardless of chat scroll
3. **Complete field collection** - Ensure agent collects ALL fields before submission
4. **Async submission** - Non-blocking form submission with proper feedback

## Glossary

- **Form_UX_System**: The widget and voice agent components responsible for form collection user experience
- **Active_Field**: The single form field currently being collected from the user
- **Sticky_Input**: A form input that remains fixed at the bottom of the chat panel, always visible
- **Field_Progression**: The sequential advancement through form fields one at a time
- **Async_Submission**: Non-blocking form data submission that doesn't freeze the UI

## Requirements

### Requirement 1: One Input at a Time Display

**User Story:** As a website visitor, I want to see only one form question at a time, so that I can focus on providing accurate information without feeling overwhelmed.

#### Acceptance Criteria

1. WHEN a form is activated THEN the Form_UX_System SHALL display only the first field's input
2. WHEN a field value is confirmed THEN the Form_UX_System SHALL hide the completed field input and show the next field
3. WHEN displaying a completed field THEN the Form_UX_System SHALL show only the field label and confirmed value as a compact summary
4. WHEN the user is on field N THEN the Form_UX_System SHALL NOT display input controls for fields N+1 or beyond
5. WHEN all fields are completed THEN the Form_UX_System SHALL transition to the summary view

### Requirement 2: Sticky Form Input Position

**User Story:** As a website visitor, I want the current form input to always be visible, so that I can easily provide my answer without scrolling.

#### Acceptance Criteria

1. WHEN a form field is active THEN the Form_UX_System SHALL position the input in a sticky container above the voice bar
2. WHEN chat messages scroll THEN the Form_UX_System SHALL keep the active input fixed and visible
3. WHEN the active field changes THEN the Form_UX_System SHALL animate the transition to the new field input
4. WHEN the form is in summary mode THEN the Form_UX_System SHALL remove the sticky input container
5. WHEN no form is active THEN the Form_UX_System SHALL hide the sticky input container

### Requirement 3: Completed Fields Display

**User Story:** As a website visitor, I want to see my previously answered questions in the chat, so that I can review what I've provided.

#### Acceptance Criteria

1. WHEN a field is confirmed THEN the Form_UX_System SHALL add a compact answer card to the chat history
2. WHEN displaying a completed field THEN the Form_UX_System SHALL show the field label and value without editable input
3. WHEN the user scrolls up THEN the Form_UX_System SHALL allow viewing all completed field cards
4. WHEN an answer card is displayed THEN the Form_UX_System SHALL NOT include edit controls (editing happens from summary only)

### Requirement 4: Agent Field Progression

**User Story:** As a website visitor, I want the voice agent to ask me about each field in order, so that all required information is collected.

#### Acceptance Criteria

1. WHEN the agent starts form collection THEN the Form_UX_System SHALL track which field is currently being collected
2. WHEN a field value is confirmed THEN the Form_UX_System SHALL advance the agent to the next uncollected field
3. WHEN the agent asks about a field THEN the Form_UX_System SHALL send a field_focus message to the widget
4. WHEN all required fields have confirmed values THEN the Form_UX_System SHALL transition to summary presentation
5. IF the agent receives a value for a non-current field THEN the Form_UX_System SHALL still accept and store it

### Requirement 5: Async Form Submission

**User Story:** As a website visitor, I want form submission to happen smoothly without freezing the interface, so that I have a responsive experience.

#### Acceptance Criteria

1. WHEN the user approves submission THEN the Form_UX_System SHALL initiate async submission without blocking the UI
2. WHEN submission is in progress THEN the Form_UX_System SHALL display a loading indicator on the submit button
3. WHEN submission succeeds THEN the Form_UX_System SHALL show a success state and allow conversation to continue
4. WHEN submission fails THEN the Form_UX_System SHALL show an error message with retry option
5. WHEN submission is queued offline THEN the Form_UX_System SHALL inform the user and retry when online

### Requirement 6: Visual Feedback for Field State

**User Story:** As a website visitor, I want clear visual feedback about which field I'm answering, so that I understand the form progress.

#### Acceptance Criteria

1. WHEN a field is active THEN the Form_UX_System SHALL highlight the sticky input with a distinct visual style
2. WHEN voice extraction is pending confirmation THEN the Form_UX_System SHALL show the extracted value with confirm/reject options
3. WHEN a field has validation errors THEN the Form_UX_System SHALL display the error message below the input
4. WHEN showing field progress THEN the Form_UX_System SHALL display a progress indicator (e.g., "Question 2 of 4")
5. WHEN the agent is speaking about a field THEN the Form_UX_System SHALL show a subtle speaking indicator

