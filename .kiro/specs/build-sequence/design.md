# Design Document - Build Sequence

## Overview

The Vakkya build sequence is designed to minimize rework and enable early validation by building services in dependency order. The sequence prioritizes getting a working end-to-end flow (vertical slice) as quickly as possible, then expanding features incrementally.

The core principle: **Build the foundation first, validate early, expand systematically.**

## Architecture

### Service Dependency Graph

```
Database (PostgreSQL + pgvector)
    ↓
API Server (REST endpoints, auth, RAG processing)
    ↓
├─→ Dashboard (project management, document upload)
└─→ Voice Agent (LiveKit room, STT→LLM→TTS pipeline)
    ↓
Widget (embeddable UI, LiveKit client)
```

### Critical Path

The fastest path to a working demo:
1. Database schema + migrations
2. API Server core (auth, projects, documents, RAG)
3. Voice Agent minimal (LiveKit + OpenAI, no RAG yet)
4. Widget minimal (button + LiveKit connection)
5. Integration: Widget → Voice Agent → API (RAG)
6. Dashboard (management UI)


## Components and Interfaces

### Phase 0: Foundation (Shared Infrastructure)

**Purpose:** Set up monorepo structure, database, and shared packages before building services.

**Components:**
- Turborepo configuration
- PostgreSQL schema with Prisma
- Shared TypeScript types package (`packages/schemas`)
- Environment variable templates

**Interfaces:**
- Prisma schema defines all database tables
- Shared Zod schemas for API contracts
- TypeScript types exported from `@vakkya/schemas`

**Why First:** All services depend on database schema and shared types. Building this first prevents rework.

### Phase 1: API Server Core

**Purpose:** Build authentication, project management, and document processing with RAG.

**Components:**
- Fastify server with routes
- JWT authentication
- Project CRUD operations
- Document upload + parsing
- Text chunking + embedding generation
- pgvector storage and similarity search
- Conversation logging endpoints

**Interfaces:**
- REST API endpoints (defined in API spec)
- Database access via Prisma
- OpenAI API for embeddings

**Why Second:** Voice Agent and Dashboard both depend on API Server. Building this enables parallel work on frontend and voice.


### Phase 2: Voice Agent Minimal (No RAG)

**Purpose:** Build the real-time voice pipeline using LiveKit Agent SDK best practices without RAG to validate LiveKit integration.

**Components:**
- `VakkyaAgent` (Agent subclass with lifecycle hooks)
- `AgentSession` configuration (STT/LLM/TTS pipeline)
- VAD and turn detection (automatic via LiveKit)
- Page context injection via `SessionUserData`
- Basic system prompt (no RAG context yet)

**Interfaces:**
- LiveKit Agents SDK (Agent subclass pattern)
- OpenAI API for LLM (configured on AgentSession)
- LiveKit Inference for STT/TTS (configured on AgentSession)
- Data channel for receiving page URL

**Architecture Pattern:**
```python
# AgentSession configures the pipeline
session = AgentSession[SessionUserData](
    stt="deepgram/nova-3:en",
    llm="openai/gpt-4o",
    tts="cartesia/sonic-3:...",
    vad=silero.VAD.load(),
    turn_detection=MultilingualModel(),
)

# VakkyaAgent implements behavior
class VakkyaAgent(Agent):
    async def on_enter(self):
        # Greet user
    
    async def on_user_turn_completed(self, turn_ctx, new_message):
        # RAG injection happens here (Phase 4)
```

**Why Third:** Building voice agent without RAG lets us validate the hardest part (real-time audio pipeline) independently using LiveKit's recommended patterns. RAG integration comes later via the `on_user_turn_completed` hook.

### Phase 3: Widget Minimal

**Purpose:** Build embeddable UI that connects to LiveKit and sends page context.

**Components:**
- Shadow DOM UI (button + expanded state)
- Microphone permission handling
- LiveKit client connection
- Canvas waveform visualization
- Data channel for sending page URL

**Interfaces:**
- LiveKit client SDK (lazy loaded)
- Widget token validation via API

**Why Fourth:** With Voice Agent working, we can now build the client that connects to it. This completes the vertical slice.


### Phase 4: Voice Agent RAG Integration

**Purpose:** Connect Voice Agent to API Server's pgvector search to enable document-based answers using LiveKit's official RAG pattern.

**Components:**
- RAG Service (PostgreSQL connection with pgvector)
- Vector similarity search with project filtering
- RAG injection via `on_user_turn_completed` hook
- Context building using `turn_ctx.add_message()`
- Enhanced system prompt with grounding rules

**Interfaces:**
- Direct PostgreSQL connection (not via API)
- pgvector extension for similarity search
- OpenAI API for query embeddings

**Architecture Pattern:**
```python
class VakkyaAgent(Agent):
    async def on_user_turn_completed(self, turn_ctx, new_message):
        # Query pgvector for relevant context
        rag_results = await self.rag_service.query(
            new_message.text_content()
        )
        
        # Inject into turn context (official LiveKit pattern)
        turn_ctx.add_message(
            role="assistant",
            content=f"Context: {rag_results}"
        )
```

**Why Fifth:** Now that the voice pipeline works, we add intelligence using LiveKit's recommended `on_user_turn_completed` hook for RAG injection. This makes the system useful.

### Phase 5: Dashboard

**Purpose:** Build the management UI for developers to create projects and upload documents.

**Components:**
- Next.js 15 app with App Router
- Authentication pages (sign up, log in)
- Projects list and detail pages
- Document upload UI
- Conversation logs viewer
- Widget embed code display

**Interfaces:**
- API Server REST endpoints
- React Query for data fetching
- Zod validation (shared schemas)

**Why Last:** Dashboard is pure UI with no dependencies on other services. Building it last means we can test the core system without it.


## Data Models

### Build Phase Tracking

Each phase has:
- **Phase Number**: Sequential identifier (0-5)
- **Phase Name**: Descriptive name
- **Spec Reference**: Which spec in `.kiro/specs/` to execute
- **Dependencies**: Which phases must be complete first
- **Success Criteria**: How to know the phase is done
- **Estimated Complexity**: Relative effort (Small, Medium, Large)

### Integration Points

| From Service | To Service | Integration Type | When Established |
|--------------|------------|------------------|------------------|
| Widget | API Server | REST (token validation) | Phase 3 |
| Widget | Voice Agent | LiveKit WebRTC | Phase 3 |
| Voice Agent | API Server | REST (conversation logging) | Phase 4 |
| Voice Agent | PostgreSQL | Direct SQL (pgvector) | Phase 4 |
| Dashboard | API Server | REST (all endpoints) | Phase 5 |

### Deployment Milestones

| Milestone | Phases Complete | What's Deployable | Why Deploy |
|-----------|-----------------|-------------------|------------|
| M1: Database | Phase 0 | PostgreSQL on Railway | Enables API development |
| M2: API | Phase 1 | API Server on Railway | Enables frontend/voice development |
| M3: Voice | Phase 2 | Voice Agent on Railway | Enables widget testing |
| M4: Vertical Slice | Phase 3 | Widget on CDN | First end-to-end demo |
| M5: RAG | Phase 4 | Updated Voice Agent | Intelligent responses |
| M6: MVP | Phase 5 | Dashboard on Cloudflare | Full product launch |


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The Build Sequence is a planning and process document, not executable code. Therefore, there are no testable correctness properties in the traditional sense. All acceptance criteria relate to process requirements, documentation quality, and planning activities rather than runtime behavior.

Instead of properties, we validate correctness through:
- **Manual review**: Ensuring the sequence follows dependency order
- **Integration testing**: Verifying each phase produces working software
- **Deployment validation**: Confirming services work in production after each milestone


## Error Handling

### Phase Failure Scenarios

**Scenario 1: Database migration fails**
- **Detection**: Prisma migrate command returns non-zero exit code
- **Response**: Fix schema issues before proceeding to Phase 1
- **Prevention**: Validate schema syntax before running migrations

**Scenario 2: API Server won't start**
- **Detection**: Health check endpoint returns 500 or times out
- **Response**: Check environment variables, database connection, and logs
- **Prevention**: Validate all env vars on startup, fail fast with clear error messages

**Scenario 3: LiveKit connection fails in Voice Agent**
- **Detection**: Agent crashes or logs connection errors
- **Response**: Verify LiveKit credentials, check network connectivity
- **Prevention**: Test LiveKit connection in isolation before building full pipeline

**Scenario 4: Widget bundle exceeds size budget**
- **Detection**: Build output shows bundle >100KB gzipped
- **Response**: Review dependencies, ensure LiveKit is lazy-loaded, optimize code
- **Prevention**: Set up bundle size monitoring in build process

**Scenario 5: Integration test fails after phase completion**
- **Detection**: End-to-end test fails (e.g., widget can't connect to voice agent)
- **Response**: Debug integration point, check logs on both sides
- **Prevention**: Test integration points immediately after completing each phase

### Rollback Strategy

If a phase fails and cannot be fixed quickly:
1. Revert code changes to last working commit
2. Document the issue and attempted solutions
3. Reassess approach before retrying
4. Consider alternative implementation if blocked repeatedly


## Testing Strategy

### Phase-Level Testing

Since the Build Sequence is a process document, testing happens at the phase level rather than through automated tests.

**Phase 0: Foundation**
- **Test**: Run `prisma migrate dev` successfully
- **Test**: Import shared types in a test file
- **Success**: No TypeScript errors, database tables created

**Phase 1: API Server**
- **Test**: Call `/health` endpoint, expect 200 OK
- **Test**: Sign up, log in, create project, upload document
- **Test**: Query pgvector for similar chunks
- **Success**: All endpoints return expected responses, document processing completes

**Phase 2: Voice Agent (No RAG)**
- **Test**: Connect to LiveKit room, speak, hear response
- **Test**: Check logs for STT transcript and LLM response
- **Success**: Voice pipeline works end-to-end with <500ms latency

**Phase 3: Widget**
- **Test**: Embed widget on test page, click button, grant mic permission
- **Test**: Speak and verify connection to Voice Agent
- **Success**: Widget loads, connects to LiveKit, sends audio

**Phase 4: Voice Agent RAG**
- **Test**: Upload document via API, ask question via widget
- **Test**: Verify response includes information from uploaded document
- **Success**: Agent answers questions using RAG context

**Phase 5: Dashboard**
- **Test**: Sign up, create project, upload document, view conversations
- **Test**: Copy widget embed code, verify it works
- **Success**: All dashboard features functional

### Integration Testing

After each milestone, run end-to-end tests:
- **M4 (Vertical Slice)**: Widget → Voice Agent → Response (no RAG)
- **M5 (RAG)**: Widget → Voice Agent → API (RAG) → Response with document context
- **M6 (MVP)**: Dashboard → API → Document upload → Widget → Voice Agent → RAG response

### No Automated Test Suite for Build Sequence

The Build Sequence itself has no unit tests or property-based tests because it's a planning document, not executable code. Validation happens through manual execution and integration testing of the services it orchestrates.

