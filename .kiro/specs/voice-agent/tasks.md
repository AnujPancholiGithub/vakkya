# Voice Agent Service - Implementation Plan (Simplified MVP)

- [x] 1. Set up project structure and core dependencies
  - Create `apps/voice-agent/` directory with Python package structure
  - Set up `requirements.txt` with core dependencies (livekit-agents, openai, asyncpg, psycopg, pydantic)
  - Configure `pyproject.toml` for project metadata
  - Set up development dependencies (pytest, pytest-asyncio, black, ruff)
  - Create `.env.example` with required environment variables
  - Implement basic environment variable validation on startup
  - _Requirements: 12.4_

- [ ] 2. Implement core data models
  - Create `models.py` with simple dataclasses for Session, PageContext, Turn, Context
  - Add basic Pydantic models for input validation
  - _Requirements: 2.1, 11.1_

- [ ] 2.1 Write basic tests for data models
  - Test validation rules
  - Test basic serialization
  - _Requirements: 2.1, 11.1_

- [ ] 3. Implement LiveKit STT handler
  - Use LiveKit's built-in STT (no third-party adapter)
  - Handle transcript events from LiveKit
  - Implement basic VAD-based end-of-turn detection
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3.1 Write basic tests for STT handler
  - Test transcript event handling
  - Test turn detection
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 4. Implement simple RAG service using PostgreSQL
  - Create `rag_service.py` for vector search
  - Implement query embedding using OpenAI text-embedding-3-small
  - Implement pgvector similarity search with projectId filtering
  - Return top 3 relevant chunks
  - _Requirements: 2.2, 2.3_

- [ ] 4.1 Write basic tests for RAG service
  - Test embedding generation
  - Test vector search
  - _Requirements: 2.2, 2.3_

- [ ] 5. Implement simple LLM service
  - Create `llm_service.py` for OpenAI integration
  - Implement streaming response generation with GPT-4o
  - Build simple prompt with system instructions and context
  - Include conversation history (last 3 turns)
  - _Requirements: 3.1, 3.4_

- [ ] 5.1 Write basic tests for LLM service
  - Test prompt construction
  - Test streaming response handling
  - _Requirements: 3.1, 3.4_

- [ ] 6. Implement LiveKit TTS handler
  - Use LiveKit's built-in TTS (no third-party adapter)
  - Stream LLM tokens to LiveKit TTS
  - Implement basic cancellation for interruptions
  - _Requirements: 4.1, 5.2_

- [ ] 6.1 Write basic tests for TTS handler
  - Test text streaming
  - Test cancellation
  - _Requirements: 4.1, 5.2_

- [ ] 7. Implement agent orchestrator
  - Create `agent.py` with VoiceAgent class
  - Implement LiveKit room connection handling
  - Handle audio input from LiveKit
  - Implement data channel handling for page context
  - Store session state in PostgreSQL
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 7.1 Write basic tests for agent orchestrator
  - Test room connection
  - Test data channel handling
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 8. Implement simple pipeline orchestration
  - Add `on_turn_complete` method to VoiceAgent
  - Query RAG for relevant context
  - Build prompt with page context + RAG results + conversation history
  - Stream LLM response to TTS
  - Send audio to LiveKit
  - _Requirements: 2.2, 3.1, 3.2, 4.1_

- [ ] 8.1 Write basic tests for pipeline
  - Test context assembly
  - Test streaming flow
  - _Requirements: 2.2, 3.1, 3.2, 4.1_

- [ ] 9. Implement basic interruption handling
  - Detect interruption via VAD during agent response
  - Cancel TTS output
  - Preserve conversation context
  - Process new user input
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9.1 Write basic tests for interruption
  - Test TTS cancellation
  - Test context preservation
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 10. Implement simple error handling
  - Add try-catch blocks around external calls
  - Log errors with basic context
  - Return graceful error responses to user
  - _Requirements: 1.5_

- [ ] 10.1 Write basic tests for error handling
  - Test error logging
  - Test error responses
  - _Requirements: 1.5_

- [ ] 11. Implement simple logging
  - Create `logging_config.py` with basic Python logging
  - Configure log levels (INFO for production, DEBUG for dev)
  - Add session_id and project_id to log messages
  - _Requirements: 9.1, 9.2_

- [ ] 12. Implement basic input validation
  - Add Pydantic validators for widget data
  - Validate page context size (max 10KB)
  - Validate LiveKit room tokens
  - _Requirements: 11.1, 11.3_

- [ ] 12.1 Write basic tests for validation
  - Test input validation rules
  - Test size limits
  - _Requirements: 11.1, 11.3_

- [ ] 13. Implement simple health check endpoint
  - Create `health.py` with basic HTTP handler
  - GET /health returns {"status": "ok"} with 200
  - _Requirements: 12.1_

- [ ] 14. Implement main application entry point
  - Create `main.py` with application startup
  - Load and validate environment variables
  - Initialize logging
  - Set up PostgreSQL connection
  - Initialize LiveKit agent worker
  - Register VoiceAgent with LiveKit
  - Start health check server
  - _Requirements: 12.4_

- [ ] 14.1 Write basic startup tests
  - Test successful startup
  - Test missing env var failure
  - _Requirements: 12.4_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Create Railway deployment configuration
  - Create `railway.json` with service configuration
  - Document required environment variables in README
  - Set up health check path
  - _Requirements: 12.1_

- [ ] 17. Add basic documentation
  - Create README.md with setup instructions
  - Document environment variables
  - Add simple architecture diagram
  - _Requirements: All_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
