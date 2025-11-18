# Requirements Document - Dashboard (Simplified MVP)

## Introduction

The Dashboard is a Next.js 15 web application that provides a simple interface for developers to manage Vakkya projects, upload documents, and view conversation logs. It uses simple authentication, React Query for server state, and is deployed on Cloudflare Pages.

## Glossary

- **Dashboard**: The Next.js web application for project management
- **Project**: A workspace containing documents and conversation logs
- **Widget Token**: A unique token for embedding the widget
- **Document**: A file uploaded to the project's knowledge base
- **Conversation Log**: A record of voice interactions
- **React Query**: Library for server state management

## Requirements

### Requirement 1

**User Story:** As a developer, I want to sign up and log in, so that I can access my projects.

#### Acceptance Criteria

1. WHEN a user visits the dashboard THEN the Dashboard SHALL display a sign-in page if not authenticated
2. WHEN a user clicks sign up THEN the Dashboard SHALL show a registration form
3. WHEN a user completes sign-up THEN the Dashboard SHALL create account and redirect to projects page
4. WHEN a user logs in THEN the Dashboard SHALL verify credentials and redirect to projects page
5. WHEN a user logs out THEN the Dashboard SHALL clear session and redirect to sign-in page

### Requirement 2

**User Story:** As a developer, I want to create and manage projects, so that I can organize my voice agents.

#### Acceptance Criteria

1. WHEN a user views the projects page THEN the Dashboard SHALL display all projects owned by that user
2. WHEN a user clicks create project THEN the Dashboard SHALL show a form to enter project name
3. WHEN a user submits the create form THEN the Dashboard SHALL call the API and display the widget token
4. WHEN a user clicks on a project THEN the Dashboard SHALL navigate to the project detail page
5. WHEN a user deletes a project THEN the Dashboard SHALL show confirmation and call the API

### Requirement 3

**User Story:** As a developer, I want to view and copy my widget token, so that I can embed the widget.

#### Acceptance Criteria

1. WHEN a user views a project detail page THEN the Dashboard SHALL display the widget token
2. WHEN a user clicks the copy button THEN the Dashboard SHALL copy the widget token to clipboard
3. WHEN the token is copied THEN the Dashboard SHALL show a success toast
4. WHEN a user views the project detail page THEN the Dashboard SHALL display the embed code snippet
5. WHEN a user clicks copy on the embed code THEN the Dashboard SHALL copy the full script tag to clipboard

### Requirement 4

**User Story:** As a developer, I want to upload documents to my project, so that the voice agent can answer questions.

#### Acceptance Criteria

1. WHEN a user views the documents tab THEN the Dashboard SHALL display all documents for that project
2. WHEN a user clicks upload document THEN the Dashboard SHALL show a file picker for PDF, TXT, or MD files
3. WHEN a user selects a file THEN the Dashboard SHALL validate file type and size before uploading
4. WHEN a file is valid THEN the Dashboard SHALL upload it to the API
5. WHEN upload completes THEN the Dashboard SHALL display the document with status
6. WHEN a user deletes a document THEN the Dashboard SHALL show confirmation and call the API

### Requirement 5

**User Story:** As a developer, I want to see document processing status, so that I know when documents are ready.

#### Acceptance Criteria

1. WHEN a document is uploading THEN the Dashboard SHALL display "Uploading" status
2. WHEN a document is processing THEN the Dashboard SHALL display "Processing" status
3. WHEN a document is completed THEN the Dashboard SHALL display "Completed" status
4. IF a document fails THEN the Dashboard SHALL display "Failed" status with error message

### Requirement 6

**User Story:** As a developer, I want to view conversation logs, so that I can monitor my voice agent.

#### Acceptance Criteria

1. WHEN a user views the conversations tab THEN the Dashboard SHALL display a list of conversations
2. WHEN displaying conversations THEN the Dashboard SHALL show timestamp, session ID, and turn count
3. WHEN a user clicks on a conversation THEN the Dashboard SHALL navigate to the conversation detail page
4. WHEN viewing conversation detail THEN the Dashboard SHALL display all turns with user queries and agent responses

### Requirement 7

**User Story:** As a developer, I want to configure project settings, so that I can customize the voice agent.

#### Acceptance Criteria

1. WHEN a user views the settings tab THEN the Dashboard SHALL display current project configuration
2. WHEN a user updates project name THEN the Dashboard SHALL validate and save via API
3. WHEN a user saves settings THEN the Dashboard SHALL show a success toast

### Requirement 8

**User Story:** As a developer, I want to see usage statistics, so that I can understand usage.

#### Acceptance Criteria

1. WHEN a user views the dashboard home THEN the Dashboard SHALL display total projects count
2. WHEN a user views a project detail THEN the Dashboard SHALL display total documents count
3. WHEN a user views a project detail THEN the Dashboard SHALL display total conversations count

### Requirement 9

**User Story:** As a developer, I want the dashboard to be responsive, so that I can use it on mobile.

#### Acceptance Criteria

1. THE Dashboard SHALL be functional on desktop browsers (1024px+ width)
2. THE Dashboard SHALL be functional on mobile devices (320px-767px width)

### Requirement 10

**User Story:** As a developer, I want the dashboard to handle errors gracefully, so that I can understand issues.

#### Acceptance Criteria

1. WHEN an API call fails THEN the Dashboard SHALL display an error toast
2. WHEN authentication fails THEN the Dashboard SHALL redirect to the sign-in page
3. WHEN a network error occurs THEN the Dashboard SHALL show a retry button
4. WHEN a validation error occurs THEN the Dashboard SHALL highlight invalid fields with error messages
