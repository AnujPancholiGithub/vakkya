# Requirements Document

## Introduction

This specification defines structured logging enhancements for Vakkya to track voice latency, conversation metrics, and LLM costs using the existing Pino (API) and Python logging (Voice Agent) infrastructure. This is a Phase 2 enhancement that adds observability without introducing new external tools or services.

The goal is to provide actionable metrics for:
- Voice pipeline latency (STT → LLM → TTS)
- Conversation completion and quality
- LLM token usage and cost estimation
- RAG retrieval performance

## Glossary

- **Voice Pipeline**: The complete flow from user speech to agent response (STT → RAG → LLM → TTS)
- **Turn**: A single user query and agent response pair within a conversation
- **Latency**: Time elapsed between pipeline stages, measured in milliseconds
- **P95 Latency**: The 95th percentile latency value (95% of requests complete faster)
- **RAG Hit**: A knowledge base search that returns relevant document chunks
- **Token**: A unit of text processed by the LLM (approximately 4 characters)
- **Structured Log**: JSON-formatted log entry with consistent field names for machine parsing

## Requirements

### Requirement 1: Voice Pipeline Latency Tracking

**User Story:** As a developer, I want to track latency at each stage of the voice pipeline, so that I can identify bottlenecks and ensure <500ms response time.

#### Acceptance Criteria

1. WHEN a user utterance is received THEN the Voice Agent SHALL log a timestamp marking STT start
2. WHEN STT transcription completes THEN the Voice Agent SHALL log STT duration in milliseconds
3. WHEN RAG search completes THEN the Voice Agent SHALL log RAG query duration in milliseconds
4. WHEN LLM response generation completes THEN the Voice Agent SHALL log LLM duration and token counts
5. WHEN TTS audio generation completes THEN the Voice Agent SHALL log TTS duration in milliseconds
6. WHEN a complete turn finishes THEN the Voice Agent SHALL log total end-to-end latency in milliseconds

### Requirement 2: Conversation Metrics Logging

**User Story:** As a developer, I want to track conversation-level metrics, so that I can measure user engagement and conversation quality.

#### Acceptance Criteria

1. WHEN a conversation starts THEN the Voice Agent SHALL log conversation start with project_id and session_id
2. WHEN a conversation ends THEN the Voice Agent SHALL log conversation duration and total turn count
3. WHEN a turn completes THEN the Voice Agent SHALL log turn sequence number and user query length
4. WHEN an interruption occurs THEN the Voice Agent SHALL log interruption event with context
5. WHEN a conversation ends abnormally THEN the Voice Agent SHALL log termination reason

### Requirement 3: LLM Cost Tracking

**User Story:** As a developer, I want to track LLM token usage per conversation, so that I can estimate costs and optimize prompts.

#### Acceptance Criteria

1. WHEN an LLM request completes THEN the Voice Agent SHALL log input token count
2. WHEN an LLM request completes THEN the Voice Agent SHALL log output token count
3. WHEN an LLM request completes THEN the Voice Agent SHALL log the model identifier used
4. WHEN a conversation ends THEN the Voice Agent SHALL log cumulative token totals for the session

### Requirement 4: RAG Performance Metrics

**User Story:** As a developer, I want to track RAG retrieval performance, so that I can measure knowledge base effectiveness.

#### Acceptance Criteria

1. WHEN a RAG search executes THEN the Voice Agent SHALL log query embedding generation time
2. WHEN a RAG search returns results THEN the Voice Agent SHALL log result count and top similarity score
3. WHEN a RAG search returns no results THEN the Voice Agent SHALL log a RAG miss event
4. WHEN a RAG search fails THEN the Voice Agent SHALL log error details without exposing sensitive data

### Requirement 5: API Request Logging Enhancement

**User Story:** As a developer, I want enhanced API request logging, so that I can correlate API calls with voice sessions.

#### Acceptance Criteria

1. WHEN an API request is received THEN the API Server SHALL log request duration in milliseconds
2. WHEN a widget token validation occurs THEN the API Server SHALL log validation result and project_id
3. WHEN a conversation turn is logged via API THEN the API Server SHALL include session correlation ID
4. WHEN an API error occurs THEN the API Server SHALL log error category and sanitized details

### Requirement 6: Log Format Standardization

**User Story:** As a developer, I want consistent log formats across services, so that I can aggregate and query logs effectively.

#### Acceptance Criteria

1. THE Voice Agent SHALL use JSON-formatted logs with consistent field naming
2. THE API Server SHALL use JSON-formatted logs with consistent field naming
3. WHEN logging latency metrics THEN both services SHALL use the field name `duration_ms` for millisecond values
4. WHEN logging identifiers THEN both services SHALL use consistent field names: `project_id`, `session_id`, `conversation_id`, `turn_id`
5. WHEN logging events THEN both services SHALL include an `event_type` field for categorization
