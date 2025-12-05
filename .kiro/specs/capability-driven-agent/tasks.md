# Implementation Plan: Capability-Driven Agent Architecture

## Phase 1: Extend Capability Base Class

- [x] 1. Enhance Capability interface
  - [x] 1.1 Add get_tools() method to base.py
    - Return list of function tools
    - Default implementation returns empty list
    - _Requirements: 1.1, 3.1_
  - [x] 1.2 Add get_instruction_fragment() method to base.py
    - Return instruction string to append
    - Default implementation returns empty string
    - _Requirements: 1.2, 2.3_
  - [x] 1.3 Add is_enabled() method to base.py
    - Check if capability should be active for session
    - Default implementation returns True
    - _Requirements: 3.3, 4.3, 4.4_
  - [ ]* 1.4 Write property test for capability interface
    - **Property 1: Capability Registration Completeness**
    - **Validates: Requirements 1.1, 1.2**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2: Create Capability Registry

- [x] 3. Implement CapabilityRegistry
  - [x] 3.1 Create registry.py with CapabilityRegistry class
    - Store capabilities by name
    - register() method with logging
    - _Requirements: 1.1, 6.1_
  - [x] 3.2 Add get_enabled_capabilities() method
    - Filter by is_enabled() for session context
    - _Requirements: 3.3_
  - [x] 3.3 Add collect_tools() method
    - Gather tools from all enabled capabilities
    - Log tool collection
    - _Requirements: 3.1, 3.2, 6.2_
  - [x] 3.4 Add collect_instruction_fragments() method
    - Gather instruction fragments from enabled capabilities
    - _Requirements: 2.3_
  - [ ]* 3.5 Write property test for tool collection
    - **Property 2: Tool Collection Correctness**
    - **Validates: Requirements 3.1, 3.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Create Instruction Builder

- [x] 5. Implement InstructionBuilder
  - [x] 5.1 Create instruction_builder.py with InstructionBuilder class
    - Takes CapabilityRegistry in constructor
    - _Requirements: 2.1_
  - [x] 5.2 Implement build() method
    - Compose: base → custom → capability → context
    - Log instruction sources and length
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.3_
  - [x] 5.3 Implement _get_base_instructions() method
    - Default greeting, tone, style
    - Use agent_name if provided
    - _Requirements: 2.5_
  - [ ]* 5.4 Write property test for instruction composition
    - **Property 3: Instruction Composition Order**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  - [ ]* 5.5 Write property test for custom prompt preservation
    - **Property 4: Custom Prompt Preservation**
    - **Validates: Requirements 4.1, 4.2**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Refactor RAG Capability

- [x] 7. Update RAGCapability with new interface
  - [x] 7.1 Implement is_enabled() in rag_capability.py
    - Check if RAG service is available
    - _Requirements: 4.4_
  - [x] 7.2 Implement get_tools() in rag_capability.py
    - Return search_knowledge tool
    - Tool should be created with session context
    - _Requirements: 3.1_
  - [x] 7.3 Implement get_instruction_fragment() in rag_capability.py
    - Return RAG-specific instructions
    - _Requirements: 2.3_
  - [x] 7.4 Move search_knowledge tool creation to capability
    - Remove from entrypoint.py
    - Create dynamically in get_tools()
    - _Requirements: 1.4_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Refactor Form Capability

- [x] 9. Update FormCapability with new interface
  - [x] 9.1 Implement is_enabled() in form_capability.py
    - Check if active_form exists in context
    - _Requirements: 4.3_
  - [x] 9.2 Implement get_tools() in form_capability.py
    - Return activate_form tool
    - Tool should be created with session context
    - _Requirements: 3.1_
  - [x] 9.3 Implement get_instruction_fragment() in form_capability.py
    - Return form-specific instructions with field list
    - Include greeting and flow guidance
    - _Requirements: 2.3_
  - [x] 9.4 Move activate_form tool creation to capability
    - Remove from entrypoint.py
    - Create dynamically in get_tools()
    - _Requirements: 1.4_
  - [ ]* 9.5 Write property test for capability enable logic
    - **Property 5: Capability Enable Logic**
    - **Validates: Requirements 3.3, 4.3, 4.4**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6: Create Core Tools Capability

- [x] 11. Create CoreCapability for always-on tools
  - [x] 11.1 Create core_capability.py
    - Always enabled capability
    - _Requirements: 3.1_
  - [x] 11.2 Implement get_tools() with get_page_context
    - Move get_page_context from entrypoint
    - _Requirements: 3.1_
  - [x] 11.3 Implement get_instruction_fragment()
    - Basic context awareness instructions
    - _Requirements: 2.3_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: Refactor Entrypoint

- [x] 13. Update entrypoint to use capability system
  - [x] 13.1 Initialize CapabilityRegistry in entrypoint
    - Create registry at session start
    - Register all capabilities
    - _Requirements: 1.3_
  - [x] 13.2 Use InstructionBuilder for instructions
    - Replace _build_agent_instructions()
    - Pass registry and context
    - _Requirements: 2.1_
  - [x] 13.3 Use registry.collect_tools() for agent tools
    - Replace hardcoded tool list
    - Log collected tools
    - _Requirements: 3.1, 6.2_
  - [x] 13.4 Store registry in SessionContext
    - Make available to capabilities
    - _Requirements: 1.3_
  - [ ]* 13.5 Write property test for logging completeness
    - **Property 6: Logging Completeness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 8: Cleanup and Documentation

- [x] 15. Remove deprecated code
  - [x] 15.1 Remove _build_agent_instructions() from entrypoint
    - Replaced by InstructionBuilder
  - [x] 15.2 Remove _build_form_instructions() from entrypoint
    - Moved to FormCapability
  - [x] 15.3 Remove _build_faq_instructions() from entrypoint
    - Moved to InstructionBuilder base
  - [x] 15.4 Remove hardcoded tool definitions from entrypoint
    - Moved to respective capabilities

- [x] 16. Update exports and imports
  - [x] 16.1 Update capabilities/__init__.py
    - Export new classes
    - _Requirements: 5.1_
  - [x] 16.2 Verify all imports work correctly
    - Test imports from capabilities module

- [ ] 17. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Summary

| Phase | Focus | Key Properties |
|-------|-------|----------------|
| 1 | Extend Capability Interface | 1 |
| 2 | Create Capability Registry | 2 |
| 3 | Create Instruction Builder | 3, 4 |
| 4 | Refactor RAG Capability | - |
| 5 | Refactor Form Capability | 5 |
| 6 | Create Core Capability | - |
| 7 | Refactor Entrypoint | 6 |
| 8 | Cleanup | - |

**Total Tasks:** 17 top-level tasks, ~35 subtasks
**Property Tests:** 6 properties covered

## Architecture After Refactor

```
entrypoint.py (simplified)
    │
    ├── Initialize CapabilityRegistry
    │   ├── register(CoreCapability)
    │   ├── register(RAGCapability)
    │   └── register(FormCapability)
    │
    ├── Build Instructions via InstructionBuilder
    │   ├── Base instructions
    │   ├── Custom system prompt (if any)
    │   └── Capability fragments (dynamic)
    │
    └── Create Agent with collected tools
        └── registry.collect_tools(context)
```
