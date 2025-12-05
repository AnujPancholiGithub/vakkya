/**
 * Chat Panel CSS Design Tokens
 * Soft UI aesthetic with rounded corners, pastel colors, subtle shadows
 * Supports light and dark themes
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */

/**
 * CSS custom properties for theming
 * Applied to :host element for Shadow DOM isolation
 */
export const CSS_VARIABLES = `
  :host {
    /* Colors - Light Theme (Pastel Palette) */
    --vakkya-bg-primary: #FAFBFC;
    --vakkya-bg-secondary: #F3F4F6;
    --vakkya-bg-chat: #FFFFFF;
    --vakkya-text-primary: #1F2937;
    --vakkya-text-secondary: #6B7280;
    --vakkya-accent: var(--vakkya-custom-accent, #3B82F6);
    --vakkya-accent-hover: color-mix(in srgb, var(--vakkya-accent), black 10%);
    --vakkya-accent-light: color-mix(in srgb, var(--vakkya-accent) 15%, white);
    --vakkya-user-bubble: color-mix(in srgb, var(--vakkya-accent) 15%, white);
    --vakkya-agent-bubble: #F3F4F6;
    --vakkya-border: #E5E7EB;
    --vakkya-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    --vakkya-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
    --vakkya-shadow-accent: 0 2px 8px color-mix(in srgb, var(--vakkya-accent), transparent 70%);
    
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
    --vakkya-user-bubble: color-mix(in srgb, var(--vakkya-accent) 30%, #1F2937);
    --vakkya-user-text: #F9FAFB;
    --vakkya-agent-bubble: #374151;
    --vakkya-border: #4B5563;
    --vakkya-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    --vakkya-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

/**
 * Chat panel container styles
 */
export const CHAT_PANEL_STYLES = `
  ${CSS_VARIABLES}

  .vakkya-chat-panel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    left: auto;
    width: 380px;
    height: 520px;
    background: var(--vakkya-bg-chat);
    border-radius: var(--vakkya-radius-lg);
    box-shadow: var(--vakkya-shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 2147483647;
    opacity: 0;
    transform: scale(0.9) translateY(20px);
    transform-origin: bottom right;
    transition: opacity var(--vakkya-transition-slow), 
                transform var(--vakkya-transition-slow);
  }

  /* Position: bottom-left */
  :host([data-position="bottom-left"]) .vakkya-chat-panel {
    right: auto;
    left: 20px;
    transform-origin: bottom left;
  }

  .vakkya-chat-panel.expanded {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  .vakkya-chat-panel.collapsed {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
    pointer-events: none;
  }

  /* Header */
  .vakkya-chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--vakkya-bg-primary);
    border-bottom: 1px solid var(--vakkya-border);
  }

  .vakkya-chat-title {
    color: var(--vakkya-text-primary);
    font-size: 15px;
    font-weight: 600;
    margin: 0;
  }

  .vakkya-chat-close {
    width: 32px;
    height: 32px;
    border-radius: var(--vakkya-radius-sm);
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--vakkya-transition);
    color: var(--vakkya-text-secondary);
  }

  .vakkya-chat-close:hover {
    background: var(--vakkya-bg-secondary);
  }

  .vakkya-chat-close:focus {
    outline: 2px solid var(--vakkya-accent);
    outline-offset: 2px;
  }

  .vakkya-chat-close svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  /* Message List */
  .vakkya-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
  }

  /* Message Bubbles - Requirement 5.4 */
  .vakkya-message {
    max-width: 85%;
    padding: 12px 16px;
    border-radius: var(--vakkya-radius-md);
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
  }

  .vakkya-message-user {
    align-self: flex-end;
    background: var(--vakkya-user-bubble);
    color: var(--vakkya-text-primary);
    border-bottom-right-radius: 4px;
  }

  .vakkya-message-agent {
    align-self: flex-start;
    background: var(--vakkya-agent-bubble);
    color: var(--vakkya-text-primary);
    border-bottom-left-radius: 4px;
  }

  .vakkya-message-system {
    align-self: center;
    background: transparent;
    color: var(--vakkya-text-secondary);
    font-size: 12px;
    padding: 8px;
  }

  /* Transcribing indicator */
  .vakkya-message-transcribing {
    opacity: 0.7;
  }

  .vakkya-message-transcribing::after {
    content: '...';
    animation: vakkya-typing 1s infinite;
  }

  @keyframes vakkya-typing {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
  }

  /* Speaking indicator */
  .vakkya-speaking-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
  }

  .vakkya-speaking-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--vakkya-accent);
    animation: vakkya-pulse 1.4s infinite ease-in-out;
  }

  .vakkya-speaking-dot:nth-child(1) { animation-delay: 0s; }
  .vakkya-speaking-dot:nth-child(2) { animation-delay: 0.2s; }
  .vakkya-speaking-dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes vakkya-pulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }

  /* Voice Input Bar */
  .vakkya-voice-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--vakkya-bg-primary);
    border-top: 1px solid var(--vakkya-border);
  }

  .vakkya-waveform-mini {
    flex: 1;
    height: 40px;
    border-radius: var(--vakkya-radius-sm);
    background: var(--vakkya-bg-secondary);
  }

  /* Mute button - Requirements 3.1, 3.4, 5.5 */
  /* Primary action button using accent color for visibility */
  .vakkya-mute-button {
    width: 44px;
    height: 44px;
    border-radius: var(--vakkya-radius-full);
    background: var(--vakkya-accent);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--vakkya-transition), 
                background var(--vakkya-transition),
                box-shadow var(--vakkya-transition);
    color: white;
    box-shadow: var(--vakkya-shadow-accent);
  }

  .vakkya-mute-button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--vakkya-accent), transparent 60%);
  }

  .vakkya-mute-button:active {
    transform: scale(0.95);
  }

  .vakkya-mute-button:focus {
    outline: 2px solid var(--vakkya-accent);
    outline-offset: 2px;
  }

  .vakkya-mute-button svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  /* Muted state - distinct red visual indicator (Requirements 3.4, 5.5) */
  .vakkya-mute-button.muted {
    background: #EF4444;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }

  .vakkya-mute-button.muted:hover {
    background: #DC2626;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
  }

  :host([data-theme="dark"]) .vakkya-mute-button.muted {
    background: #DC2626;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
  }

  :host([data-theme="dark"]) .vakkya-mute-button.muted:hover {
    background: #EF4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
  }

  @keyframes vakkya-mic-pulse {
    0%, 100% { box-shadow: 0 2px 8px color-mix(in srgb, var(--vakkya-accent), transparent 70%); }
    50% { box-shadow: 0 2px 16px color-mix(in srgb, var(--vakkya-accent), transparent 40%); }
  }

  /* Status text */
  .vakkya-status-text {
    font-size: 12px;
    color: var(--vakkya-text-secondary);
    text-align: center;
    padding: 4px 0;
  }

  /* Empty state */
  .vakkya-chat-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    color: var(--vakkya-text-secondary);
    text-align: center;
  }

  .vakkya-chat-empty-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .vakkya-chat-empty-text {
    font-size: 14px;
    margin: 0;
  }

  /* Answer Card - Requirements 1.3, 3.1, 3.2, 3.4 */
  .vakkya-answer-card {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 85%;
    align-self: flex-start;
    padding: 10px 14px;
    background: var(--vakkya-bg-secondary);
    border-radius: var(--vakkya-radius-md);
    border-bottom-left-radius: 4px;
    font-size: 14px;
    color: var(--vakkya-text-primary);
  }

  .vakkya-answer-card-check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: #10B981;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .vakkya-answer-card-check svg {
    width: 12px;
    height: 12px;
    fill: white;
  }

  .vakkya-answer-card-content {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    line-height: 1.4;
  }

  .vakkya-answer-card-label {
    font-weight: 500;
    color: var(--vakkya-text-secondary);
  }

  .vakkya-answer-card-value {
    font-weight: 500;
    color: var(--vakkya-text-primary);
  }

  /* Inline Form Inputs - Requirement 4.1 */
  .vakkya-inline-form {
    max-width: 85%;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--vakkya-bg-secondary);
    border-radius: var(--vakkya-radius-md);
    border-bottom-left-radius: 4px;
  }

  .vakkya-inline-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--vakkya-text-primary);
    margin-bottom: 4px;
  }

  .vakkya-inline-input,
  .vakkya-inline-select,
  .vakkya-inline-textarea {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid var(--vakkya-border);
    border-radius: var(--vakkya-radius-sm);
    background: var(--vakkya-bg-chat);
    color: var(--vakkya-text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color var(--vakkya-transition);
  }

  .vakkya-inline-input:focus,
  .vakkya-inline-select:focus,
  .vakkya-inline-textarea:focus {
    border-color: var(--vakkya-accent);
  }

  .vakkya-inline-input:disabled,
  .vakkya-inline-select:disabled,
  .vakkya-inline-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--vakkya-bg-secondary);
  }

  /* Pending input state - shows voice-extracted value awaiting confirmation */
  .vakkya-inline-pending-input {
    border-color: var(--vakkya-accent);
    background: var(--vakkya-accent-light);
  }

  .vakkya-inline-input::placeholder,
  .vakkya-inline-textarea::placeholder {
    color: var(--vakkya-text-secondary);
    opacity: 0.6;
  }

  .vakkya-inline-select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 32px;
  }

  .vakkya-inline-textarea {
    resize: vertical;
    min-height: 60px;
  }

  /* Pending confirmation UI - Requirement 4.3 */
  .vakkya-inline-pending {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: var(--vakkya-accent-light);
    border: 2px solid var(--vakkya-accent);
    border-radius: var(--vakkya-radius-sm);
  }

  .vakkya-inline-pending-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--vakkya-accent);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .vakkya-inline-pending-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--vakkya-text-primary);
  }

  .vakkya-inline-pending-actions {
    display: flex;
    gap: 8px;
  }

  .vakkya-inline-btn {
    flex: 1;
    padding: 8px 12px;
    border-radius: var(--vakkya-radius-sm);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all var(--vakkya-transition);
  }

  .vakkya-inline-btn-confirm {
    background: var(--vakkya-accent);
    color: white;
  }

  .vakkya-inline-btn-confirm:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .vakkya-inline-btn-reject {
    background: transparent;
    color: var(--vakkya-text-secondary);
    border: 1px solid var(--vakkya-border);
  }

  .vakkya-inline-btn-reject:hover {
    background: var(--vakkya-bg-secondary);
  }

  /* Confirmed state indicator */
  .vakkya-inline-confirmed {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #10B981;
    color: white;
    border-radius: var(--vakkya-radius-sm);
    font-size: 12px;
    font-weight: 500;
  }

  .vakkya-inline-confirmed svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  /* Summary Card - Requirements 4.5, 8.1, 8.2, 8.3 */
  .vakkya-summary-card {
    max-width: 90%;
    align-self: flex-start;
    background: var(--vakkya-bg-chat);
    border: 1px solid var(--vakkya-border);
    border-radius: var(--vakkya-radius-md);
    overflow: hidden;
    box-shadow: var(--vakkya-shadow-sm);
  }

  .vakkya-summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--vakkya-bg-secondary);
    border-bottom: 1px solid var(--vakkya-border);
  }

  .vakkya-summary-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--vakkya-text-primary);
  }

  .vakkya-summary-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: var(--vakkya-radius-sm);
  }

  .vakkya-summary-status svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  .vakkya-summary-status-submitting {
    background: var(--vakkya-accent-light);
    color: var(--vakkya-accent);
  }

  .vakkya-summary-status-submitting svg {
    animation: vakkya-spin 1s linear infinite;
  }

  @keyframes vakkya-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .vakkya-summary-status-success {
    background: #D1FAE5;
    color: #059669;
  }

  .vakkya-summary-status-error {
    background: #FEE2E2;
    color: #DC2626;
  }

  .vakkya-summary-answers {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .vakkya-summary-answer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--vakkya-border);
  }

  .vakkya-summary-answer:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .vakkya-summary-label {
    flex: 0 0 auto;
    font-size: 12px;
    font-weight: 500;
    color: var(--vakkya-text-secondary);
    min-width: 80px;
  }

  .vakkya-summary-value {
    flex: 1;
    font-size: 14px;
    color: var(--vakkya-text-primary);
    word-break: break-word;
  }

  .vakkya-summary-edit-btn {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: var(--vakkya-radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--vakkya-text-secondary);
    transition: all var(--vakkya-transition);
  }

  .vakkya-summary-edit-btn:hover {
    background: var(--vakkya-bg-secondary);
    color: var(--vakkya-accent);
  }

  .vakkya-summary-edit-btn svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .vakkya-summary-error {
    padding: 10px 16px;
    background: #FEF2F2;
    color: #DC2626;
    font-size: 13px;
    border-top: 1px solid #FECACA;
  }

  .vakkya-summary-actions {
    padding: 12px 16px;
    border-top: 1px solid var(--vakkya-border);
  }

  .vakkya-summary-approve-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--vakkya-accent);
    color: white;
    border: none;
    border-radius: var(--vakkya-radius-sm);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--vakkya-transition);
  }

  .vakkya-summary-approve-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .vakkya-summary-approve-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .vakkya-summary-approve-btn svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .vakkya-summary-approve-btn svg {
    animation: none;
  }

  .vakkya-summary-submitting .vakkya-summary-approve-btn svg {
    animation: vakkya-spin 1s linear infinite;
  }

  .vakkya-summary-success-message {
    padding: 12px 16px;
    background: #D1FAE5;
    color: #059669;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    border-top: 1px solid #A7F3D0;
  }

  /* Dark theme adjustments for summary card */
  :host([data-theme="dark"]) .vakkya-summary-status-success {
    background: #064E3B;
    color: #34D399;
  }

  :host([data-theme="dark"]) .vakkya-summary-status-error {
    background: #7F1D1D;
    color: #FCA5A5;
  }

  :host([data-theme="dark"]) .vakkya-summary-error {
    background: #7F1D1D;
    color: #FCA5A5;
    border-top-color: #991B1B;
  }

  :host([data-theme="dark"]) .vakkya-summary-success-message {
    background: #064E3B;
    color: #34D399;
    border-top-color: #065F46;
  }

  /* Sticky Input Container - Requirements 2.1, 6.4 */
  .vakkya-sticky-input {
    position: sticky;
    bottom: 0;
    background: var(--vakkya-bg-chat);
    border-top: 1px solid var(--vakkya-border);
    padding: 12px 16px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
    transition: opacity var(--vakkya-transition), transform var(--vakkya-transition);
  }

  .vakkya-sticky-input.hidden {
    display: none;
  }

  /* Progress indicator - Requirement 6.4 */
  .vakkya-sticky-progress {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: var(--vakkya-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  .vakkya-sticky-progress-text {
    color: var(--vakkya-accent);
  }

  .vakkya-sticky-progress-bar {
    flex: 1;
    height: 3px;
    background: var(--vakkya-bg-secondary);
    border-radius: 2px;
    margin-left: 12px;
    overflow: hidden;
  }

  .vakkya-sticky-progress-fill {
    height: 100%;
    background: var(--vakkya-accent);
    border-radius: 2px;
    transition: width var(--vakkya-transition-slow);
  }

  /* Field label in sticky container */
  .vakkya-sticky-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--vakkya-text-primary);
    margin: 4px 0;
  }

  /* Input wrapper in sticky container */
  .vakkya-sticky-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Input row with input and submit button */
  .vakkya-sticky-input-row {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }

  .vakkya-sticky-input-row .vakkya-inline-input,
  .vakkya-sticky-input-row .vakkya-inline-select {
    flex: 1;
    min-width: 0;
  }

  .vakkya-sticky-input-row .vakkya-inline-textarea {
    flex: 1;
    min-width: 0;
  }

  /* Submit button for mobile users */
  .vakkya-sticky-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    min-width: 48px;
    height: auto;
    padding: 12px;
    border: none;
    border-radius: var(--vakkya-radius-sm);
    background: var(--vakkya-accent);
    color: white;
    cursor: pointer;
    transition: background var(--vakkya-transition), transform var(--vakkya-transition);
  }

  .vakkya-sticky-submit-btn:hover {
    background: var(--vakkya-accent-hover);
  }

  .vakkya-sticky-submit-btn:active {
    transform: scale(0.95);
  }

  .vakkya-sticky-submit-btn svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .vakkya-sticky-input .vakkya-inline-input,
  .vakkya-sticky-input .vakkya-inline-select,
  .vakkya-sticky-input .vakkya-inline-textarea {
    width: 100%;
    padding: 12px 14px;
    border: 2px solid var(--vakkya-border);
    border-radius: var(--vakkya-radius-sm);
    background: var(--vakkya-bg-chat);
    color: var(--vakkya-text-primary);
    font-size: 15px;
    font-family: inherit;
    outline: none;
    transition: border-color var(--vakkya-transition), box-shadow var(--vakkya-transition);
  }

  .vakkya-sticky-input .vakkya-inline-input:focus,
  .vakkya-sticky-input .vakkya-inline-select:focus,
  .vakkya-sticky-input .vakkya-inline-textarea:focus {
    border-color: var(--vakkya-accent);
    box-shadow: 0 0 0 3px var(--vakkya-accent-light);
  }

  /* Pending confirmation in sticky container - Requirement 6.2 */
  .vakkya-sticky-pending {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--vakkya-accent-light);
    border: 2px solid var(--vakkya-accent);
    border-radius: var(--vakkya-radius-sm);
    animation: vakkya-pending-pulse 2s ease-in-out infinite;
  }

  @keyframes vakkya-pending-pulse {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--vakkya-accent), transparent 80%); }
    50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--vakkya-accent), transparent 90%); }
  }

  .vakkya-sticky-pending-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--vakkya-accent);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .vakkya-sticky-pending-value {
    font-size: 16px;
    font-weight: 500;
    color: var(--vakkya-text-primary);
    padding: 8px 0;
  }

  .vakkya-sticky-pending-actions {
    display: flex;
    gap: 8px;
  }

  .vakkya-sticky-pending-actions .vakkya-inline-btn {
    flex: 1;
    padding: 10px 16px;
    font-size: 14px;
  }

  /* Validation error in sticky container - Requirement 6.3 */
  .vakkya-sticky-error {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #FEF2F2;
    color: #DC2626;
    font-size: 13px;
    border-radius: var(--vakkya-radius-sm);
    border: 1px solid #FECACA;
  }

  .vakkya-sticky-error svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
    flex-shrink: 0;
  }

  :host([data-theme="dark"]) .vakkya-sticky-error {
    background: #7F1D1D;
    color: #FCA5A5;
    border-color: #991B1B;
  }

  /* Speaking indicator in sticky container - Requirement 6.5 */
  .vakkya-sticky-speaking {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--vakkya-accent);
  }

  .vakkya-sticky-speaking-dots {
    display: flex;
    gap: 3px;
  }

  .vakkya-sticky-speaking-dots span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--vakkya-accent);
    animation: vakkya-pulse 1.4s infinite ease-in-out;
  }

  .vakkya-sticky-speaking-dots span:nth-child(1) { animation-delay: 0s; }
  .vakkya-sticky-speaking-dots span:nth-child(2) { animation-delay: 0.2s; }
  .vakkya-sticky-speaking-dots span:nth-child(3) { animation-delay: 0.4s; }

  /* Responsive */
  @media (max-width: 480px) {
    .vakkya-chat-panel {
      width: calc(100vw - 32px);
      height: calc(100vh - 100px);
      max-height: 600px;
      right: 16px;
      bottom: 16px;
    }

    .vakkya-inline-form {
      max-width: 90%;
    }

    .vakkya-summary-card {
      max-width: 95%;
    }

    .vakkya-summary-label {
      min-width: 60px;
    }
  }

  /* Session End Overlay (Requirements 2.3, 2.4) */
  .vakkya-session-end-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    opacity: 0;
    transition: opacity var(--vakkya-transition-slow);
  }

  .vakkya-session-end-overlay.vakkya-session-end-visible {
    opacity: 1;
  }

  .vakkya-session-end-content {
    background: var(--vakkya-bg-chat);
    border-radius: var(--vakkya-radius-lg);
    padding: 24px 32px;
    text-align: center;
    max-width: 280px;
    box-shadow: var(--vakkya-shadow);
  }

  .vakkya-session-end-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--vakkya-accent-light);
  }

  .vakkya-session-end-icon svg {
    width: 24px;
    height: 24px;
    fill: var(--vakkya-accent);
  }

  /* Error state styling */
  .vakkya-session-end-error .vakkya-session-end-icon {
    background: #FEE2E2;
  }

  .vakkya-session-end-error .vakkya-session-end-icon svg {
    fill: #DC2626;
  }

  .vakkya-session-end-message {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--vakkya-text-primary);
  }
`;

/**
 * Apply custom accent color from config
 * @param {HTMLElement} host - Host element to apply styles to
 * @param {string} accentColor - CSS color value
 */
export function applyAccentColor(host, accentColor) {
  if (accentColor && isValidColor(accentColor)) {
    // Set both --vakkya-accent directly AND --vakkya-custom-accent for proper cascading
    host.style.setProperty('--vakkya-accent', accentColor);
    host.style.setProperty('--vakkya-custom-accent', accentColor);
  }
}

/**
 * Apply theme to host element
 * @param {HTMLElement} host - Host element
 * @param {'light'|'dark'} theme - Theme name
 */
export function applyTheme(host, theme) {
  if (theme === 'dark') {
    host.setAttribute('data-theme', 'dark');
  } else {
    host.removeAttribute('data-theme');
  }
}

/**
 * Validate CSS color value
 * @param {string} color - Color to validate
 * @returns {boolean}
 */
function isValidColor(color) {
  if (!color || typeof color !== 'string') return false;
  
  // Check hex colors
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)) return true;
  
  // Check rgb/rgba
  if (/^rgba?\([\d\s,%.]+\)$/.test(color)) return true;
  
  // Check hsl/hsla
  if (/^hsla?\([\d\s,%.]+\)$/.test(color)) return true;
  
  // Check named colors (basic set)
  const namedColors = ['red', 'blue', 'green', 'white', 'black', 'gray', 'grey'];
  if (namedColors.includes(color.toLowerCase())) return true;
  
  return false;
}
