# Implementation Plan - Build Sequence

This is the master execution plan for building Vakkya. Follow these phases in order.

**Note:** This document provides a high-level overview. For detailed task execution, refer to individual service specs:
- `.kiro/specs/api-server/tasks.md`
- `.kiro/specs/voice-agent/tasks.md`
- `.kiro/specs/widget/tasks.md`
- `.kiro/specs/dashboard/tasks.md`

## Phase 0: Foundation

- [x] 0.1 Set up monorepo structure (API spec task 1)
  - Status: ✅ Complete
  - _Requirements: 8.1, 9.1_

- [x] 0.2 Fix API dependencies to align with tech.md
  - Status: ✅ Complete
  - _Requirements: 8.1, 9.1_

- [x] 0.3 Set up PostgreSQL with Prisma (API spec task 2)
  - Status: ✅ Complete
  - Created Prisma schema with all models
  - Configured pgvector extension
  - Created initial migration
  - **Execute:** API spec task 2
  - _Requirements: 9.1, 9.2_

- [x] 0.4 Create shared schemas package (Dashboard spec task 2)
  - Status: ✅ Complete
  - Created `packages/schemas` with TypeScript + Zod
  - Defined shared types and validation schemas
  - Added comprehensive tests (10 passing)
  - **Execute:** Dashboard spec task 2
  - _Requirements: 8.1, 8.2_

- [x] 0.5 Create environment variable templates
  - Status: ✅ Complete
  - _Requirements: 9.3_

- [x] 0.6 Checkpoint - Validate foundation
  - Status: ✅ Complete
  - ✅ Prisma schema with pgvector configured
  - ✅ Shared schemas package working (10 tests passing)
  - ✅ Environment files complete and aligned with tech.md
  - ✅ Package structure correct
  - All foundation tasks verified and ready for Phase 1


## Phase 1: API Server Core

**Overview:** Build authentication, project management, document processing with RAG, and conversation logging.

- [x] 1.1 Implement JWT authentication (API spec task 3)
  - **Execute:** API spec task 3 (all subtasks 3.1-3.3)
  - Status: ✅ Complete
  - Created JWT utilities (sign/verify)
  - Created authentication middleware
  - Created auth routes (signup/login)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 Implement project service (API spec task 4)
  - **Execute:** API spec task 4 (all subtasks 4.1-4.3)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.3 Implement project API routes (API spec task 5)
  - **Execute:** API spec task 5 (all subtasks 5.1-5.3)
  - Status: ✅ Complete
  - Created Zod validation schemas
  - Implemented all project CRUD routes (POST, GET, PATCH, DELETE)
  - Added authentication middleware to all routes
  - Created API integration tests
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.4 Checkpoint (API spec task 6)
  - **Execute:** API spec task 6
  - Status: ✅ Complete
  - All tests passing (27 tests)
  - _Requirements: 4.1_

- [x] 1.5 Implement document validation (API spec task 7)
  - **Execute:** API spec task 7 (all subtasks 7.1)
  - Status: ✅ Complete
  - Created document validation utilities with file type and size checks
  - All 23 tests passing
  - _Requirements: 3.1, 3.5_

- [x] 1.6 Implement RAG processing service (API spec task 8)
  - **Execute:** API spec task 8 (all subtasks 8.1-8.5)
  - Status: ✅ Complete
  - Created document parser (PDF, TXT, MD)
  - Created text chunking with LangChain (1000 chars, 200 overlap)
  - Created embedding service with OpenAI (text-embedding-3-small)
  - Created vector storage with pgvector
  - All 76 tests passing
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 1.7 Implement document service (API spec task 9)
  - **Execute:** API spec task 9 (all subtasks 9.1-9.2)
  - Status: ✅ Complete
  - Created document service orchestrating upload and processing
  - Implemented synchronous processing pipeline
  - All 86 tests passing
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 1.8 Implement document API routes (API spec task 10)
  - **Execute:** API spec task 10 (all subtasks 10.1-10.3)
  - Status: ✅ Complete
  - Created document routes with multipart file upload
  - POST /projects/:projectId/documents - Upload document
  - GET /projects/:projectId/documents - List documents
  - GET /projects/:projectId/documents/:id - Get document details
  - DELETE /projects/:projectId/documents/:id - Delete document
  - All 98 tests passing
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - **Execute:** API spec task 10 (all subtasks 10.1-10.3)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.9 Checkpoint (API spec task 11)
  - **Execute:** API spec task 11
  - Status: ✅ Complete
  - All 98 tests passing
  - _Requirements: 4.1_

- [x] 1.10 Implement conversation service (API spec task 12)
  - **Execute:** API spec task 12 (all subtasks 12.1-12.2)
  - Status: ✅ Complete + Quality Improvements Applied
  - Created conversation service with CRUD operations
  - Implemented turn appending with atomic turnCount increment
  - **Quality Fixes (2025-11-18):**
    - Fixed transaction race condition in addTurn()
    - Added getWithOwnership() for single-query ownership validation
    - Added input sanitization and max length validation
    - Fixed test cleanup order
  - All 149 tests passing (14 conversation tests including 3 new ownership tests)
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 1.11 Implement conversation API routes (API spec task 13)
  - **Execute:** API spec task 13 (all subtasks 13.1-13.3)
  - Status: ✅ Complete + Security Improvements Applied
  - Created conversation REST endpoints with widget token validation
  - POST /conversations - Create conversation (voice agent)
  - POST /conversations/:id/turns - Add turn (voice agent)
  - GET /projects/:projectId/conversations - List conversations (dashboard)
  - GET /conversations/:id - Get conversation detail (dashboard)
  - **Security Fixes (2025-11-18):**
    - Fixed N+1 query vulnerability (eliminated DoS vector)
    - Added input length validation to prevent memory exhaustion
    - Single-query ownership validation with JOIN
  - All 149 tests passing (8 conversation route tests)
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 1.12 Implement widget token validation endpoint (API spec task 14)
  - **Execute:** API spec task 14 (all subtasks 14.1-14.2)
  - Status: ✅ Complete
  - Created POST /validate-token endpoint
  - Returns project config for valid tokens
  - Returns 401 for invalid tokens
  - All 122 tests passing (5 new widget validation tests)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 1.13 Implement health check (API spec task 15)
  - **Execute:** API spec task 15 (all subtasks 15.1)
  - Status: ✅ Complete
  - GET /health - Basic health check
  - GET /health/ready - Database and pgvector readiness check
  - All 126 tests passing (4 new health check tests)
  - _Requirements: 9.1_

- [x] 1.14 Implement error handling (API spec task 16)
  - **Execute:** API spec task 16 (all subtasks 16.1-16.3)
  - Status: ✅ Complete
  - Global error handler with consistent JSON format
  - Zod validation error handling
  - Request ID tracking for all errors
  - Never exposes internal details in 500 errors
  - All 133 tests passing (7 new error handler tests)
  - _Requirements: 8.4, 8.6_

- [x] 1.15 Implement security middleware (API spec task 17)
  - **Execute:** API spec task 17 (all subtasks 17.1-17.3)
  - Status: ✅ Complete
  - Helmet configured with CSP, XSS protection, frame options
  - CORS configured with allowed origins and credentials
  - Trust proxy enabled for Railway deployment
  - All 141 tests passing (8 new security tests)
  - _Requirements: 10.2, 10.3_

- [x] 1.16 Configure logging (API spec task 18)
  - **Execute:** API spec task 18
  - Status: ✅ Complete
  - Pino structured JSON logging configured
  - Sensitive data redaction (passwords, tokens, secrets)
  - Environment-specific log levels (silent/debug/info)
  - Pretty printing in development mode
  - All 146 tests passing (5 new logger tests)
  - _Requirements: 10.6_

- [x] 1.17 Create Railway deployment config (API spec task 19)
  - **Execute:** API spec task 19 (all subtasks 19.1-19.2)
  - Status: ✅ Complete
  - Created Dockerfile with multi-stage build (Node 20 Alpine)
  - Created migration script (scripts/migrate.sh) with pgvector verification
  - Added railway.json configuration file
  - Updated DEPLOYMENT.md with Docker deployment instructions
  - Added .dockerignore for optimized builds
  - All 149 tests passing
  - _Requirements: All_

- [x] 1.18 Final checkpoint (API spec task 20)
  - **Execute:** API spec task 20
  - Status: ✅ Complete
  - All 149 tests passing (18 test files)
  - API Server fully functional and ready for deployment
  - Test: /health endpoint, auth flow, project CRUD, document upload, pgvector search
  - _Requirements: 4.1_


## Phase 2: Voice Agent Minimal (No RAG)

**Overview:** Build real-time voice pipeline using LiveKit Agents 1.0+ framework. AgentSession handles STT→LLM→TTS automatically.

- [x] 2.1 Set up project structure (Voice Agent spec task 1)
  - **Execute:** Voice Agent spec task 1
  - Status: ✅ Complete
  - Created Python package structure with src/ and tests/
  - Installed livekit-agents[silero,turn-detector]~=1.2 with Python 3.12
  - Configured pyproject.toml, requirements.txt, pytest.ini
  - Created .env.example with all required environment variables
  - Created comprehensive README.md with setup instructions
  - All 7 setup tests passing
  - _Requirements: 11.3_

- [x] 2.2 Implement data models (Voice Agent spec task 2)
  - **Execute:** Voice Agent spec task 2 (all subtasks 2.1)
  - Status: ✅ Complete
  - Created dataclasses for Session, PageContext, Turn, DocumentChunk, Context
  - Created Pydantic validation models for PageContextInput, ProjectMetadata, RAGQuery
  - All 31 tests passing (24 model tests + 7 setup tests)
  - _Requirements: 2.1, 10.1_

- [x] 2.3 Implement entrypoint function (Voice Agent spec task 4)
  - **Execute:** Voice Agent spec task 4 (all subtasks 4.1)
  - Status: ✅ Complete
  - Created entrypoint.py with async entrypoint(ctx: JobContext)
  - Initialized AgentSession with LiveKit Inference models:
    - STT: deepgram/nova-2-general
    - LLM: openai/gpt-4o-mini
    - TTS: openai/tts-1
    - VAD: Silero
  - Implemented project_id extraction from room metadata with validation
  - Created simple Agent with conversational instructions (no RAG tool yet)
  - All 45 tests passing (11 entrypoint tests + 27 model tests + 7 setup tests)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.4 Implement session state management (Voice Agent spec task 6)
  - **Execute:** Voice Agent spec task 6 (all subtasks 6.1)
  - Status: ✅ Complete
  - Created SessionManager class for conversation state management
  - Implemented session CRUD operations in PostgreSQL
  - Implemented conversation history tracking (last 3 turns)
  - Implemented API logging with httpx
  - All 57 tests passing (12 session manager tests)
  - Store conversation state in PostgreSQL
  - _Requirements: 2.1, 9.2_

- [x] 2.5 Implement data channel handling (Voice Agent spec task 7)
  - **Execute:** Voice Agent spec task 7 (all subtasks 7.1)
  - Status: ✅ Complete
  - Implemented data channel handler in entrypoint
  - Receives and validates page context from widget via data channel
  - Stores page context in memory for agent access
  - Validates URLs and blocks internal addresses (SSRF protection)
  - All 62 tests passing (5 new data channel tests)
  - _Requirements: 2.1_

- [x] 2.6 Implement error handling (Voice Agent spec task 8)
  - **Execute:** Voice Agent spec task 8 (all subtasks 8.1)
  - Status: ✅ Complete
  - Added comprehensive error handling to entrypoint function
  - Added error handling to session_manager (create, get, add_turn)
  - Implemented proper error logging with structured context
  - Transient errors (data channel) logged but don't interrupt session
  - Permanent errors (invalid project_id, connection failures) logged and raised
  - All 72 tests passing (10 new error handling tests)
  - Framework handles pipeline errors automatically
  - _Requirements: 1.5_

- [x] 2.7 Implement logging (Voice Agent spec task 9)
  - **Execute:** Voice Agent spec task 9
  - Status: ✅ Complete
  - Created logging_config.py with structlog integration
  - Configured JSON logging for production, pretty-printing for development
  - Added context binding (session_id, project_id) via contextvars
  - Environment-based log level configuration (LOG_LEVEL env var)
  - All 88 tests passing (15 new logging tests)
  - _Requirements: 8.1, 8.2_

- [x] 2.8 Implement input validation (Voice Agent spec task 10)
  - **Execute:** Voice Agent spec task 10 (all subtasks 10.1)
  - Status: ✅ Complete
  - Created validation.py with comprehensive input validation utilities
  - Implemented 10KB size limit for page context and data channel messages
  - Integrated validation into entrypoint for page context and project metadata
  - All 115 tests passing (27 new validation tests)
  - _Requirements: 10.1_

- [x] 2.9 Implement environment validation (Voice Agent spec task 11)
  - **Execute:** Voice Agent spec task 11
  - Status: ✅ Complete
  - Created config.py with pydantic-settings for environment validation
  - Validates all required vars: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, DATABASE_URL, OPENAI_API_KEY
  - Fail-fast with clear error messages on startup
  - All 142 tests passing (27 new config tests)
  - _Requirements: 11.3_

- [x] 2.10 Implement main entry point (Voice Agent spec task 12)
  - **Execute:** Voice Agent spec task 12 (all subtasks 12.1)
  - Status: ✅ Complete
  - Created main.py with cli.run_app() and WorkerOptions
  - Integrated config loading and logging configuration
  - Framework handles worker lifecycle automatically
  - All 150 tests passing (8 new main tests)
  - Use agents.cli.run_app() with WorkerOptions
  - _Requirements: 11.3_

- [x] 2.11 Checkpoint (Voice Agent spec task 13)
  - **Execute:** Voice Agent spec task 13
  - Status: ✅ Complete
  - All 150 tests passing across 9 test files
  - Core voice agent modules complete and ready for integration
  - Test: Connect to LiveKit, speak, verify transcript, LLM response, TTS audio
  - Measure latency (target <500ms P95)
  - Framework handles STT→LLM→TTS automatically!
  - _Requirements: 4.1_


## Phase 3: Widget Minimal

**Overview:** Build embeddable UI that connects to LiveKit and sends page context.

- [x] 3.1 Set up project structure (Widget spec task 1)
  - **Execute:** Widget spec task 1
  - Status: ✅ Complete
  - Created Vite project with vanilla JS
  - Configured IIFE bundle format with Terser minification
  - 5 setup tests passing
  - _Requirements: 7.1, 7.2_

- [x] 3.2 Implement widget initializer (Widget spec task 2)
  - **Execute:** Widget spec task 2 (all subtasks 2.1-2.3)
  - Status: ✅ Complete
  - Created config parser with token validation
  - Created Shadow DOM container with style isolation
  - 44 tests passing
  - _Requirements: 1.1, 1.3_

- [x] 3.3 Implement button component (Widget spec task 3)
  - **Execute:** Widget spec task 3 (all subtasks 3.1-3.2)
  - Status: ✅ Complete
  - Created floating button with mic icon (#3B82F6)
  - Implemented mic permission request/release
  - 61 tests passing
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.4 Implement voice UI component (Widget spec task 4)
  - **Execute:** Widget spec task 4 (all subtasks 4.1-4.3)
  - Status: ✅ Complete
  - Created voice UI with waveform canvas and close button
  - Implemented waveform visualization with Canvas API
  - 91 tests passing
  - _Requirements: 3.1, 5.1_

- [x] 3.5 Implement audio processor (Widget spec task 5)
  - **Execute:** Widget spec task 5 (all subtasks 5.1)
  - Status: ✅ Complete
  - Created AudioContext with AnalyserNode
  - Implemented mic and remote audio processors
  - 108 tests passing
  - _Requirements: 3.1, 3.2_

- [x] 3.6 Implement LiveKit manager (Widget spec task 6)
  - **Execute:** Widget spec task 6 (all subtasks 6.1-6.7)
  - Status: ✅ Complete
  - Implemented lazy SDK loading, token validation, room connection
  - Audio track publishing/subscription, data channel, graceful disconnect
  - 121 tests passing
  - _Requirements: 2.5, 4.1, 5.1, 5.4, 6.1, 6.2, 7.2, 7.3_

- [x] 3.7 Implement error handling (Widget spec task 7)
  - **Execute:** Widget spec task 7 (all subtasks 7.1-7.3)
  - Status: ✅ Complete
  - Created error classification and user-friendly messages
  - Implemented safeExecute wrapper for error isolation
  - 144 tests passing
  - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.5_

- [x] 3.8 Checkpoint (Widget spec task 8)
  - **Execute:** Widget spec task 8
  - Status: ✅ Complete
  - All 144 tests passing across 10 test files
  - Widget bundle: 5.1KB gzipped (LiveKit SDK loads from CDN)
  - _Requirements: 4.1_

- [x] 3.9 Optimize bundle size (Widget spec task 9)
  - **Execute:** Widget spec task 9 (all subtasks 9.1-9.2)
  - Status: ✅ Complete
  - Widget bundle: 5.1KB gzipped (well under 100KB target)
  - LiveKit SDK loaded from CDN on demand (~120KB)
  - Total on-demand: ~125KB (acceptable for lazy-loaded SDK)
  - _Requirements: 7.1_

- [x] 3.10 Create deployment config (Widget spec task 10)
  - **Execute:** Widget spec task 10 (all subtasks 10.1-10.2)
  - Status: ✅ Complete
  - Created wrangler.toml for Cloudflare R2
  - Created deploy.sh script with cache headers
  - Created README.md with integration docs
  - _Requirements: 7.5_

- [x] 3.11 Final checkpoint (Widget spec task 12)
  - **Execute:** Widget spec task 12
  - Status: ✅ Complete
  - All 144 tests passing across 10 test files
  - Widget bundle: 5.1KB gzipped
  - All core functionality implemented
  - _Requirements: 4.1_


## Phase 4: Voice Agent RAG Integration

**Overview:** Add RAG tool to Agent for document-based answers. This is the only custom logic we need to add!

- [ ] 4.1 Implement RAG service (Voice Agent spec task 3)
  - **Execute:** Voice Agent spec task 3 (all subtasks 3.1)
  - Implement PostgreSQL connection with pgvector
  - Implement vector similarity search with projectId filtering
  - Return top 3 relevant chunks formatted as string
  - _Requirements: 2.2, 2.3_

- [ ] 4.2 Implement Agent with RAG tool (Voice Agent spec task 5)
  - **Execute:** Voice Agent spec task 5 (all subtasks 5.1)
  - Define Agent with knowledge grounding instructions
  - Implement @agent.function() decorator for search_knowledge tool
  - Let LLM decide when to use the tool
  - _Requirements: 2.4, 3.1, 3.4_

- [ ] 4.3 Update session management for conversation logging
  - **Execute:** Update Voice Agent spec task 6 to add API logging
  - Log all turns to API server
  - _Requirements: 2.1, 9.2_

- [ ] 4.4 Create Railway deployment config (Voice Agent spec task 14)
  - **Execute:** Voice Agent spec task 14
  - Use built-in CLI health checks
  - _Requirements: 11.1, 11.2_

- [ ] 4.5 Add documentation (Voice Agent spec task 15)
  - **Execute:** Voice Agent spec task 15
  - Document LiveKit Inference model descriptors
  - Add architecture diagram showing AgentSession
  - _Requirements: All_

- [ ] 4.6 Final checkpoint (Voice Agent spec task 16)
  - **Execute:** Voice Agent spec task 16
  - Test: Upload document via API, ask question via widget, verify RAG response
  - Verify conversation logged in API
  - Framework handles entire voice pipeline automatically!
  - _Requirements: 4.1_


## Phase 5: Dashboard

**Overview:** Build management UI for developers to create projects and upload documents.

- [ ] 5.1 Set up Next.js project (Dashboard spec task 1)
  - **Execute:** Dashboard spec task 1
  - _Requirements: All_

- [ ] 5.2 Implement authentication (Dashboard spec task 3)
  - **Execute:** Dashboard spec task 3 (all subtasks 3.1)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 5.3 Create API client (Dashboard spec task 4)
  - **Execute:** Dashboard spec task 4
  - _Requirements: 2.1, 2.3, 2.5, 4.1, 4.4, 4.6, 6.1, 7.2, 7.3_

- [ ] 5.4 Implement layout (Dashboard spec task 5)
  - **Execute:** Dashboard spec task 5
  - _Requirements: 9.1, 9.2_

- [ ] 5.5 Build projects list page (Dashboard spec task 6)
  - **Execute:** Dashboard spec task 6
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 5.6 Implement create project dialog (Dashboard spec task 7)
  - **Execute:** Dashboard spec task 7
  - _Requirements: 2.2, 2.3_

- [ ] 5.7 Build project detail page (Dashboard spec task 8)
  - **Execute:** Dashboard spec task 8 (all subtasks 8.1)
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ] 5.8 Implement documents tab (Dashboard spec task 9)
  - **Execute:** Dashboard spec task 9
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 5.9 Implement document status display (Dashboard spec task 10)
  - **Execute:** Dashboard spec task 10
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5.10 Build conversations tab (Dashboard spec task 11)
  - **Execute:** Dashboard spec task 11
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 5.11 Implement conversation detail page (Dashboard spec task 12)
  - **Execute:** Dashboard spec task 12
  - _Requirements: 6.4_

- [ ] 5.12 Implement toast notifications (Dashboard spec task 13)
  - **Execute:** Dashboard spec task 13
  - _Requirements: 3.3, 7.4, 10.1_

- [ ] 5.13 Implement error handling (Dashboard spec task 14)
  - **Execute:** Dashboard spec task 14
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 5.14 Implement delete project (Dashboard spec task 15)
  - **Execute:** Dashboard spec task 15
  - _Requirements: 2.5_

- [ ] 5.15 Configure deployment (Dashboard spec task 17)
  - **Execute:** Dashboard spec task 17
  - _Requirements: All_

- [ ] 5.16 Final checkpoint (Dashboard spec task 18)
  - **Execute:** Dashboard spec task 18
  - Test: Sign up, create project, upload document, view conversations
  - _Requirements: 4.1_


## Phase 6: Deployment & Final Validation

- [ ] 6.1 Deploy API Server to Railway
  - Use API spec task 19 deployment config
  - Configure environment variables
  - Deploy from GitHub
  - Verify /health endpoint returns 200
  - _Requirements: 9.4_

- [ ] 6.2 Deploy Voice Agent to Railway
  - Use Voice Agent spec task 16 deployment config
  - Configure environment variables
  - Deploy from GitHub
  - Verify /health endpoint returns 200
  - _Requirements: 9.4_

- [ ] 6.3 Deploy Dashboard to Cloudflare Pages
  - Use Dashboard spec task 17 deployment config
  - Connect GitHub repository
  - Configure build settings (Next.js)
  - Configure environment variables
  - Verify dashboard loads and connects to API
  - _Requirements: 9.4_

- [ ] 6.4 Deploy Widget to CDN
  - Use Widget spec task 10 deployment config
  - Build widget bundle
  - Upload to Cloudflare R2 or CDN
  - Configure caching headers (1 hour TTL)
  - Verify widget loads from CDN
  - _Requirements: 9.4_

- [ ] 6.5 End-to-End Production Test
  - Sign up on production dashboard
  - Create project, upload document
  - Copy embed code, test on external website
  - Speak to widget, verify RAG response
  - Check conversation logs in dashboard
  - Verify all services are stable
  - Ensure all tests pass, ask the user if questions arise

