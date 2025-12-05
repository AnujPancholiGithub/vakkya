import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseConfig, findWidgetScript, AUDIO_CONSTRAINTS, DEFAULT_CONFIG, isValidColor } from './config.js';

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

  // Customization parsing tests (Requirements 6.1, 6.2, 6.4)
  it('should use default accent color when not specified', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    
    const config = parseConfig(script);
    
    expect(config.accentColor).toBe(DEFAULT_CONFIG.accentColor);
  });

  it('should parse valid hex accent color', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    script.setAttribute('data-accent-color', '#6366F1');
    
    const config = parseConfig(script);
    
    expect(config.accentColor).toBe('#6366F1');
  });

  it('should parse valid 3-digit hex accent color', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    script.setAttribute('data-accent-color', '#F00');
    
    const config = parseConfig(script);
    
    expect(config.accentColor).toBe('#F00');
  });

  it('should fall back to default for invalid accent color', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    script.setAttribute('data-accent-color', 'not-a-color');
    
    const config = parseConfig(script);
    
    expect(config.accentColor).toBe(DEFAULT_CONFIG.accentColor);
  });

  it('should use default theme when not specified', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    
    const config = parseConfig(script);
    
    expect(config.theme).toBe('light');
  });

  it('should parse dark theme', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    script.setAttribute('data-theme', 'dark');
    
    const config = parseConfig(script);
    
    expect(config.theme).toBe('dark');
  });

  it('should parse light theme', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    script.setAttribute('data-theme', 'light');
    
    const config = parseConfig(script);
    
    expect(config.theme).toBe('light');
  });

  it('should fall back to default for invalid theme', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    script.setAttribute('data-theme', 'invalid');
    
    const config = parseConfig(script);
    
    expect(config.theme).toBe('light');
  });

  it('should use default position when not specified', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    
    const config = parseConfig(script);
    
    expect(config.position).toBe('bottom-right');
  });

  it('should parse bottom-left position', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token');
    script.setAttribute('data-position', 'bottom-left');
    
    const config = parseConfig(script);
    
    expect(config.position).toBe('bottom-left');
  });
});

describe('isValidColor', () => {
  it('should validate 6-digit hex colors', () => {
    expect(isValidColor('#3B82F6')).toBe(true);
    expect(isValidColor('#ffffff')).toBe(true);
    expect(isValidColor('#000000')).toBe(true);
  });

  it('should validate 3-digit hex colors', () => {
    expect(isValidColor('#F00')).toBe(true);
    expect(isValidColor('#abc')).toBe(true);
  });

  it('should validate 8-digit hex colors with alpha', () => {
    expect(isValidColor('#3B82F6FF')).toBe(true);
    expect(isValidColor('#00000080')).toBe(true);
  });

  it('should validate rgb colors', () => {
    expect(isValidColor('rgb(59, 130, 246)')).toBe(true);
    expect(isValidColor('rgb(0, 0, 0)')).toBe(true);
  });

  it('should validate rgba colors', () => {
    expect(isValidColor('rgba(59, 130, 246, 0.5)')).toBe(true);
  });

  it('should validate hsl colors', () => {
    expect(isValidColor('hsl(217, 91%, 60%)')).toBe(true);
  });

  it('should validate named colors', () => {
    expect(isValidColor('red')).toBe(true);
    expect(isValidColor('blue')).toBe(true);
    expect(isValidColor('transparent')).toBe(true);
  });

  it('should reject invalid colors', () => {
    expect(isValidColor('not-a-color')).toBe(false);
    expect(isValidColor('#GGG')).toBe(false);
    expect(isValidColor('')).toBe(false);
    expect(isValidColor(null)).toBe(false);
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
