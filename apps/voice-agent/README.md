# Vakkya Voice Agent Service

Real-time voice interaction service built with LiveKit Agents SDK 1.0+. Handles STT→LLM→TTS pipeline with RAG integration for document-based answers.

## Architecture

The Voice Agent uses LiveKit's AgentSession which automatically handles:
- **STT**: Speech-to-Text via LiveKit Inference (AssemblyAI, Deepgram)
- **LLM**: Language model via LiveKit Inference (OpenAI GPT-4o-mini)
- **TTS**: Text-to-Speech via LiveKit Inference (Cartesia, ElevenLabs)
- **VAD**: Voice Activity Detection (Silero)
- **Turn Detection**: Multilingual conversation turn boundaries

Our custom logic:
- **RAG Service**: PostgreSQL pgvector search for document retrieval
- **Agent Tool**: `search_knowledge()` function for LLM to query documents
- **Session Management**: Conversation state and API logging

## Setup

### Prerequisites

- Python 3.12+
- PostgreSQL 17 with pgvector extension
- LiveKit Cloud account
- OpenAI API key (for embeddings only)

### Installation

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LIVEKIT_URL` | LiveKit server WebSocket URL | `wss://your-instance.livekit.cloud` |
| `LIVEKIT_API_KEY` | LiveKit API key | `APIxxxxx` |
| `LIVEKIT_API_SECRET` | LiveKit API secret | `secret123` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `OPENAI_API_KEY` | OpenAI API key (embeddings) | `sk-xxxxx` |
| `API_SERVER_URL` | Vakkya API server URL | `http://localhost:3000` |
| `LOG_LEVEL` | Logging level | `INFO` or `DEBUG` |
| `ENVIRONMENT` | Environment name | `development` or `production` |

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black src/ tests/
```

### Linting

```bash
ruff check src/ tests/
```

## Running the Service

### Local Development

```bash
python -m src.main
```

The service validates all required environment variables on startup and fails fast with clear error messages if any are missing or invalid.

### Railway Deployment

The service is configured for Railway deployment with automatic health checks.

#### Deployment Steps

1. **Connect Repository**: Link your GitHub repository to Railway

2. **Configure Service**: Railway will auto-detect the `railway.json` configuration

3. **Set Environment Variables** in Railway dashboard:
   ```
   LIVEKIT_URL=wss://your-instance.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   DATABASE_URL=postgresql://user:pass@host:5432/vakkya
   OPENAI_API_KEY=sk-xxxxx
   API_SERVER_URL=https://your-api.railway.app
   LOG_LEVEL=INFO
   ENVIRONMENT=production
   ```

4. **Deploy**: Railway will build the Docker image and start the service

5. **Verify**: Check the `/health` endpoint returns 200

#### Health Checks

The LiveKit Agents CLI provides built-in health check endpoints:
- `GET /health` - Basic health check (returns 200 if worker is running)

Railway is configured to check `/health` with a 300-second timeout to allow for initial model loading.

## Project Structure

```
apps/voice-agent/
├── src/
│   ├── __init__.py
│   ├── main.py              # Application entry point
│   ├── entrypoint.py        # LiveKit agent entrypoint
│   ├── config.py            # Environment configuration
│   ├── models.py            # Data models
│   ├── rag_service.py       # RAG vector search
│   ├── session_manager.py   # Session state management
│   └── logging_config.py    # Structured logging
├── tests/
│   ├── __init__.py
│   └── test_*.py            # Test files
├── requirements.txt         # Python dependencies
├── pyproject.toml          # Project configuration
├── pytest.ini              # Pytest configuration
├── .env.example            # Environment template
└── README.md               # This file
```

## Performance Targets

- **STT Latency**: <300ms (P95)
- **pgvector Query**: <100ms (P95)
- **LLM First Token**: <200ms (P95)
- **TTS First Byte**: <200ms (P95)
- **Total Pipeline**: <500ms (P95)

## Key Features

- ✅ Automatic STT→LLM→TTS pipeline via AgentSession
- ✅ RAG integration with PostgreSQL pgvector
- ✅ Interruption handling (user can interrupt agent)
- ✅ Page context awareness (receives URL from widget)
- ✅ Conversation logging to API server
- ✅ Structured JSON logging
- ✅ Health check endpoints for Railway
- ✅ Environment validation on startup

## LiveKit Inference Models

The service uses LiveKit Inference with string descriptors for easy provider switching:

- **STT**: `"assemblyai/universal-streaming:en"` or `"deepgram/nova-2"`
- **LLM**: `"openai/gpt-4o-mini"` or `"openai/gpt-4o"`
- **TTS**: `"cartesia/sonic-3:voice-id"` or `"elevenlabs/eleven_turbo_v2"`

No need for separate API keys - LiveKit Inference handles all model access!

## License

Proprietary - Vakkya
