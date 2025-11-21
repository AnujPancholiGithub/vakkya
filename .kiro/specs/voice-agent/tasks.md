# Voice Agent Service - Implementation Plan (Modern LiveKit Agents 1.0+)

- [x] 1. Set up project structure and core dependencies
  - Create `apps/voice-agent/` directory with Python package structure
  - Set up `requirements.txt` with `livekit-agents[silero,turn-detector]~=1.2`
  - Add database dependencies (asyncpg, psycopg2-binary)
  - Add utilities (pydantic, python-dotenv, structlog)
  - Configure `pyproject.toml` for project metadata
  - Set up development dependencies (pytest, pytest-asyncio, black, ruff)
  - Create `.env.example` with required environment variables (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, DATABASE_URL)
  - _Requirements: 11.3_

- [x] 2. Implement core data models
  - Create `models.py` with simple dataclasses for Session, PageContext, Turn
  - Add basic Pydantic models for input validation
  - Keep models minimal - no need for pipeline/adapter models
  - Write basic tests for data models
  - Test validation rules
  - Test basic serialization
  - _Requirements: 2.1, 10.1_

- [ ] 3. Implement RAG service using PostgreSQL
  - Create `rag_service.py` for vector search
  - Implement query embedding using OpenAI text-embedding-3-small
  - Implement pgvector similarity search with projectId filtering
  - Return top 3 relevant chunks formatted as string
  - This is the ONLY custom service we need - framework handles STT/LLM/TTS
  - Write basic tests for RAG service
  - Test embedding generation
  - Test vector search
  - Test result formatting
  - _Requirements: 2.2, 2.3_

- [x] 4. Implement entrypoint function
  - Create `entrypoint.py` with async entrypoint(ctx: JobContext)
  - Initialize AgentSession with LiveKit Inference models:
    - stt="assemblyai/universal-streaming:en"
    - llm="openai/gpt-4o-mini"
    - tts="cartesia/sonic-3:voice-id"
    - vad=silero.VAD.load()
    - turn_detection=MultilingualModel()
  - Extract project_id from room metadata
  - Initialize RAG service
  - Write basic tests for entrypoint
  - Test session initialization
  - Test project_id extraction
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 5. Implement Agent with instructions and RAG tool
  - Define Agent with clear instructions for knowledge grounding
  - Implement @agent.function() decorator for search_knowledge tool
  - Tool should call RAG service and return formatted results
  - Let LLM decide when to use the tool
  - Write basic tests for Agent tool
  - Test tool invocation
  - Test RAG integration
  - Test result formatting
  - _Requirements: 2.4, 3.1, 3.4_

- [x] 6. Implement session state management
  - Create `session_manager.py` for conversation state
  - Store session data in PostgreSQL
  - Track conversation history (last 3 turns)
  - Implement conversation logging to API server
  - Write basic tests for session management
  - Test session creation
  - Test turn tracking
  - Test API logging
  - _Requirements: 2.1, 9.2_

- [x] 7. Implement data channel handling for page context
  - Handle data channel messages from widget
  - Store page URL in session state
  - Make page context available to Agent
  - Write basic tests for data channel
  - Test message reception
  - Test context storage
  - _Requirements: 2.1_

- [x] 8. Implement error handling
  - Add try-catch blocks around RAG service calls
  - Log errors with session context
  - Framework handles pipeline errors automatically
  - Write basic tests for error handling
  - Test RAG error handling
  - Test error logging
  - _Requirements: 1.5_

- [ ] 9. Implement logging configuration
  - Create `logging_config.py` with structured logging
  - Configure log levels (INFO for production, DEBUG for dev)
  - Add session_id and project_id to log context
  - Framework has built-in logging too
  - _Requirements: 8.1, 8.2_

- [ ] 10. Implement input validation
  - Add Pydantic validators for page context data
  - Validate page context size (max 10KB)
  - Validate project_id format
  - Write basic tests for validation
  - Test input validation rules
  - Test size limits
  - _Requirements: 10.1_

- [ ] 11. Implement environment variable validation
  - Create `config.py` with environment validation
  - Validate all required vars on startup (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, DATABASE_URL)
  - Fail fast with clear error messages
  - _Requirements: 11.3_

- [ ] 12. Implement main application entry point
  - Create `main.py` using agents.cli.run_app()
  - Pass WorkerOptions with entrypoint function
  - Framework handles worker lifecycle automatically
  - Load and validate environment variables
  - Initialize logging
  - Set up PostgreSQL connection pool
  - Write basic startup tests
  - Test successful startup
  - Test missing env var failure
  - _Requirements: 11.3_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Create Railway deployment configuration
  - Create `railway.json` with service configuration
  - Document required environment variables in README
  - Use built-in CLI health checks
  - _Requirements: 11.1, 11.2_

- [ ] 15. Add documentation
  - Create README.md with setup instructions
  - Document environment variables
  - Add architecture diagram showing AgentSession
  - Document LiveKit Inference model descriptors
  - _Requirements: All_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
