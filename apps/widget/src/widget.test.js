import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VakkyaWidget } from './widget.js';

describe('VakkyaWidget', () => {
  let widget;
  let scriptElement;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    scriptElement = document.createElement('script');
    scriptElement.setAttribute('data-token', 'test-token-123');
  });

  afterEach(() => {
    if (widget) {
      widget.destroy();
      widget = null;
    }
    // Clean up any leftover elements
    const host = document.getElementById('vakkya-widget-host');
    if (host) host.remove();
    
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should parse config from script element', () => {
      widget = new VakkyaWidget(scriptElement);
      
      const config = widget.getConfig();
      expect(config.token).toBe('test-token-123');
    });

    it('should initialize with idle state', () => {
      widget = new VakkyaWidget(scriptElement);
      
      const state = widget.getState();
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
    });

    it('should not be initialized before init() is called', () => {
      widget = new VakkyaWidget(scriptElement);
      
      expect(widget.initialized).toBe(false);
    });
  });

  describe('init', () => {
    it('should create shadow DOM container', () => {
      widget = new VakkyaWidget(scriptElement);
      
      const result = widget.init();
      
      expect(result).toBe(true);
      expect(widget.host).toBeTruthy();
      expect(widget.shadow).toBeTruthy();
      expect(widget.container).toBeTruthy();
    });

    it('should set initialized flag to true', () => {
      widget = new VakkyaWidget(scriptElement);
      
      widget.init();
      
      expect(widget.initialized).toBe(true);
    });

    it('should return true on successful initialization', () => {
      widget = new VakkyaWidget(scriptElement);
      
      expect(widget.init()).toBe(true);
    });

    it('should return true and warn if already initialized', () => {
      widget = new VakkyaWidget(scriptElement);
      widget.init();
      
      const result = widget.init();
      
      expect(result).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('[Vakkya] Widget already initialized');
    });

    it('should return false if config is invalid', () => {
      const invalidScript = document.createElement('script');
      // No data-token attribute
      widget = new VakkyaWidget(invalidScript);
      
      const result = widget.init();
      
      expect(result).toBe(false);
      expect(widget.getState().status).toBe('error');
    });

    it('should append host to document body', () => {
      widget = new VakkyaWidget(scriptElement);
      
      widget.init();
      
      expect(document.body.contains(widget.host)).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should remove host from DOM', async () => {
      widget = new VakkyaWidget(scriptElement);
      widget.init();
      const host = widget.host;
      
      await widget.destroy();
      
      expect(document.body.contains(host)).toBe(false);
    });

    it('should reset all references', async () => {
      widget = new VakkyaWidget(scriptElement);
      widget.init();
      
      await widget.destroy();
      
      expect(widget.host).toBeNull();
      expect(widget.shadow).toBeNull();
      expect(widget.container).toBeNull();
    });

    it('should reset initialized flag', async () => {
      widget = new VakkyaWidget(scriptElement);
      widget.init();
      
      await widget.destroy();
      
      expect(widget.initialized).toBe(false);
    });

    it('should reset state to idle', async () => {
      widget = new VakkyaWidget(scriptElement);
      widget.init();
      
      await widget.destroy();
      
      const state = widget.getState();
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
    });

    it('should handle destroy when not initialized', async () => {
      widget = new VakkyaWidget(scriptElement);
      
      await expect(widget.destroy()).resolves.not.toThrow();
    });
  });

  describe('getState', () => {
    it('should return a copy of state', () => {
      widget = new VakkyaWidget(scriptElement);
      
      const state1 = widget.getState();
      const state2 = widget.getState();
      
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      widget = new VakkyaWidget(scriptElement);
      
      const config1 = widget.getConfig();
      const config2 = widget.getConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should return null if config is invalid', () => {
      const invalidScript = document.createElement('script');
      widget = new VakkyaWidget(invalidScript);
      
      expect(widget.getConfig()).toBeNull();
    });
  });
});
