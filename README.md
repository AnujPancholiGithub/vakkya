# Vakkya

<div align="center">
  <img src="apps/dashboard/public/logo.png" alt="Vakkya Logo" width="120" />
  <h3>Build voice agents in minutes, not months.</h3>
  <p>Transform any website into an interactive, voice-first experience with a single line of JavaScript.</p>

  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Fastify-4-000000?style=flat-square&logo=fastify" alt="Fastify" />
    <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python" alt="Python" />
    <img src="https://img.shields.io/badge/LiveKit-Agents-FF6B35?style=flat-square" alt="LiveKit" />
    <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  </p>
</div>

---

## Overview

**Vakkya** is a Voice AI platform that lets developers add conversational AI to any website with a single `<script>` tag. No backend code required, no WebRTC knowledge needed.

### Key Features

- **🎙️ Real-time Voice Agents** — Sub-500ms latency voice conversations powered by LiveKit and GPT-4o
- **📄 RAG-Powered Answers** — Upload PDFs, TXT, or Markdown files and get accurate answers from your docs
- **� CPonversational Forms** — Typeform-style voice forms with webhook delivery to 5000+ integrations
- **⚡ One-Line Integration** — Drop in a script tag and you're live
- **🎨 Developer Dashboard** — Manage projects, view conversations, build forms, configure agents

---

## How It Works

```html
<!-- Add to any website -->
<script src="https://cdn.vakkya.ai/widget.js" data-token="your-project-token"></script>
```

That's it. Your visitors can now talk to your AI agent.

---

## Architecture

```
vakkya/
├── apps/
│   ├── dashboard/     # Developer Console (Next.js 15, React 19)
│   ├── api/           # Backend API (Fastify, Prisma, PostgreSQL)
│   ├── voice-agent/   # AI Runtime (Python, LiveKit Agents SDK)
│   └── widget/        # Embeddable Client (Vanilla JS, Shadow DOM)
└── packages/
    └── schemas/       # Shared Zod Schemas & Types
```

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Dashboard** | Next.js 15, React 19, Tailwind CSS 4, shadcn/ui, React Query |
| **API** | Node.js 20, Fastify, Prisma ORM, PostgreSQL 17 + pgvector |
| **Voice Agent** | Python 3.12, LiveKit Agents SDK, OpenAI GPT-4o, Deepgram STT/TTS |
| **Widget** | Vanilla JS, Shadow DOM, Canvas API, livekit-client |
| **Infrastructure** | Turborepo, pnpm, Railway, Cloudflare Pages |

---

## Use Cases

### Voice FAQ Assistant
Upload your documentation and let visitors ask questions in natural language. The agent retrieves relevant context via RAG and responds conversationally.

### Conversational Forms
Replace static forms with voice-driven data collection. Perfect for lead qualification, intake forms, and surveys. Data syncs to your CRM via webhooks.

---

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- pnpm
- PostgreSQL with pgvector extension

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/vakkya.git
cd vakkya

# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/voice-agent/.env.example apps/voice-agent/.env

# Run database migrations
pnpm --filter api prisma migrate dev

# Start development servers
pnpm dev
```

### Local URLs
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **Widget Demo**: http://localhost:5173

---

## Deployment

| Service | Platform |
|---------|----------|
| API | Railway |
| Voice Agent | Railway |
| Dashboard | Cloudflare Pages |
| Widget Bundle | Cloudflare R2 / CDN |
| Database | Railway PostgreSQL |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ for developers who want voice AI without the complexity.</sub>
</div>
