---
title: Development Philosophy & Flow
inclusion: always
---

# Development Philosophy

- Prefer **simple, boring solutions** over clever abstractions.
- Optimize for **readability and maintainability** before micro-optimizations.
- Follow the existing architecture instead of inventing new patterns.

## Working Style

- Work in **small, incremental changes** that are easy to reason about.
- Prefer **improving existing code** over introducing new layers or indirection.
- Keep functions and files focused: one clear responsibility, minimal side effects.

- If you found really confusing or confliting code or any action you taking ask me first to what to do.

## When Making Changes

- Preserve existing contracts (types, public APIs) unless explicitly asked to change them.
- If something feels too complex, **simplify the design first**, then implement.
- Leave clear comments only where intent is non-obvious; avoid noisy comments.

## Trade-Offs

- Latency and bundle size matter, but **do not prematurely optimize**.
- Only introduce new dependencies if they significantly reduce complexity.
- If a change conflicts with `product.md` or `tech.md`, those files win.
