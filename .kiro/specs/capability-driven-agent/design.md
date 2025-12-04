# Design Document: Capability-Driven Agent Architecture

## Overview

This design refactors the voice agent from hardcoded logic to a dynamic, capability-driven architecture. The key changes are:

1. **Capability Registry** - Central registry where capabilities register tools and instruction fragments
2. **Instruction Builder** - Composes instructions from base + custom + capability-specific sources
3. **Dynamic Tool Assembly** - Tools collected from enabled capabilities at session start
4. **Clean Entrypoint** - Simplified entrypoint that delegates to the capability system

### Key Design Principles

1. **Plugin Architecture**: Capabilities are self-contained plugins that register themselves
2. **Composition over Inheritance**: Instructions are composed, not replaced
3. **Configuration-Driven**: Project config determines which capabilities are active
4. **Backward Compatible**: Existing behavior preserved while enabling new patterns
5. **Debuggable**: Comprehensive logging at every step

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VOICE AGENT                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Capability Registry                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ RAG         │  │ Forms       │  │ Future:     │              │   │
│  │  │ Capability  │  │ Capability  │  │ MCP, etc.   │              │   │
│  │  │             │  │             │  │             │              │   │
│  │  │ - tools     │  │ - tools     │  │ - tools     │              │   │
│  │  │ - instruct  │  │ - instruct  │  │ - instruct  │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Instruction Builder                           │   │
│  │                                                                   │   │
│  │  1. Base Instructions (greeting, tone, style)                    │   │
│  │  2. Custom System Prompt (from project owner)                    │   │
│  │  3. Capability Instructions (appended dynamically)               │   │
│  │  4. Context (page URL, etc.)                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Agent Session                                 │   │
│  │                                                                   │   │
│  │  - instructions: composed string                                 │   │
│  │  - tools: [dynamically assembled from capabilities]              │   │
│  │  - userdata: SessionContext                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Capability Interface

Extend the existing `Capability` base class to support tool and instruction registration.

```python
class Capability(ABC):
    """Enhanced capability interface with tool and instruction support."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this capability."""
        pass
    
    def get_tools(self, context: SessionContext) -> list[Callable]:
        """Return list of function tools this capability provides.
        
        Override to provide capability-specific tools.
        Default returns empty list.
        """
        return []
    
    def get_instruction_fragment(self, context: SessionContext) -> str:
        """Return instruction fragment to append to agent instructions.
        
        Override to provide capability-specific instructions.
        Default returns empty string.
        """
        return ""
    
    def is_enabled(self, context: SessionContext) -> bool:
        """Check if this capability should be enabled for the session.
        
        Override to implement custom enable logic.
        Default returns True.
        """
        return True
```

### 2. Capability Registry

Central registry for managing capabilities.

```python
@dataclass
class CapabilityRegistry:
    """Registry for managing voice agent capabilities."""
    
    _capabilities: dict[str, Capability] = field(default_factory=dict)
    
    def register(self, capability: Capability) -> None:
        """Register a capability."""
        self._capabilities[capability.name] = capability
        logger.info(f"Registered capability: {capability.name}")
    
    def get_enabled_capabilities(self, context: SessionContext) -> list[Capability]:
        """Get all capabilities enabled for this session."""
        return [c for c in self._capabilities.values() if c.is_enabled(context)]
    
    def collect_tools(self, context: SessionContext) -> list[Callable]:
        """Collect all tools from enabled capabilities."""
        tools = []
        for cap in self.get_enabled_capabilities(context):
            cap_tools = cap.get_tools(context)
            tools.extend(cap_tools)
            logger.debug(f"Collected {len(cap_tools)} tools from {cap.name}")
        return tools
    
    def collect_instruction_fragments(self, context: SessionContext) -> list[str]:
        """Collect instruction fragments from enabled capabilities."""
        fragments = []
        for cap in self.get_enabled_capabilities(context):
            fragment = cap.get_instruction_fragment(context)
            if fragment:
                fragments.append(fragment)
        return fragments
```

### 3. Instruction Builder

Composes instructions from multiple sources.

```python
class InstructionBuilder:
    """Builds agent instructions from multiple sources."""
    
    def __init__(self, registry: CapabilityRegistry):
        self._registry = registry
    
    def build(
        self,
        context: SessionContext,
        agent_config: Optional[AgentConfig] = None,
    ) -> str:
        """Build complete agent instructions.
        
        Order:
        1. Base instructions (greeting, tone)
        2. Custom system prompt (if provided)
        3. Capability-specific instructions
        4. Context (page URL, etc.)
        """
        sections = []
        
        # 1. Base instructions
        sections.append(self._get_base_instructions(agent_config))
        
        # 2. Custom system prompt
        if agent_config and agent_config.system_prompt:
            sections.append(f"\n## Custom Instructions\n{agent_config.system_prompt}")
        
        # 3. Capability instructions
        fragments = self._registry.collect_instruction_fragments(context)
        if fragments:
            sections.append("\n## Capabilities\n" + "\n\n".join(fragments))
        
        # 4. Context
        if context.page_context:
            sections.append(f"\n## Current Context\nUser is viewing: {context.page_context.url}")
        
        instructions = "\n".join(sections)
        logger.info(f"Built instructions: {len(instructions)} chars, {len(fragments)} capability fragments")
        return instructions
    
    def _get_base_instructions(self, agent_config: Optional[AgentConfig]) -> str:
        """Get base instructions for all agents."""
        agent_name = agent_config.agent_name if agent_config else "a helpful voice assistant"
        return f"""You are {agent_name}.

## Communication Style
- Be conversational and concise
- Speak naturally as if having a real conversation
- Keep responses brief unless more detail is needed
- Be friendly and helpful"""
```

### 4. RAG Capability (Enhanced)

```python
class RAGCapability(Capability):
    """RAG capability with tool and instruction support."""
    
    @property
    def name(self) -> str:
        return "rag"
    
    def is_enabled(self, context: SessionContext) -> bool:
        """Enable if RAG service is available."""
        return hasattr(context, 'rag_service') and context.rag_service is not None
    
    def get_tools(self, context: SessionContext) -> list[Callable]:
        """Return RAG-related tools."""
        return [self._create_search_tool(context)]
    
    def get_instruction_fragment(self, context: SessionContext) -> str:
        """Return RAG-specific instructions."""
        return """### Knowledge Base Search
You have access to a knowledge base of uploaded documents.
- Use the search_knowledge tool to find information
- If results have low confidence, acknowledge uncertainty
- Never fabricate information - say "I don't know" if unsure"""
    
    def _create_search_tool(self, context: SessionContext):
        """Create the search_knowledge tool."""
        @function_tool()
        async def search_knowledge(query: str) -> str:
            """Search the knowledge base for relevant information."""
            # Implementation...
        return search_knowledge
```

### 5. Form Capability (Enhanced)

```python
class FormCapability(Capability):
    """Form capability with tool and instruction support."""
    
    @property
    def name(self) -> str:
        return "forms"
    
    def is_enabled(self, context: SessionContext) -> bool:
        """Enable if active form exists."""
        return hasattr(context, 'active_form') and context.active_form is not None
    
    def get_tools(self, context: SessionContext) -> list[Callable]:
        """Return form-related tools."""
        return [self._create_activate_tool(context)]
    
    def get_instruction_fragment(self, context: SessionContext) -> str:
        """Return form-specific instructions."""
        form = context.active_form
        if not form:
            return ""
        
        fields = form.get("fields", [])
        field_list = "\n".join([f"- {f.get('label', f.get('name'))}" for f in fields])
        
        return f"""### Form Collection: {form.get('name', 'Contact Form')}
You can collect information using a conversational form.

Fields to collect:
{field_list}

IMPORTANT:
1. Greet the user first and explain what you'll collect
2. Only activate the form after user shows intent
3. Ask questions one at a time
4. Confirm each answer before moving on"""
    
    def _create_activate_tool(self, context: SessionContext):
        """Create the activate_form tool."""
        @function_tool()
        async def activate_form() -> str:
            """Activate the form UI in the widget."""
            # Implementation...
        return activate_form
```

## Data Models

### Session Context (Extended)

```python
@dataclass
class SessionContext:
    """Extended session context with capability support."""
    project_id: str
    page_context: Optional[PageContext] = None
    widget_token: Optional[str] = None
    agent_config: Optional[AgentConfig] = None
    room: Optional[rtc.Room] = None
    active_form: Optional[dict] = None
    rag_service: Optional[RAGService] = None
    api_conversation_id: Optional[str] = None
    
    # Capability registry (set during initialization)
    capability_registry: Optional[CapabilityRegistry] = None
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Capability Registration Completeness
*For any* capability registered with the registry, its tools and instruction fragments shall be available for collection.
**Validates: Requirements 1.1, 1.2**

### Property 2: Tool Collection Correctness
*For any* session with enabled capabilities, the collected tools shall equal the union of tools from all enabled capabilities.
**Validates: Requirements 3.1, 3.2**

### Property 3: Instruction Composition Order
*For any* instruction build, the output shall contain base instructions before custom prompt before capability fragments.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 4: Custom Prompt Preservation
*For any* project with custom system prompt, the built instructions shall contain the custom prompt verbatim.
**Validates: Requirements 4.1, 4.2**

### Property 5: Capability Enable Logic
*For any* capability, it shall only be included if its is_enabled() returns True for the session context.
**Validates: Requirements 3.3, 4.3, 4.4**

### Property 6: Logging Completeness
*For any* capability registration or tool assembly, the system shall log the operation with relevant details.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

## Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| Capability registration fails | Exception during register() | Log error, continue with other capabilities |
| Tool creation fails | Exception in get_tools() | Log error, skip capability's tools |
| Instruction fragment fails | Exception in get_instruction_fragment() | Log error, skip fragment |
| No capabilities enabled | Empty capability list | Use fallback instructions |

## Testing Strategy

### Property-Based Testing Library
- **Python**: hypothesis

### Unit Tests
- Capability registration
- Tool collection from multiple capabilities
- Instruction composition order
- Custom prompt preservation
- Enable/disable logic

### Integration Tests
- Full session initialization with capabilities
- Tool execution through agent
- Instruction building with real capabilities

## Implementation Notes

### Migration Path

1. **Phase 1**: Add new interfaces to existing capability base class (backward compatible)
2. **Phase 2**: Implement CapabilityRegistry and InstructionBuilder
3. **Phase 3**: Refactor RAGCapability and FormCapability to use new interfaces
4. **Phase 4**: Update entrypoint to use capability system
5. **Phase 5**: Remove hardcoded logic from entrypoint

### Files to Modify

1. `capabilities/base.py` - Add get_tools(), get_instruction_fragment(), is_enabled()
2. `capabilities/rag_capability.py` - Implement new interface methods
3. `capabilities/form_capability.py` - Implement new interface methods
4. `entrypoint.py` - Use CapabilityRegistry and InstructionBuilder
5. `models.py` - Extend SessionContext if needed

### New Files

1. `capabilities/registry.py` - CapabilityRegistry class
2. `capabilities/instruction_builder.py` - InstructionBuilder class
