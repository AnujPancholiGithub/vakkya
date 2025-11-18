---
title: External Tools & MCP Usage
inclusion: always
---

# External Tools & MCPs

- Use internet-connected MCPs (Perplexity, Tavily, etc.) **only when**:
  - Up-to-date information is required (APIs, SDK versions, service pricing).
  - Concrete examples from external docs or blogs are needed.
  - There is genuine uncertainty that cannot be resolved from existing repo context.

## Usage Guidelines

- Prefer **repo context first**, then MCPs only as a supplement.
- When using MCPs, pull out **specific, actionable details** (endpoints, flags, version notes), not generic advice.
- Do not mirror long external docs; extract only what is required to complete the current task.

## Code Generation with Tools

- Never blindly follow external snippets; **adapt them** to the existing architecture and stack.
- When external examples conflict with `tech.md`, **follow `tech.md`**.
- If a provider offers multiple options, pick the simplest that fits our chosen stack (no “framework shopping”).

## Performance & Cost Awareness

- Avoid patterns that significantly increase API calls (OpenAI, Pinecone, etc.) unless absolutely necessary.
- Prefer batching (embeddings, upserts) when it clearly reduces cost and complexity.
- Do not introduce heavy dependencies just because external examples use them.
