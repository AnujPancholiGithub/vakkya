import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseConfig, findWidgetScript, AUDIO_CONSTRAINTS } from './config.js';

describe('parseConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should parse valid token from script element', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token-123');
    
    const config = parseConfig(script);
    
    expect(config).not.toBeNull();
    expect(config.token).toBe('test-token-123');
  });

  it('should use default API URL when not specified', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    
    const config = parseConfig(script);
    
    expect(config.apiUrl).toBe('https://api.vakkya.ai');
  });

  it('should allow custom API URL override', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    script.setAttribute('data-api-url', 'http://localhost:3001');
    
    const config = parseConfig(script);
    
    expect(config.apiUrl).toBe('http://localhost:3001');
  });

  it('should return null when script element is null', () => {
    const config = parseConfig(null);
    
    expect(config).toBeNull();
    expect(console.error).toHaveBeenCalledWith('[Vakkya] No script element provided');
  });

  it('should return null when token is missing', () => {
    const script = document.createElement('script');
    
    const config = parseConfig(script);
    
    expect(config).toBeNull();
    expect(console.error).toHaveBeenCalledWith('[Vakkya] Missing required data-token attribute');
  });

  it('should return null when token is empty string', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', '');
    
    const config = parseConfig(script);
    
    expect(config).toBeNull();
  });

  it('should return null when token is whitespace only', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', '   ');
    
    const config = parseConfig(script);
    
    expect(config).toBeNull();
  });

  it('should trim whitespace from token', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', '  my-token  ');
    
    const config = parseConfig(script);
    
    expect(config.token).toBe('my-token');
  });
});

describe('findWidgetScript', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('should find script with data-token attribute', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'found-token');
    document.body.appendChild(script);
    
    const found = findWidgetScript();
    
    expect(found).toBe(script);
  });

  it('should return null when no script with data-token exists', () => {
    const script = document.createElement('script');
    script.src = 'some-other-script.js';
    document.body.appendChild(script);
    
    const found = findWidgetScript();
    
    expect(found).toBeNull();
  });

  it('should return last script when multiple exist', () => {
    const script1 = document.createElement('script');
    script1.setAttribute('data-token', 'first-token');
    document.body.appendChild(script1);
    
    const script2 = document.createElement('script');
    script2.setAttribute('data-token', 'second-token');
    document.body.appendChild(script2);
    
    const found = findWidgetScript();
    
    expect(found).toBe(script2);
    expect(found.getAttribute('data-token')).toBe('second-token');
  });
});

describe('AUDIO_CONSTRAINTS', () => {
  it('should have echoCancellation enabled', () => {
    expect(AUDIO_CONSTRAINTS.echoCancellation).toBe(true);
  });

  it('should have noiseSuppression enabled', () => {
    expect(AUDIO_CONSTRAINTS.noiseSuppression).toBe(true);
  });

  it('should have autoGainControl enabled', () => {
    expect(AUDIO_CONSTRAINTS.autoGainControl).toBe(true);
  });
});
