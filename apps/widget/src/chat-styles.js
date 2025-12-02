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

  .vakkya-mic-button {
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
                box-shadow var(--vakkya-transition);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .vakkya-mic-button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .vakkya-mic-button:active {
    transform: scale(0.95);
  }

  .vakkya-mic-button:focus {
    outline: 2px solid var(--vakkya-accent);
    outline-offset: 2px;
  }

  .vakkya-mic-button svg {
    width: 20px;
    height: 20px;
    fill: white;
  }

  /* Voice status states */
  .vakkya-mic-button.listening {
    animation: vakkya-mic-pulse 2s infinite;
  }

  .vakkya-mic-button.processing {
    background: var(--vakkya-text-secondary);
  }

  .vakkya-mic-button.speaking {
    background: #10B981;
  }

  .vakkya-mic-button.error {
    background: #EF4444;
  }

  @keyframes vakkya-mic-pulse {
    0%, 100% { box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); }
    50% { box-shadow: 0 2px 16px rgba(59, 130, 246, 0.6); }
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

  /* Responsive */
  @media (max-width: 480px) {
    .vakkya-chat-panel {
      width: calc(100vw - 32px);
      height: calc(100vh - 100px);
      max-height: 600px;
      right: 16px;
      bottom: 16px;
    }
  }
`;

/**
 * Apply custom accent color from config
 * @param {HTMLElement} host - Host element to apply styles to
 * @param {string} accentColor - CSS color value
 */
export function applyAccentColor(host, accentColor) {
  if (accentColor && isValidColor(accentColor)) {
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
