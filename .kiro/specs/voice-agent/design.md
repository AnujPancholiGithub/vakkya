# Voice Agent Service - Design Document (Simplified MVP)

## Overview

The Voice Agent Service is a Python-based microservice that orchestrates real-time voice conversations. Built on LiveKit Agents SDK 1.0+, it uses the AgentSession class which automatically handles the STT→LLM→TTS pipeline via LiveKit Inference. The service focuses on custom RAG logic while the framework handles all voice pipeline complexity, maintaining sub-500ms latency.

## Architecture

### High-Level System Context

```
┌─────────────┐
│   Widget    │ (Browser)
└──────┬──────┘
       │ WebRTC Audio + Data Channel
┌──────▼──────────────────────────────────┐
│         LiveKit Cloud                    │
│  (Rooms, Tracks, WebRTC)                │
└──────┬──────────────────────────────────┘
       │ LiveKit Agents SDK 1.0+
┌──────▼──────────────────────────────────┐
│    Voice Agent Service (Python)         │
│  ┌────────────────────────────────────┐ │
│  │   AgentSession (Framework)          │ │
│  │   - STT (LiveKit Inference)         │ │
│  │   - LLM (LiveKit Inference)         │ │
│  │   - TTS (LiveKit Inference)         │ │
│  │   - VAD (Silero)                    │ │
│  │   - Turn Detection (Multilingual)   │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │   Custom Logic                      │ │
│  │   - Agent (instructions + tools)    │ │
│  │   - RAG Service (pgvector)          │ │
│  │   - Session State                   │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
       │
       └─► PostgreSQL (Session State + Vectors)
```

### Pipeline Flow

```
User speaks
    ↓
[1] AgentSession: Audio → STT (LiveKit Inference)
    ↓
[2] AgentSession: VAD + Turn Detection → Finalized query
    ↓
[3] Agent Tool: search_knowledge(query) → pgvector search
    ↓
[4] Agent Tool: Return RAG results to LLM
    ↓
[5] AgentSession: LLM (LiveKit Inference) → Streaming tokens
    ↓
[6] AgentSession: Tokens → TTS (LiveKit Inference) → Audio
    ↓
[7] User hears response
```

**Key Insight:** Steps 1, 2, 5, 6 are handled automatically by AgentSession. We only implement step 3-4 (RAG tool).

**Latency Budget (P95):**
- STT finalization: <300ms (framework optimized)
- pgvector query: <100ms (our responsibility)
- LLM first token: <200ms (framework optimized)
- TTS first audio byte: <200ms (framework optimized)
- **Total: <500ms**

## Components and Interfaces

### 1. Entrypoint Function

**Responsibility:** Initialize AgentSession and Agent when a participant joins.

```python
async def entrypoint(ctx: JobContext) -> None:
    """Main entrypoint for LiveKit agent worker"""
    await ctx.connect()
    participant = await ctx.wait_for_participant()
    
    # Extract project_id from room metadata
    project_id = ctx.room.metadata.get("project_id")
    
    # Initialize RAG service
    rag = RAGService(db_connection)
    
    # Create agent with instructions
    agent = Agent(
        instructions="""You are a helpful assistant for website visitors.
        Use the search_knowledge tool to find relevant information from uploaded documents.
        Only answer based on the provided context.
        If information is not available, say 'I don't have that information'.
        Be concise and conversational."""
    )
    
    # Define RAG tool
    @agent.function()
    async def search_knowledge(query: str) -> str:
        """Search the knowledge base for relevant information."""
        results = await rag.search(query, project_id)
        return format_results(results)
    
    # Create session with LiveKit Inference
    session = AgentSession(
        stt="assemblyai/universal-streaming:en",
        llm="openai/gpt-4o-mini",
        tts="cartesia/sonic-3:voice-id",
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel()
    )
    
    # Framework handles everything else!
    await session.start(room=ctx.room, agent=agent)
```

### 2. RAG Service (PostgreSQL pgvector)

**Responsibility:** Retrieve relevant document chunks (only custom logic we need).

```python
class RAGService:
    def __init__(self, db_connection):
        self.db = db_connection
        
    async def search(
        self, 
        query_text: str, 
        project_id: str,
        top_k: int = 3
    ) -> list[DocumentChunk]:
        """Search pgvector for relevant documents"""
        # 1. Generate embedding via OpenAI (or LiveKit Inference)
        embedding = await self.embed_query(query_text)
        
        # 2. Query pgvector with project filter
        results = await self.db.fetch("""
            SELECT content, metadata
            FROM document_chunks
            WHERE project_id = $1
            ORDER BY embedding <=> $2
            LIMIT $3
        """, project_id, embedding, top_k)
        
        return [DocumentChunk(**r) for r in results]
        
    async def embed_query(self, text: str) -> list[float]:
        """Generate embedding using OpenAI"""
        # Use OpenAI text-embedding-3-small
        response = await openai.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
```

**Query Flow:**
1. Embed query text → OpenAI embedding API
2. Query PostgreSQL pgvector with projectId filter
3. Return top 3 results formatted as string

### 3. Session State Manager

**Responsibility:** Maintain conversation state and log to API.

```python
class SessionState:
    session_id: str
    project_id: str
    page_context: dict
    conversation_history: list[Turn]
    created_at: datetime
    
class SessionManager:
    async def create_session(self, room_name: str, project_id: str) -> SessionState
    async def get_session(self, session_id: str) -> Optional[SessionState]
    async def add_turn(self, session_id: str, turn: Turn) -> None
    async def log_to_api(self, session_id: str, turn: Turn) -> None
```

**Storage:** PostgreSQL (no Redis for MVP)

## Data Models

### Session

```python
@dataclass
class Session:
    session_id: str
    project_id: str
    room_name: str
    page_context: PageContext
    conversation_history: list[Turn]
    created_at: datetime
    status: Literal["active", "completed"]
```

### Page Context

```python
@dataclass
class PageContext:
    url: str
```

### Turn

```python
@dataclass
class Turn:
    turn_id: str
    session_id: str
    user_query: str
    agent_response: str
    rag_documents: list[DocumentChunk]
    timestamp: datetime
```

### Context

```python
@dataclass
class Context:
    query: str
    page_context: PageContext
    rag_documents: list[DocumentChunk]
    conversation_history: list[Turn]  # Last 3 turns
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Audio streaming continuity
*For any* user audio input, all audio frames should be forwarded to LiveKit STT and transcript chunks received.
**Validates: Requirements 1.1, 1.2**

### Property 2: Transcript finalization latency
*For any* end-of-turn detection, transcript finalization should complete within 300ms (P95).
**Validates: Requirements 1.3**

### Property 3: Transcript completeness
*For any* sequence of transcript chunks, the finalized transcript should contain all text without data loss.
**Validates: Requirements 1.4**

### Property 4: Page context persistence
*For any* page context sent via data channel, it should be stored in session state.
**Validates: Requirements 2.1**

### Property 5: RAG query latency
*For any* finalized query, pgvector search should complete within 100ms (P95).
**Validates: Requirements 2.2**

### Property 6: Context assembly completeness
*For any* user query with page context and RAG results, the LLM context should include all three components.
**Validates: Requirements 2.3, 2.4**

### Property 7: LLM context inclusion
*For any* OpenAI request, the prompt should include combined context.
**Validates: Requirements 3.1**

### Property 8: Token streaming pipeline
*For any* LLM response tokens, they should be forwarded immediately to TTS.
**Validates: Requirements 3.2, 4.1**

### Property 9: LLM first token latency
*For any* LLM request, first token should arrive within 200ms (P95).
**Validates: Requirements 3.3**

### Property 10: Knowledge grounding enforcement
*For any* system prompt, it should contain instructions to ground responses in provided context.
**Validates: Requirements 3.4**

### Property 11: TTS first byte latency
*For any* TTS request, first audio byte should arrive within 200ms (P95).
**Validates: Requirements 4.2**

### Property 12: Interruption detection and cancellation
*For any* user speech during agent response, interruption should be detected and TTS cancelled immediately.
**Validates: Requirements 5.1, 5.2**

### Property 13: Post-interruption processing
*For any* interruption, new user input should begin processing.
**Validates: Requirements 5.3**

### Property 14: STT latency budget
*For any* speech input, transcription should complete within 300ms (P95).
**Validates: Requirements 6.1**

### Property 15: pgvector query latency budget
*For any* vector search, completion should occur within 100ms (P95).
**Validates: Requirements 6.2**

### Property 16: LLM latency budget
*For any* LLM request, first token within 200ms (P95).
**Validates: Requirements 6.3**

### Property 17: TTS latency budget
*For any* TTS request, first audio byte within 200ms (P95).
**Validates: Requirements 6.4**

### Property 18: End-to-end latency budget
*For any* complete interaction, total processing within 500ms (P95).
**Validates: Requirements 6.5**

### Property 19: Session state externalization
*For any* session state, it should be stored in PostgreSQL.
**Validates: Requirements 9.2**

### Property 20: Input validation enforcement
*For any* data from widget, validation should occur before processing.
**Validates: Requirements 10.1**

### Property 21: Secret exclusion from logs
*For any* log entry, API keys and tokens should never appear.
**Validates: Requirements 10.2**

### Property 22: Token validation on connection
*For any* LiveKit connection, room token should be validated.
**Validates: Requirements 10.3**

### Property 23: Health check response
*For any* health check request, if healthy return HTTP 200.
**Validates: Requirements 11.2**

### Property 24: Startup environment validation
*For any* service startup, all required environment variables should be validated.
**Validates: Requirements 11.3**

## Error Handling

### Error Categories

**Transient Errors:**
- Network timeouts
- Temporary service unavailability

**Strategy:** Retry with exponential backoff (1s, 2s, 4s, max 30s)

**Permanent Errors:**
- Invalid API keys
- Malformed requests
- Invalid room tokens

**Strategy:** Immediate failure with clear error message

### Error Logging

All errors include:
- Error code and message
- Session ID, project ID
- Stack trace (for unexpected errors)
- Timestamp

## Testing Strategy

### Unit Testing

**Framework:** pytest with pytest-asyncio

**Coverage:**
- Adapter implementations
- Session state management
- Error handling
- Context assembly
- Prompt construction

### Property-Based Testing

**Framework:** Hypothesis

**Configuration:** Minimum 100 iterations

**Tests:**
- Property 1: Audio streaming continuity
- Property 3: Transcript completeness
- Property 6: Context assembly completeness
- Property 12: Interruption detection

### Integration Testing

- Test with real LiveKit
- Test with real OpenAI
- Test with real PostgreSQL pgvector

## Performance Considerations

### Latency Optimization

**Streaming:**
- Stream audio to STT immediately
- Stream LLM tokens to TTS immediately
- Stream TTS audio to LiveKit immediately

**Parallel Operations:**
- Run pgvector query while assembling context
- Pipeline LLM → TTS

**Connection Pooling:**
- PostgreSQL connection pooling (max 10)

### Resource Management

**Memory:**
- Limit audio buffer (max 10 seconds)
- Limit conversation history (last 3 turns)
- Stream large responses

**CPU:**
- Use asyncio for I/O-bound operations

### Scalability

**Horizontal Scaling:**
- Stateless service design
- Session state in PostgreSQL
- Each instance handles independent sessions

**Capacity Planning:**
- Target: 100 concurrent sessions per instance
- Each session: ~50MB RAM, ~10% CPU

## Security

### Authentication & Authorization

- LiveKit room tokens validated on connection
- Tokens include project ID in metadata

### API Keys

- Stored in Railway environment variables
- Never logged or exposed

### Input Validation

- Validate page context structure
- Sanitize URLs
- Limit page content size (max 10KB)

### Data Privacy

- Don't log user queries in production
- Store conversation logs with project-level access
- Anonymize session IDs in traces

## Deployment

### Railway Configuration

```yaml
name: voice-agent
runtime: python-3.12
buildCommand: pip install -r requirements.txt
startCommand: python -m src.main
healthCheckPath: /health
```

### Environment Variables

```
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
OPENAI_API_KEY=...
DATABASE_URL=postgresql://...
LOG_LEVEL=INFO
```

### Resources

- Memory: 1GB (start), 2GB (scale)
- CPU: 0.5 vCPU (start), 1 vCPU (scale)

### Monitoring

**Key Metrics:**
- P95 latency per pipeline stage
- Error rate
- Active session count
- Memory and CPU usage

**Logging:**
- Structured JSON logs
- Include session ID, project ID
- Log levels: DEBUG, INFO, WARNING, ERROR

## Dependencies

```
# requirements.txt
# Core framework with VAD and turn detection
livekit-agents[silero,turn-detector]~=1.2

# Database
asyncpg==0.29.0
psycopg2-binary==2.9.9

# Validation and config
pydantic==2.5.0
python-dotenv==1.0.0

# Logging
structlog==24.1.0

# Testing
pytest==7.4.0
pytest-asyncio==0.21.0
hypothesis==6.92.0

# Note: No separate openai, deepgram, cartesia packages needed!
# LiveKit Inference handles all AI model access
```
