/**
 * Error handling utilities for the widget
 * Ensures errors never crash the host page
 */

/**
 * @typedef {'mic_denied'|'mic_not_found'|'connection_failed'|'invalid_token'|'sdk_load_failed'|'unknown'} ErrorCode
 */

/**
 * @typedef {Object} WidgetError
 * @property {ErrorCode} code
 * @property {string} message
 * @property {string} userMessage
 */

/** @type {Record<ErrorCode, string>} */
const USER_MESSAGES = {
  mic_denied: 'Microphone access was denied. Please allow microphone access to use voice.',
  mic_not_found: 'No microphone found. Please connect a microphone.',
  connection_failed: 'Connection failed. Please try again.',
  invalid_token: 'Invalid configuration. Please contact support.',
  sdk_load_failed: 'Failed to load voice features. Please refresh the page.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Create a widget error from a native error
 * @param {Error} error - Original error
 * @returns {WidgetError}
 */
export function createWidgetError(error) {
  const code = classifyError(error);
  return {
    code,
    message: error.message,
    userMessage: USER_MESSAGES[code],
  };
}

/**
 * Classify an error into a known error code
 * @param {Error} error
 * @returns {ErrorCode}
 */
function classifyError(error) {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  // Microphone errors
  if (name === 'notallowederror' || name === 'permissiondeniederror' || message.includes('permission denied')) {
    return 'mic_denied';
  }
  if (name === 'notfounderror' || message.includes('no microphone') || message.includes('requested device not found')) {
    return 'mic_not_found';
  }

  // Token errors
  if (message.includes('invalid') && message.includes('token')) {
    return 'invalid_token';
  }

  // SDK errors
  if (message.includes('failed to load') || message.includes('sdk')) {
    return 'sdk_load_failed';
  }

  // Connection errors
  if (message.includes('connection') || message.includes('network') || message.includes('timeout')) {
    return 'connection_failed';
  }

  return 'unknown';
}

/**
 * Wrap a function to catch and handle errors safely
 * @template T
 * @param {() => T | Promise<T>} fn - Function to wrap
 * @param {(error: WidgetError) => void} onError - Error handler
 * @returns {Promise<T | null>}
 */
export async function safeExecute(fn, onError) {
  try {
    return await fn();
  } catch (error) {
    const widgetError = createWidgetError(error);
    
    // Log error but never throw to host page
    console.error('[Vakkya] Error:', widgetError.code, error);
    
    if (onError) {
      try {
        onError(widgetError);
      } catch (handlerError) {
        // Even error handler errors shouldn't crash
        console.error('[Vakkya] Error handler failed:', handlerError);
      }
    }
    
    return null;
  }
}

/**
 * Create a safe wrapper for the entire widget
 * @param {() => void} initFn - Widget initialization function
 */
export function safeWidgetInit(initFn) {
  try {
    initFn();
  } catch (error) {
    // Never crash the host page
    console.error('[Vakkya] Widget initialization failed:', error);
  }
}

/**
 * Check if an error is recoverable (user can retry)
 * @param {ErrorCode} code
 * @returns {boolean}
 */
export function isRecoverableError(code) {
  return code === 'connection_failed' || code === 'unknown';
}
