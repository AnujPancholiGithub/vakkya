---
inclusion: always
---

# External Tools & MCP Usage Guidelines

## When to Use MCPs

Use internet-connected MCPs (Gemini, Perplexity, Tavily) **only** for:

- **Version-specific information**: Latest API changes, breaking changes in dependencies, SDK updates
- **Error resolution**: Unfamiliar error messages, production deployment issues, platform-specific bugs
- **Security best practices**: Current vulnerability patterns, authentication standards, rate limiting strategies
- **Performance patterns**: Real-world optimization techniques for specific libraries (LiveKit, Fastify, Prisma)

## When NOT to Use MCPs

Do **not** use MCPs for:

- Questions answered in steering files (`tech.md`, `product.md`, `development-philosophy.md`)
- Basic syntax or language features (TypeScript, Python, JavaScript)
- Architecture decisions already defined in this codebase
- Generic "how to" questions that don't require current information
- Exploring alternative frameworks or libraries not in our stack

## Decision Priority

When information conflicts, follow this hierarchy:

1. **Steering files** (`tech.md`, `product.md`) — our architectural decisions
2. **Existing codebase patterns** — established conventions in this repo
3. **MCP research** — external best practices adapted to our context
4. **External examples** — only as inspiration, never copy-paste

## Using MCP Results Effectively

### Extract Specifics
- Pull out concrete details: API endpoints, configuration flags, version numbers
- Ignore generic advice like "use error handling" or "add logging"
- Focus on actionable changes that solve the immediate problem

### Adapt to Our Stack
- **Never** introduce new frameworks or libraries without explicit approval
- Translate external patterns to match our existing architecture
- If an example uses Redis and we use Postgres, adapt the pattern to Postgres
- If an example uses Express and we use Fastify, convert the middleware pattern

### Minimize Dependencies
- Prefer built-in solutions over new packages
- If a package is suggested, check if existing dependencies already solve it
- Avoid "framework shopping" — stick to the chosen stack in `tech.md`

## Cost & Performance Awareness

### API Call Optimization
- Batch operations when possible (embeddings, database upserts)
- Avoid patterns that multiply API calls (N+1 queries, per-request embeddings)
- Cache expensive operations only after measuring real bottlenecks

### Bundle Size
- Widget must stay under 100KB gzipped
- Avoid heavy dependencies in frontend code
- Use dynamic imports for optional features

### Database Queries
- Prefer single queries with joins over multiple round trips
- Use Prisma's `include` and `select` to minimize data transfer
- Avoid loading full documents when only metadata is needed

## Security Considerations

When researching security patterns:

- Always validate inputs with Zod (TypeScript) or Pydantic (Python)
- Never log tokens, API keys, or user content
- Enforce domain whitelisting for widget embeds
- Use parameterized queries (Prisma handles this)
- Implement rate limiting on public endpoints

## Example Scenarios

### ✅ Good MCP Usage
- "What's the latest LiveKit Agents SDK breaking change in v0.8?"
- "How do Railway's health checks work for Node.js apps?"
- "What's the recommended pgvector index type for cosine similarity?"

### ❌ Bad MCP Usage
- "How do I write a TypeScript function?" (basic syntax)
- "Should I use Fastify or Express?" (already decided in `tech.md`)
- "What's the best way to structure a monorepo?" (already established)

## Summary

**Repo context first, MCPs as a supplement.** Use external tools to fill knowledge gaps, not to redesign the architecture.
