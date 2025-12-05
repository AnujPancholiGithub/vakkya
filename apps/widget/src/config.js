/**
 * Widget configuration parser
 * Extracts and validates configuration from script tag attributes
 * Requirements: 6.1, 6.2, 6.4
 */

/**
 * @typedef {Object} WidgetConfig
 * @property {string} token - Project token for authentication
 * @property {string} apiUrl - API server URL
 * @property {string} accentColor - Custom accent color (CSS color value)
 * @property {'light'|'dark'} theme - Widget theme
 * @property {'bottom-right'|'bottom-left'} position - Widget position
 */

/**
 * Default configuration values
 * Requirement 6.4: Sensible defaults
 */
export const DEFAULT_CONFIG = {
  accentColor: '#3B82F6', // Soft blue accent
  theme: 'light',
  position: 'bottom-right',
};

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
 * Requirements: 6.1, 6.2, 6.4
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

  // Parse customization attributes (Requirements 6.1, 6.2)
  const accentColor = parseAccentColor(scriptElement.getAttribute('data-accent-color'));
  const theme = parseTheme(scriptElement.getAttribute('data-theme'));
  const position = parsePosition(scriptElement.getAttribute('data-position'));

  return {
    token: token.trim(),
    apiUrl: apiUrl.trim(),
    accentColor,
    theme,
    position,
  };
}

/**
 * Parse and validate accent color from data attribute
 * Requirement 6.1: Configure primary accent color via data attribute
 * @param {string|null} value - Color value from attribute
 * @returns {string} Valid color or default
 */
function parseAccentColor(value) {
  if (!value || typeof value !== 'string') {
    return DEFAULT_CONFIG.accentColor;
  }
  
  const trimmed = value.trim();
  if (isValidColor(trimmed)) {
    return trimmed;
  }
  
  console.warn('[Vakkya] Invalid accent color, using default:', trimmed);
  return DEFAULT_CONFIG.accentColor;
}

/**
 * Parse and validate theme from data attribute
 * Requirement 6.2: Configure light or dark mode via data attribute
 * @param {string|null} value - Theme value from attribute
 * @returns {'light'|'dark'} Valid theme or default
 */
function parseTheme(value) {
  if (!value || typeof value !== 'string') {
    return DEFAULT_CONFIG.theme;
  }
  
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'dark' || trimmed === 'light') {
    return trimmed;
  }
  
  console.warn('[Vakkya] Invalid theme, using default:', trimmed);
  return DEFAULT_CONFIG.theme;
}

/**
 * Parse and validate position from data attribute
 * @param {string|null} value - Position value from attribute
 * @returns {'bottom-right'|'bottom-left'} Valid position or default
 */
function parsePosition(value) {
  if (!value || typeof value !== 'string') {
    return DEFAULT_CONFIG.position;
  }
  
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'bottom-right' || trimmed === 'bottom-left') {
    return trimmed;
  }
  
  console.warn('[Vakkya] Invalid position, using default:', trimmed);
  return DEFAULT_CONFIG.position;
}

/**
 * Validate CSS color value
 * @param {string} color - Color to validate
 * @returns {boolean}
 */
export function isValidColor(color) {
  if (!color || typeof color !== 'string') return false;
  
  // Check hex colors (3, 4, 6, or 8 digits)
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color)) return true;
  
  // Check rgb/rgba
  if (/^rgba?\([\d\s,%.]+\)$/.test(color)) return true;
  
  // Check hsl/hsla
  if (/^hsla?\([\d\s,%.]+\)$/.test(color)) return true;
  
  // Check named colors (common set)
  const namedColors = [
    'red', 'blue', 'green', 'white', 'black', 'gray', 'grey',
    'orange', 'yellow', 'purple', 'pink', 'cyan', 'magenta',
    'navy', 'teal', 'olive', 'maroon', 'aqua', 'fuchsia', 'lime',
    'silver', 'transparent', 'inherit', 'currentColor'
  ];
  if (namedColors.includes(color.toLowerCase())) return true;
  
  return false;
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
