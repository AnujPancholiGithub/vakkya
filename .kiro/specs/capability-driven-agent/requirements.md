# Requirements Document

## Introduction

This specification addresses the need to refactor the voice agent's `entrypoint.py` from hardcoded, monolithic logic to a dynamic, capability-driven architecture. Currently, the agent has:

1. **Hardcoded instruction building** - `_build_agent_instructions()` with static paths (FAQ vs Form)
2. **Static tool registration** - Tools are hardcoded: `[search_knowledge, get_page_context, activate_form]`
3. **Monolithic prompts** - Instructions are large strings that can't be composed
4. **Unused capability architecture** - A capability system exists but isn't integrated

The goal is to make Vakkya a truly extensible voice agent platform where:
- Capabilities register themselves dynamically
- Tools are assembled based on project configuration
- Instructions are composable (base + capability-specific + custom)
- Project owner's custom prompts are respected and enhanced, not replaced

## Glossary

- **Capability**: A pluggable module that provides specific functionality (RAG, Forms, MCP, etc.)
- **Tool**: A function the LLM can call to perform actions (search_knowledge, activate_form)
- **Instruction_Builder**: Component that composes agent instructions from multiple sources
- **Project_Config**: Configuration set by project owner (custom prompt, enabled capabilities)
- **Session_Context**: Runtime context containing project_id, page_url, active capabilities
- **Capability_Registry**: Central registry where capabilities register their tools and instructions

## Requirements

### Requirement 1: Dynamic Capability Registration

**User Story:** As a platform developer, I want capabilities to register themselves dynamically, so that adding new features doesn't require modifying core entrypoint code.

#### Acceptance Criteria

1. WHEN a Capability is initialized THEN the Capability SHALL register its tools with the Capability_Registry
2. WHEN a Capability is initialized THEN the Capability SHALL register its instruction fragments with the Capability_Registry
3. WHEN the agent session starts THEN the system SHALL collect all registered tools from enabled capabilities
4. WHEN a new capability is added THEN the entrypoint code SHALL NOT require modification

### Requirement 2: Composable Instruction Building

**User Story:** As a project owner, I want my custom system prompt to be enhanced with capability-specific instructions, so that I maintain control over the agent's persona while getting full functionality.

#### Acceptance Criteria

1. WHEN building agent instructions THEN the Instruction_Builder SHALL start with base instructions (greeting, tone)
2. WHEN a project has custom system prompt THEN the Instruction_Builder SHALL include it after base instructions
3. WHEN capabilities are enabled THEN the Instruction_Builder SHALL append capability-specific instructions
4. WHEN instructions are composed THEN the order SHALL be: base → custom → capability-specific
5. WHEN no custom prompt exists THEN the Instruction_Builder SHALL use default persona instructions

### Requirement 3: Dynamic Tool Assembly

**User Story:** As a platform developer, I want tools to be assembled dynamically based on project configuration, so that each project gets only the tools it needs.

#### Acceptance Criteria

1. WHEN the agent session starts THEN the system SHALL query each enabled capability for its tools
2. WHEN a capability provides tools THEN the tools SHALL be added to the agent's tool list
3. WHEN a capability is disabled THEN its tools SHALL NOT be included in the agent
4. WHEN tools are assembled THEN the system SHALL log which tools are enabled for debugging

### Requirement 4: Project Configuration Respect

**User Story:** As a project owner, I want to configure my agent's persona and enabled capabilities, so that the agent behaves according to my business needs.

#### Acceptance Criteria

1. WHEN a project has agent_config with system_prompt THEN the system SHALL use it as the custom prompt
2. WHEN a project has agent_config with agent_name THEN the system SHALL use it in the persona
3. WHEN a project has active forms THEN the Form capability SHALL be automatically enabled
4. WHEN a project has uploaded documents THEN the RAG capability SHALL be automatically enabled

### Requirement 5: Extensibility for Future Capabilities

**User Story:** As a platform developer, I want the architecture to support future capabilities (MCP, integrations), so that Vakkya can grow without architectural changes.

#### Acceptance Criteria

1. WHEN adding a new capability THEN the developer SHALL only need to implement the Capability interface
2. WHEN a capability needs custom tools THEN the capability SHALL define them in its module
3. WHEN a capability needs instruction fragments THEN the capability SHALL provide them via a method
4. WHEN capabilities have dependencies THEN the system SHALL resolve them during registration

### Requirement 6: Logging and Debugging

**User Story:** As a platform developer, I want comprehensive logging of capability registration and tool assembly, so that I can debug issues quickly.

#### Acceptance Criteria

1. WHEN a capability registers THEN the system SHALL log the capability name and its tools
2. WHEN tools are assembled THEN the system SHALL log the final tool list
3. WHEN instructions are built THEN the system SHALL log the instruction sources and total length
4. WHEN a capability fails to register THEN the system SHALL log the error and continue with other capabilities
