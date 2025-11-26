import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createButton, requestMicrophonePermission, releaseMicrophone } from './button.js';

describe('createButton', () => {
  let host;
  let shadow;

  beforeEach(() => {
    host = document.createElement('div');
    shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('should create a button element', () => {
    const button = createButton(shadow);
    
    expect(button).toBeInstanceOf(HTMLButtonElement);
  });

  it('should have correct class name', () => {
    const button = createButton(shadow);
    
    expect(button.className).toBe('vakkya-button');
  });

  it('should have aria-label for accessibility', () => {
    const button = createButton(shadow);
    
    expect(button.getAttribute('aria-label')).toBe('Start voice conversation');
  });

  it('should have type="button" to prevent form submission', () => {
    const button = createButton(shadow);
    
    expect(button.getAttribute('type')).toBe('button');
  });

  it('should contain microphone icon SVG', () => {
    const button = createButton(shadow);
    
    const svg = button.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.classList.contains('vakkya-button-icon')).toBe(true);
  });

  it('should inject styles into shadow root', () => {
    createButton(shadow);
    
    const styles = shadow.querySelectorAll('style');
    const hasButtonStyles = Array.from(styles).some(s => 
      s.textContent.includes('.vakkya-button')
    );
    expect(hasButtonStyles).toBe(true);
  });

  it('should include hover styles', () => {
    createButton(shadow);
    
    const styles = shadow.querySelectorAll('style');
    const hasHoverStyles = Array.from(styles).some(s => 
      s.textContent.includes('.vakkya-button:hover')
    );
    expect(hasHoverStyles).toBe(true);
  });

  it('should include focus styles for accessibility', () => {
    createButton(shadow);
    
    const styles = shadow.querySelectorAll('style');
    const hasFocusStyles = Array.from(styles).some(s => 
      s.textContent.includes('.vakkya-button:focus')
    );
    expect(hasFocusStyles).toBe(true);
  });

  it('should include mobile responsive styles', () => {
    createButton(shadow);
    
    const styles = shadow.querySelectorAll('style');
    const hasMediaQuery = Array.from(styles).some(s => 
      s.textContent.includes('@media')
    );
    expect(hasMediaQuery).toBe(true);
  });

  it('should use correct blue color (#3B82F6)', () => {
    createButton(shadow);
    
    const styles = shadow.querySelectorAll('style');
    const hasCorrectColor = Array.from(styles).some(s => 
      s.textContent.includes('#3B82F6')
    );
    expect(hasCorrectColor).toBe(true);
  });
});

describe('requestMicrophonePermission', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return stream when permission granted', async () => {
    const mockStream = { getTracks: () => [] };
    const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });
    
    const stream = await requestMicrophonePermission();
    
    expect(stream).toBe(mockStream);
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });
  });

  it('should return null when permission denied', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(error) },
      writable: true,
      configurable: true,
    });
    
    const stream = await requestMicrophonePermission();
    
    expect(stream).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('[Vakkya] Microphone permission denied');
  });

  it('should return null when no microphone found', async () => {
    const error = new Error('No microphone');
    error.name = 'NotFoundError';
    
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(error) },
      writable: true,
      configurable: true,
    });
    
    const stream = await requestMicrophonePermission();
    
    expect(stream).toBeNull();
    expect(console.error).toHaveBeenCalledWith('[Vakkya] No microphone found');
  });

  it('should handle other errors gracefully', async () => {
    const error = new Error('Unknown error');
    error.name = 'UnknownError';
    
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(error) },
      writable: true,
      configurable: true,
    });
    
    const stream = await requestMicrophonePermission();
    
    expect(stream).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('releaseMicrophone', () => {
  it('should stop all tracks in stream', () => {
    const mockTrack1 = { stop: vi.fn() };
    const mockTrack2 = { stop: vi.fn() };
    const mockStream = {
      getTracks: () => [mockTrack1, mockTrack2]
    };
    
    releaseMicrophone(mockStream);
    
    expect(mockTrack1.stop).toHaveBeenCalled();
    expect(mockTrack2.stop).toHaveBeenCalled();
  });

  it('should handle null stream gracefully', () => {
    expect(() => releaseMicrophone(null)).not.toThrow();
  });

  it('should handle undefined stream gracefully', () => {
    expect(() => releaseMicrophone(undefined)).not.toThrow();
  });
});
