import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createVoiceUI } from './voice-ui.js';

describe('createVoiceUI', () => {
  let host;
  let shadow;
  let onClose;

  beforeEach(() => {
    host = document.createElement('div');
    shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    onClose = vi.fn();
  });

  afterEach(() => {
    host.remove();
  });

  it('should create voice UI element', () => {
    const { element } = createVoiceUI(shadow, onClose);
    
    expect(element).toBeInstanceOf(HTMLElement);
    expect(element.className).toBe('vakkya-voice-ui');
  });

  it('should have dialog role for accessibility', () => {
    const { element } = createVoiceUI(shadow, onClose);
    
    expect(element.getAttribute('role')).toBe('dialog');
    expect(element.getAttribute('aria-label')).toBe('Voice conversation');
  });

  it('should create canvas for waveform', () => {
    const { canvas } = createVoiceUI(shadow, onClose);
    
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.className).toBe('vakkya-waveform');
  });

  it('should set canvas dimensions', () => {
    const { canvas } = createVoiceUI(shadow, onClose);
    
    expect(canvas.width).toBe(288);
    expect(canvas.height).toBe(80);
  });

  it('should create close button', () => {
    const { element } = createVoiceUI(shadow, onClose);
    
    const closeButton = element.querySelector('.vakkya-close-button');
    expect(closeButton).toBeTruthy();
    expect(closeButton.getAttribute('aria-label')).toBe('Close voice conversation');
  });

  it('should call onClose when close button clicked', () => {
    const { element } = createVoiceUI(shadow, onClose);
    
    const closeButton = element.querySelector('.vakkya-close-button');
    closeButton.click();
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display title', () => {
    const { element } = createVoiceUI(shadow, onClose);
    
    const title = element.querySelector('.vakkya-voice-ui-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('Voice Assistant');
  });

  it('should display initial status as connecting', () => {
    const { element } = createVoiceUI(shadow, onClose);
    
    const status = element.querySelector('.vakkya-status');
    expect(status.textContent).toBe('Connecting...');
  });

  it('should inject styles into shadow root', () => {
    createVoiceUI(shadow, onClose);
    
    const styles = shadow.querySelectorAll('style');
    const hasVoiceUIStyles = Array.from(styles).some(s => 
      s.textContent.includes('.vakkya-voice-ui')
    );
    expect(hasVoiceUIStyles).toBe(true);
  });

  it('should include mobile responsive styles', () => {
    createVoiceUI(shadow, onClose);
    
    const styles = shadow.querySelectorAll('style');
    const hasMediaQuery = Array.from(styles).some(s => 
      s.textContent.includes('@media') && s.textContent.includes('480px')
    );
    expect(hasMediaQuery).toBe(true);
  });

  describe('setStatus', () => {
    it('should update status text for listening', () => {
      const { element, setStatus } = createVoiceUI(shadow, onClose);
      
      setStatus('listening');
      
      const status = element.querySelector('.vakkya-status');
      expect(status.textContent).toBe('Listening...');
    });

    it('should update status text for processing', () => {
      const { element, setStatus } = createVoiceUI(shadow, onClose);
      
      setStatus('processing');
      
      const status = element.querySelector('.vakkya-status');
      expect(status.textContent).toBe('Thinking...');
    });

    it('should update status text for speaking', () => {
      const { element, setStatus } = createVoiceUI(shadow, onClose);
      
      setStatus('speaking');
      
      const status = element.querySelector('.vakkya-status');
      expect(status.textContent).toBe('Speaking...');
    });

    it('should show error container for error status', () => {
      const { element, setStatus } = createVoiceUI(shadow, onClose);
      
      setStatus('error');
      
      const errorContainer = element.querySelector('.vakkya-error');
      expect(errorContainer.style.display).toBe('block');
    });
  });

  describe('showError', () => {
    it('should display error message', () => {
      const { element, showError } = createVoiceUI(shadow, onClose);
      
      showError('Connection failed');
      
      const errorContainer = element.querySelector('.vakkya-error');
      expect(errorContainer.textContent).toBe('Connection failed');
      expect(errorContainer.style.display).toBe('block');
    });

    it('should hide status when showing error', () => {
      const { element, showError } = createVoiceUI(shadow, onClose);
      
      showError('Test error');
      
      const status = element.querySelector('.vakkya-status');
      expect(status.style.display).toBe('none');
    });
  });

  describe('setStatus edge cases', () => {
    it('should handle unknown status gracefully', () => {
      const { element, setStatus } = createVoiceUI(shadow, onClose);
      
      setStatus('invalid_status');
      
      const status = element.querySelector('.vakkya-status');
      expect(status.textContent).toBe('');
    });
  });
});
