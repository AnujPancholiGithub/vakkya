# Requirements Document: Voice Forms

## Introduction

This spec defines the implementation of Vakkya's two flagship use cases: Voice FAQ Assistant and Conversational Forms (Hybrid Voice + Visual). Vakkya is a web-native voice AI widget with one `<script>` tag, 30-second setup, no backend required.

## Glossary

- **Voice AI Widget**: Embeddable JS component for voice interactions
- **Conversational Form**: Voice-driven data collection → structured JSON
- **RAG**: Retrieval-Augmented Generation (answers from your docs)
- **Capability**: Pluggable feature module (RAG, Forms, future: Booking, etc.)

---

## Market Position

| Competitor | Approach | Our Advantage |
|------------|----------|---------------|
| Vapi/Retell | API-first, phone-focused | Web-native, built-in UI |
| Voiceflow | Visual builder | No builder needed, just paste |
| Bland AI | Phone-only | Works on any website |

**Our Position**: "Intercom for Voice" — paste one line, get a working voice assistant.

---

## Requirements

### Requirement 1: Core Value Proposition

**User Story:** As a developer or business owner, I want to add voice AI to my website in 30 seconds without backend complexity.

#### Acceptance Criteria
1. THE integration SHALL require only a single `<script>` tag
2. THE widget SHALL work immediately without additional configuration
3. THE voice latency SHALL be under 500ms (P95)

---

### Requirement 2: Two Flagship Use Cases

**User Story:** As a product strategist, I want two distinct use cases that demonstrate versatility.

#### Use Case A: Voice FAQ Assistant
- **What**: Answer questions from uploaded docs via RAG
- **For**: SaaS docs sites, e-commerce, service businesses
- **Value**: 70% support ticket reduction, 24/7 availability

#### Use Case B: Conversational Forms (Hybrid Voice + Visual)
- **What**: Typeform-style one-question-at-a-time experience with voice OR keyboard input
- **How**: Voice agent asks question → User speaks OR types → Animate to next question → Webhook
- **For**: Real estate, healthcare, B2B lead gen
- **Value**: 2-3x form completion rate, 24/7 lead capture, accessibility for all users

---

### Requirement 3: What to Build

| Component | Build | Why |
|-----------|-------|-----|
| Context collector (widget) | 🆕 | Page-aware responses |
| Capability orchestrator (agent) | 🆕 | Extensible architecture |
| Form schema API | 🆕 | Define form fields |
| Field extraction (LLM) | 🆕 | Voice → structured data |
| Webhook delivery | 🆕 | Send to Zapier/CRM |
| Dashboard form builder | 🆕 | User-friendly config |

---

### Requirement 4: What NOT to Build

| Don't Build | Why |
|-------------|-----|
| Phone/PSTN | Different market |
| Visual flow builder | Competitor moat |
| Native CRM integrations | Webhooks cover this |
| Multi-channel (SMS, WhatsApp) | Scope creep |
| Enterprise features | Focus on SMB first |

---

### Requirement 5: Target Customers

**Segment A**: Developers with documentation sites
- Pain: Support tickets for FAQ questions
- Budget: $29-99/mo

**Segment B**: Service business owners
- Pain: Missed leads after hours
- Budget: $99-299/mo

---

### Requirement 6: Success Metrics

| Metric | Target |
|--------|--------|
| Integration completion | >80% |
| Week 1 retention | >40% |
| Time to first value | <5 minutes |

**PMF Achieved**: 100+ active projects, consistent "I can't believe how easy this was" feedback

---

## What We Have vs What We Need

### Current State (✅ Built)
- Widget: Voice UI, LiveKit audio, waveform, Shadow DOM
- Dashboard: Auth, projects, document upload, conversations
- API: CRUD, document parsing, embeddings, pgvector
- Voice Agent: STT → LLM → TTS, RAG retrieval

### Gaps to Fill

**For Use Case A (FAQ)**:
- Page context awareness (widget → agent)
- Improved RAG prompting
- "I don't know" fallback

**For Use Case B (Forms)**:
- Form schema definition (API + Dashboard)
- Field extraction via LLM function calling
- Webhook delivery with retries

---

## Architecture Principle

**Capability-based, not mode-based**: Each feature (RAG, Forms, future Booking) is a pluggable capability. The orchestrator routes to the best capability based on confidence scores.

```
User speaks → STT → Orchestrator → [RAG | Form | ...] → Response → TTS
```

This is lean for MVP but extensible for any future use case.

---

## Integration Strategy

**Webhooks as universal connector**: Instead of building native integrations, we provide webhooks that work with Zapier (5000+ apps), Make, n8n, or any custom endpoint.

Users get unlimited integrations on day one without us building anything custom.
