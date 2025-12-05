# Design Document: Form Keyboard Sync

## Overview

This design addresses the critical synchronization issue where the voice agent loses awareness of keyboard-submitted form inputs. The core problem is that keyboard inputs are stored in `session_context.pending_keyboard_input` but the agent only checks this when it explicitly calls the `check_keyboard_input` tool - which it doesn't know to do because it's unaware inputs were submitted.

### Key Design Principles

1. **Context Injection via Hooks**: Use LiveKit's `on_user_turn_completed` hook to inject keyboard inputs into the chat context before LLM processing
2. **Centralized State**: A single `confirmed_fields` dictionary is the source of truth for all collected values
3. **Tool-Driven State Queries**: Agent explicitly calls `get_form_state` tool when needed, guided by clear instructions
4. **Lifecycle Hooks**: Use `on_enter` for form greetings and `on_exit` for cleanup
5. **Persistence Guarantee**: All completed submissions are persisted to the database via API

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              WIDGET (Browser)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Form UI      │  │ State Manager│  │ Data Channel │                  │
│  │ (inputs)     │  │ (local)      │  │ (sync)       │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│         │                 │                 │                           │
│         │    keyboard_input + field_completed                           │
│         └─────────────────┴─────────────────┘                           │
│                              │                                          │
│                              ▼                                          │
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
│  │                    Data Channel Handler                           │  │
│  │  on field_completed → update confirmed_fields                     │  │
│  │                    → store in pending_keyboard_inputs             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              LiveKit Agent Hooks (NEW)                            │  │
│  │  on_user_turn_completed → inject pending_keyboard_inputs          │  │
│  │                         → into chat context as system message     │  │
│  │  on_enter → say form greeting                                     │  │
│  │  on_exit → cleanup state                                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Session Context                                │  │
│  │  confirmed_fields: Dict[str, ConfirmedField]  ← SOURCE OF TRUTH  │  │
│  │  pending_keyboard_inputs: List[Dict]  ← for hook injection       │  │
│  │  current_field_index: int                                         │  │
│  │  form_complete: bool                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Form Capability Tools                          │  │
│  │  get_form_state() → reads confirmed_fields (explicit call)       │  │
│  │  submit_form() → calls API → persists to database                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API SERVER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │ Form Submit │  │ Webhook     │  │ Database    │                     │
│  │ Endpoint    │  │ Service     │  │ (Prisma)    │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. LiveKit Agent Hooks

Implement LiveKit lifecycle hooks to handle keyboard input injection and form greetings:

```python
class FormAwareAgent(Agent):
    """Agent with form-aware hooks for keyboard input handling."""
    
    async def on_user_turn_completed(
        self,
        turn_ctx: ChatContext,
        new_message: ChatMessage
    ) -> None:
        """Inject keyboard inputs into context before LLM processes turn.
        
        This hook is called after the user's turn ends but before the LLM
        generates a response. It's the perfect place to inject keyboard
        inputs so the agent is immediately aware of them.
        
        Requirements: 1.1, 1.2, 2.1
        """
        ctx = self.userdata
        
        # Check for pending keyboard inputs
        if hasattr(ctx, 'pending_keyboard_inputs') and ctx.pending_keyboard_inputs:
            # Build context message about keyboard inputs
            inputs_summary = []
            for inp in ctx.pending_keyboard_inputs:
                inputs_summary.append(
                    f"- {inp['field_name']}: {inp['value']} (via {inp['source']})"
                )
            
            context_msg = (
                "SYSTEM NOTIFICATION: The user has submitted the following fields "
                "via keyboard while you were processing:\n" +
                "\n".join(inputs_summary) +
                "\n\nYou MUST acknowledge these inputs in your next response. "
                "Say something like 'I see you entered [value] for [field]. "
                "Let me continue with the next question.'"
            )
            
            # Inject as system message into chat context
            turn_ctx.messages.append(
                ChatMessage(role="system", content=context_msg)
            )
            
            # Clear pending inputs after injection
            ctx.pending_keyboard_inputs.clear()
            
            logger.info(
                "Keyboard inputs injected into chat context",
                extra={
                    "input_count": len(inputs_summary),
                    "session_id": ctx.session_id,
                }
            )
    
    async def on_enter(self, session: AgentSession) -> None:
        """Called when agent becomes active - say form greeting.
        
        Requirements: 2.1, 2.2
        """
        ctx = self.userdata
        form_state = getattr(ctx, 'form_collection_state', None)
        
        if form_state and form_state.greeting_message:
            await session.say(form_state.greeting_message)
            logger.info(
                "Form greeting delivered via on_enter hook",
                extra={
                    "form_id": form_state.form_id,
                    "session_id": ctx.session_id,
                }
            )
    
    async def on_exit(self, session: AgentSession) -> None:
        """Called before agent gives control to another agent - cleanup.
        
        Requirements: 6.1
        """
        ctx = self.userdata
        
        # Clear any pending keyboard inputs
        if hasattr(ctx, 'pending_keyboard_inputs'):
            ctx.pending_keyboard_inputs.clear()
        
        logger.info(
            "Form agent exiting - state cleaned up",
            extra={"session_id": ctx.session_id}
        )
```

### 2. Enhanced Data Channel Protocol

Add a new message type for field completion that includes the confirmed value:

```typescript
// Widget → Agent: Field completed with value (keyboard submit)
interface FieldCompletedMessage {
  type: 'field_completed';
  fieldName: string;
  value: unknown;
  source: 'keyboard' | 'voice';
}
```

### 2. Confirmed Fields Data Structure

Centralized tracking of all confirmed field values in session context:

```python
@dataclass
class ConfirmedField:
    """A confirmed form field value."""
    value: Any
    source: str  # 'keyboard' or 'voice'
    confirmed_at: float  # timestamp
    
@dataclass 
class FormCollectionState:
    """Centralized form collection state."""
    form_id: str
    confirmed_fields: Dict[str, ConfirmedField]
    current_field_index: int
    total_fields: int
    is_complete: bool
    
    def add_confirmed_field(self, field_name: str, value: Any, source: str) -> None:
        """Add a confirmed field value."""
        self.confirmed_fields[field_name] = ConfirmedField(
            value=value,
            source=source,
            confirmed_at=time.time()
        )
        self._check_completion()
    
    def is_field_confirmed(self, field_name: str) -> bool:
        """Check if a field has been confirmed."""
        return field_name in self.confirmed_fields
    
    def get_next_uncollected_field_index(self, fields: List[dict]) -> int:
        """Get the index of the next uncollected field."""
        for i, field in enumerate(fields):
            if field['name'] not in self.confirmed_fields:
                return i
        return len(fields)  # All collected
    
    def _check_completion(self) -> None:
        """Check if all required fields are collected."""
        # Will be set based on form schema
        pass
```

### 3. Enhanced Data Channel Handler

Update the data channel handler to immediately process keyboard inputs and store them for context injection:

```python
def on_data_received(data: rtc.DataPacket) -> None:
    """Handle data channel messages with immediate state updates."""
    message = json.loads(data.data.decode("utf-8"))
    msg_type = message.get("type")
    
    if msg_type == "field_completed":
        # Immediately update confirmed_fields
        field_name = message.get("fieldName")
        value = message.get("value")
        source = message.get("source", "keyboard")
        
        if field_name and value is not None:
            form_state = get_or_create_form_state(session_context)
            form_state.add_confirmed_field(field_name, value, source)
            
            # Store for context injection in on_user_turn_completed hook
            if not hasattr(session_context, 'pending_keyboard_inputs'):
                session_context.pending_keyboard_inputs = []
            
            session_context.pending_keyboard_inputs.append({
                "field_name": field_name,
                "value": value,
                "source": source
            })
            
            logger.info(
                "Field completed via keyboard - will inject in next turn",
                extra={
                    "field_name": field_name,
                    "value": value,
                    "total_confirmed": len(form_state.confirmed_fields)
                }
            )
```

### 4. Form State Query Tool

A new tool that returns the current form state including all confirmed fields:

```python
@function_tool()
async def get_form_state(context: RunContext[Any]) -> str:
    """Get the current form collection state.
    
    **When to call this tool:**
    - User says "I already submitted", "I filled that out", or similar
    - User asks "what have I entered so far?"
    - Before asking for a field, to avoid asking for already-collected data
    - When resuming a paused form
    
    **IMPORTANT:** Do NOT rely on your memory of collected fields. Always call
    this tool to get the current state from the source of truth.
    
    Returns:
        JSON string with confirmed fields and completion status.
    """
    ctx = context.userdata
    form_state = getattr(ctx, 'form_collection_state', None)
    
    if not form_state:
        return json.dumps({"status": "no_form_active"})
    
    return json.dumps({
        "status": "active",
        "confirmed_fields": {
            name: {"value": cf.value, "source": cf.source}
            for name, cf in form_state.confirmed_fields.items()
        },
        "is_complete": form_state.is_complete,
        "current_field_index": form_state.current_field_index,
        "total_fields": form_state.total_fields
    })
```

### 5. Form Submission with Persistence

Enhanced submit_form that persists to database:

```python
@function_tool()
async def submit_form(context: RunContext[Any]) -> str:
    """Submit the completed form to the server and persist to database.
    
    Call this ONLY after all required fields are collected and user approves.
    
    Returns:
        Success message with submission ID, or error message.
    """
    ctx = context.userdata
    form_state = getattr(ctx, 'form_collection_state', None)
    form = getattr(ctx, 'active_form', None)
    
    if not form_state or not form:
        return "No form to submit."
    
    # Collect all confirmed values
    submission_data = {
        name: cf.value 
        for name, cf in form_state.confirmed_fields.items()
    }
    
    # Submit to API with retry logic
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = await http_client.post(
                f"{api_base_url}/api/internal/forms/{form['id']}/submit",
                json={
                    "sessionId": ctx.session_id,
                    "data": submission_data,
                    "conversationId": getattr(ctx, 'api_conversation_id', None)
                }
            )
            
            if response.status_code == 201:
                result = response.json()
                submission_id = result.get("submission", {}).get("id")
                
                # Send success to widget
                await send_widget_message(ctx.room, {
                    "type": "submission_success",
                    "submissionId": submission_id
                })
                
                return f"Form submitted successfully! Submission ID: {submission_id}"
            
        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            return f"Failed to submit form after {max_retries} attempts: {str(e)}"
    
    return "Form submission failed. Please try again."
```

## Data Models

### Session Context Additions

```python
@dataclass
class SessionContext:
    # ... existing fields ...
    
    # Form collection state (centralized)
    form_collection_state: Optional[FormCollectionState] = None
    
    # Pending keyboard inputs for context injection
    pending_keyboard_inputs: List[Dict[str, Any]] = field(default_factory=list)
```

### API Submission Endpoint

The existing `/api/internal/forms/:formId/submit` endpoint already handles persistence. We ensure it:
1. Creates a FormSubmission record with status "completed"
2. Triggers webhooks if configured
3. Returns the submission ID

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Keyboard Input State Update
*For any* keyboard input with a valid field name and value, submitting it SHALL result in that field appearing in the confirmed_fields dictionary with the correct value and source='keyboard'.
**Validates: Requirements 1.1, 1.2, 7.2**

### Property 2: Confirmed Field Skip
*For any* field that exists in confirmed_fields, the get_next_uncollected_field_index function SHALL return an index that does not correspond to that field.
**Validates: Requirements 1.3**

### Property 3: Multiple Input Ordering
*For any* sequence of N keyboard inputs submitted in order, all N fields SHALL appear in confirmed_fields with their correct values.
**Validates: Requirements 1.4**

### Property 4: State Advancement on Keyboard Input
*For any* keyboard input for the current field, processing it SHALL advance current_field_index to the next uncollected field.
**Validates: Requirements 2.3**

### Property 5: Form Completion Detection
*For any* form where all required fields have confirmed values in confirmed_fields, the is_complete flag SHALL be true.
**Validates: Requirements 3.1**

### Property 6: State Query Completeness
*For any* form state query, the returned data SHALL include all fields present in confirmed_fields with their correct values.
**Validates: Requirements 4.3, 7.3**

### Property 7: Voice Confirmation Storage
*For any* voice-confirmed field value, it SHALL be stored in confirmed_fields with source='voice'.
**Validates: Requirements 4.1, 7.1**

### Property 8: Submission Persistence
*For any* successful form submission, the API SHALL create a FormSubmission record containing all confirmed field values, session ID, and status='completed'.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 9: Webhook Trigger on Submission
*For any* form with a configured webhook URL, successful submission SHALL trigger a webhook call with the submission data.
**Validates: Requirements 6.4**

### Property 10: Submission Retry Logic
*For any* submission that fails, the system SHALL retry up to 3 times with exponential backoff before reporting failure.
**Validates: Requirements 6.5**

### Property 11: Field Collection Check
*For any* field collection check, the system SHALL use the confirmed_fields dictionary as the source of truth, not LLM context.
**Validates: Requirements 7.4**

## Agent Instructions Enhancement

Add explicit tool usage guidance to agent instructions:

```markdown
## Form State Management

**CRITICAL:** When collecting form data, you MUST use the `get_form_state` tool 
to check which fields have already been collected. Do NOT rely on your memory.

**When to call `get_form_state`:**
- User says "I already submitted", "I filled that out", or similar phrases
- User asks "what have I entered so far?" or "what do you have?"
- Before asking for any field, to avoid redundant questions
- When resuming a paused form conversation

**Keyboard Input Acknowledgment:**
When you receive a SYSTEM NOTIFICATION about keyboard inputs, you MUST:
1. Acknowledge each field the user submitted
2. Mention the field name and value naturally
3. Proceed to the next uncollected field or summary

Example: "I see you entered john@example.com for your email. Great! Now, what's 
your phone number?"

**State Source of Truth:**
The `confirmed_fields` dictionary in FormCollectionState is the ONLY source of 
truth for collected values. Never assume a field is collected based on conversation 
history alone - always check the tool.
```

## Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| Invalid field name in keyboard input | Field not in form schema | Log warning, ignore input |
| Duplicate field submission | Field already in confirmed_fields | Update with new value, log info |
| API submission failure | HTTP error/timeout | Retry 3x with exponential backoff |
| Data channel disconnect | LiveKit event | Queue inputs locally, sync on reconnect |
| Context injection failure | Exception in on_user_turn_completed | Log error, continue without injection |

## Testing Strategy

### Property-Based Testing Library
- **Python (Voice Agent)**: hypothesis

### Unit Tests
- FormCollectionState add/query operations
- Data channel message parsing
- Submission payload construction
- Retry logic

### Property-Based Tests
Each correctness property (1-11) shall have a corresponding property-based test that:
1. Generates random valid inputs
2. Executes the operation
3. Verifies the property holds
4. Runs minimum 100 iterations

### Test Annotations
All property-based tests must include:
```python
# **Feature: form-keyboard-sync, Property 1: Keyboard Input State Update**
# **Validates: Requirements 1.1, 1.2, 7.2**
```
