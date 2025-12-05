/**
 * Floating button component
 * Renders the voice assistant trigger button
 */

import { AUDIO_CONSTRAINTS } from './config.js';

const BUTTON_STYLES = `
  .vakkya-button {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background-color: var(--vakkya-accent, #3B82F6);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--vakkya-accent, #3B82F6), transparent 60%);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .vakkya-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px color-mix(in srgb, var(--vakkya-accent, #3B82F6), transparent 50%);
  }
  
  .vakkya-button:active {
    transform: scale(0.95);
  }
  
  .vakkya-button:focus {
    outline: 2px solid #1D4ED8;
    outline-offset: 2px;
  }
  
  .vakkya-button-icon {
    width: 24px;
    height: 24px;
    fill: white;
  }
  
  @media (max-width: 480px) {
    .vakkya-button {
      width: 48px;
      height: 48px;
    }
    
    .vakkya-button-icon {
      width: 20px;
      height: 20px;
    }
  }
`;

// Microphone SVG icon
const MIC_ICON = `
  <svg class="vakkya-button-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>
`;

/**
 * Create the floating button element
 * @param {ShadowRoot} shadow - Shadow root to inject styles
 * @returns {HTMLButtonElement}
 */
export function createButton(shadow) {
  // Inject button styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = BUTTON_STYLES;
  shadow.appendChild(styleSheet);
  
  // Create button
  const button = document.createElement('button');
  button.className = 'vakkya-button';
  button.setAttribute('aria-label', 'Start voice conversation');
  button.setAttribute('type', 'button');
  button.innerHTML = MIC_ICON;
  
  return button;
}

/**
 * Request microphone permission
 * @returns {Promise<MediaStream|null>} MediaStream if granted, null if denied
 */
export async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: AUDIO_CONSTRAINTS
    });
    return stream;
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      console.warn('[Vakkya] Microphone permission denied');
    } else if (err.name === 'NotFoundError') {
      console.error('[Vakkya] No microphone found');
    } else {
      console.error('[Vakkya] Microphone error:', err);
    }
    return null;
  }
}

/**
 * Release microphone stream
 * @param {MediaStream} stream - Stream to release
 */
export function releaseMicrophone(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
