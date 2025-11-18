# Voice Agent - Working Mode Guidelines

## Overview

When working on the Voice Agent service, always verify implementation patterns against official LiveKit documentation to ensure we're following best practices and using the latest SDK features correctly.

## Official Documentation Sources

### Primary References (Always Check These)

1. **Building Voice Agents**
   - URL: https://docs.livekit.io/agents/build/
   - Use for: Overall architecture, Agent subclass patterns, AgentSession configuration

2. **Workflows & Handoffs**
   - URL: https://docs.livekit.io/agents/build/workflows/
   - Use for: Multi-agent patterns, agent handoffs, task delegation

3. **Sessions**
   - URL: https://docs.livekit.io/agents/build/sessions/
   - Use for: AgentSession configuration, STT/LLM/TTS setup, userdata management

4. **Tasks & Nodes**
   - URL: https://docs.livekit.io/agents/build/tasks/
   - Use for: Agent lifecycle hooks (on_enter, on_exit, on_user_turn_completed)

5. **Function Tools**
   - URL: https://docs.livekit.io/agents/build/tools/
   - Use for: @function_tool decorator, tool definitions, RunContext usage

6. **Turn Detection & Interruptions**
   - URL: https://docs.livekit.io/agents/build/turns/
   - Use for: VAD configuration, turn detection models, interruption handling

7. **Text Input/Output**
   - URL: https://docs.livekit.io/agents/build/text/
   - Use for: Text-based interactions, chat interfaces

8. **External Data & RAG**
   - URL: https://docs.livekit.io/agents/build/external-data/
   - Use for: RAG patterns, on_user_turn_completed hook, turn_ctx.add_message()

### Additional References

9. **Models Overview**
   - STT: https://docs.livekit.io/agents/models/stt/
   - LLM: https://docs.livekit.io/agents/models/llm/
   - TTS: https://docs.livekit.io/agents/models/tts/

10. **Python SDK Reference**
    - URL: https://docs.livekit.io/reference/python/v1/livekit/agents/
    - Use for: API reference, class signatures, method parameters

## Verification Workflow

### Before Implementing a Feature

1. **Read the relevant documentation section** from the list above
2. **Check for code examples** in the official docs
3. **Verify the pattern** matches our architecture (Agent subclass, AgentSession config)
4. **Look for recent updates** (LiveKit SDK is actively developed)

### During Implementation

1. **Follow official patterns exactly** - Don't invent custom approaches
2. **Use provided abstractions** - Don't bypass framework features
3. **Check method signatures** - Ensure parameters match SDK expectations
4. **Test with real LiveKit** - Use dev mode for rapid iteration

### After Implementation

1. **Compare with examples** - Does our code look like official examples?
2. **Check for deprecation warnings** - SDK may have newer patterns
3. **Verify automatic features work** - VAD, interruptions, turn detection
4. **Test edge cases** - Interruptions, errors, reconnections

## Common Patterns to Verify

### Agent Subclass Pattern
```python
# ✅ CORRECT - Verify against: https://docs.livekit.io/agents/build/
class VakkyaAgent(Agent):
    def __init__(self, project_id: str):
        super().__init__(instructions="...")
        self.project_id = project_id
```

### AgentSession Configuration
```python
# ✅ CORRECT - Verify against: https://docs.livekit.io/agents/build/sessions/
session = AgentSession[SessionUserData](
    stt="deepgram/nova-3:en",
    llm="openai/gpt-4o",
    tts="cartesia/sonic-3:...",
    vad=silero.VAD.load(),
    turn_detection=MultilingualModel(),
    userdata=SessionUserData(project_id=project_id),
)
```

### RAG Injection via on_user_turn_completed
```python
# ✅ CORRECT - Verify against: https://docs.livekit.io/agents/build/external-data/
async def on_user_turn_completed(
    self, 
    turn_ctx: ChatContext, 
    new_message: ChatMessage
) -> None:
    rag_results = await self.rag_service.query(new_message.text_content())
    turn_ctx.add_message(
        role="assistant",
        content=f"Context: {rag_results}"
    )
```

### Function Tools
```python
# ✅ CORRECT - Verify against: https://docs.livekit.io/agents/build/tools/
@function_tool()
async def search_documents(
    self,
    context: RunContext[SessionUserData],
    query: str,
) -> str:
    """Search the knowledge base."""
    results = await self.rag_service.query(query)
    return "\n".join([r.content for r in results])
```

## Anti-Patterns to Avoid

### ❌ DON'T: Create separate handler classes
```python
# ❌ WRONG - Don't do this
class STTHandler:
    async def handle_transcript(self, transcript: str):
        pass

class TTSHandler:
    async def synthesize(self, text: str):
        pass
```

**Why:** STT/LLM/TTS are configured on AgentSession, not as separate classes.

### ❌ DON'T: Manually handle VAD or interruptions
```python
# ❌ WRONG - Don't do this
async def on_interruption_detected(self):
    await self.cancel_synthesis()
```

**Why:** LiveKit handles interruptions automatically when VAD is configured.

### ❌ DON'T: Store session state in PostgreSQL
```python
# ❌ WRONG - Don't do this
class SessionManager:
    async def save_session(self, session_id: str, state: dict):
        await self.db.execute("INSERT INTO sessions ...")
```

**Why:** Use `AgentSession.userdata` for session-level state.

### ❌ DON'T: Bypass on_user_turn_completed for RAG
```python
# ❌ WRONG - Don't do this
async def on_turn_complete(self, query: str):
    rag_results = await self.rag_service.query(query)
    # Manually building prompt...
```

**Why:** Use `on_user_turn_completed` hook with `turn_ctx.add_message()`.

## When to Use Web Search

Use Perplexity or Tavily MCP tools when:

1. **Checking for SDK updates** - "Has LiveKit Agents SDK changed since Nov 2024?"
2. **Finding recent examples** - "Latest LiveKit Agent RAG examples"
3. **Troubleshooting errors** - "LiveKit Agent connection error solutions"
4. **Comparing approaches** - "LiveKit Agent vs custom pipeline performance"

**Always prefer official docs over blog posts or Stack Overflow.**

## Development Commands

```bash
# Development mode (hot reload)
python agent.py dev

# Production mode
python agent.py start

# Console mode (local testing without LiveKit)
python agent.py console
```

## Testing Checklist

Before marking a task complete:

- [ ] Code matches official LiveKit examples
- [ ] No custom handler classes (use Agent subclass)
- [ ] STT/LLM/TTS configured on AgentSession
- [ ] VAD and turn detection configured (not manual)
- [ ] RAG uses on_user_turn_completed hook
- [ ] Session state uses userdata (not database)
- [ ] Function tools use @function_tool decorator
- [ ] All tests pass
- [ ] Tested with real LiveKit in dev mode
- [ ] Interruptions work automatically
- [ ] Latency meets <500ms target

## Quick Reference Card

| Feature | Official Pattern | Documentation |
|---------|-----------------|---------------|
| Agent Definition | Subclass `Agent` | https://docs.livekit.io/agents/build/ |
| Pipeline Config | `AgentSession(stt=..., llm=..., tts=...)` | https://docs.livekit.io/agents/build/sessions/ |
| RAG Injection | `on_user_turn_completed` + `turn_ctx.add_message()` | https://docs.livekit.io/agents/build/external-data/ |
| Session State | `AgentSession.userdata` | https://docs.livekit.io/agents/build/sessions/ |
| Tools | `@function_tool()` decorator | https://docs.livekit.io/agents/build/tools/ |
| VAD | `vad=silero.VAD.load()` on AgentSession | https://docs.livekit.io/agents/build/turns/ |
| Interruptions | Automatic (no code needed) | https://docs.livekit.io/agents/build/turns/ |
| Greeting | `on_enter()` hook | https://docs.livekit.io/agents/build/tasks/ |

## Summary

**Golden Rule:** When in doubt, check the official LiveKit documentation first. The SDK is well-documented with clear examples. Following official patterns ensures:

1. ✅ Code is maintainable
2. ✅ Features work as expected
3. ✅ Updates are easier
4. ✅ Performance is optimized
5. ✅ Community support is available

**Always verify against official docs before implementing any voice-agent feature.**
