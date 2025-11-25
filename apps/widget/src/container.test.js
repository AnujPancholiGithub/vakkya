import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createContainer, destroyContainer } from './container.js';

describe('createContainer', () => {
  let result;

  afterEach(() => {
    // Clean up after each test
    if (result?.host) {
      destroyContainer(result.host);
    }
    // Remove any leftover elements
    const host = document.getElementById('vakkya-widget-host');
    if (host) host.remove();
  });

  it('should create host element with correct id', () => {
    result = createContainer();
    
    expect(result.host).toBeTruthy();
    expect(result.host.id).toBe('vakkya-widget-host');
  });

  it('should attach shadow root to host', () => {
    result = createContainer();
    
    expect(result.shadow).toBeTruthy();
    expect(result.host.shadowRoot).toBe(result.shadow);
  });

  it('should create shadow root in open mode', () => {
    result = createContainer();
    
    expect(result.host.shadowRoot).not.toBeNull();
  });

  it('should inject styles into shadow root', () => {
    result = createContainer();
    
    const styleElement = result.shadow.querySelector('style');
    expect(styleElement).toBeTruthy();
    expect(styleElement.textContent).toContain(':host');
    expect(styleElement.textContent).toContain('.vakkya-widget');
  });

  it('should create container element with correct class', () => {
    result = createContainer();
    
    expect(result.container).toBeTruthy();
    expect(result.container.className).toBe('vakkya-widget');
  });

  it('should append host to document body', () => {
    result = createContainer();
    
    expect(document.body.contains(result.host)).toBe(true);
  });

  it('should include responsive styles for mobile', () => {
    result = createContainer();
    
    const styleElement = result.shadow.querySelector('style');
    expect(styleElement.textContent).toContain('@media');
    expect(styleElement.textContent).toContain('480px');
  });

  it('should set maximum z-index for visibility', () => {
    result = createContainer();
    
    const styleElement = result.shadow.querySelector('style');
    expect(styleElement.textContent).toContain('z-index: 2147483647');
  });
});

describe('destroyContainer', () => {
  it('should remove host from DOM', () => {
    const { host } = createContainer();
    expect(document.body.contains(host)).toBe(true);
    
    destroyContainer(host);
    
    expect(document.body.contains(host)).toBe(false);
  });

  it('should handle null host gracefully', () => {
    expect(() => destroyContainer(null)).not.toThrow();
  });

  it('should handle already removed host gracefully', () => {
    const { host } = createContainer();
    host.remove();
    
    expect(() => destroyContainer(host)).not.toThrow();
  });
});
