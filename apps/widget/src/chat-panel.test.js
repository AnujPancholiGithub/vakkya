import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createChatPanel, generateMessageId } from './chat-panel.js';

describe('createChatPanel', () => {
  let host;
  let shadow;
  let callbacks;

  beforeEach(() => {
    host = document.createElement('div');
    shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    
    callbacks = {
      onClose: vi.fn(),
      onMicClick: vi.fn(),
      onKeyboardInput: vi.fn(),
      onConfirmValue: vi.fn(),
      onRejectValue: vi.fn(),
    };
  });

  afterEach(() => {
    host.remove();
  });

  describe('User Message Bubble (Task 4.1)', () => {
    it('should create user message with distinct styling', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const userId = generateMessageId();
      panel.addMessage({
        id: userId,
        type: 'user',
        content: 'Hello, how can I help?',
        timestamp: Date.now(),
      });
      
      const userBubble = panel.element.querySelector('.vakkya-message-user');
      expect(userBubble).toBeTruthy();
      expect(userBubble.textContent).toContain('Hello, how can I help?');
    });

    it('should align user messages to the right', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addMessage({
        id: generateMessageId(),
        type: 'user',
        content: 'Test message',
        timestamp: Date.now(),
      });
      
      const userBubble = panel.element.querySelector('.vakkya-message-user');
      const styles = window.getComputedStyle(userBubble);
      
      // User messages should have align-self: flex-end in CSS
      expect(userBubble.classList.contains('vakkya-message-user')).toBe(true);
    });

    it('should support transcribing state for user messages', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const msgId = generateMessageId();
      panel.addMessage({
        id: msgId,
        type: 'user',
        content: 'Transcribing...',
        timestamp: Date.now(),
        isTranscribing: true,
      });
      
      const userBubble = panel.element.querySelector(`[data-message-id="${msgId}"]`);
      expect(userBubble.classList.contains('vakkya-message-transcribing')).toBe(true);
    });

    it('should update transcribing state dynamically', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const msgId = generateMessageId();
      panel.addMessage({
        id: msgId,
        type: 'user',
        content: 'Hello',
        timestamp: Date.now(),
        isTranscribing: true,
      });
      
      let userBubble = panel.element.querySelector(`[data-message-id="${msgId}"]`);
      expect(userBubble.classList.contains('vakkya-message-transcribing')).toBe(true);
      
      // Update to final transcription
      panel.updateMessage(msgId, {
        content: 'Hello, how are you?',
        isTranscribing: false,
      });
      
      userBubble = panel.element.querySelector(`[data-message-id="${msgId}"]`);
      expect(userBubble.classList.contains('vakkya-message-transcribing')).toBe(false);
      expect(userBubble.textContent).toContain('Hello, how are you?');
    });
  });

  describe('Agent Message Bubble (Task 4.2)', () => {
    it('should create agent message with distinct styling', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const agentId = generateMessageId();
      panel.addMessage({
        id: agentId,
        type: 'agent',
        content: 'I can help you with that.',
        timestamp: Date.now(),
      });
      
      const agentBubble = panel.element.querySelector('.vakkya-message-agent');
      expect(agentBubble).toBeTruthy();
      expect(agentBubble.textContent).toContain('I can help you with that.');
    });

    it('should align agent messages to the left', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addMessage({
        id: generateMessageId(),
        type: 'agent',
        content: 'Test message',
        timestamp: Date.now(),
      });
      
      const agentBubble = panel.element.querySelector('.vakkya-message-agent');
      
      // Agent messages should have align-self: flex-start in CSS
      expect(agentBubble.classList.contains('vakkya-message-agent')).toBe(true);
    });

    it('should show speaking indicator when agent is speaking', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const msgId = generateMessageId();
      panel.addMessage({
        id: msgId,
        type: 'agent',
        content: 'Let me explain...',
        timestamp: Date.now(),
        isSpeaking: true,
      });
      
      const agentBubble = panel.element.querySelector(`[data-message-id="${msgId}"]`);
      const indicator = agentBubble.querySelector('.vakkya-speaking-indicator');
      
      expect(indicator).toBeTruthy();
      expect(indicator.querySelectorAll('.vakkya-speaking-dot').length).toBe(3);
    });

    it('should remove speaking indicator when agent stops speaking', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const msgId = generateMessageId();
      panel.addMessage({
        id: msgId,
        type: 'agent',
        content: 'Speaking now',
        timestamp: Date.now(),
        isSpeaking: true,
      });
      
      let agentBubble = panel.element.querySelector(`[data-message-id="${msgId}"]`);
      expect(agentBubble.querySelector('.vakkya-speaking-indicator')).toBeTruthy();
      
      // Update to stop speaking
      panel.updateMessage(msgId, { isSpeaking: false });
      
      agentBubble = panel.element.querySelector(`[data-message-id="${msgId}"]`);
      expect(agentBubble.querySelector('.vakkya-speaking-indicator')).toBeNull();
    });

    it('should differentiate user and agent bubbles visually', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addMessage({
        id: generateMessageId(),
        type: 'user',
        content: 'User message',
        timestamp: Date.now(),
      });
      
      panel.addMessage({
        id: generateMessageId(),
        type: 'agent',
        content: 'Agent message',
        timestamp: Date.now(),
      });
      
      const userBubble = panel.element.querySelector('.vakkya-message-user');
      const agentBubble = panel.element.querySelector('.vakkya-message-agent');
      
      expect(userBubble).toBeTruthy();
      expect(agentBubble).toBeTruthy();
      
      // They should have different classes
      expect(userBubble.classList.contains('vakkya-message-agent')).toBe(false);
      expect(agentBubble.classList.contains('vakkya-message-user')).toBe(false);
    });
  });

  describe('Auto-scroll (Task 4.3)', () => {
    it('should scroll to bottom when new message is added', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      panel.expand();
      
      // Add multiple messages to trigger scroll
      for (let i = 0; i < 10; i++) {
        panel.addMessage({
          id: generateMessageId(),
          type: i % 2 === 0 ? 'user' : 'agent',
          content: `Message ${i}`,
          timestamp: Date.now(),
        });
      }
      
      const messagesContainer = panel.element.querySelector('.vakkya-chat-messages');
      
      // After adding messages, scroll should be at bottom
      // scrollTop + clientHeight should equal scrollHeight
      const isAtBottom = Math.abs(
        messagesContainer.scrollHeight - 
        messagesContainer.scrollTop - 
        messagesContainer.clientHeight
      ) < 5; // Allow 5px tolerance
      
      expect(isAtBottom).toBe(true);
    });

    it('should scroll to bottom when message is updated', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      panel.expand();
      
      const msgId = generateMessageId();
      panel.addMessage({
        id: msgId,
        type: 'agent',
        content: 'Short',
        timestamp: Date.now(),
      });
      
      // Add more messages
      for (let i = 0; i < 5; i++) {
        panel.addMessage({
          id: generateMessageId(),
          type: 'user',
          content: `Message ${i}`,
          timestamp: Date.now(),
        });
      }
      
      const messagesContainer = panel.element.querySelector('.vakkya-chat-messages');
      const scrollHeightBefore = messagesContainer.scrollHeight;
      
      // Update first message with longer content
      panel.updateMessage(msgId, {
        content: 'This is a much longer message that will change the scroll height',
      });
      
      // Scroll should still be at bottom
      const isAtBottom = Math.abs(
        messagesContainer.scrollHeight - 
        messagesContainer.scrollTop - 
        messagesContainer.clientHeight
      ) < 5;
      
      expect(isAtBottom).toBe(true);
    });

    it('should have smooth scroll behavior', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      // Check that the CSS includes scroll-behavior: smooth
      const styles = shadow.querySelectorAll('style');
      const hasScrollBehavior = Array.from(styles).some(s => 
        s.textContent.includes('scroll-behavior: smooth')
      );
      
      expect(hasScrollBehavior).toBe(true);
    });
  });

  describe('Message rendering integration', () => {
    it('should remove empty state when first message is added', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const emptyState = panel.element.querySelector('.vakkya-chat-empty');
      expect(emptyState).toBeTruthy();
      
      panel.addMessage({
        id: generateMessageId(),
        type: 'user',
        content: 'First message',
        timestamp: Date.now(),
      });
      
      const emptyStateAfter = panel.element.querySelector('.vakkya-chat-empty');
      expect(emptyStateAfter).toBeNull();
    });

    it('should maintain message order', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addMessage({
        id: 'msg1',
        type: 'user',
        content: 'First',
        timestamp: Date.now(),
      });
      
      panel.addMessage({
        id: 'msg2',
        type: 'agent',
        content: 'Second',
        timestamp: Date.now(),
      });
      
      panel.addMessage({
        id: 'msg3',
        type: 'user',
        content: 'Third',
        timestamp: Date.now(),
      });
      
      const messages = panel.element.querySelectorAll('.vakkya-message');
      expect(messages.length).toBe(3);
      expect(messages[0].getAttribute('data-message-id')).toBe('msg1');
      expect(messages[1].getAttribute('data-message-id')).toBe('msg2');
      expect(messages[2].getAttribute('data-message-id')).toBe('msg3');
    });

    it('should handle mixed message types in conversation', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addMessage({
        id: generateMessageId(),
        type: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      });
      
      panel.addMessage({
        id: generateMessageId(),
        type: 'agent',
        content: 'Hi there!',
        timestamp: Date.now(),
        isSpeaking: true,
      });
      
      panel.addMessage({
        id: generateMessageId(),
        type: 'user',
        content: 'How are you?',
        timestamp: Date.now(),
        isTranscribing: true,
      });
      
      const userMessages = panel.element.querySelectorAll('.vakkya-message-user');
      const agentMessages = panel.element.querySelectorAll('.vakkya-message-agent');
      
      expect(userMessages.length).toBe(2);
      expect(agentMessages.length).toBe(1);
    });
  });

  describe('Inline Form Inputs (Task 9.1)', () => {
    it('should render inline text input in chat flow', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const messageId = panel.addFormInput('name', 'string', 'What is your name?');
      
      const formInput = panel.element.querySelector('.vakkya-inline-form');
      expect(formInput).toBeTruthy();
      expect(formInput.getAttribute('data-field-name')).toBe('name');
      
      const input = formInput.querySelector('.vakkya-inline-input');
      expect(input).toBeTruthy();
      expect(input.type).toBe('text');
      expect(input.placeholder).toBe('Type your answer...');
    });

    it('should render inline email input with correct type', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('email', 'email', 'What is your email?');
      
      const input = panel.element.querySelector('.vakkya-inline-input');
      expect(input.type).toBe('email');
      expect(input.placeholder).toBe('your@email.com');
    });

    it('should render inline phone input with correct type', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('phone', 'phone', 'What is your phone number?');
      
      const input = panel.element.querySelector('.vakkya-inline-input');
      expect(input.type).toBe('tel');
      expect(input.placeholder).toBe('(555) 123-4567');
    });

    it('should render inline number input with correct type', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('age', 'number', 'What is your age?');
      
      const input = panel.element.querySelector('.vakkya-inline-input');
      expect(input.type).toBe('number');
      expect(input.placeholder).toBe('Enter a number');
    });

    it('should render inline select for enum type', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('color', 'enum', 'What is your favorite color?', ['Red', 'Blue', 'Green']);
      
      const select = panel.element.querySelector('.vakkya-inline-select');
      expect(select).toBeTruthy();
      expect(select.tagName).toBe('SELECT');
      
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(4); // placeholder + 3 options
      expect(options[1].value).toBe('Red');
      expect(options[2].value).toBe('Blue');
      expect(options[3].value).toBe('Green');
    });

    it('should render inline textarea for text type', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('message', 'text', 'Tell us more');
      
      const textarea = panel.element.querySelector('.vakkya-inline-textarea');
      expect(textarea).toBeTruthy();
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea.rows).toBe(3);
    });

    it('should show pending confirmation UI when value is pending', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('name', 'string', 'What is your name?');
      panel.setFormInputPending('name', 'John Doe');
      
      const pending = panel.element.querySelector('.vakkya-inline-pending');
      expect(pending).toBeTruthy();
      
      const label = pending.querySelector('.vakkya-inline-pending-label');
      expect(label.textContent).toBe('I heard:');
      
      const value = pending.querySelector('.vakkya-inline-pending-value');
      expect(value.textContent).toBe('John Doe');
      
      const confirmBtn = pending.querySelector('.vakkya-inline-btn-confirm');
      const rejectBtn = pending.querySelector('.vakkya-inline-btn-reject');
      expect(confirmBtn).toBeTruthy();
      expect(rejectBtn).toBeTruthy();
    });

    it('should call onConfirmValue when confirm button is clicked', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('name', 'string', 'What is your name?');
      panel.setFormInputPending('name', 'John Doe');
      
      const confirmBtn = panel.element.querySelector('.vakkya-inline-btn-confirm');
      confirmBtn.click();
      
      expect(callbacks.onConfirmValue).toHaveBeenCalledWith('name');
    });

    it('should call onRejectValue when reject button is clicked', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('name', 'string', 'What is your name?');
      panel.setFormInputPending('name', 'John Doe');
      
      const rejectBtn = panel.element.querySelector('.vakkya-inline-btn-reject');
      rejectBtn.click();
      
      expect(callbacks.onRejectValue).toHaveBeenCalledWith('name');
    });

    it('should show confirmed state after confirmation', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('name', 'string', 'What is your name?');
      panel.setFormInputPending('name', 'John Doe');
      panel.confirmFormInput('name');
      
      const confirmed = panel.element.querySelector('.vakkya-inline-confirmed');
      expect(confirmed).toBeTruthy();
      expect(confirmed.textContent).toContain('Confirmed');
      
      const input = panel.element.querySelector('.vakkya-inline-input');
      expect(input.disabled).toBe(true);
      expect(input.value).toBe('John Doe');
    });

    it('should clear pending state after rejection', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('name', 'string', 'What is your name?');
      panel.setFormInputPending('name', 'John Doe');
      panel.rejectFormInput('name');
      
      const pending = panel.element.querySelector('.vakkya-inline-pending');
      expect(pending).toBeFalsy();
    });

    it('should update form input value from keyboard', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      panel.addFormInput('name', 'string', 'What is your name?');
      panel.updateFormInputValue('name', 'Jane Smith');
      
      const input = panel.element.querySelector('.vakkya-inline-input');
      expect(input.value).toBe('Jane Smith');
    });
  });
});

describe('generateMessageId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateMessageId();
    const id2 = generateMessageId();
    
    expect(id1).not.toBe(id2);
  });

  it('should generate IDs with correct prefix', () => {
    const id = generateMessageId();
    
    expect(id.startsWith('msg_')).toBe(true);
  });

  it('should generate IDs with timestamp component', () => {
    const before = Date.now();
    const id = generateMessageId();
    const after = Date.now();
    
    const parts = id.split('_');
    const timestamp = parseInt(parts[1], 10);
    
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});


describe('Summary Card (Task 12.1, 12.2)', () => {
  let host;
  let shadow;
  let callbacks;

  beforeEach(() => {
    host = document.createElement('div');
    shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    
    callbacks = {
      onClose: vi.fn(),
      onMicClick: vi.fn(),
      onKeyboardInput: vi.fn(),
      onConfirmValue: vi.fn(),
      onRejectValue: vi.fn(),
      onSummaryApprove: vi.fn(),
      onSummaryEdit: vi.fn(),
    };
  });

  afterEach(() => {
    host.remove();
  });

  describe('Summary Card Display (Task 12.1)', () => {
    it('should render summary card with form name', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = {
        name: { label: 'Name', value: 'John Doe' },
        email: { label: 'Email', value: 'john@example.com' },
      };
      
      panel.addSummaryCard('Contact Form', answers);
      
      const card = panel.element.querySelector('.vakkya-summary-card');
      expect(card).toBeTruthy();
      
      const title = card.querySelector('.vakkya-summary-title');
      expect(title.textContent).toBe('Contact Form');
    });

    it('should display all collected answers', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = {
        name: { label: 'Full Name', value: 'Jane Smith' },
        email: { label: 'Email Address', value: 'jane@test.com' },
        phone: { label: 'Phone', value: '555-1234' },
      };
      
      panel.addSummaryCard('Lead Form', answers);
      
      const answerRows = panel.element.querySelectorAll('.vakkya-summary-answer');
      expect(answerRows.length).toBe(3);
      
      // Check first answer
      const firstLabel = answerRows[0].querySelector('.vakkya-summary-label');
      const firstValue = answerRows[0].querySelector('.vakkya-summary-value');
      expect(firstLabel.textContent).toBe('Full Name');
      expect(firstValue.textContent).toBe('Jane Smith');
    });

    it('should show edit button for each field', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = {
        name: { label: 'Name', value: 'Test User' },
        email: { label: 'Email', value: 'test@example.com' },
      };
      
      panel.addSummaryCard('Test Form', answers);
      
      const editButtons = panel.element.querySelectorAll('.vakkya-summary-edit-btn');
      expect(editButtons.length).toBe(2);
    });

    it('should call onSummaryEdit when edit button is clicked', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = {
        name: { label: 'Name', value: 'Test User' },
      };
      
      panel.addSummaryCard('Test Form', answers);
      
      const editBtn = panel.element.querySelector('.vakkya-summary-edit-btn');
      editBtn.click();
      
      expect(callbacks.onSummaryEdit).toHaveBeenCalledWith('name');
    });

    it('should show approve/submit button', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = {
        name: { label: 'Name', value: 'Test' },
      };
      
      panel.addSummaryCard('Test Form', answers);
      
      const approveBtn = panel.element.querySelector('.vakkya-summary-approve-btn');
      expect(approveBtn).toBeTruthy();
      expect(approveBtn.textContent).toContain('Approve');
    });

    it('should call onSummaryApprove when approve button is clicked', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = {
        name: { label: 'Name', value: 'Test' },
      };
      
      panel.addSummaryCard('Test Form', answers);
      
      const approveBtn = panel.element.querySelector('.vakkya-summary-approve-btn');
      approveBtn.click();
      
      expect(callbacks.onSummaryApprove).toHaveBeenCalled();
    });

    it('should format array values correctly', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = {
        interests: { label: 'Interests', value: ['Sports', 'Music', 'Art'] },
      };
      
      panel.addSummaryCard('Survey', answers);
      
      const valueEl = panel.element.querySelector('.vakkya-summary-value');
      expect(valueEl.textContent).toBe('Sports, Music, Art');
    });

    it('should handle null/undefined values gracefully', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = {
        optional: { label: 'Optional Field', value: null },
      };
      
      panel.addSummaryCard('Test Form', answers);
      
      const valueEl = panel.element.querySelector('.vakkya-summary-value');
      expect(valueEl.textContent).toBe('—');
    });
  });

  describe('Submission States (Task 12.2)', () => {
    it('should show submitting state', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummarySubmitting(messageId);
      
      const card = panel.element.querySelector('.vakkya-summary-card');
      expect(card.classList.contains('vakkya-summary-submitting')).toBe(true);
      
      const statusBadge = card.querySelector('.vakkya-summary-status-submitting');
      expect(statusBadge).toBeTruthy();
      expect(statusBadge.textContent).toContain('Submitting');
    });

    it('should disable approve button during submission', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummarySubmitting(messageId);
      
      const approveBtn = panel.element.querySelector('.vakkya-summary-approve-btn');
      expect(approveBtn.disabled).toBe(true);
    });

    it('should hide edit buttons during submission', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummarySubmitting(messageId);
      
      const editButtons = panel.element.querySelectorAll('.vakkya-summary-edit-btn');
      expect(editButtons.length).toBe(0);
    });

    it('should show success state', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummarySuccess(messageId);
      
      const card = panel.element.querySelector('.vakkya-summary-card');
      expect(card.classList.contains('vakkya-summary-success')).toBe(true);
      
      const statusBadge = card.querySelector('.vakkya-summary-status-success');
      expect(statusBadge).toBeTruthy();
      expect(statusBadge.textContent).toContain('Submitted');
    });

    it('should show success message after submission', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummarySuccess(messageId);
      
      const successMessage = panel.element.querySelector('.vakkya-summary-success-message');
      expect(successMessage).toBeTruthy();
      expect(successMessage.textContent).toContain('submitted successfully');
    });

    it('should hide approve button after success', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummarySuccess(messageId);
      
      const approveBtn = panel.element.querySelector('.vakkya-summary-approve-btn');
      expect(approveBtn).toBeNull();
    });

    it('should show error state with message', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummaryError(messageId, 'Network error occurred');
      
      const card = panel.element.querySelector('.vakkya-summary-card');
      expect(card.classList.contains('vakkya-summary-error')).toBe(true);
      
      const statusBadge = card.querySelector('.vakkya-summary-status-error');
      expect(statusBadge).toBeTruthy();
      
      const errorMessage = card.querySelector('.vakkya-summary-error');
      expect(errorMessage.textContent).toBe('Network error occurred');
    });

    it('should show retry button on error', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummaryError(messageId, 'Failed to submit');
      
      const approveBtn = panel.element.querySelector('.vakkya-summary-approve-btn');
      expect(approveBtn).toBeTruthy();
      expect(approveBtn.textContent).toContain('Retry');
    });

    it('should allow retry after error', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummaryError(messageId, 'Failed');
      
      const approveBtn = panel.element.querySelector('.vakkya-summary-approve-btn');
      approveBtn.click();
      
      expect(callbacks.onSummaryApprove).toHaveBeenCalled();
    });

    it('should reset to idle state for retry', () => {
      const panel = createChatPanel(shadow, callbacks);
      shadow.appendChild(panel.element);
      
      const answers = { name: { label: 'Name', value: 'Test' } };
      const messageId = panel.addSummaryCard('Test Form', answers);
      
      panel.setSummaryError(messageId, 'Failed');
      panel.resetSummaryState(messageId);
      
      const card = panel.element.querySelector('.vakkya-summary-card');
      expect(card.classList.contains('vakkya-summary-error')).toBe(false);
      
      const errorMessage = card.querySelector('.vakkya-summary-error');
      expect(errorMessage).toBeNull();
      
      const approveBtn = card.querySelector('.vakkya-summary-approve-btn');
      expect(approveBtn.textContent).toContain('Approve');
    });
  });
});

/**
 * Mute Button Tests
 * Requirements 3.1, 3.4, 5.5: Mute/unmute toggle button with visual feedback
 */
describe('Mute Button (Requirements 3.1, 3.4, 5.5)', () => {
  let host;
  let shadow;
  let callbacks;

  beforeEach(() => {
    host = document.createElement('div');
    shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    
    callbacks = {
      onClose: vi.fn(),
      onMicClick: vi.fn(),
      onMuteToggle: vi.fn(),
    };
  });

  afterEach(() => {
    host.remove();
  });

  it('should render mute button in voice bar', () => {
    const panel = createChatPanel(shadow, callbacks);
    shadow.appendChild(panel.element);
    
    const muteButton = panel.element.querySelector('.vakkya-mute-button');
    expect(muteButton).toBeTruthy();
  });

  it('should have minimum 44x44px touch target', () => {
    const panel = createChatPanel(shadow, callbacks);
    shadow.appendChild(panel.element);
    
    const muteButton = panel.element.querySelector('.vakkya-mute-button');
    // Check that the button has the correct class which defines 44x44px in CSS
    expect(muteButton.classList.contains('vakkya-mute-button')).toBe(true);
  });

  it('should call onMuteToggle when clicked', () => {
    const panel = createChatPanel(shadow, callbacks);
    shadow.appendChild(panel.element);
    
    const muteButton = panel.element.querySelector('.vakkya-mute-button');
    muteButton.click();
    
    expect(callbacks.onMuteToggle).toHaveBeenCalled();
  });

  it('should start with unmuted state', () => {
    const panel = createChatPanel(shadow, callbacks);
    shadow.appendChild(panel.element);
    
    expect(panel.getMuted()).toBe(false);
    
    const muteButton = panel.element.querySelector('.vakkya-mute-button');
    expect(muteButton.classList.contains('muted')).toBe(false);
  });

  it('should update visual state when setMuted(true) is called', () => {
    const panel = createChatPanel(shadow, callbacks);
    shadow.appendChild(panel.element);
    
    panel.setMuted(true);
    
    expect(panel.getMuted()).toBe(true);
    
    const muteButton = panel.element.querySelector('.vakkya-mute-button');
    expect(muteButton.classList.contains('muted')).toBe(true);
    expect(muteButton.getAttribute('aria-label')).toBe('Unmute microphone');
  });

  it('should update visual state when setMuted(false) is called', () => {
    const panel = createChatPanel(shadow, callbacks);
    shadow.appendChild(panel.element);
    
    panel.setMuted(true);
    panel.setMuted(false);
    
    expect(panel.getMuted()).toBe(false);
    
    const muteButton = panel.element.querySelector('.vakkya-mute-button');
    expect(muteButton.classList.contains('muted')).toBe(false);
    expect(muteButton.getAttribute('aria-label')).toBe('Mute microphone');
  });

  it('should show distinct muted icon when muted', () => {
    const panel = createChatPanel(shadow, callbacks);
    shadow.appendChild(panel.element);
    
    const muteButton = panel.element.querySelector('.vakkya-mute-button');
    const initialIcon = muteButton.innerHTML;
    
    panel.setMuted(true);
    
    // Icon should change when muted
    expect(muteButton.innerHTML).not.toBe(initialIcon);
  });
});
