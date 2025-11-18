---
title: Code Improvement Guidelines
inclusion: fileMatch
fileMatchPattern: "**/*"
---

# Code Improvement Guidelines

These rules exist to keep the codebase simple, maintainable, and fast to develop.  
Every contribution should follow the principles of **minimalism, clarity, and incremental evolution**.

---

## File Creation Policy

### General Rule
Do **not** create new files unless absolutely necessary.  
Prefer improving, extending, or refactoring existing modules.

### Allowed
- Expanding existing services with new methods.
- Improving logic inside established modules.
- Refactoring functions for readability and maintainability.

### Avoid
- Parallel service files for similar behavior.
- New utility modules that replicate existing helpers.
- Duplicate DTOs or types.
- New abstractions that complicate established patterns.

### Instead
- Add small, well-named functions to existing modules.
- Improve validation and error handling already present.
- Reuse existing architectural patterns.

---

## Implementation Approach

### Performance Improvements
- Optimize algorithms in-place before adding layers such as caching.
- Add caching only after identifying a real bottleneck.
- Avoid premature optimization and unnecessary abstractions.

### Feature Enhancements
- Extend existing public interfaces (API routes, services, components).
- Follow established patterns for API calls, state management, and UI structure.
- Keep compatibility intact unless the change requires breaking behavior.

### Bug Fixes
- Reproduce the bug with a focused test.
- Apply the fix in the smallest relevant scope.
- Prefer improving existing error handling instead of adding excessive wrappers.

---

## Security Guidelines

### API Security
- Every protected route must:
  - Validate and decode the project's authentication token.
  - Attach `userId` or `projectId` to the request context.
  - Enforce ownership rules for all project and document operations.

### Widget Security
- Validate the project token before issuing LiveKit room tokens.
- Enforce domain checks to prevent unauthorized embedding.
- Only request microphone access on explicit user interaction.

### Input Validation
- Validate all request bodies and query parameters using Zod or Pydantic (service-dependent).
- Check uploaded file size limits.
- Confirm allowed file types explicitly (PDF, TXT, MD).

### No Secrets Exposure
- Never log tokens, API keys, or user content.
- Sanitize logs before writing them.

---

## External Service Calls

### General Rules
- All external API calls must include:
  - Timeouts.
  - Basic error handling.
  - Minimal retry logic for transient failures.

### When Integrating
- Log errors with high-level context (which provider, which action).
- Never log request payloads containing sensitive data.
- Ensure errors propagate with clear, actionable messages.

---

## Minimalism Principles

- Prefer extending existing endpoints rather than adding new ones.
- Keep handlers thin; move complex logic to service modules.
- Write explicit, readable code over abstract, generic designs.
- Keep bundle sizes and cold-start times low.
- Avoid unnecessary configuration toggles unless they deliver real user value.

---

## Testing Guidelines

- Add tests only where they improve reliability:
  - Core data transformations
  - Critical request flows
  - Authentication and validation
- Prefer simple, direct tests over large end-to-end suites.
- Avoid writing tests for trivial or UI-only behaviors.

---

## Maintainability

- Follow a consistent naming strategy across modules.
- Keep services focused on one responsibility.
- Avoid combining unrelated concerns in the same file.
- Clean unused code and dead branches promptly.

---

This document governs the entire repository.  
All contributors must follow these rules to maintain clarity, velocity, and architectural discipline.
