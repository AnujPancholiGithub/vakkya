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
  - Status: ✅ Complete
  - Created conversation service with CRUD operations
  - Implemented turn appending with atomic turnCount increment
  - All 107 tests passing (9 new conversation tests)
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 1.11 Implement conversation API routes (API spec task 13)
  - **Execute:** API spec task 13 (all subtasks 13.1-13.3)
  - Status: ✅ Complete
  - Created conversation REST endpoints with widget token validation
  - POST /conversations - Create conversation (voice agent)
  - POST /conversations/:id/turns - Add turn (voice agent)
  - GET /projects/:projectId/conversations - List conversations (dashboard)
  - GET /conversations/:id - Get conversation detail (dashboard)
  - All 117 tests passing (8 new conversation route tests)
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

- [ ] 1.17 Create Railway deployment config (API spec task 19)
  - **Execute:** API spec task 19 (all subtasks 19.1-19.2)
  - _Requirements: All_

- [ ] 1.18 Final checkpoint (API spec task 20)
  - **Execute:** API spec task 20
  - Test: /health endpoint, auth flow, project CRUD, document upload, pgvector search
  - _Requirements: 4.1_


## Phase 2: Voice Agent Minimal (No RAG)

**Overview:** Build real-time voice pipeline (STT → LLM → TTS) without RAG to validate LiveKit integration.

- [ ] 2.1 Set up project structure (Voice Agent spec task 1)
  - **Execute:** Voice Agent spec task 1
  - _Requirements: 12.4_

- [ ] 2.2 Implement data models (Voice Agent spec task 2)
  - **Execute:** Voice Agent spec task 2 (all subtasks 2.1)
  - _Requirements: 2.1, 11.1_

- [ ] 2.3 Implement STT handler (Voice Agent spec task 3)
  - **Execute:** Voice Agent spec task 3 (all subtasks 3.1)
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2.4 Implement LLM service (Voice Agent spec task 5)
  - **Execute:** Voice Agent spec task 5 (all subtasks 5.1)
  - **Note:** Skip RAG context for now, use simple prompt
  - _Requirements: 3.1, 3.4_

- [ ] 2.5 Implement TTS handler (Voice Agent spec task 6)
  - **Execute:** Voice Agent spec task 6 (all subtasks 6.1)
  - _Requirements: 4.1, 5.2_

- [ ] 2.6 Implement agent orchestrator (Voice Agent spec task 7)
  - **Execute:** Voice Agent spec task 7 (all subtasks 7.1)
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 2.7 Implement pipeline orchestration (Voice Agent spec task 8)
  - **Execute:** Voice Agent spec task 8 (all subtasks 8.1)
  - **Note:** Skip RAG query for now
  - _Requirements: 3.1, 3.2, 4.1_

- [ ] 2.8 Implement interruption handling (Voice Agent spec task 9)
  - **Execute:** Voice Agent spec task 9 (all subtasks 9.1)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 2.9 Implement error handling (Voice Agent spec task 10)
  - **Execute:** Voice Agent spec task 10 (all subtasks 10.1)
  - _Requirements: 1.5_

- [ ] 2.10 Implement logging (Voice Agent spec task 11)
  - **Execute:** Voice Agent spec task 11
  - _Requirements: 9.1, 9.2_

- [ ] 2.11 Implement input validation (Voice Agent spec task 12)
  - **Execute:** Voice Agent spec task 12 (all subtasks 12.1)
  - _Requirements: 11.1, 11.3_

- [ ] 2.12 Implement health check (Voice Agent spec task 13)
  - **Execute:** Voice Agent spec task 13
  - _Requirements: 12.1_

- [ ] 2.13 Implement main entry point (Voice Agent spec task 14)
  - **Execute:** Voice Agent spec task 14 (all subtasks 14.1)
  - _Requirements: 12.4_

- [ ] 2.14 Checkpoint (Voice Agent spec task 15)
  - **Execute:** Voice Agent spec task 15
  - Test: Connect to LiveKit, speak, verify transcript, LLM response, TTS audio
  - Measure latency (target <500ms P95)
  - _Requirements: 4.1_


## Phase 3: Widget Minimal

**Overview:** Build embeddable UI that connects to LiveKit and sends page context.

- [ ] 3.1 Set up project structure (Widget spec task 1)
  - **Execute:** Widget spec task 1
  - _Requirements: 7.1, 7.2_

- [ ] 3.2 Implement widget initializer (Widget spec task 2)
  - **Execute:** Widget spec task 2 (all subtasks 2.1-2.3)
  - _Requirements: 1.1, 1.3_

- [ ] 3.3 Implement button component (Widget spec task 3)
  - **Execute:** Widget spec task 3 (all subtasks 3.1-3.2)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3.4 Implement voice UI component (Widget spec task 4)
  - **Execute:** Widget spec task 4 (all subtasks 4.1-4.3)
  - _Requirements: 3.1, 5.1_

- [ ] 3.5 Implement audio processor (Widget spec task 5)
  - **Execute:** Widget spec task 5 (all subtasks 5.1)
  - _Requirements: 3.1, 3.2_

- [ ] 3.6 Implement LiveKit manager (Widget spec task 6)
  - **Execute:** Widget spec task 6 (all subtasks 6.1-6.7)
  - _Requirements: 2.5, 4.1, 5.1, 5.4, 6.1, 6.2, 7.2, 7.3_

- [ ] 3.7 Implement error handling (Widget spec task 7)
  - **Execute:** Widget spec task 7 (all subtasks 7.1-7.3)
  - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.5_

- [ ] 3.8 Checkpoint (Widget spec task 8)
  - **Execute:** Widget spec task 8
  - _Requirements: 4.1_

- [ ] 3.9 Optimize bundle size (Widget spec task 9)
  - **Execute:** Widget spec task 9 (all subtasks 9.1-9.2)
  - Verify bundle <100KB gzipped
  - _Requirements: 7.1_

- [ ] 3.10 Create deployment config (Widget spec task 10)
  - **Execute:** Widget spec task 10 (all subtasks 10.1-10.2)
  - _Requirements: 7.5_

- [ ] 3.11 Final checkpoint (Widget spec task 12)
  - **Execute:** Widget spec task 12
  - Test: Embed widget, click button, grant mic, speak, hear response, close
  - _Requirements: 4.1_


## Phase 4: Voice Agent RAG Integration

**Overview:** Connect Voice Agent to API's pgvector search to enable document-based answers.

- [ ] 4.1 Implement RAG service (Voice Agent spec task 4)
  - **Execute:** Voice Agent spec task 4 (all subtasks 4.1)
  - Implement PostgreSQL connection with pgvector
  - Implement vector similarity search
  - _Requirements: 2.2, 2.3_

- [ ] 4.2 Update pipeline orchestration with RAG
  - **Execute:** Update Voice Agent spec task 8 to include RAG query
  - Build context with page URL + RAG chunks + conversation history
  - _Requirements: 2.2, 3.1, 3.2_

- [ ] 4.3 Implement conversation logging to API
  - **Execute:** Add API logging to Voice Agent
  - Log all turns to API server
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4.4 Create Railway deployment config (Voice Agent spec task 16)
  - **Execute:** Voice Agent spec task 16
  - _Requirements: 12.1_

- [ ] 4.5 Add documentation (Voice Agent spec task 17)
  - **Execute:** Voice Agent spec task 17
  - _Requirements: All_

- [ ] 4.6 Final checkpoint (Voice Agent spec task 18)
  - **Execute:** Voice Agent spec task 18
  - Test: Upload document via API, ask question via widget, verify RAG response
  - Verify conversation logged in API
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

