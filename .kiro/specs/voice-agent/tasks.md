# Voice Agent Service - Implementation Plan (LiveKit Best Practices)

- [x] 1. Set up project structure and core dependencies
  - Create `apps/voice-agent/` directory with Python package structure
  - Set up `requirements.txt` with LiveKit Agents SDK and plugins
  - Configure `pyproject.toml` for project metadata
  - Set up development dependencies (pytest, pytest-asyncio, black, ruff)
  - Create `.env.example` with required environment variables
  - Implement basic environment variable validation on startup
  - _Requirements: 11.3_

- [x] 2. Implement core data models
  - Create `models.py` with SessionUserData, PageContext, Turn, DocumentChunk
  - Add Pydantic models for input validation (PageContextInput, DataChannelMessage)
  - Remove Session and Context models (replaced by AgentSession.userdata)
  - _Requirements: 2.1, 10.1_

- [x] 2.1 Write basic tests for data models
  - Test validation rules
  - Test SessionUserData.add_turn() method
  - _Requirements: 2.1, 10.1_

- [ ] 3. Implement RAG service using PostgreSQL pgvector
  - Create `rag_service.py` for vector search
  - Implement query embedding using OpenAI text-embedding-3-small
  - Implement pgvector similarity search with projectId filtering
  - Return top 3 relevant chunks
  - _Requirements: 2.2, 2.3_

- [ ] 3.1 Write basic tests for RAG service
  - Test embedding generation
  - Test vector search with project filtering
  - _Requirements: 2.2, 2.3_

- [ ] 4. Implement VakkyaAgent (Agent subclass)
  - Create `agent.py` with VakkyaAgent class extending Agent
  - Implement `__init__` with instructions and RAG service initialization
  - Implement `on_enter()` hook for greeting
  - Implement `on_user_turn_completed()` hook for RAG injection
  - Use `turn_ctx.add_message()` to inject RAG context
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 2.4, 3.1, 3.4_

- [ ] 4.1 Add @function_tool methods to VakkyaAgent
  - Implement `search_documents()` tool for explicit knowledge base search
  - Add proper docstrings and type hints for tool schema generation
  - _Requirements: 2.2, 2.3_

- [ ] 4.2 Write basic tests for VakkyaAgent
  - Test on_enter() greeting generation
  - Test on_user_turn_completed() RAG injection
  - Test function tools
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3_

- [ ] 5. Implement entrypoint function
  - Create `entrypoint.py` with async entrypoint(ctx: JobContext)
  - Configure AgentSession with STT/LLM/TTS using LiveKit Inference descriptors
  - Configure VAD using silero.VAD.load()
  - Configure turn detection using MultilingualModel()
  - Initialize SessionUserData with project_id from room metadata
  - Start session with VakkyaAgent instance
  - _Requirements: 1.1, 1.2, 1.3, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

- [ ] 5.1 Write basic tests for entrypoint
  - Test AgentSession configuration
  - Test session startup
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 6. Implement page context injection
  - Add data channel listener in entrypoint
  - Update SessionUserData.page_context when widget sends page URL
  - Optionally inject page context into chat_ctx as system message
  - _Requirements: 2.1_

- [ ] 6.1 Write basic tests for page context
  - Test data channel message handling
  - Test page context storage in userdata
  - _Requirements: 2.1_

- [ ] 7. Implement conversation logging
  - Create `conversation_logger.py` for logging turns to API
  - Log each turn (user query + agent response + RAG docs) to API server
  - Include project_id and session metadata
  - _Requirements: 8.1, 8.2_

- [ ] 7.1 Write basic tests for conversation logging
  - Test turn logging to API
  - Test error handling for API failures
  - _Requirements: 8.1, 8.2_

- [ ] 8. Implement error handling
  - Add try-catch blocks around RAG queries
  - Add try-catch blocks around API logging
  - Log errors with structured context (project_id, session_id)
  - Never log API keys or tokens
  - _Requirements: 1.5, 10.2_

- [ ] 8.1 Write basic tests for error handling
  - Test RAG service error handling
  - Test API logging error handling
  - Test secret exclusion from logs
  - _Requirements: 1.5, 10.2_

- [ ] 9. Implement logging configuration
  - Create `logging_config.py` with structlog configuration
  - Configure JSON output for production
  - Add context processors for project_id and session_id
  - _Requirements: 8.1, 8.2_

- [ ] 10. Implement health check endpoint
  - Create `health.py` with simple HTTP server
  - GET /health returns {"status": "ok"} with 200
  - _Requirements: 11.1, 11.2_

- [ ] 11. Implement main application entry point
  - Create `main.py` with CLI setup
  - Load and validate environment variables using config.py
  - Initialize logging
  - Set up PostgreSQL connection pool
  - Register entrypoint with LiveKit CLI
  - Start health check server in background
  - _Requirements: 11.3_

- [ ] 11.1 Write basic startup tests
  - Test successful startup with valid env vars
  - Test failure with missing env vars
  - _Requirements: 11.3_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Create Railway deployment configuration
  - Create `railway.json` with service configuration
  - Set buildCommand and startCommand
  - Configure healthCheckPath
  - Document required environment variables in README
  - _Requirements: 11.1, 11.2_

- [ ] 14. Update documentation
  - Update README.md with LiveKit Agent architecture
  - Document AgentSession configuration
  - Document VakkyaAgent lifecycle hooks
  - Add architecture diagram showing Agent subclass pattern
  - _Requirements: All_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
