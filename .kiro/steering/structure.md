---
title: Vakkya High-Level Structure
inclusion: fileMatch
fileMatchPattern: "apps/**,packages/**"
---

# Project Structure (High-Level)

Vakkya is organized as a Turborepo monorepo optimized for simplicity, fast iteration, and clean boundaries.  
All runtime apps reside in `apps/`, and all shared modules live in `packages/`.

---

## Apps

### `apps/widget`
- Embeddable, framework-free JavaScript widget.
- Uses Shadow DOM isolation.
- Loads LiveKit client dynamically.
- Handles UI bubble, mic permission, waveform, and real-time audio streaming.
- Target bundle size: **<100KB**.

### `apps/dashboard`
- Next.js dashboard used by developers.
- Features project management, document upload, and conversation logs.
- Communicates only with the API server.

### `apps/api`
- Fastify + Prisma backend.
- Responsibilities:
  - Authentication (JWT-based)
  - Project and document management
  - RAG indexing (PDF/TXT/MD)
  - Token validation for widget
  - Conversation logging
- Uses PostgreSQL + pgvector for embeddings.

### `apps/voice-agent`
- Python-based LiveKit agent worker.
- Handles real-time STT → RAG → LLM → TTS pipeline.
- Components:
  - LiveKit Agents SDK for STT/TTS
  - pgvector for RAG queries
  - OpenAI for LLM generation
  - Simple orchestrator for turn-level processing

---

## Packages

### `packages/schemas`
- Shared Zod schemas for both the API server and dashboard.
- Ensures consistent input/output validation across services.

### `packages/database`
- Centralized Prisma schema and database client.
- Source of truth for migrations and types.

### `packages/ui`
- Shared UI components for the dashboard (React + shadcn/ui).
- Reusable layouts, forms, and primitives.

### `packages/config`
- Shared configuration for TypeScript, ESLint, Prettier, Tailwind, and build tooling.
- Ensures consistent developer experience.

---

## Boundaries

- **Widget**
  - Talks only to the API (token validation) and LiveKit (media and data channels).
  - Does not access database or other internal services.

- **Dashboard**
  - Communicates exclusively with the API.
  - Does not call LiveKit or the voice agent directly.

- **API**
  - Handles all persistence, RAG indexing, and validation.
  - Does not interact with LiveKit media directly.

- **Voice Agent**
  - Communicates with:
    - LiveKit for media + data channels
    - API for conversation logging
    - PostgreSQL + pgvector for RAG
    - OpenAI for LLM inference
  - Has no access to dashboard internals or widget internals.

- **Shared Packages**
  - Are read-only from apps.
  - No cross-app imports (e.g., `apps/api` must not import from `apps/dashboard`).

---

This structure ensures clarity, isolation, and clean internal boundaries while enabling rapid iteration across the Vakkya platform.
