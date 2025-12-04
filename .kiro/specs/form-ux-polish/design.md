# Design Document: Form UX Polish

## Overview

This design enhances the Conversational Forms widget to deliver a Typeform-style one-question-at-a-time experience. The key changes are:

1. **Sticky Input Container** - A fixed container above the voice bar that always shows the current field
2. **Sequential Field Display** - Only one active input at a time, completed fields shown as compact cards
3. **Progress Indicator** - Visual feedback showing "Question X of Y"
4. **Async Submission** - Non-blocking submission with proper loading/success/error states

### Key Design Principles

1. **Focus Over Overwhelm**: Show only what's needed for the current step
2. **Always Visible Input**: The active field never scrolls out of view
3. **Clear Progress**: User always knows where they are in the form
4. **Non-Blocking**: Submission doesn't freeze the UI

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CHAT PANEL                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         HEADER                                    │  │
│  │  Voice Assistant                                        [X]       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    MESSAGES CONTAINER (scrollable)                │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Agent: "Hi! I'd like to collect some info..."              │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ ✓ Email: john@example.com                    (answer card) │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Agent: "Great! Now, what's your interest?"                 │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    STICKY INPUT CONTAINER (fixed)                 │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Question 2 of 3                                            │  │  │
│  │  │ Interest                                                   │  │  │
│  │  │ ┌────────────────────────────────────────────────────────┐ │  │  │
│  │  │ │ Type your answer...                                    │ │  │  │
│  │  │ └────────────────────────────────────────────────────────┘ │  │  │
│  │  │ [Pending: "web development" - Confirm | Reject]            │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         VOICE BAR                                 │  │
│  │  [~~~~~~~~ waveform ~~~~~~~~]                            [🎤]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Sticky Input Container

New component that renders the active field input in a fixed position.

```typescript
interface StickyInputProps {
  field: FormField | null;
  fieldIndex: number;
  totalFields: number;
  value: unknown;
  pendingConfirmation: PendingConfirmation | null;
  validationError: string | null;
  isSpeaking: boolean;
  onKeyboardInput: (fieldName: string, value: unknown) => void;
  onConfirm: (fieldName: string) => void;
  onReject: (fieldName: string) => void;
}

// CSS positioning
.vakkya-sticky-input {
  position: sticky;
  bottom: 60px; /* Above voice bar */
  background: white;
  border-top: 1px solid #e5e7eb;
  padding: 12px;
  z-index: 10;
}
```

### 2. Answer Card Component

Compact display for completed fields in chat history.

```typescript
interface AnswerCardProps {
  fieldLabel: string;
  value: unknown;
  fieldType: string;
}

// Renders as:
// ✓ Email: john@example.com
```

### 3. Enhanced Form State Manager

Updates to track active field and manage one-at-a-time display.

```typescript
interface FormStateManager {
  // Existing...
  
  // New methods
  getActiveField(): FormField | null;
  getCompletedFields(): Array<{field: FormField, answer: FieldAnswer}>;
  getProgress(): { current: number; total: number };
  isFieldActive(fieldName: string): boolean;
}
```

### 4. Data Channel Protocol Updates

New message types for field focus synchronization.

```typescript
// Agent → Widget messages (additions)
type AgentToWidgetMessage =
  | { type: 'field_focus'; fieldName: string; fieldIndex: number }
  | { type: 'field_completed'; fieldName: string; value: unknown }
  | { type: 'all_fields_collected' }
  // ... existing types
```

## Data Models

### Widget State Changes

```typescript
interface ChatPanelState {
  // Existing...
  messages: ChatMessage[];
  voiceStatus: VoiceStatus;
  
  // New
  activeFormField: FormField | null;
  activeFieldIndex: number;
  totalFormFields: number;
  completedAnswers: Map<string, {label: string, value: unknown}>;
  stickyInputVisible: boolean;
}
```

### Message Type Changes

```typescript
// New message type for completed field cards
interface AnswerCardMessage {
  id: string;
  type: 'answer-card';
  fieldName: string;
  fieldLabel: string;
  value: unknown;
  timestamp: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Single Active Input Display
*For any* form with N fields and current field index I, only field I shall have an editable input control visible; fields 0 to I-1 shall display as answer cards, and fields I+1 to N-1 shall not be rendered.
**Validates: Requirements 1.1, 1.2, 1.4**

### Property 2: Completed Field Card Content
*For any* confirmed field answer, the answer card shall contain the field label and formatted value, with no input elements or edit buttons.
**Validates: Requirements 1.3, 3.2, 3.4**

### Property 3: Summary Transition on Completion
*For any* form where all required fields have confirmed values, the system shall transition to summary mode.
**Validates: Requirements 1.5, 4.4**

### Property 4: Sticky Container Visibility
*For any* form state, the sticky input container shall be visible if and only if mode is 'active' and there is an uncollected field.
**Validates: Requirements 2.1, 2.4, 2.5**

### Property 5: Sticky Input Scroll Independence
*For any* scroll position of the messages container, the sticky input container shall remain in its fixed position above the voice bar.
**Validates: Requirements 2.2**

### Property 6: Field Progression on Confirm
*For any* field confirmation, the currentFieldIndex shall increment by 1 (unless already at the last field).
**Validates: Requirements 4.2**

### Property 7: Field Focus Message Sync
*For any* field transition in the agent, a field_focus message shall be sent to the widget with the correct fieldName and fieldIndex.
**Validates: Requirements 4.3**

### Property 8: Out-of-Order Value Acceptance
*For any* value received for a field that is not the current field, the value shall still be stored in answers.
**Validates: Requirements 4.5**

### Property 9: Async Submission Non-Blocking
*For any* submission initiation, the function shall return a Promise immediately without blocking, and the UI shall remain interactive.
**Validates: Requirements 5.1**

### Property 10: Submission State Indicators
*For any* submission in progress, the submit button shall display a loading indicator; on success, a success state; on failure, an error with retry option.
**Validates: Requirements 5.2, 5.3, 5.4**

### Property 11: Offline Queue Behavior
*For any* submission when offline, the submission shall be queued and the user shall be informed; when online, queued submissions shall be retried.
**Validates: Requirements 5.5**

### Property 12: Pending Confirmation UI
*For any* pending voice confirmation, the sticky input shall display the extracted value with confirm and reject buttons.
**Validates: Requirements 6.2**

### Property 13: Validation Error Display
*For any* field with a validation error, the error message shall be displayed below the input in the sticky container.
**Validates: Requirements 6.3**

### Property 14: Progress Indicator Accuracy
*For any* form with N fields and current index I, the progress indicator shall display "Question {I+1} of {N}".
**Validates: Requirements 6.4**

## Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| Field focus out of sync | Widget field index != agent field index | Re-sync via field_focus message |
| Sticky container not visible | CSS/DOM issue | Fallback to inline input |
| Submission timeout | No response in 30s | Show retry option |
| Offline during submission | navigator.onLine false | Queue locally, retry on online event |

## Testing Strategy

### Property-Based Testing Library
- **JavaScript (Widget)**: fast-check

### Unit Tests
- Sticky input container rendering
- Answer card formatting
- Progress indicator calculation
- Field visibility logic
- Submission state transitions

### Property-Based Tests
Each correctness property (1-14) shall have a corresponding property-based test that:
1. Generates random valid inputs (form schemas, field values, states)
2. Executes the operation
3. Verifies the property holds
4. Runs minimum 100 iterations

### Test Annotations
All property-based tests must include:
```javascript
// **Feature: form-ux-polish, Property 1: Single Active Input Display**
// **Validates: Requirements 1.1, 1.2, 1.4**
```

