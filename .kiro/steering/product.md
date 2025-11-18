---
title: Vakkya Product Overview
inclusion: always
---

# Vakkya - Real-Time Voice Agent Widget

## Product Vision
Transform any website into an interactive, voice-first experience with a single line of JavaScript. Make conversational AI accessible to every developer, regardless of their ML expertise.

## Target Users

### Primary: Frontend Developers at Startups
- **Goal:** Add voice support without backend complexity
- **Pain:** Limited resources, tight deadlines, no AI/ML expertise
- **Use Case:** Voice FAQ assistant for docs sites

### Secondary: Service Business Founders
- **Goal:** Automate customer inquiries, 24/7 availability
- **Pain:** No technical team, budget constraints
- **Use Case:** Voice booking for clinics, gyms, laundries

### Tertiary: E-commerce Store Owners
- **Goal:** Increase conversions, interactive shopping
- **Pain:** High cart abandonment, support ticket volume
- **Use Case:** Product recommendations via voice

## Core Value Propositions

1. **30-Second Integration**
   - Single `<script>` tag embed
   - No backend code required
   - No WebRTC knowledge needed

2. **Intelligent Context Awareness**
   - RAG: Answers from company documents
   - Behavior: Knows what page user is on, time spent, scroll depth
   - Live data: Extracts visible page content automatically

3. **Production-Ready Performance**
   - <500ms voice response latency (hard requirement)
   - Scales to 1000+ concurrent conversations
   - Works on all modern browsers + mobile

## Key Features (MVP - 4 Week Build)

### Must-Have (Week 1-4)
- One-line JavaScript embed
- Dashboard for project creation + token generation
- RAG document upload (PDF, TXT, MD) - **inline processing, no queue**
- Real-time voice pipeline (STT → LLM → TTS via LiveKit)
- Widget UI with waveform visualization
- User behavior tracking (page URL, scroll depth, time spent)
- Conversation logs + transcripts in dashboard

### Deferred to V2 (Post-Launch)
- Emotion detection from voice tone (Hume AI)
- Advanced analytics with charts
- Billing/subscriptions
- Team collaboration
- Webhooks
- Multi-language support
- Mobile SDKs

## Success Metrics

### MVP Launch (Week 4-6)
- Integration time: <30 seconds
- Voice latency: <500ms (P95)
- Conversation completion rate: 80%+
- Beta signups: 100+ in first month

### Product-Market Fit (Month 3)
- 500+ active projects
- 10,000+ conversations/day
- 4.5+ star rating from users

## Competitive Differentiation

| Vakkya | Vapi/Retell | Bland | Voiceflow |
|--------|-------------|-------|-----------|
| `<script>` tag embed | API integration | API calls | Builder + API |
| No backend required | Backend required | Backend required | Backend required |
| 30-second setup | 2-5 day setup | 3-7 days | 1-2 days |
| Built-in widget UI | Build your own | Phone only | Chatbot UI |
| Behavior awareness | None | None | None |
| Context extraction | None | None | None |

## Decision-Making Principles

1. **Simplicity Over Features:** If a feature adds complexity to integration, defer it
2. **Speed Over Perfection:** MVP quality is "works reliably," not "perfect"
3. **Developer Experience First:** Every decision optimizes for integration ease
4. **Performance is Non-Negotiable:** <500ms latency is a hard requirement
5. **Security by Default:** Domain whitelisting, token validation, rate limiting

## User Journey

1. Developer signs up on dashboard.vakkya.ai
2. Creates project, uploads 3 PDFs (product docs)
3. Copies embed code: `<script src="cdn.vakkya.ai/widget.js" data-token="xxx"></script>`
4. Pastes into website `<body>` tag
5. Visitor clicks widget, asks "How do I reset password?"
6. Agent responds in voice with answer from uploaded docs

## Constraints for Kiro
- **Solo Development:** Optimize for single developer velocity
- **Budget:** Use free tiers where possible (Railway, Pinecone, Cloudflare)
- **Performance Budget:** <500ms voice latency, <100KB widget bundle
- **Security:** Always validate inputs, never expose secrets, enforce rate limits
