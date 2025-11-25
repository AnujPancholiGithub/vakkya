import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Widget Setup', () => {
  let originalDocument;
  
  beforeEach(() => {
    // Clear any previous script tags
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have jsdom environment configured', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('should be able to create DOM elements', () => {
    const div = document.createElement('div');
    div.id = 'test';
    document.body.appendChild(div);
    
    expect(document.getElementById('test')).toBeTruthy();
  });

  it('should support Shadow DOM', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    
    const shadow = host.attachShadow({ mode: 'open' });
    expect(shadow).toBeTruthy();
    expect(host.shadowRoot).toBe(shadow);
  });

  it('should support Canvas API', () => {
    const canvas = document.createElement('canvas');
    expect(canvas.getContext).toBeDefined();
  });

  it('should support custom data attributes', () => {
    const script = document.createElement('script');
    script.setAttribute('data-token', 'test-token-123');
    
    expect(script.getAttribute('data-token')).toBe('test-token-123');
  });
});
