# Requirements Document - Build Sequence

## Introduction

The Build Sequence defines the optimal development order for the Vakkya monorepo to minimize rework, enable early testing, and ensure clean integration between services. This sequence accounts for service dependencies, testing requirements, and the goal of achieving a working end-to-end flow as quickly as possible.

## Glossary

- **Build Sequence**: The ordered list of development phases for the Vakkya monorepo
- **Service Dependency**: When one service requires another service to be functional for testing
- **Integration Point**: Where two services communicate (API endpoints, LiveKit rooms, widget embed)
- **Vertical Slice**: A minimal end-to-end feature that touches all layers
- **Smoke Test**: Basic validation that a service is functional
- **Monorepo**: Single repository containing all four services (API, Dashboard, Widget, Voice Agent)

## Requirements

### Requirement 1

**User Story:** As a solo developer, I want to build services in dependency order, so that I can test each service as I build it.

#### Acceptance Criteria

1. WHEN determining build order THEN the Build Sequence SHALL prioritize services with no dependencies first
2. WHEN a service depends on another THEN the Build Sequence SHALL ensure the dependency is built first
3. WHEN multiple services have equal priority THEN the Build Sequence SHALL prioritize the service that unblocks the most downstream work
4. WHEN a service is completed THEN the Build Sequence SHALL enable immediate smoke testing without waiting for other services

### Requirement 2

**User Story:** As a solo developer, I want to achieve a working end-to-end flow early, so that I can validate the architecture.

#### Acceptance Criteria

1. WHEN planning the build sequence THEN the Build Sequence SHALL identify the minimal vertical slice that demonstrates core value
2. WHEN the vertical slice is complete THEN the Build Sequence SHALL enable testing the full user journey from widget click to voice response
3. WHEN the vertical slice works THEN the Build Sequence SHALL provide confidence that the architecture is sound before building remaining features

### Requirement 3

**User Story:** As a solo developer, I want to avoid rework, so that I don't waste time rebuilding components.

#### Acceptance Criteria

1. WHEN defining interfaces between services THEN the Build Sequence SHALL ensure contracts are defined before implementation
2. WHEN building a service THEN the Build Sequence SHALL ensure all required environment variables and configuration are defined
3. WHEN a service is complete THEN the Build Sequence SHALL ensure it follows the patterns defined in tech.md and product.md
4. WHEN integration points are reached THEN the Build Sequence SHALL ensure both sides of the integration are ready

### Requirement 4

**User Story:** As a solo developer, I want to test incrementally, so that I catch bugs early.

#### Acceptance Criteria

1. WHEN a service reaches a stable state THEN the Build Sequence SHALL include a checkpoint for testing
2. WHEN testing a service THEN the Build Sequence SHALL provide clear success criteria
3. WHEN a bug is found THEN the Build Sequence SHALL allow fixing it before proceeding to dependent services
4. WHEN all services are built THEN the Build Sequence SHALL include end-to-end integration testing

### Requirement 5

**User Story:** As a solo developer, I want to minimize context switching, so that I maintain focus and velocity.

#### Acceptance Criteria

1. WHEN working on a service THEN the Build Sequence SHALL group related tasks together
2. WHEN switching between services THEN the Build Sequence SHALL ensure the previous service is in a stable state
3. WHEN a service requires multiple technologies THEN the Build Sequence SHALL complete all work in one technology before switching to another
4. WHEN database schema changes are needed THEN the Build Sequence SHALL batch them to minimize migration cycles

### Requirement 6

**User Story:** As a solo developer, I want clear phase boundaries, so that I know when to commit and deploy.

#### Acceptance Criteria

1. WHEN a phase is complete THEN the Build Sequence SHALL define what "done" means for that phase
2. WHEN a phase is done THEN the Build Sequence SHALL indicate whether deployment is required or optional
3. WHEN multiple phases are complete THEN the Build Sequence SHALL identify natural deployment milestones
4. WHEN a deployment milestone is reached THEN the Build Sequence SHALL ensure all services are in a deployable state

### Requirement 7

**User Story:** As a solo developer, I want to defer non-critical features, so that I reach MVP faster.

#### Acceptance Criteria

1. WHEN prioritizing features THEN the Build Sequence SHALL distinguish between MVP-critical and nice-to-have features
2. WHEN a feature is nice-to-have THEN the Build Sequence SHALL defer it to post-MVP
3. WHEN the MVP is complete THEN the Build Sequence SHALL provide a clear list of deferred features for V2
4. WHEN building MVP features THEN the Build Sequence SHALL ensure they are production-ready, not prototypes

### Requirement 8

**User Story:** As a solo developer, I want to handle shared code efficiently, so that I don't duplicate logic.

#### Acceptance Criteria

1. WHEN multiple services need the same types THEN the Build Sequence SHALL create shared packages before building dependent services
2. WHEN shared code is created THEN the Build Sequence SHALL ensure it is tested independently
3. WHEN a service uses shared code THEN the Build Sequence SHALL ensure the shared package is stable
4. WHEN shared code changes THEN the Build Sequence SHALL identify which services need updates

### Requirement 9

**User Story:** As a solo developer, I want to set up infrastructure once, so that I don't revisit deployment configuration.

#### Acceptance Criteria

1. WHEN starting development THEN the Build Sequence SHALL define all required infrastructure upfront
2. WHEN infrastructure is provisioned THEN the Build Sequence SHALL validate it works before building services
3. WHEN environment variables are needed THEN the Build Sequence SHALL document them in .env.example files
4. WHEN services are deployed THEN the Build Sequence SHALL ensure Railway configuration is correct

### Requirement 10

**User Story:** As a solo developer, I want a single source of truth for the build plan, so that I don't get confused about what to do next.

#### Acceptance Criteria

1. THE Build Sequence SHALL provide a numbered list of phases in execution order
2. THE Build Sequence SHALL specify which spec to execute in each phase
3. THE Build Sequence SHALL identify dependencies between phases
4. THE Build Sequence SHALL estimate relative complexity for each phase
5. THE Build Sequence SHALL provide success criteria for each phase
