# Design Document: Conversational Forms V2

## Overview

Conversational Forms V2 transforms the existing rigid form-filling system into a dynamic, agent-driven conversational inquiry system. The key architectural shift is that **the agent controls the conversation flow**, using forms as tools rather than scripts.

### Key Design Principles

1. **Agent-First**: The LLM agent decides when to activate forms based on user intent
2. **Graceful Degradation**: Every failure has a fallback; the system never breaks
3. **State Preservation**: Form progress survives disconnections and mode switches
4. **Hybrid Input**: Voice and keyboard are equal citizens, user chooses per-field
5. **Confirmation-Driven**: Every voice-extracted value is confirmed before storage

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              WIDGET (Browser)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Voice UI     │  │ Form UI      │  │ State Manager│  │ Data Channel│ │
│  │ (waveform)   │  │ (fields)     │  │ (persistence)│  │ (sync)      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                              │                                │         │
│                              ▼                                ▼         │
│                    ┌─────────────────────────────────────────────┐     │
│                    │           LiveKit Data Channel              │     │
│                    └─────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           VOICE AGENT (Python)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Capability Orchestrator                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │  │
│  │  │ RAG         │  │ Form        │  │ Future: Booking, etc.   │   │  │
│  │  │ Capability  │  │ Capability  │  │                         │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Form State Machine                             │  │
│  │  States: INACTIVE → ACTIVE → COLLECTING → CONFIRMING →           │  │
│  │          SUMMARY → SUBMITTING → COMPLETED                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API SERVER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Form Schema │  │ Submission  │  │ Webhook     │  │ Conversation│   │
│  │ Service     │  │ Service     │  │ Service     │  │ Logging     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Widget Form State Manager

Manages form state on the client side with persistence for recovery.

```typescript
interface FormStateManager {
  // State
  currentForm: FormSchema | null;
  currentFieldIndex: number;
  answers: Record<string, FieldAnswer>;
  pendingConfirmation: PendingConfirmation | null;
  mode: 'inactive' | 'active' | 'paused' | 'summary' | 'completed';
  
  // Actions
  activateForm(schema: FormSchema): void;
  setAnswer(fieldName: string, value: unknown, source: 'voice' | 'keyboard'): void;
  confirmAnswer(fieldName: string): void;
  rejectAnswer(fieldName: string): void;
  editField(fieldName: string): void;
  pauseForm(): void;
  resumeForm(): void;
  abandonForm(): void;
  submitForm(): Promise<SubmissionResult>;
  
  // Persistence
  saveToStorage(): void;
  restoreFromStorage(): boolean;
  clearStorage(): void;
}

interface FieldAnswer {
  value: unknown;
  confirmed: boolean;
  source: 'voice' | 'keyboard';
  attempts: number;
  timestamp: number;
}

interface PendingConfirmation {
  fieldName: string;
  extractedValue: unknown;
  originalUtterance: string;
}
```

### 2. Data Channel Protocol

Bidirectional communication between widget and agent.

```typescript
// Widget → Agent messages
type WidgetToAgentMessage = 
  | { type: 'keyboard_input'; fieldName: string; value: unknown }
  | { type: 'field_confirmed'; fieldName: string }
  | { type: 'field_rejected'; fieldName: string }
  | { type: 'form_abandoned' }
  | { type: 'submission_approved' }
  | { type: 'edit_requested'; fieldName: string }
  | { type: 'page_context'; url: string; title: string };

// Agent → Widget messages
type AgentToWidgetMessage =
  | { type: 'form_activate'; schema: FormSchema }
  | { type: 'field_focus'; fieldName: string }
  | { type: 'value_extracted'; fieldName: string; value: unknown; utterance: string }
  | { type: 'value_confirmed'; fieldName: string; value: unknown }
  | { type: 'show_summary'; answers: Record<string, unknown> }
  | { type: 'submission_success'; submissionId: string }
  | { type: 'submission_failed'; error: string; canRetry: boolean }
  | { type: 'form_deactivated' };
```

### 3. Form Capability (Voice Agent)

Enhanced FormCapability with state machine and confirmation flow.

```python
class FormState(Enum):
    INACTIVE = "inactive"
    ACTIVE = "active"           # Form activated, greeting
    COLLECTING = "collecting"   # Asking for field value
    CONFIRMING = "confirming"   # Awaiting confirmation
    SUMMARY = "summary"         # Presenting summary
    SUBMITTING = "submitting"   # Submitting to API
    COMPLETED = "completed"     # Done, transitioning out

@dataclass
class FormContext:
    schema: FormSchema
    current_field_index: int
    answers: Dict[str, FieldAnswer]
    pending_value: Optional[Any]
    state: FormState
    attempt_count: int
    paused_for_rag: bool

class FormCapabilityV2(Capability):
    async def can_handle(self, context: RunContext, user_input: str) -> float:
        """Return confidence score for handling this input."""
        # Check if form is active
        # Check if input matches trigger phrases
        # Return 0.0-1.0 confidence
    
    async def handle(self, context: RunContext, user_input: str) -> str:
        """Process input based on current form state."""
        # State machine logic
    
    async def activate_form(self, form_id: str) -> None:
        """Activate a specific form and notify widget."""
    
    async def extract_field_value(self, field: FormField, utterance: str) -> Optional[Any]:
        """Extract typed value from user speech."""
    
    async def confirm_value(self, field_name: str, value: Any) -> str:
        """Generate confirmation prompt for extracted value."""
    
    async def generate_summary(self) -> str:
        """Generate human-readable summary of all answers."""
    
    async def submit_form(self) -> SubmissionResult:
        """Submit form data to API with retry logic."""
```

### 4. Enhanced Form Schema

Extended schema with trigger phrases and messages.

```typescript
interface FormSchemaV2 {
  id: string;
  projectId: string;
  name: string;
  description: string;           // For agent understanding
  triggerPhrases: string[];      // Activation triggers
  greetingMessage: string;       // Said when form starts
  completionMessage: string;     // Said after submission
  fields: FormFieldV2[];
  webhookUrl: string | null;
  webhookSecret: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FormFieldV2 {
  name: string;
  type: 'string' | 'email' | 'phone' | 'number' | 'enum' | 'text' | 'date';
  label: string;
  description: string;           // Help text for agent
  required: boolean;
  options?: string[];            // For enum type
  validation?: FieldValidation;
  confirmationPrompt?: string;   // Custom confirmation text
}

interface FieldValidation {
  pattern?: string;              // Regex pattern
  minLength?: number;
  maxLength?: number;
  min?: number;                  // For number type
  max?: number;
}
```

## Data Models

### Database Schema Changes

```prisma
model FormSchema {
  id                String            @id @default(cuid())
  projectId         String
  name              String
  description       String?           @db.Text    // NEW
  triggerPhrases    String[]          // NEW: Array of trigger phrases
  greetingMessage   String?           @db.Text    // NEW
  completionMessage String?           @db.Text    // NEW
  fields            Json
  webhookUrl        String?           @db.Text
  webhookSecret     String?           // NEW: For HMAC signing
  isActive          Boolean           @default(true)  // NEW: Enable/disable
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  project           Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  submissions       FormSubmission[]

  @@index([projectId])
  @@map("form_schemas")
}

model FormSubmission {
  id              String     @id @default(cuid())
  formSchemaId    String
  sessionId       String
  conversationId  String?    // NEW: Link to conversation
  data            Json
  webhookSent     Boolean    @default(false)
  webhookAttempts Int        @default(0)  // NEW: Track retry count
  status          String     @default("pending")  // NEW: pending, submitted, failed
  createdAt       DateTime   @default(now())
  formSchema      FormSchema @relation(fields: [formSchemaId], references: [id], onDelete: Cascade)

  @@index([formSchemaId])
  @@index([sessionId])
  @@index([conversationId])
  @@map("form_submissions")
}

model FormEvent {
  id             String   @id @default(cuid())
  formSchemaId   String
  sessionId      String
  conversationId String?
  eventType      String   // activated, field_collected, submitted, abandoned
  eventData      Json     // Field name, value, attempts, etc.
  createdAt      DateTime @default(now())

  @@index([formSchemaId])
  @@index([sessionId])
  @@map("form_events")
}
```

### Local Storage Schema (Widget)

```typescript
interface PersistedFormState {
  formId: string;
  projectId: string;
  sessionId: string;
  answers: Record<string, FieldAnswer>;
  currentFieldIndex: number;
  mode: string;
  savedAt: number;
  expiresAt: number;  // 24 hours from save
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Lazy Loading Guarantee
*For any* widget initialization, no form schema API calls shall be made until the user clicks the voice button to start a session.
**Validates: Requirements 1.1**

### Property 2: Form Schema Caching
*For any* session where forms are successfully fetched, subsequent form schema accesses shall not trigger additional API calls.
**Validates: Requirements 1.4**

### Property 3: Graceful Degradation on Fetch Failure
*For any* form fetch failure, the session shall continue in RAG-only mode without throwing errors to the user.
**Validates: Requirements 1.3**

### Property 4: Multi-Form Availability
*For any* project with N forms, all N forms shall be available to the agent as selectable tools.
**Validates: Requirements 2.1**

### Property 5: Trigger Phrase Activation
*For any* user input matching a form's trigger phrases, that specific form shall be activated (not a different form).
**Validates: Requirements 2.2**

### Property 6: Form Activation Widget Sync
*For any* form activation by the agent, a corresponding data channel message shall be sent to the widget within 100ms.
**Validates: Requirements 2.4, 3.5**

### Property 7: Confirmation State Machine
*For any* voice-extracted value, the system shall transition through states: COLLECTING → CONFIRMING → (COLLECTING if rejected, next field if confirmed).
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 8: Keyboard Bypass Confirmation
*For any* value entered via keyboard, the system shall skip the CONFIRMING state and directly store the value.
**Validates: Requirements 4.5**

### Property 9: Extraction Fallback After Failures
*For any* field where voice extraction fails 3 consecutive times, the system shall offer keyboard input as fallback.
**Validates: Requirements 4.6**

### Property 10: Input Priority Resolution
*For any* concurrent voice and keyboard inputs, the most recent complete input (by timestamp) shall be used.
**Validates: Requirements 5.5**

### Property 11: Summary Generation on Completion
*For any* form where all required fields are collected, the system shall transition to SUMMARY state before submission.
**Validates: Requirements 6.1**

### Property 12: Edit Without Restart
*For any* edit request during summary, only the specified field shall be cleared; all other answers shall be preserved.
**Validates: Requirements 6.4**

### Property 13: Submission Retry Logic
*For any* failed submission, the system shall retry up to 3 times with exponential backoff before reporting failure.
**Validates: Requirements 6.6**

### Property 14: Connection Recovery State Preservation
*For any* disconnection during form collection, all confirmed answers shall be preserved in local storage.
**Validates: Requirements 7.1**

### Property 15: Reconnection Resume
*For any* successful reconnection after disconnect, the form shall resume from the last confirmed field index.
**Validates: Requirements 7.2**

### Property 16: Local Queue on API Failure
*For any* submission when API is unreachable, the submission shall be queued locally and retried when connectivity returns.
**Validates: Requirements 7.3**

### Property 17: Validation Re-ask
*For any* field value that fails validation, the system shall return to COLLECTING state for that field.
**Validates: Requirements 7.4**

### Property 18: Mode Transition Context Preservation
*For any* transition between form mode and RAG mode, conversation context and form state shall be preserved.
**Validates: Requirements 8.4**

### Property 19: Form Schema Validation
*For any* form creation/update, the schema shall include valid trigger phrases, description, greeting, and completion messages.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 20: Trigger Phrase Conflict Detection
*For any* form update with trigger phrases, the system shall reject phrases that conflict with other forms in the same project.
**Validates: Requirements 9.5**

### Property 21: Widget-Agent State Sync
*For any* agent state change (field focus, value confirmation), the widget UI shall reflect the change within 200ms.
**Validates: Requirements 10.1, 10.2, 10.3**

### Property 22: Event Logging Completeness
*For any* form lifecycle (activation, field collection, submission, abandonment), all events shall be logged with required metadata.
**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

## Error Handling

### Widget Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| Form fetch fails | API returns error/timeout | Continue in RAG mode, log error |
| Data channel disconnect | LiveKit event | Preserve state, show reconnecting UI |
| Submission fails | API error | Retry 3x, then queue locally |
| Local storage full | QuotaExceededError | Clear old sessions, retry |

### Voice Agent Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| Field extraction fails | No valid value extracted | Increment attempt counter, re-ask |
| 3 extraction failures | attempt_count >= 3 | Offer keyboard fallback |
| API unreachable | Connection error | Queue submission, notify widget |
| Invalid form state | State machine violation | Log error, reset to safe state |

### API Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| Webhook delivery fails | HTTP error/timeout | Retry 3x with backoff |
| Database error | Prisma error | Return 500, log details |
| Validation error | Zod parse failure | Return 400 with details |

## Testing Strategy

### Property-Based Testing Library
- **TypeScript (Widget/API)**: fast-check
- **Python (Voice Agent)**: hypothesis

### Unit Tests
- Form state machine transitions
- Field extraction for each type
- Data channel message serialization
- Trigger phrase matching
- Validation logic

### Property-Based Tests
Each correctness property (1-22) shall have a corresponding property-based test that:
1. Generates random valid inputs
2. Executes the operation
3. Verifies the property holds
4. Runs minimum 100 iterations

### Integration Tests
- Widget ↔ Agent data channel sync
- Form submission → Webhook delivery
- Disconnect → Reconnect → Resume flow
- Mode transition (Form → RAG → Form)

### Test Annotations
All property-based tests must include:
```typescript
// **Feature: conversational-forms-v2, Property 7: Confirmation State Machine**
// **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
```

