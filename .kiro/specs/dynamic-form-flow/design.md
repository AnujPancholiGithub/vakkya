# Design Document: Dynamic Form Flow & Chat UI

## Overview

This design transforms the Vakkya widget from a simple voice button with form overlay into a modern chat-style interface with agent-driven form activation. The key changes are:

1. **Remove automatic form display** - Forms only appear when the agent explicitly activates them
2. **Chat panel UI** - Expandable panel showing conversation transcriptions
3. **Inline form inputs** - Form fields render within the chat flow as message components
4. **Soft UI aesthetic** - Modern design with rounded corners, pastel colors, subtle shadows

### Key Design Principles

1. **Agent-First**: The agent controls when forms appear, not the widget
2. **Conversational Continuity**: Forms feel like part of the dialogue, not separate overlays
3. **Visual Feedback**: Users see transcriptions of both their speech and agent responses
4. **Aesthetic Harmony**: Soft, modern design that blends with any website
5. **Minimal Customization**: Only essential options (accent color, theme) to keep it simple

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WIDGET (Browser)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────────────────────────────┐   │
│  │  Voice Button   │────▶│            Chat Panel                    │   │
│  │  (collapsed)    │     │  ┌─────────────────────────────────┐    │   │
│  └─────────────────┘     │  │     Message List                 │    │   │
│                          │  │  ┌─────────────────────────┐     │    │   │
│                          │  │  │ Agent Message Bubble    │     │    │   │
│                          │  │  └─────────────────────────┘     │    │   │
│                          │  │  ┌─────────────────────────┐     │    │   │
│                          │  │  │ User Message Bubble     │     │    │   │
│                          │  │  └─────────────────────────┘     │    │   │
│                          │  │  ┌─────────────────────────┐     │    │   │
│                          │  │  │ Inline Form Input       │     │    │   │
│                          │  │  └─────────────────────────┘     │    │   │
│                          │  │  ┌─────────────────────────┐     │    │   │
│                          │  │  │ Summary Card            │     │    │   │
│                          │  │  └─────────────────────────┘     │    │   │
│                          │  └─────────────────────────────────┘    │   │
│                          │  ┌─────────────────────────────────┐    │   │
│                          │  │  Voice Input Bar                 │    │   │
│                          │  │  [Waveform] [Mic Button] [Send]  │    │   │
│                          │  └─────────────────────────────────┘    │   │
│                          └─────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    State Management                               │  │
│  │  - messages: Message[]                                            │  │
│  │  - activeForm: FormSchema | null                                  │  │
│  │  - currentField: string | null                                    │  │
│  │  - formAnswers: Record<string, any>                               │  │
│  │  - voiceStatus: 'idle' | 'listening' | 'processing' | 'speaking'  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Chat Panel Component

The main container that replaces the current voice UI and form UI.

```typescript
interface ChatPanelState {
  isExpanded: boolean;
  messages: ChatMessage[];
  voiceStatus: 'idle' | 'listening' | 'processing' | 'speaking';
  activeForm: FormSchema | null;
  currentFieldName: string | null;
  formAnswers: Record<string, FieldAnswer>;
  pendingConfirmation: PendingConfirmation | null;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'form-input' | 'summary' | 'system';
  content: string;
  timestamp: number;
  // For form-input type
  fieldName?: string;
  fieldType?: string;
  fieldValue?: unknown;
  isConfirmed?: boolean;
  // For agent type
  isSpeaking?: boolean;
}
```

### 2. Message Components

Different message types rendered in the chat flow.

```typescript
// User message bubble (transcription of user speech)
interface UserMessageProps {
  content: string;
  timestamp: number;
  isTranscribing?: boolean; // Show typing indicator while STT is processing
}

// Agent message bubble
interface AgentMessageProps {
  content: string;
  timestamp: number;
  isSpeaking?: boolean; // Show speaking indicator
}

// Inline form input (rendered after agent asks a question)
interface InlineFormInputProps {
  fieldName: string;
  fieldType: 'string' | 'email' | 'phone' | 'number' | 'enum' | 'text';
  label: string;
  options?: string[]; // For enum type
  value?: unknown;
  isConfirmed: boolean;
  isPending: boolean; // Awaiting voice confirmation
  pendingValue?: unknown;
  onSubmit: (value: unknown) => void;
  onConfirm: () => void;
  onReject: () => void;
}

// Summary card (shown when all fields collected)
interface SummaryCardProps {
  formName: string;
  answers: Record<string, { label: string; value: unknown }>;
  onApprove: () => void;
  onEdit: (fieldName: string) => void;
  isSubmitting?: boolean;
  isSuccess?: boolean;
  error?: string;
}
```

### 3. Voice Input Bar

Bottom bar with microphone controls and optional text input.

```typescript
interface VoiceInputBarProps {
  status: 'idle' | 'listening' | 'processing' | 'speaking';
  onMicClick: () => void;
  onTextSubmit?: (text: string) => void;
  showTextInput?: boolean; // Show text input alongside mic
  waveformData?: Uint8Array;
}
```

### 4. Updated Data Channel Protocol

Extended messages for chat UI synchronization.

```typescript
// Agent → Widget messages (extended)
type AgentToWidgetMessage =
  | { type: 'form_activate'; schema: FormSchema }
  | { type: 'field_focus'; fieldName: string; question: string }
  | { type: 'value_extracted'; fieldName: string; value: unknown; utterance: string }
  | { type: 'value_confirmed'; fieldName: string; value: unknown }
  | { type: 'show_summary'; answers: Record<string, unknown> }
  | { type: 'submission_success'; submissionId: string }
  | { type: 'submission_failed'; error: string; canRetry: boolean }
  | { type: 'form_deactivated' }
  // NEW: Chat messages
  | { type: 'agent_message'; content: string; isSpeaking?: boolean }
  | { type: 'agent_speaking_start' }
  | { type: 'agent_speaking_end' };

// Widget → Agent messages (extended)
type WidgetToAgentMessage =
  | { type: 'keyboard_input'; fieldName: string; value: unknown }
  | { type: 'field_confirmed'; fieldName: string }
  | { type: 'field_rejected'; fieldName: string }
  | { type: 'form_abandoned' }
  | { type: 'submission_approved' }
  | { type: 'edit_requested'; fieldName: string }
  | { type: 'page_context'; url: string; title: string }
  // NEW: User transcription
  | { type: 'user_transcription'; content: string; isFinal: boolean };
```

## Data Models

### Widget Configuration (Extended)

```typescript
interface WidgetConfig {
  token: string;
  apiUrl: string;
  // NEW: Customization options
  accentColor?: string;      // CSS color value (default: #3B82F6)
  theme?: 'light' | 'dark';  // Default: 'light'
  position?: 'bottom-right' | 'bottom-left'; // Default: 'bottom-right'
}

// Parsed from script tag data attributes:
// <script src="..." 
//   data-token="xxx"
//   data-accent-color="#6366F1"
//   data-theme="light"
//   data-position="bottom-right"
// ></script>
```

### CSS Design Tokens

```css
:host {
  /* Colors - Light Theme (Pastel Palette) */
  --vakkya-bg-primary: #FAFBFC;
  --vakkya-bg-secondary: #F3F4F6;
  --vakkya-bg-chat: #FFFFFF;
  --vakkya-text-primary: #1F2937;
  --vakkya-text-secondary: #6B7280;
  --vakkya-accent: var(--vakkya-custom-accent, #3B82F6);
  --vakkya-accent-light: color-mix(in srgb, var(--vakkya-accent) 15%, white);
  --vakkya-user-bubble: #E0E7FF;
  --vakkya-agent-bubble: #F3F4F6;
  --vakkya-border: #E5E7EB;
  --vakkya-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  --vakkya-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  /* Spacing */
  --vakkya-radius-sm: 8px;
  --vakkya-radius-md: 12px;
  --vakkya-radius-lg: 16px;
  --vakkya-radius-full: 9999px;
  
  /* Transitions */
  --vakkya-transition: 200ms ease;
  --vakkya-transition-slow: 300ms ease;
}

/* Dark Theme */
:host([data-theme="dark"]) {
  --vakkya-bg-primary: #1F2937;
  --vakkya-bg-secondary: #374151;
  --vakkya-bg-chat: #111827;
  --vakkya-text-primary: #F9FAFB;
  --vakkya-text-secondary: #9CA3AF;
  --vakkya-user-bubble: #312E81;
  --vakkya-agent-bubble: #374151;
  --vakkya-border: #4B5563;
  --vakkya-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: No Automatic Form Display
*For any* widget connection with available forms, no form UI elements shall be rendered until a form_activate message is received from the agent.
**Validates: Requirements 1.1, 1.2**

### Property 2: Form Activation via Data Channel
*For any* form activation by the agent, a form_activate message shall be sent via data channel before the widget renders any form inputs.
**Validates: Requirements 2.2, 2.3**

### Property 3: Chat Panel Expansion
*For any* voice button click, the widget shall transition from collapsed button to expanded chat panel.
**Validates: Requirements 3.1, 3.5**

### Property 4: User Transcription Display
*For any* user speech transcription received, a user message bubble shall be added to the chat panel.
**Validates: Requirements 3.2**

### Property 5: Agent Message Display
*For any* agent response, an agent message bubble shall be added to the chat panel.
**Validates: Requirements 3.3**

### Property 6: Chat Auto-Scroll
*For any* new message added to the chat, the scroll position shall update to show the latest message.
**Validates: Requirements 3.4**

### Property 7: Inline Form Input Rendering
*For any* field_focus message from the agent, an inline form input shall be rendered below the corresponding agent question message.
**Validates: Requirements 4.1**

### Property 8: Keyboard Input Data Channel Sync
*For any* value typed in an inline form input, a keyboard_input message shall be sent to the agent via data channel.
**Validates: Requirements 4.2**

### Property 9: Voice Value Display in Input
*For any* value_extracted message, the extracted value shall be displayed in the corresponding inline form input with pending confirmation state.
**Validates: Requirements 4.3**

### Property 10: Summary Card in Chat
*For any* form completion (all fields collected), a summary card shall be rendered within the chat flow.
**Validates: Requirements 4.5, 8.1**

### Property 11: Message Bubble Differentiation
*For any* chat panel with messages, user bubbles and agent bubbles shall have visually distinct background colors.
**Validates: Requirements 5.4**

### Property 12: Customization Application
*For any* widget with custom accent color or theme data attributes, the custom values shall be applied to the rendered UI.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 13: Voice Status Indicators
*For any* voice status change (listening, processing, speaking), the widget shall display the corresponding visual indicator.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 14: Submission Announcement
*For any* form submission approval, the agent shall send a submission announcement message before the API call is made.
**Validates: Requirements 8.2**

### Property 15: Success Message in Chat
*For any* successful form submission, a success message shall be displayed in the chat panel.
**Validates: Requirements 8.3**

## Error Handling

### Widget Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| Form activation without schema | Missing schema in message | Log warning, ignore message |
| Transcription display fails | DOM manipulation error | Log error, continue without display |
| Chat scroll fails | Scroll API error | Graceful degradation, no auto-scroll |
| Custom color invalid | CSS parse failure | Fall back to default accent color |

### Voice Agent Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| No greeting sent | Session start without greeting | Send default greeting |
| Form activation without explanation | Direct activation | Prepend explanation message |
| Transcription sync fails | Data channel error | Continue voice-only mode |

## Testing Strategy

### Property-Based Testing Library
- **TypeScript (Widget)**: fast-check

### Unit Tests
- Chat panel expand/collapse
- Message rendering for each type
- Inline form input interactions
- Customization parsing
- Voice status transitions

### Property-Based Tests
Each correctness property (1-15) shall have a corresponding property-based test that:
1. Generates random valid inputs
2. Executes the operation
3. Verifies the property holds
4. Runs minimum 100 iterations

### Test Annotations
All property-based tests must include:
```typescript
// **Feature: dynamic-form-flow, Property 1: No Automatic Form Display**
// **Validates: Requirements 1.1, 1.2**
```

## Implementation Notes

### Key Changes to Existing Files

1. **widget.js** - Remove `handleFormAvailable` auto-display, add chat panel management
2. **livekit-manager.js** - Remove `onFormAvailableCallback` trigger on connect
3. **form-ui.js** - Refactor into inline form components for chat integration
4. **voice-ui.js** - Integrate into chat panel as voice input bar
5. **config.js** - Add parsing for new data attributes (accent-color, theme)

### New Files (Minimal)

1. **chat-panel.js** - Main chat panel component (consolidates voice-ui + form-ui)
2. **chat-messages.js** - Message bubble components
3. **chat-styles.js** - CSS design tokens and styles

### Bundle Size Considerations

- Reuse existing waveform renderer
- Consolidate form-ui and voice-ui into chat-panel
- Use CSS custom properties for theming (no JS color manipulation)
- Target: Stay under 100KB gzipped

