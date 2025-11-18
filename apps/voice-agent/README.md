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
User speaks → LiveKit STT → Query pgvector → OpenAI GPT-4o → LiveKit TTS → User hears
```

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
│   ├── config.py          # Environment configuration
│   ├── models.py          # Data models
│   ├── agent.py           # Agent orchestrator
│   ├── stt_handler.py     # STT processing
│   ├── llm_service.py     # LLM integration
│   ├── tts_handler.py     # TTS processing
│   ├── rag_service.py     # RAG with pgvector
│   ├── session_manager.py # Session state
│   ├── logging_config.py  # Logging setup
│   ├── health.py          # Health check
│   └── main.py            # Application entry
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

## License

See LICENSE file in repository root.
