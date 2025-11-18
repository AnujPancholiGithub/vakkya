# Voice Agent Service - Design Document (Simplified MVP)

## Overview

The Voice Agent Service is a Python-based microservice that orchestrates real-time voice conversations. Built on LiveKit Agents SDK, it uses LiveKit's built-in STT/TTS, OpenAI GPT-4o for LLM, and PostgreSQL pgvector for RAG—all while maintaining sub-500ms latency. This MVP version simplifies the architecture by using LiveKit's built-in capabilities instead of third-party providers.

## Architecture

### High-Level System Context

```
┌─────────────┐
│   Widget    │ (Browser)
└──────┬──────┘
       │ WebRTC Audio + Data Channel
┌──────▼──────────────────────────────────┐
│         LiveKit Cloud                    │
│  (Rooms, Tracks, Built-in STT/TTS)      │
└──────┬──────────────────────────────────┘
       │ LiveKit Agents SDK
┌──────▼──────────────────────────────────┐
│    Voice Agent Service (Python)         │
│  ┌────────────────────────────────────┐ │
│  │   AgentSession                      │ │
│  │   (STT/LLM/TTS Pipeline Config)     │ │
│  └─┬──────────────────────────────────┘ │
│    │                                     │
│  ┌─▼──────────────────────────────────┐ │
│  │   VakkyaAgent (Agent subclass)      │ │
│  │   - on_enter()                      │ │
│  │   - on_user_turn_completed()        │ │
│  │   - @function_tool methods          │ │
│  └─┬──────────────────────────────────┘ │
│    │                                     │
│    └─► RAG Service (PostgreSQL pgvector)│
└──────────────────────────────────────────┘
       │
       └─► PostgreSQL (Vectors + Conversation Logs)
```

### Pipeline Flow

```
User speaks
    ↓
[1] AgentSession: Audio → STT (LiveKit built-in)
    ↓
[2] AgentSession: VAD detects end-of-turn (automatic)
    ↓
[3] VakkyaAgent.on_user_turn_completed() hook triggered
    ↓
[4] RAG Service: Query pgvector for relevant chunks
    ↓
[5] turn_ctx.add_message() injects RAG context
    ↓
[6] AgentSession: LLM generates response (OpenAI GPT-4o streaming)
    ↓
[7] AgentSession: TTS synthesizes audio (LiveKit built-in)
    ↓
[8] User hears response (interruptions handled automatically)
```

**Latency Budget (P95):**
- STT finalization: <300ms (LiveKit automatic)
- pgvector query: <100ms
- LLM first token: <200ms
- TTS first audio byte: <200ms (LiveKit automatic)
- **Total: <500ms**

## Components and Interfaces

### 1. AgentSession Configuration

**Responsibility:** Configure the STT/LLM/TTS pipeline and manage the voice conversation.

```python
from livekit.agents import AgentSession
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

session = AgentSession[SessionUserData](
    # STT: LiveKit built-in (configured via string descriptor)
    stt="deepgram/nova-3:en",
    
    # LLM: OpenAI GPT-4o
    llm="openai/gpt-4o",
    
    # TTS: LiveKit built-in (configured via string descriptor)
    tts="cartesia/sonic-3:...",
    
    # VAD: Automatic voice activity detection
    vad=silero.VAD.load(),
    
    # Turn detection: Automatic end-of-turn detection
    turn_detection=MultilingualModel(),
    
    # Session-level state
    userdata=SessionUserData(project_id=project_id),
    
    # Interruption handling (automatic)
    allow_interruptions=True,
)
```

**Key Points:**
- STT/LLM/TTS are configured on AgentSession, not as separate classes
- VAD and turn detection are automatic when configured
- Interruptions are handled automatically by the framework
- Session state is managed via typed `userdata`

### 2. VakkyaAgent (Agent Subclass)

**Responsibility:** Implement agent behavior using LiveKit lifecycle hooks.

```python
from livekit.agents import Agent, ChatContext, ChatMessage, function_tool, RunContext

class VakkyaAgent(Agent):
    def __init__(self, project_id: str):
        super().__init__(
            instructions="""You are a helpful voice assistant for Vakkya.
            Only answer based on the provided context from the knowledge base.
            If information is not in the context, say 'I don't have that information'.
            Be concise and conversational."""
        )
        self.project_id = project_id
        self.rag_service = RAGService()
    
    async def on_enter(self) -> None:
        """Called when agent becomes active in the session."""
        await self.session.generate_reply(
            instructions="Greet the user warmly and ask how you can help"
        )
    
    async def on_user_turn_completed(
        self,
        turn_ctx: ChatContext,
        new_message: ChatMessage,
    ) -> None:
        """Called after user finishes speaking, before LLM generates response.
        This is the official hook for RAG injection."""
        
        # Extract user's query
        user_query = new_message.text_content()
        
        # Query pgvector for relevant context
        rag_results = await self.rag_service.query(
            query_text=user_query,
            project_id=self.project_id,
            top_k=3
        )
        
        # Inject RAG context into the turn (not persisted to history)
        if rag_results:
            context_text = "\n\n".join([
                f"Document: {chunk.content}" 
                for chunk in rag_results
            ])
            turn_ctx.add_message(
                role="assistant",
                content=f"Relevant context from knowledge base:\n{context_text}"
            )
    
    @function_tool()
    async def search_documents(
        self,
        context: RunContext[SessionUserData],
        query: str,
    ) -> str:
        """Search the knowledge base for specific information.
        
        Args:
            query: The search query to find relevant documents
        """
        results = await self.rag_service.query(
            query_text=query,
            project_id=context.userdata.project_id,
            top_k=5
        )
        return "\n".join([r.content for r in results])
```

**Key Points:**
- Subclass `Agent` from `livekit.agents`
- Use `on_enter()` for initialization/greeting
- Use `on_user_turn_completed()` for RAG injection
- Use `@function_tool()` decorator for LLM-callable tools
- No manual STT/TTS/VAD handling needed

### 3. RAG Service (PostgreSQL pgvector)

**Responsibility:** Retrieve relevant document chunks from vector database.

```python
class RAGService:
    async def query(
        self, 
        query_text: str, 
        project_id: str,
        top_k: int = 3
    ) -> list[DocumentChunk]:
        """Search pgvector for relevant documents."""
        # Embed query using OpenAI
        embedding = await self.embed_query(query_text)
        
        # Query pgvector with project filter
        results = await self.db.fetch(
            """
            SELECT chunk_id, content, document_id, 
                   1 - (embedding <=> $1) as similarity_score
            FROM document_chunks
            WHERE project_id = $2
            ORDER BY embedding <=> $1
            LIMIT $3
            """,
            embedding, project_id, top_k
        )
        
        return [DocumentChunk(**row) for row in results]
        
    async def embed_query(self, text: str) -> list[float]:
        """Generate embedding using OpenAI text-embedding-3-small."""
        response = await self.openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
```

### 4. Session User Data

**Responsibility:** Store session-level state accessible to all agents and tools.

```python
from dataclasses import dataclass, field

@dataclass
class SessionUserData:
    """Session-level state managed by AgentSession.userdata"""
    project_id: str
    page_context: PageContext | None = None
    conversation_history: list[Turn] = field(default_factory=list)
    
    def add_turn(self, turn: Turn) -> None:
        """Add a turn to conversation history (last 3 turns only)."""
        self.conversation_history.append(turn)
        if len(self.conversation_history) > 3:
            self.conversation_history.pop(0)
```

**Key Points:**
- Stored in `AgentSession.userdata` (not PostgreSQL for MVP)
- Accessible in agents via `self.session.userdata`
- Accessible in tools via `context.userdata`
- Type-safe through generic typing

## Data Models

### SessionUserData (Primary State Model)

```python
@dataclass
class SessionUserData:
    """Session-level state stored in AgentSession.userdata"""
    project_id: str
    page_context: PageContext | None = None
    conversation_history: list[Turn] = field(default_factory=list)
    
    def add_turn(self, turn: Turn) -> None:
        """Add turn to history (keep last 3 only)"""
        self.conversation_history.append(turn)
        if len(self.conversation_history) > 3:
            self.conversation_history.pop(0)
```

### PageContext

```python
@dataclass
class PageContext:
    """Context about the page the user is viewing"""
    url: str
```

### Turn

```python
@dataclass
class Turn:
    """A single conversation turn"""
    turn_id: str
    user_query: str
    agent_response: str
    rag_documents: list[DocumentChunk]
    timestamp: datetime
```

### DocumentChunk

```python
@dataclass
class DocumentChunk:
    """A chunk from RAG search"""
    chunk_id: str
    content: str
    document_id: str
    similarity_score: float
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
# Core LiveKit Agents SDK
livekit-agents>=1.0.0
livekit>=1.0.0

# AI Providers
openai>=1.0.0

# LiveKit Plugins
livekit-plugins-deepgram>=0.1.0  # STT
livekit-plugins-openai>=0.1.0    # LLM
livekit-plugins-cartesia>=0.1.0  # TTS
livekit-plugins-silero>=0.1.0    # VAD

# Database
asyncpg>=0.29.0

# Utilities
pydantic>=2.5.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
structlog>=24.1.0

# Development
pytest>=8.0.0
pytest-asyncio>=0.24.0
black>=24.0.0
ruff>=0.7.0
hypothesis>=6.92.0
```


## Development Guidelines

**Important:** Always verify implementation patterns against official LiveKit documentation before implementing any feature.

See `WORKING_MODE.md` in this directory for:
- Official documentation sources (8 key URLs)
- Verification workflow (before/during/after implementation)
- Common patterns to verify
- Anti-patterns to avoid
- Testing checklist

**Key Documentation Sources:**
1. Building Agents: https://docs.livekit.io/agents/build/
2. Sessions: https://docs.livekit.io/agents/build/sessions/
3. Tasks & Nodes: https://docs.livekit.io/agents/build/tasks/
4. Function Tools: https://docs.livekit.io/agents/build/tools/
5. Turn Detection: https://docs.livekit.io/agents/build/turns/
6. External Data (RAG): https://docs.livekit.io/agents/build/external-data/
7. Workflows: https://docs.livekit.io/agents/build/workflows/
8. Text I/O: https://docs.livekit.io/agents/build/text/

**Golden Rule:** When in doubt, check official LiveKit docs first. Don't invent custom patterns.
