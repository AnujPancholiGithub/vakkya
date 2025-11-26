# Vakkya Voice Agent Service

Real-time voice interaction service built with LiveKit Agents SDK 1.0+. Handles STT→LLM→TTS pipeline with RAG integration for document-based answers.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LiveKit Room                                       │
│  ┌─────────────┐                                    ┌─────────────────────┐ │
│  │   Widget    │◄──────── Audio/Data ──────────────►│   Voice Agent       │ │
│  │  (Browser)  │         (WebRTC)                   │   (Python Worker)   │ │
│  └─────────────┘                                    └──────────┬──────────┘ │
└─────────────────────────────────────────────────────────────────┼───────────┘
                                                                  │
                    ┌─────────────────────────────────────────────┼───────────┐
                    │                  AgentSession               │           │
                    │  ┌──────────────────────────────────────────▼────────┐  │
                    │  │                                                   │  │
                    │  │   ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐       │  │
                    │  │   │ VAD │───►│ STT │───►│ LLM │───►│ TTS │       │  │
                    │  │   │     │    │     │    │     │    │     │       │  │
                    │  │   └─────┘    └─────┘    └──┬──┘    └─────┘       │  │
                    │  │   Silero    AssemblyAI    │      Cartesia        │  │
                    │  │                           │                       │  │
                    │  └───────────────────────────┼───────────────────────┘  │
                    │                              │                          │
                    │                    ┌─────────▼─────────┐                │
                    │                    │  search_knowledge │                │
                    │                    │   (Agent Tool)    │                │
                    │                    └─────────┬─────────┘                │
                    └──────────────────────────────┼──────────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────┐
                    │                              │                          │
                    │  ┌───────────────────────────▼───────────────────────┐  │
                    │  │                    RAG Service                     │  │
                    │  │  ┌─────────────┐    ┌──────────────────────────┐  │  │
                    │  │  │   OpenAI    │    │      PostgreSQL          │  │  │
                    │  │  │  Embeddings │───►│  pgvector similarity     │  │  │
                    │  │  │  (1536 dim) │    │  search by projectId     │  │  │
                    │  │  └─────────────┘    └──────────────────────────┘  │  │
                    │  └───────────────────────────────────────────────────┘  │
                    │                                                         │
                    │                         Custom Logic                    │
                    └─────────────────────────────────────────────────────────┘
```

### Components

**LiveKit AgentSession** (automatic pipeline):
- **VAD**: Silero Voice Activity Detection - detects when user starts/stops speaking
- **STT**: AssemblyAI Universal Streaming - real-time speech-to-text
- **LLM**: OpenAI GPT-4o-mini - generates responses with tool calling
- **TTS**: Cartesia Sonic 3 - low-latency text-to-speech
- **Turn Detection**: Multilingual model for conversation boundaries

**Custom Logic** (our code):
- **RAG Service**: PostgreSQL pgvector search for document retrieval
- **Agent Tool**: `search_knowledge()` function for LLM to query documents
- **Session Management**: Conversation state and API logging

### Data Flow

1. User speaks → Widget captures audio → WebRTC to LiveKit Room
2. VAD detects speech → STT transcribes → Text to LLM
3. LLM decides to call `search_knowledge` tool → RAG queries pgvector
4. LLM generates response with RAG context → TTS synthesizes audio
5. Audio streams back to Widget → User hears response

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
python -m src.main dev
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

The service uses LiveKit Inference with string descriptors. LiveKit handles all API keys and provider authentication - you only need your LiveKit credentials.

### Model Descriptor Format

```
provider/model-name:variant
```

### Current Configuration

| Component | Descriptor | Provider | Notes |
|-----------|------------|----------|-------|
| STT | `assemblyai/universal-streaming:en` | AssemblyAI | Real-time streaming, English |
| LLM | `openai/gpt-4o-mini` | OpenAI | Fast, cost-effective, tool calling |
| TTS | `cartesia/sonic-3` | Cartesia | Ultra-low latency (~100ms) |
| VAD | `silero.VAD.load()` | Silero | Local, no API call |
| Turn Detection | `MultilingualModel()` | LiveKit | Conversation boundary detection |

### Alternative Models

**STT Options:**
- `deepgram/nova-2-general` - High accuracy, streaming
- `deepgram/nova-2-conversationalai` - Optimized for dialogue
- `assemblyai/universal-streaming:en` - Multi-accent support

**LLM Options:**
- `openai/gpt-4o` - Higher quality, slower
- `openai/gpt-4o-mini` - Faster, cheaper (current)
- `anthropic/claude-3-haiku` - Alternative provider

**TTS Options:**
- `cartesia/sonic-3` - Lowest latency (current)
- `elevenlabs/eleven_turbo_v2` - High quality voices
- `openai/tts-1` - Good quality, moderate latency

### Changing Models

Models are configured in `src/entrypoint.py`:

```python
# Model descriptors for LiveKit Inference
STT_MODEL = "assemblyai/universal-streaming:en"
LLM_MODEL = "openai/gpt-4o-mini"
TTS_MODEL = "cartesia/sonic-3"
```

To switch providers, simply change the string descriptor. No code changes needed beyond the constant.

## License

Proprietary - Vakkya
