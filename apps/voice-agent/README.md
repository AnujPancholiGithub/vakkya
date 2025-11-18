# Vakkya Voice Agent Service

Real-time voice interaction service built with LiveKit Agents SDK, OpenAI GPT-4o, and PostgreSQL pgvector.

## Overview

The Voice Agent Service orchestrates real-time voice conversations with sub-500ms latency:
- **STT**: LiveKit's built-in speech-to-text
- **LLM**: OpenAI GPT-4o for intelligent responses
- **TTS**: LiveKit's built-in text-to-speech
- **RAG**: PostgreSQL pgvector for document-based context

## Architecture

```
User speaks → AgentSession (STT/VAD/Turn Detection) → VakkyaAgent.on_user_turn_completed() 
→ RAG Service (pgvector) → turn_ctx.add_message() → AgentSession (LLM/TTS) → User hears
```

**Key Components:**
- **AgentSession**: Manages STT/LLM/TTS pipeline, VAD, and turn detection
- **VakkyaAgent**: Agent subclass with lifecycle hooks for RAG injection
- **RAG Service**: PostgreSQL pgvector search for document retrieval

## Setup

### Prerequisites

- Python 3.12+
- PostgreSQL 17 with pgvector extension
- LiveKit account
- OpenAI API key

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

### Environment Variables

See `.env.example` for all required variables:

- `LIVEKIT_URL`: Your LiveKit server URL (wss://...)
- `LIVEKIT_API_KEY`: LiveKit API key
- `LIVEKIT_API_SECRET`: LiveKit API secret
- `OPENAI_API_KEY`: OpenAI API key
- `DATABASE_URL`: PostgreSQL connection string
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
- `ENVIRONMENT`: Environment name (development, production, test)
- `API_SERVER_URL`: API server base URL for conversation logging

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_config.py
```

### Code Formatting

```bash
# Format code
black src tests

# Lint code
ruff check src tests
```

## Deployment

See Railway deployment configuration in `railway.json`.

### Health Check

The service exposes a `/health` endpoint for monitoring:

```bash
curl http://localhost:8080/health
# Response: {"status": "ok"}
```

## Project Structure

```
apps/voice-agent/
├── src/
│   ├── __init__.py
│   ├── config.py              # Environment configuration
│   ├── models.py              # Data models (SessionUserData, PageContext, Turn)
│   ├── agent.py               # VakkyaAgent (Agent subclass)
│   ├── rag_service.py         # RAG with pgvector
│   ├── entrypoint.py          # AgentSession configuration
│   ├── conversation_logger.py # Log turns to API
│   ├── logging_config.py      # Logging setup
│   ├── health.py              # Health check endpoint
│   └── main.py                # Application entry (CLI)
├── tests/
│   └── ...
├── requirements.txt
├── pyproject.toml
├── .env.example
└── README.md
```

## Performance

Target latencies (P95):
- STT finalization: <300ms
- pgvector query: <100ms
- LLM first token: <200ms
- TTS first audio: <200ms
- **Total pipeline: <500ms**

## Development Guidelines

**Important:** Always verify implementation patterns against official LiveKit documentation.

See `.kiro/specs/voice-agent/WORKING_MODE.md` for:
- Official documentation sources
- Verification workflow
- Common patterns and anti-patterns
- Testing checklist

**Key Documentation:**
- Building Agents: https://docs.livekit.io/agents/build/
- Sessions: https://docs.livekit.io/agents/build/sessions/
- External Data (RAG): https://docs.livekit.io/agents/build/external-data/
- Function Tools: https://docs.livekit.io/agents/build/tools/
- Turn Detection: https://docs.livekit.io/agents/build/turns/

## License

See LICENSE file in repository root.
