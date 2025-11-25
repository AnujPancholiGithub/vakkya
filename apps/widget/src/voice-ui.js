/**
 * Voice UI component
 * Expanded interface shown during active voice conversation
 */

const VOICE_UI_STYLES = `
  .vakkya-voice-ui {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 320px;
    height: 180px;
    background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 2147483647;
  }
  
  .vakkya-voice-ui-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
  }
  
  .vakkya-voice-ui-title {
    color: white;
    font-size: 14px;
    font-weight: 500;
    margin: 0;
  }
  
  .vakkya-close-button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }
  
  .vakkya-close-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .vakkya-close-button:focus {
    outline: 2px solid white;
    outline-offset: 2px;
  }
  
  .vakkya-close-icon {
    width: 14px;
    height: 14px;
    fill: white;
  }
  
  .vakkya-waveform-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px 16px;
  }
  
  .vakkya-waveform {
    width: 100%;
    height: 100%;
    border-radius: 8px;
  }
  
  .vakkya-status {
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    text-align: center;
    padding-bottom: 12px;
  }
  
  .vakkya-error {
    background: rgba(239, 68, 68, 0.9);
    color: white;
    padding: 8px 16px;
    font-size: 13px;
    text-align: center;
  }
  
  @media (max-width: 480px) {
    .vakkya-voice-ui {
      width: calc(100vw - 32px);
      right: 16px;
      bottom: 16px;
      height: 160px;
    }
  }
`;

const CLOSE_ICON = `
  <svg class="vakkya-close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
`;

/**
 * @typedef {'connecting'|'listening'|'processing'|'speaking'|'error'} VoiceUIStatus
 */

const STATUS_MESSAGES = {
  connecting: 'Connecting...',
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
  error: 'Connection error',
};

/**
 * Create the voice UI element
 * @param {ShadowRoot} shadow - Shadow root to inject styles
 * @param {Function} onClose - Callback when close button is clicked
 * @returns {{ element: HTMLElement, canvas: HTMLCanvasElement, setStatus: Function, showError: Function }}
 */
export function createVoiceUI(shadow, onClose) {
  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = VOICE_UI_STYLES;
  shadow.appendChild(styleSheet);
  
  // Create main container
  const element = document.createElement('div');
  element.className = 'vakkya-voice-ui';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Voice conversation');
  
  // Header with title and close button
  const header = document.createElement('div');
  header.className = 'vakkya-voice-ui-header';
  
  const title = document.createElement('span');
  title.className = 'vakkya-voice-ui-title';
  title.textContent = 'Voice Assistant';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'vakkya-close-button';
  closeButton.setAttribute('aria-label', 'Close voice conversation');
  closeButton.setAttribute('type', 'button');
  closeButton.innerHTML = CLOSE_ICON;
  closeButton.addEventListener('click', onClose);
  
  header.appendChild(title);
  header.appendChild(closeButton);
  
  // Waveform container
  const waveformContainer = document.createElement('div');
  waveformContainer.className = 'vakkya-waveform-container';
  
  const canvas = document.createElement('canvas');
  canvas.className = 'vakkya-waveform';
  canvas.width = 288;
  canvas.height = 80;
  waveformContainer.appendChild(canvas);
  
  // Status text
  const status = document.createElement('div');
  status.className = 'vakkya-status';
  status.textContent = STATUS_MESSAGES.connecting;
  
  // Error container (hidden by default)
  const errorContainer = document.createElement('div');
  errorContainer.className = 'vakkya-error';
  errorContainer.style.display = 'none';
  
  // Assemble
  element.appendChild(header);
  element.appendChild(waveformContainer);
  element.appendChild(status);
  element.appendChild(errorContainer);
  
  /**
   * Update status message
   * @param {VoiceUIStatus} newStatus
   */
  function setStatus(newStatus) {
    status.textContent = STATUS_MESSAGES[newStatus] || '';
    errorContainer.style.display = newStatus === 'error' ? 'block' : 'none';
  }
  
  /**
   * Show error message
   * @param {string} message
   */
  function showError(message) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    status.style.display = 'none';
  }
  
  return { element, canvas, setStatus, showError };
}
