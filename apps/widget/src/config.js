/**
 * Widget configuration parser
 * Extracts and validates configuration from script tag attributes
 */

/**
 * @typedef {Object} WidgetConfig
 * @property {string} token - Project token for authentication
 * @property {string} apiUrl - API server URL
 */

/**
 * Shared audio constraints for microphone capture
 * Used by both button.js and livekit-manager.js
 */
export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Parse configuration from the script tag that loaded the widget
 * @param {HTMLScriptElement} scriptElement - The script element
 * @returns {WidgetConfig|null} Configuration object or null if invalid
 */
export function parseConfig(scriptElement) {
  if (!scriptElement) {
    console.error('[Vakkya] No script element provided');
    return null;
  }

  const token = scriptElement.getAttribute('data-token');
  
  if (!token || token.trim() === '') {
    console.error('[Vakkya] Missing required data-token attribute');
    return null;
  }

  // API URL can be overridden for development
  const apiUrl = scriptElement.getAttribute('data-api-url') || 'https://api.vakkya.ai';

  return {
    token: token.trim(),
    apiUrl: apiUrl.trim(),
  };
}

/**
 * Find the script tag that loaded this widget
 * @returns {HTMLScriptElement|null}
 */
export function findWidgetScript() {
  // document.currentScript is only available during initial script execution
  // For module scripts, we need to find it by src or data attribute
  const scripts = document.querySelectorAll('script[data-token]');
  
  // Return the last one (most recently added)
  return scripts.length > 0 ? scripts[scripts.length - 1] : null;
}
