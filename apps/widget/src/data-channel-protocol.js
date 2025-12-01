/**
 * Data Channel Protocol
 * Bidirectional communication between widget and voice agent
 * 
 * Validates: Requirements 3.5, 10.1, 10.2, 10.3
 */

/**
 * Message types from Widget to Agent
 * @typedef {'keyboard_input'|'field_confirmed'|'field_rejected'|'form_abandoned'|'submission_approved'|'edit_requested'|'page_context'} WidgetToAgentType
 */

/**
 * Message types from Agent to Widget
 * @typedef {'form_activate'|'field_focus'|'value_extracted'|'value_confirmed'|'show_summary'|'submission_success'|'submission_failed'|'form_deactivated'} AgentToWidgetType
 */

/**
 * @typedef {Object} KeyboardInputMessage
 * @property {'keyboard_input'} type
 * @property {string} fieldName
 * @property {unknown} value
 */

/**
 * @typedef {Object} FieldConfirmedMessage
 * @property {'field_confirmed'} type
 * @property {string} fieldName
 */

/**
 * @typedef {Object} FieldRejectedMessage
 * @property {'field_rejected'} type
 * @property {string} fieldName
 */

/**
 * @typedef {Object} FormAbandonedMessage
 * @property {'form_abandoned'} type
 */

/**
 * @typedef {Object} SubmissionApprovedMessage
 * @property {'submission_approved'} type
 */

/**
 * @typedef {Object} EditRequestedMessage
 * @property {'edit_requested'} type
 * @property {string} fieldName
 */

/**
 * @typedef {Object} PageContextMessage
 * @property {'page_context'} type
 * @property {string} url
 * @property {string} title
 */

/**
 * @typedef {KeyboardInputMessage|FieldConfirmedMessage|FieldRejectedMessage|FormAbandonedMessage|SubmissionApprovedMessage|EditRequestedMessage|PageContextMessage} WidgetToAgentMessage
 */

/**
 * @typedef {Object} FormActivateMessage
 * @property {'form_activate'} type
 * @property {Object} schema
 */

/**
 * @typedef {Object} FieldFocusMessage
 * @property {'field_focus'} type
 * @property {string} fieldName
 */

/**
 * @typedef {Object} ValueExtractedMessage
 * @property {'value_extracted'} type
 * @property {string} fieldName
 * @property {unknown} value
 * @property {string} utterance
 */

/**
 * @typedef {Object} ValueConfirmedMessage
 * @property {'value_confirmed'} type
 * @property {string} fieldName
 * @property {unknown} value
 */

/**
 * @typedef {Object} ShowSummaryMessage
 * @property {'show_summary'} type
 * @property {Record<string, unknown>} answers
 */

/**
 * @typedef {Object} SubmissionSuccessMessage
 * @property {'submission_success'} type
 * @property {string} submissionId
 */

/**
 * @typedef {Object} SubmissionFailedMessage
 * @property {'submission_failed'} type
 * @property {string} error
 * @property {boolean} canRetry
 */

/**
 * @typedef {Object} FormDeactivatedMessage
 * @property {'form_deactivated'} type
 */

/**
 * @typedef {FormActivateMessage|FieldFocusMessage|ValueExtractedMessage|ValueConfirmedMessage|ShowSummaryMessage|SubmissionSuccessMessage|SubmissionFailedMessage|FormDeactivatedMessage} AgentToWidgetMessage
 */

// Valid message types for validation
const WIDGET_TO_AGENT_TYPES = [
  'keyboard_input',
  'field_confirmed',
  'field_rejected',
  'form_abandoned',
  'submission_approved',
  'edit_requested',
  'page_context',
];

const AGENT_TO_WIDGET_TYPES = [
  'form_activate',
  'field_focus',
  'value_extracted',
  'value_confirmed',
  'show_summary',
  'submission_success',
  'submission_failed',
  'form_deactivated',
];

/**
 * Serialize a message for transmission over data channel
 * @param {WidgetToAgentMessage} message
 * @returns {Uint8Array}
 */
export function serializeMessage(message) {
  const json = JSON.stringify(message);
  const encoder = new TextEncoder();
  return encoder.encode(json);
}

/**
 * Deserialize a message received from data channel
 * @param {Uint8Array|ArrayBuffer} data
 * @returns {AgentToWidgetMessage|null}
 */
export function deserializeMessage(data) {
  try {
    const decoder = new TextDecoder();
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const json = decoder.decode(bytes);
    const message = JSON.parse(json);
    
    if (!isValidAgentMessage(message)) {
      console.warn('[Vakkya] Invalid agent message:', message);
      return null;
    }
    
    return message;
  } catch (err) {
    console.warn('[Vakkya] Failed to deserialize message:', err);
    return null;
  }
}

/**
 * Validate that a message is a valid agent-to-widget message
 * @param {unknown} message
 * @returns {message is AgentToWidgetMessage}
 */
export function isValidAgentMessage(message) {
  if (!message || typeof message !== 'object') return false;
  if (!('type' in message)) return false;
  return AGENT_TO_WIDGET_TYPES.includes(message.type);
}

/**
 * Validate that a message is a valid widget-to-agent message
 * @param {unknown} message
 * @returns {message is WidgetToAgentMessage}
 */
export function isValidWidgetMessage(message) {
  if (!message || typeof message !== 'object') return false;
  if (!('type' in message)) return false;
  return WIDGET_TO_AGENT_TYPES.includes(message.type);
}

// Message factory functions for type safety

/**
 * Create a keyboard input message
 * @param {string} fieldName
 * @param {unknown} value
 * @returns {KeyboardInputMessage}
 */
export function createKeyboardInputMessage(fieldName, value) {
  return { type: 'keyboard_input', fieldName, value };
}

/**
 * Create a field confirmed message
 * @param {string} fieldName
 * @returns {FieldConfirmedMessage}
 */
export function createFieldConfirmedMessage(fieldName) {
  return { type: 'field_confirmed', fieldName };
}

/**
 * Create a field rejected message
 * @param {string} fieldName
 * @returns {FieldRejectedMessage}
 */
export function createFieldRejectedMessage(fieldName) {
  return { type: 'field_rejected', fieldName };
}

/**
 * Create a form abandoned message
 * @returns {FormAbandonedMessage}
 */
export function createFormAbandonedMessage() {
  return { type: 'form_abandoned' };
}

/**
 * Create a submission approved message
 * @returns {SubmissionApprovedMessage}
 */
export function createSubmissionApprovedMessage() {
  return { type: 'submission_approved' };
}

/**
 * Create an edit requested message
 * @param {string} fieldName
 * @returns {EditRequestedMessage}
 */
export function createEditRequestedMessage(fieldName) {
  return { type: 'edit_requested', fieldName };
}

/**
 * Create a page context message
 * @param {string} url
 * @param {string} title
 * @returns {PageContextMessage}
 */
export function createPageContextMessage(url, title) {
  return { type: 'page_context', url, title };
}

// Export constants for testing
export { WIDGET_TO_AGENT_TYPES, AGENT_TO_WIDGET_TYPES };
