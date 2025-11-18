# Vakkya

Real-time voice agent widget that transforms any website into an interactive, voice-first experience.

## Monorepo Structure

```
vakkya/
├── apps/
│   ├── api/           # Fastify REST API (Node.js + TypeScript)
│   ├── dashboard/     # Next.js 15 developer console
│   ├── voice-agent/   # LiveKit voice agent (Python)
│   └── widget/        # Embeddable voice widget (Vanilla JS)
├── packages/
│   └── schemas/       # Shared TypeScript types + Zod schemas
└── turbo.json         # Turborepo configuration
```

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **API**: Node.js 20+ | Fastify | Prisma | PostgreSQL + pgvector
- **Dashboard**: Next.js 15 | React 19 | Tailwind CSS 4 | shadcn/ui
- **Voice Agent**: Python 3.12+ | LiveKit Agents SDK | OpenAI GPT-4o
- **Widget**: Vanilla JS | Shadow DOM | Canvas API | LiveKit Client

## Getting Started

```bash
# Install dependencies
pnpm install

# Run all services in development
pnpm dev

# Build all services
pnpm build

# Run tests
pnpm test
```

## Development

See `.kiro/specs/build-sequence/tasks.md` for the complete implementation plan.

## Documentation

- [Product Vision](./kiro/steering/product.md)
- [Tech Stack](./kiro/steering/tech.md)
- [Build Sequence](./.kiro/specs/build-sequence/design.md)
