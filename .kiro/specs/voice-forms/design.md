# Design Document: Voice Forms

## Overview

Technical design for Vakkya's two flagship use cases:
1. **Voice FAQ** - RAG-powered answers from uploaded docs
2. **Conversational Forms** - Hybrid voice + visual form (Typeform-style)

Design principles: Simplicity, <500ms latency, extensibility.

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Website: <script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" data-token="x">  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  WIDGET (Vanilla JS)                                             │
│  • Voice UI + Waveform (existing)                               │
│  • 🆕 Form UI (Typeform-style, one question at a time)          │
│  • 🆕 Context Collector (page URL, title)                       │
│  • LiveKit Client (existing)                                    │
└─────────────────────────────────────────────────────────────────┘
                              │ Audio + Context + Form Data
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  LIVEKIT CLOUD (WebRTC Transport)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  VOICE AGENT (Python)                                            │
│  • STT → 🆕 Orchestrator → TTS                                  │
│              │                                                   │
│    ┌─────────┴─────────┐                                        │
│    ▼                   ▼                                        │
│  RAG Capability    Form Capability                              │
│  (FAQ answers)     (guides form flow)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  API SERVER (Fastify)                                            │
│  • Existing: Auth, Projects, Documents, RAG                     │
│  • 🆕 Form Schema CRUD                                          │
│  • 🆕 Webhook Delivery                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  POSTGRESQL + PGVECTOR                                           │
│  • Existing: Users, Projects, Documents, Chunks, Conversations  │
│  • 🆕 FormSchemas, FormSubmissions                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Capability Architecture

Pluggable modules instead of hard-coded modes:

```python
class Capability(ABC):
    async def can_handle(self, context) -> float:  # Confidence 0-1
    async def handle(self, context) -> Response:

class CapabilityOrchestrator:
    # Routes to highest-confidence capability
```

**MVP**: `RAGCapability`, `FormCapability`
**Future**: `BookingCapability`, `ProductCapability`, `HandoffCapability`

---

## New Components

### 1. Hybrid Form UI (Widget)

Typeform-style experience: one question at a time, voice OR keyboard input.

```
┌─────────────────────────────────────────────────────────────┐
│  🎤  "What's your email address?"                            │  ← Voice asks
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  sarah@company.com                              ▶   │   │  ← Type OR speak
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ○ ○ ● ○ ○                                                 │  ← Progress (3/5)
│  [← Back]                              [Skip →]            │
│  🎙️ Listening...                                           │
└─────────────────────────────────────────────────────────────┘
```

**User Flow**:
1. Widget expands to form mode
2. Voice agent asks question (audio + text)
3. User speaks OR types answer
4. Validate → animate to next question
5. On completion → submit → webhook

**Widget-Agent Coordination**:
- Widget sends form schema to agent on start
- Agent speaks each question
- Widget displays question text + input field
- User input (voice or keyboard) → widget validates → sends to agent
- Agent confirms and triggers next question

### 2. Form Schema (Database)

```prisma
model FormSchema {
  id          String           @id @default(cuid())
  projectId   String
  name        String
  fields      Json             // [{name, type, label, required, options?}]
  webhookUrl  String?
  submissions FormSubmission[]
}

model FormSubmission {
  id           String     @id @default(cuid())
  formSchemaId String
  sessionId    String
  data         Json       // {name: "John", email: "john@x.com"}
  webhookSent  Boolean    @default(false)
}
```

**Field Types**: `string`, `email`, `phone`, `number`, `enum`, `text`

### 3. Webhook Delivery (API)

- Retry 3x with exponential backoff (1s, 5s, 30s)
- HMAC signature for verification
- Log delivery status

```json
{
  "event": "form.submitted",
  "data": {"name": "John", "email": "john@x.com"},
  "metadata": {"page_url": "https://site.com/pricing"}
}
```

### 4. Context Collector (Widget)

Sends page context to agent: `{pageUrl, pageTitle, timestamp}`

---

## API Endpoints (New)

```
POST   /api/projects/:id/forms           # Create form
GET    /api/projects/:id/forms           # List forms
GET    /api/projects/:id/forms/:formId   # Get form
PUT    /api/projects/:id/forms/:formId   # Update form
DELETE /api/projects/:id/forms/:formId   # Delete form
GET    /api/projects/:id/forms/:formId/submissions  # List submissions
POST   /api/internal/forms/:formId/submit           # Submit form data
```

---

## Correctness Properties

### Property 1: Widget Initialization
*For any* valid token, a `<script>` tag SHALL result in a functional widget.

### Property 2: Voice Latency
*For any* interaction, latency SHALL be <500ms (P95).

### Property 3: Form Schema Validation
*For any* input, accept valid schemas or reject with errors.

### Property 4: Field Extraction
*For any* voice input, extract typed value or request clarification.

### Property 5: Webhook Delivery
*For any* submission with webhook, attempt delivery and record outcome.

---

## Error Handling

| Error | Response |
|-------|----------|
| Invalid token | "Unable to connect" |
| Mic denied | "Please allow microphone" |
| RAG no results | "I don't have that information" |
| Field unclear | "Could you repeat?" |
| Webhook failed | Log error, mark failed |

---

## Testing Strategy

- **Property-based tests**: Form validation, field extraction, webhook payload
- **Integration tests**: End-to-end form completion, webhook delivery

---

## Integration

Webhooks enable 5000+ integrations (Zapier, Make, n8n, HubSpot, etc.) without native connectors.
