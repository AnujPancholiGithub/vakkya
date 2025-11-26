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

- [x] 3. Implement RAG service using PostgreSQL
  - Status: ✅ Complete
  - Created `rag_service.py` for vector search
  - Implemented query embedding using OpenAI text-embedding-3-small (1536 dimensions)
  - Implemented pgvector similarity search with projectId filtering
  - Returns top 3 relevant chunks formatted as string for LLM context
  - Created RAGService class with async pool management
  - Created format_chunks_for_llm() helper for LLM-friendly output
  - All 175 tests passing (25 new RAG service tests)
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

- [x] 5. Implement Agent with instructions and RAG tool
  - Status: ✅ Complete
  - Defined Agent with knowledge grounding instructions
  - Implemented @function_tool() decorator for search_knowledge tool
  - Tool calls RAG service and returns formatted results
  - LLM decides when to use the tool based on user questions
  - Added context-aware instructions with page URL when available
  - All 183 tests passing (8 new RAG tool tests)
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

- [x] 9. Implement logging configuration
  - Create `logging_config.py` with structured logging
  - Configure log levels (INFO for production, DEBUG for dev)
  - Add session_id and project_id to log context
  - Framework has built-in logging too
  - _Requirements: 8.1, 8.2_

- [x] 10. Implement input validation
  - Add Pydantic validators for page context data
  - Validate page context size (max 10KB)
  - Validate project_id format
  - Write basic tests for validation
  - Test input validation rules
  - Test size limits
  - _Requirements: 10.1_

- [x] 11. Implement environment variable validation
  - Create `config.py` with environment validation
  - Validate all required vars on startup (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, DATABASE_URL)
  - Fail fast with clear error messages
  - _Requirements: 11.3_

- [x] 12. Implement main application entry point
  - Create `main.py` using agents.cli.run_app()
  - Pass WorkerOptions with entrypoint function
  - Framework handles worker lifecycle automatically
  - Load and validate environment variables
  - Initialize logging
  - Set up PostgreSQL connection pool
  - Write basic startup tests
  - Test successful startup
  - Test missing env var failure
  - Status: ✅ Complete
  - Created main.py with cli.run_app() and WorkerOptions
  - Integrated config loading and logging configuration
  - Framework handles worker lifecycle, health checks, and graceful shutdown
  - All 150 tests passing (8 new main tests)
  - _Requirements: 11.3_

- [x] 13. Checkpoint - Ensure all tests pass
  - Status: ✅ Complete
  - All 150 tests passing across 9 test files
  - Core modules implemented: config, entrypoint, logging_config, main, models, session_manager, validation
  - Ready to proceed to Phase 3 (Widget) or Phase 4 (RAG Integration)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Create Railway deployment configuration
  - Status: ✅ Complete
  - Created `Dockerfile` with Python 3.12-slim, non-root user, health checks
  - Created `railway.json` with service configuration (300s health timeout for model loading)
  - Created `.dockerignore` for optimized builds
  - Updated README.md with deployment instructions
  - All 186 tests passing
  - _Requirements: 11.1, 11.2_

- [x] 15. Add documentation
  - Status: ✅ Complete
  - README.md already exists with setup instructions
  - Environment variables documented in table format
  - Added ASCII architecture diagram showing AgentSession pipeline
  - Enhanced LiveKit Inference model descriptors with alternatives table
  - SCHEMA_REFERENCE.md documents database schema alignment
  - _Requirements: All_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Status: ✅ Complete
  - All 186 voice agent tests passing across 9 test files
  - Voice Agent RAG Integration complete and ready for deployment
  - Modules: config, entrypoint, logging_config, main, models, rag_service, session_manager, validation
  - _Requirements: 4.1_
