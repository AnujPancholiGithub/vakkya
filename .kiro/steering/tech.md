---
title: Vakkya Technology Stack
inclusion: always
---

# Vakkya – Technology Stack

This document describes the complete technology stack used across all four services in the Vakkya monorepo.  
It reflects the current MVP implementation — simple, consistent, and minimal.

---

# Core Principles

- Use **one DB** (PostgreSQL + pgvector) across all services.
- Keep dependencies minimal and avoid unnecessary external services.
- Prefer **synchronous processing** for MVP simplicity.
- Use **TypeScript** for API + Dashboard, **Python** for Voice Agent, **vanilla JS** for Widget.
- Deliver a **fast developer experience** and an **easy integration path** for users.

---

# Runtimes & Languages

- **Node.js:** 20.x+ for API server  
- **TypeScript:** 5.x for API + Dashboard  
- **Python:** 3.12+ for the voice agent  
- **JavaScript:** ES2020+ for the widget (no frameworks)

---

# Frontend – Widget (Embeddable Client)

**Purpose:** A single `<script>` that turns any website into a voice-enabled interface.

### Stack
- Vanilla JavaScript  
- Shadow DOM for UI isolation  
- Canvas API for waveform visualization  
- WebRTC + `livekit-client` for audio transport  
- Dynamic import to load LiveKit only after button click  
- Vite + Rollup + Terser for bundling/minification

### Behavior
- Renders floating voice button  
- Handles mic permission  
- Streams microphone audio to LiveKit  
- Receives TTS audio from the voice agent  
- Sends **only page URL** as context via data channel  
- Bundle target: **<100KB gzipped**

---

# Frontend – Dashboard (Developer Console)

**Purpose:** Manage projects, upload documents, and view conversations.

### Stack
- Next.js 15 (App Router)  
- React 19  
- Cloudflare Pages deployment  
- Tailwind CSS 4.x  
- shadcn/ui components  
- lucide-react for icons  
- React Query v5 for data fetching/caching  
- Zod validation (shared with backend)  

### Features (MVP)
- Email/password authentication (custom JWT)  
- Project creation  
- Document upload (PDF, TXT, MD only)  
- Document status display  
- Conversation list + detail view  
- Widget embed snippet  
- Toast-based error/success feedback  

---

# Backend – API Server

**Purpose:** Core backend for authentication, project management, document processing, embeddings, and conversation logging.

### Stack
- Node.js + Fastify  
- TypeScript  
- Prisma ORM  
- PostgreSQL 17 with pgvector extension  
- Zod for input validation  
- Multer / Fastify multipart for file uploads  

### Responsibilities
- User authentication (email/password + JWT)  
- Project CRUD  
- Document upload + synchronous processing:
  - Parse PDF/TXT/MD  
  - Chunk text  
  - Generate embeddings (OpenAI text-embedding-3-small)  
  - Store vectors in pgvector  
- Token validation for widget  
- Conversation logging from voice agent  
- REST endpoints for dashboard + widget  

### Storage
- Files stored locally or via simple Railway volume  
- Vectors stored in Postgres pgvector  
- No Redis, no S3, no Pinecone used in MVP  

---

# Backend – Voice Agent

**Purpose:** Real-time STT → RAG → LLM → TTS pipeline running in a LiveKit room.

### Stack
- Python 3.12+  
- LiveKit Agents SDK  
- OpenAI GPT-4o for LLM  
- LiveKit’s built-in STT + TTS (fast, streaming)  
- PostgreSQL for vector search  
- Asyncio for concurrency  

### Responsibilities
- Join LiveKit room  
- Receive live audio → STT  
- Retrieve RAG context from pgvector  
- Generate streaming response with GPT-4o  
- Stream TTS audio back to user  
- Handle interruptions mid-response  
- Log all turns to API  

### Context Inputs
- STT transcript  
- Page URL sent from widget  
- RAG chunks from Postgres  

---

# Document Processing (MVP – Inline)

### Flow
1. Upload file to API  
2. Extract text  
3. Chunk text (1000 chars, 200 overlap)  
4. Generate embeddings  
5. Insert into Postgres pgvector (namespace = project)  
6. Mark document as completed  

### Formats Supported
- PDF  
- TXT  
- MD  

---

# Infrastructure & Deployment

### Monorepo
Managed with **Turborepo + pnpm**:

apps/
widget/
dashboard/
api/
voice-agent/
packages/
schemas/
ui/
config/
database


### Hosting
- **API:** Railway (Node.js)  
- **Voice Agent:** Railway (Python)  
- **Dashboard:** Cloudflare Pages  
- **Widget JS bundle:** Cloudflare R2 / CDN  

### Database
- Railway PostgreSQL 17  
- pgvector extension enabled  

---

# Observability

### Logging
- API: Pino (structured JSON logs)  
- Voice Agent: Python logging (JSON output)  
- Widget: minimal console.error only  

### Monitoring
- Railway built-in metrics (CPU, RAM, requests)  

### Error Handling
- API returns consistent JSON error responses  
- Dashboard shows toast messages  
- Voice agent logs structured context  

---

# Security

- All API endpoints validated with Zod  
- JWT-based session tokens  
- All widget → API calls over HTTPS  
- CORS restricted to dashboard + widget embed origins  
- Input validation for file type & file size  
- No secrets logged anywhere  

---

# Versioning Strategy

- Pin core dependencies to minor versions  
- Auto-update dev tools via Renovate/Dependabot  
- Validate environment variables on startup  

---

This stack forms a clean, minimal, production-ready MVP foundation for Vakkya.
