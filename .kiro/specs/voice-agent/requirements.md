# Requirements Document - Voice Agent Service (Simplified MVP)

## Introduction

The Voice Agent Service is a Python-based real-time voice interaction system that enables low-latency conversations between users and an AI assistant. The service uses LiveKit's built-in STT and TTS, OpenAI for LLM, and PostgreSQL pgvector for RAG. This MVP version focuses on core functionality with simplified architecture.

## Glossary

- **Voice Agent Service**: The Python application orchestrating voice interactions
- **LiveKit**: Cloud-based WebRTC infrastructure with built-in STT/TTS
- **STT (Speech-to-Text)**: LiveKit's built-in speech recognition
- **LLM (Large Language Model)**: OpenAI GPT-4o for generating responses
- **TTS (Text-to-Speech)**: LiveKit's built-in speech synthesis
- **RAG (Retrieval-Augmented Generation)**: Vector search combined with LLM
- **VAD (Voice Activity Detection)**: Detection of when user finishes speaking
- **Data Channel**: LiveKit mechanism for sending page context
- **Session**: A single voice conversation instance
- **Context**: Combined information including user query, page data, and vector search results
- **pgvector**: PostgreSQL extension for vector similarity search

## Requirements

### Requirement 1

**User Story:** As a website visitor, I want to speak naturally to the voice agent, so that I can get information without typing.

#### Acceptance Criteria

1. WHEN a user speaks into their microphone THEN the Voice Agent Service SHALL stream audio to LiveKit STT
2. WHEN LiveKit processes audio THEN the Voice Agent Service SHALL receive transcript chunks
3. WHEN VAD detects end-of-turn THEN the Voice Agent Service SHALL finalize the transcript within 300ms
4. WHEN the transcript is finalized THEN the Voice Agent Service SHALL preserve the complete user utterance
5. WHEN audio streaming encounters errors THEN the Voice Agent Service SHALL log the error and maintain session stability

### Requirement 2

**User Story:** As a website visitor, I want the agent to understand my question in context of the page I'm viewing, so that I receive relevant answers.

#### Acceptance Criteria

1. WHEN the widget sends page context via data channel THEN the Voice Agent Service SHALL receive and store the context
2. WHEN a user query is finalized THEN the Voice Agent Service SHALL query PostgreSQL pgvector with the user's question within 100ms
3. WHEN pgvector returns results THEN the Voice Agent Service SHALL extract relevant document chunks
4. WHEN building LLM context THEN the Voice Agent Service SHALL combine user query, page context, and vector search results

### Requirement 3

**User Story:** As a website visitor, I want to receive intelligent responses to my questions, so that I can accomplish my goals.

#### Acceptance Criteria

1. WHEN the Voice Agent Service sends a request to OpenAI THEN the system SHALL include the combined context in the prompt
2. WHEN OpenAI streams response tokens THEN the Voice Agent Service SHALL forward tokens to TTS immediately
3. WHEN the LLM generates a response THEN the Voice Agent Service SHALL receive the first token within 200ms
4. WHEN the system prompt is constructed THEN the Voice Agent Service SHALL enforce knowledge grounding rules

### Requirement 4

**User Story:** As a website visitor, I want to hear the agent's response in natural-sounding speech, so that the conversation feels human-like.

#### Acceptance Criteria

1. WHEN the Voice Agent Service receives LLM tokens THEN the system SHALL stream them to LiveKit TTS
2. WHEN LiveKit processes text THEN the Voice Agent Service SHALL receive audio within 200ms

### Requirement 5

**User Story:** As a website visitor, I want to interrupt the agent when needed, so that I can redirect the conversation naturally.

#### Acceptance Criteria

1. WHEN a user starts speaking during agent response THEN the Voice Agent Service SHALL detect the interruption via VAD
2. WHEN an interruption is detected THEN the Voice Agent Service SHALL cancel ongoing TTS streaming immediately
3. WHEN the interruption is processed THEN the Voice Agent Service SHALL begin processing the new user input

### Requirement 6

**User Story:** As a developer, I want the voice agent to maintain low latency, so that conversations feel natural.

#### Acceptance Criteria

1. WHEN measuring STT latency THEN the Voice Agent Service SHALL complete transcription within 300ms after speech ends (P95)
2. WHEN measuring pgvector query latency THEN the Voice Agent Service SHALL complete vector search within 100ms (P95)
3. WHEN measuring LLM latency THEN the Voice Agent Service SHALL receive first token within 200ms (P95)
4. WHEN measuring TTS latency THEN the Voice Agent Service SHALL receive first audio byte within 200ms (P95)
5. WHEN measuring total pipeline latency THEN the Voice Agent Service SHALL complete end-to-end processing within 500ms (P95)

### Requirement 7

**User Story:** As a developer, I want the voice agent to be maintainable, so that I can modify it easily.

#### Acceptance Criteria

1. WHEN integrating LiveKit STT THEN the Voice Agent Service SHALL encapsulate STT logic behind an adapter interface
2. WHEN integrating OpenAI THEN the Voice Agent Service SHALL encapsulate LLM logic behind an adapter interface
3. WHEN integrating LiveKit TTS THEN the Voice Agent Service SHALL encapsulate TTS logic behind an adapter interface
4. WHEN integrating pgvector THEN the Voice Agent Service SHALL encapsulate vector search logic behind an adapter interface

### Requirement 8

**User Story:** As a system administrator, I want comprehensive logging, so that I can debug issues.

#### Acceptance Criteria

1. WHEN any pipeline stage executes THEN the Voice Agent Service SHALL emit structured JSON logs with timestamps
2. WHEN logging events THEN the Voice Agent Service SHALL include session ID and project ID in all log entries

### Requirement 9

**User Story:** As a system administrator, I want the voice agent to scale efficiently, so that I can handle concurrent conversations.

#### Acceptance Criteria

1. WHEN a session starts THEN the Voice Agent Service SHALL maintain stateless operation per session
2. WHEN session state is needed THEN the Voice Agent Service SHALL store state in PostgreSQL
3. WHEN multiple sessions are active THEN the Voice Agent Service SHALL use asyncio for concurrent operations

### Requirement 10

**User Story:** As a security-conscious administrator, I want the voice agent to validate inputs, so that the system remains secure.

#### Acceptance Criteria

1. WHEN receiving data from the widget THEN the Voice Agent Service SHALL validate all inputs before processing
2. WHEN logging or reporting errors THEN the Voice Agent Service SHALL never log API keys or tokens
3. WHEN connecting to LiveKit THEN the Voice Agent Service SHALL validate room tokens before joining

### Requirement 11

**User Story:** As a developer, I want health check endpoints, so that Railway can monitor service availability.

#### Acceptance Criteria

1. WHEN Railway requests health status THEN the Voice Agent Service SHALL expose a `/health` endpoint
2. WHEN the health endpoint is called THEN the Voice Agent Service SHALL return HTTP 200 if healthy
3. WHEN the service starts THEN the Voice Agent Service SHALL validate all required environment variables and fail fast if missing
