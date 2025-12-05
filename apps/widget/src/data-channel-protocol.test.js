/**
 * Data Channel Protocol Tests
 * 
 * Property 21: Widget-Agent State Sync
 * Validates: Requirements 10.1, 10.2, 10.3
 */

import { describe, it, expect } from 'vitest';
import {
  serializeMessage,
  deserializeMessage,
  isValidAgentMessage,
  isValidWidgetMessage,
  createKeyboardInputMessage,
  createFieldConfirmedMessage,
  createFieldRejectedMessage,
  createFormAbandonedMessage,
  createSubmissionApprovedMessage,
  createEditRequestedMessage,
  createPageContextMessage,
  createMuteStatusMessage,
  createUserEndedSessionMessage,
  isValidSessionEndReason,
  WIDGET_TO_AGENT_TYPES,
  AGENT_TO_WIDGET_TYPES,
  VALID_SESSION_END_REASONS,
} from './data-channel-protocol.js';

describe('Data Channel Protocol', () => {
  describe('Message Serialization', () => {
    it('should serialize message to Uint8Array', () => {
      const message = createKeyboardInputMessage('email', 'test@example.com');
      const serialized = serializeMessage(message);

      // Check it's a typed array (Uint8Array)
      expect(serialized.constructor.name).toBe('Uint8Array');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should serialize and deserialize round-trip correctly for agent messages', () => {
      // Use an agent message type for round-trip test
      const original = { type: 'field_focus', fieldName: 'email' };
      const serialized = new TextEncoder().encode(JSON.stringify(original));
      
      // Simulate receiving as ArrayBuffer (like from data channel)
      const received = deserializeMessage(serialized.buffer);

      expect(received).toEqual(original);
    });

    it('should handle complex values in agent messages', () => {
      const message = {
        type: 'show_summary',
        answers: {
          newsletter: true,
          frequency: 'weekly',
        },
      };
      const serialized = new TextEncoder().encode(JSON.stringify(message));
      const deserialized = deserializeMessage(serialized);

      expect(deserialized.answers).toEqual({
        newsletter: true,
        frequency: 'weekly',
      });
    });

    it('should serialize widget messages correctly', () => {
      const message = createKeyboardInputMessage('email', 'test@example.com');
      const serialized = serializeMessage(message);
      
      // Verify the serialized data can be decoded back to JSON
      const decoder = new TextDecoder();
      const json = decoder.decode(serialized);
      const parsed = JSON.parse(json);
      
      expect(parsed).toEqual(message);
    });
  });

  describe('Message Deserialization', () => {
    it('should deserialize valid agent message', () => {
      const agentMessage = {
        type: 'form_activate',
        schema: { id: 'form_123', name: 'Contact Form', fields: [] },
      };
      const encoded = new TextEncoder().encode(JSON.stringify(agentMessage));
      
      const result = deserializeMessage(encoded);

      expect(result).toEqual(agentMessage);
    });

    it('should return null for invalid JSON', () => {
      const invalidData = new TextEncoder().encode('not valid json');
      
      const result = deserializeMessage(invalidData);

      expect(result).toBeNull();
    });

    it('should return null for unknown message type', () => {
      const unknownMessage = { type: 'unknown_type', data: 'test' };
      const encoded = new TextEncoder().encode(JSON.stringify(unknownMessage));
      
      const result = deserializeMessage(encoded);

      expect(result).toBeNull();
    });

    it('should return null for message without type', () => {
      const noTypeMessage = { fieldName: 'email', value: 'test' };
      const encoded = new TextEncoder().encode(JSON.stringify(noTypeMessage));
      
      const result = deserializeMessage(encoded);

      expect(result).toBeNull();
    });

    it('should handle ArrayBuffer input', () => {
      const message = { type: 'field_focus', fieldName: 'email' };
      const encoded = new TextEncoder().encode(JSON.stringify(message));
      
      const result = deserializeMessage(encoded.buffer);

      expect(result).toEqual(message);
    });
  });

  describe('Message Validation', () => {
    describe('isValidAgentMessage', () => {
      it.each(AGENT_TO_WIDGET_TYPES)('should accept valid agent message type: %s', (type) => {
        const message = { type };
        expect(isValidAgentMessage(message)).toBe(true);
      });

      it('should reject widget message types', () => {
        const message = { type: 'keyboard_input', fieldName: 'email', value: 'test' };
        expect(isValidAgentMessage(message)).toBe(false);
      });

      it('should reject null', () => {
        expect(isValidAgentMessage(null)).toBe(false);
      });

      it('should reject non-object', () => {
        expect(isValidAgentMessage('string')).toBe(false);
      });

      it('should reject object without type', () => {
        expect(isValidAgentMessage({ fieldName: 'email' })).toBe(false);
      });
    });

    describe('isValidWidgetMessage', () => {
      it.each(WIDGET_TO_AGENT_TYPES)('should accept valid widget message type: %s', (type) => {
        const message = { type };
        expect(isValidWidgetMessage(message)).toBe(true);
      });

      it('should reject agent message types', () => {
        const message = { type: 'form_activate', schema: {} };
        expect(isValidWidgetMessage(message)).toBe(false);
      });

      it('should reject null', () => {
        expect(isValidWidgetMessage(null)).toBe(false);
      });
    });
  });

  describe('Message Factory Functions', () => {
    describe('createKeyboardInputMessage', () => {
      it('should create valid keyboard input message', () => {
        const message = createKeyboardInputMessage('email', 'test@example.com');

        expect(message).toEqual({
          type: 'keyboard_input',
          fieldName: 'email',
          value: 'test@example.com',
        });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });

    describe('createFieldConfirmedMessage', () => {
      it('should create valid field confirmed message', () => {
        const message = createFieldConfirmedMessage('name');

        expect(message).toEqual({
          type: 'field_confirmed',
          fieldName: 'name',
        });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });

    describe('createFieldRejectedMessage', () => {
      it('should create valid field rejected message', () => {
        const message = createFieldRejectedMessage('phone');

        expect(message).toEqual({
          type: 'field_rejected',
          fieldName: 'phone',
        });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });

    describe('createFormAbandonedMessage', () => {
      it('should create valid form abandoned message', () => {
        const message = createFormAbandonedMessage();

        expect(message).toEqual({ type: 'form_abandoned' });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });

    describe('createSubmissionApprovedMessage', () => {
      it('should create valid submission approved message', () => {
        const message = createSubmissionApprovedMessage();

        expect(message).toEqual({ type: 'submission_approved' });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });

    describe('createEditRequestedMessage', () => {
      it('should create valid edit requested message', () => {
        const message = createEditRequestedMessage('email');

        expect(message).toEqual({
          type: 'edit_requested',
          fieldName: 'email',
        });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });

    describe('createPageContextMessage', () => {
      it('should create valid page context message', () => {
        const message = createPageContextMessage(
          'https://example.com/contact',
          'Contact Us'
        );

        expect(message).toEqual({
          type: 'page_context',
          url: 'https://example.com/contact',
          title: 'Contact Us',
        });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });

    describe('createMuteStatusMessage', () => {
      it('should create valid mute status message when muted', () => {
        const message = createMuteStatusMessage(true);

        expect(message).toEqual({
          type: 'mute_status_changed',
          muted: true,
        });
        expect(isValidWidgetMessage(message)).toBe(true);
      });

      it('should create valid mute status message when unmuted', () => {
        const message = createMuteStatusMessage(false);

        expect(message).toEqual({
          type: 'mute_status_changed',
          muted: false,
        });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });

    describe('createUserEndedSessionMessage', () => {
      it('should create valid user ended session message', () => {
        const message = createUserEndedSessionMessage();

        expect(message).toEqual({ type: 'user_ended_session' });
        expect(isValidWidgetMessage(message)).toBe(true);
      });
    });
  });

  /**
   * Property 21: Widget-Agent State Sync
   * For any agent state change, the widget UI shall reflect the change within 200ms.
   * These tests verify the protocol supports all required state sync messages.
   */
  describe('Property 21: Widget-Agent State Sync', () => {
    it('should support form_activate message for form activation sync', () => {
      const message = {
        type: 'form_activate',
        schema: {
          id: 'form_123',
          name: 'Contact Form',
          fields: [
            { name: 'email', type: 'email', label: 'Email', required: true },
          ],
        },
      };

      expect(isValidAgentMessage(message)).toBe(true);
      
      const serialized = new TextEncoder().encode(JSON.stringify(message));
      const deserialized = deserializeMessage(serialized);
      
      expect(deserialized.type).toBe('form_activate');
      expect(deserialized.schema.id).toBe('form_123');
    });

    it('should support field_focus message for field navigation sync', () => {
      const message = { type: 'field_focus', fieldName: 'email' };

      expect(isValidAgentMessage(message)).toBe(true);
    });

    it('should support value_extracted message for voice extraction sync', () => {
      const message = {
        type: 'value_extracted',
        fieldName: 'email',
        value: 'john@example.com',
        utterance: 'my email is john at example dot com',
      };

      expect(isValidAgentMessage(message)).toBe(true);
    });

    it('should support value_confirmed message for confirmation sync', () => {
      const message = {
        type: 'value_confirmed',
        fieldName: 'email',
        value: 'john@example.com',
      };

      expect(isValidAgentMessage(message)).toBe(true);
    });

    it('should support show_summary message for summary display sync', () => {
      const message = {
        type: 'show_summary',
        answers: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
      };

      expect(isValidAgentMessage(message)).toBe(true);
    });

    it('should support submission_success message for completion sync', () => {
      const message = {
        type: 'submission_success',
        submissionId: 'sub_abc123',
      };

      expect(isValidAgentMessage(message)).toBe(true);
    });

    it('should support submission_failed message for error sync', () => {
      const message = {
        type: 'submission_failed',
        error: 'Network error',
        canRetry: true,
      };

      expect(isValidAgentMessage(message)).toBe(true);
    });

    it('should support form_deactivated message for form exit sync', () => {
      const message = { type: 'form_deactivated' };

      expect(isValidAgentMessage(message)).toBe(true);
    });

    it('should support bidirectional keyboard input sync', () => {
      // Widget sends keyboard input
      const widgetMessage = createKeyboardInputMessage('email', 'test@example.com');
      expect(isValidWidgetMessage(widgetMessage)).toBe(true);

      // Agent confirms the value
      const agentMessage = {
        type: 'value_confirmed',
        fieldName: 'email',
        value: 'test@example.com',
      };
      expect(isValidAgentMessage(agentMessage)).toBe(true);
    });

    it('should support confirmation flow messages', () => {
      // Agent extracts value from voice
      const extractedMessage = {
        type: 'value_extracted',
        fieldName: 'name',
        value: 'John',
        utterance: 'my name is john',
      };
      expect(isValidAgentMessage(extractedMessage)).toBe(true);

      // Widget confirms
      const confirmMessage = createFieldConfirmedMessage('name');
      expect(isValidWidgetMessage(confirmMessage)).toBe(true);

      // Widget rejects
      const rejectMessage = createFieldRejectedMessage('name');
      expect(isValidWidgetMessage(rejectMessage)).toBe(true);
    });
  });

  /**
   * Session Control Messages
   * Validates: Requirements 2.3, 3.5, 4.3
   */
  describe('Session Control Messages', () => {
    describe('session_end message', () => {
      it('should support session_end message with reason', () => {
        const message = {
          type: 'session_end',
          reason: 'conversation_complete',
        };
        expect(isValidAgentMessage(message)).toBe(true);
      });

      it('should support session_end message with reason and optional message', () => {
        const message = {
          type: 'session_end',
          reason: 'form_submitted',
          message: 'Thank you for your submission!',
        };
        expect(isValidAgentMessage(message)).toBe(true);
      });

      it('should deserialize session_end message correctly', () => {
        const original = {
          type: 'session_end',
          reason: 'user_requested',
          message: 'Goodbye!',
        };
        const serialized = new TextEncoder().encode(JSON.stringify(original));
        const deserialized = deserializeMessage(serialized);

        expect(deserialized).toEqual(original);
      });
    });

    describe('isValidSessionEndReason', () => {
      it.each(VALID_SESSION_END_REASONS)('should accept valid reason: %s', (reason) => {
        expect(isValidSessionEndReason(reason)).toBe(true);
      });

      it('should reject invalid reasons', () => {
        expect(isValidSessionEndReason('invalid_reason')).toBe(false);
        expect(isValidSessionEndReason('')).toBe(false);
        expect(isValidSessionEndReason('CONVERSATION_COMPLETE')).toBe(false);
      });
    });

    describe('mute_status_changed message', () => {
      it('should serialize and deserialize mute status message', () => {
        const message = createMuteStatusMessage(true);
        const serialized = serializeMessage(message);
        
        const decoder = new TextDecoder();
        const json = decoder.decode(serialized);
        const parsed = JSON.parse(json);
        
        expect(parsed).toEqual(message);
      });
    });

    describe('user_ended_session message', () => {
      it('should serialize and deserialize user ended session message', () => {
        const message = createUserEndedSessionMessage();
        const serialized = serializeMessage(message);
        
        const decoder = new TextDecoder();
        const json = decoder.decode(serialized);
        const parsed = JSON.parse(json);
        
        expect(parsed).toEqual(message);
      });
    });
  });
});
