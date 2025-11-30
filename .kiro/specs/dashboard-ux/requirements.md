# Requirements Document

## Introduction

This specification defines UI/UX improvements for the Vakkya Dashboard to transform it from a functional-only interface into an educational, visually engaging experience that guides users through the voice agent setup process. This phase focuses on the core dashboard experience (Tier 1 + Tier 2) - improving empty states, progress indicators, project cards, tooltips, upload experience, and conversation previews. Landing page enhancements are deferred to a future phase.

## Glossary

- **Dashboard**: The Next.js web application where developers manage voice agent projects
- **Project**: A container for documents, conversations, and widget configuration
- **Widget**: The embeddable voice interface that end-users interact with
- **Document**: PDF, TXT, or MD files uploaded to train the voice agent (RAG knowledge base)
- **Conversation**: A logged interaction between an end-user and the voice agent
- **Empty State**: UI displayed when a list or section has no data
- **Pill Badge**: A small rounded label used to highlight key information or status
- **Progress Indicator**: Visual element showing completion status of multi-step processes
- **Tooltip**: Small popup providing contextual information on hover

## Requirements

### Requirement 1: Enhanced Empty States with Educational Content

**User Story:** As a new user, I want empty states to educate me about what each section does and guide me to take action, so that I understand the product without reading external documentation.

#### Acceptance Criteria

1. WHEN a user views the projects list with no projects THEN the Dashboard SHALL display an illustrated empty state with a three-step visual showing the setup flow (Create Project → Upload Docs → Embed Widget)
2. WHEN displaying the projects empty state THEN the Dashboard SHALL include a headline, supporting text explaining the value, and a prominent primary CTA button
3. WHEN a user views the documents tab with no documents THEN the Dashboard SHALL display educational content with file type icons (PDF, TXT, MD) and a brief explanation of how documents power the voice agent
4. WHEN a user views the conversations tab with no conversations THEN the Dashboard SHALL display a visual showing how conversations flow from widget interactions to the dashboard
5. WHEN displaying any empty state THEN the Dashboard SHALL include a secondary text link to documentation or help content

### Requirement 2: Project Setup Progress Indicator

**User Story:** As a user setting up a new project, I want to see my progress through visual step indicators, so that I know exactly what I've completed and what remains.

#### Acceptance Criteria

1. WHEN a user views a project detail page THEN the Dashboard SHALL display a horizontal progress indicator with three steps: Create Project, Upload Documents, Embed Widget
2. WHEN displaying progress steps THEN the Dashboard SHALL show checkmarks for completed steps, highlight the current step, and show pending steps in a muted state
3. WHEN a project has no documents THEN the Dashboard SHALL indicate "Upload Documents" as the current incomplete step
4. WHEN a project has documents but the widget has not been used THEN the Dashboard SHALL indicate "Embed Widget" as the current step with copy-ready embed code
5. WHEN all setup steps are complete THEN the Dashboard SHALL collapse the progress indicator and display a subtle success badge

### Requirement 3: Enhanced Project Cards with Metrics

**User Story:** As a user with multiple projects, I want project cards to show meaningful metrics at a glance with visual indicators, so that I can quickly assess project health and activity.

#### Acceptance Criteria

1. WHEN displaying a project card THEN the Dashboard SHALL show document count with a file icon and conversation count with a chat icon in a metrics row
2. WHEN displaying a project card THEN the Dashboard SHALL show the last activity timestamp in relative format (e.g., "Active 2h ago")
3. WHEN a project has incomplete setup THEN the Dashboard SHALL display a colored pill badge indicating setup status (e.g., "Setup Incomplete" in amber)
4. WHEN a project has zero documents THEN the Dashboard SHALL display "No docs" indicator to prompt action
5. WHEN displaying project cards THEN the Dashboard SHALL use consistent card heights with aligned content sections

### Requirement 4: Contextual Help with Tooltips

**User Story:** As a user, I want inline explanations for technical concepts without leaving the current page, so that I can learn while doing.

#### Acceptance Criteria

1. WHEN a user hovers over the widget token field THEN the Dashboard SHALL display a tooltip explaining that the token authenticates widget requests and should be kept private
2. WHEN displaying the embed code section THEN the Dashboard SHALL include helper text showing where to paste the code (before closing body tag)
3. WHEN displaying the agent settings section THEN the Dashboard SHALL provide example system prompts as placeholder text
4. WHEN a user hovers over document status badges THEN the Dashboard SHALL display a tooltip explaining each status (Processing: being chunked and embedded, Ready: available for RAG, Failed: processing error)
5. WHEN displaying the system prompt field THEN the Dashboard SHALL include a character count and brief guidance on effective prompts

### Requirement 5: Improved Document Upload Experience

**User Story:** As a user uploading documents, I want clear visual feedback throughout the upload process, so that I understand what's happening and feel confident.

#### Acceptance Criteria

1. WHEN a user drags a file over the documents section THEN the Dashboard SHALL display a highlighted drop zone with dashed border and upload icon
2. WHEN a document is uploading THEN the Dashboard SHALL display the file name with a loading spinner and "Processing..." status
3. WHEN a document upload completes successfully THEN the Dashboard SHALL display a success toast with the document name
4. WHEN a document upload fails THEN the Dashboard SHALL display an error message with the specific reason and a suggestion to retry
5. WHEN displaying the documents list THEN the Dashboard SHALL show file type icons specific to each format (PDF icon, TXT icon, MD icon)

### Requirement 6: Conversation List with Query Previews

**User Story:** As a user reviewing conversations, I want to see previews and insights without clicking into each one, so that I can quickly find relevant conversations.

#### Acceptance Criteria

1. WHEN displaying a conversation in the list THEN the Dashboard SHALL show a truncated preview of the first user query (max 60 characters with ellipsis)
2. WHEN displaying conversation rows THEN the Dashboard SHALL show turn count with a message icon
3. WHEN displaying the conversations tab header THEN the Dashboard SHALL show total conversation count as a metric
4. WHEN a conversation occurred within the last 24 hours THEN the Dashboard SHALL display the timestamp in relative format (e.g., "2 hours ago")
5. WHEN displaying conversation timestamps older than 24 hours THEN the Dashboard SHALL display the date in short format (e.g., "Nov 28")
