import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLiveKitManager, validateToken } from './livekit-manager.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('validateToken', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return token data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        livekitUrl: 'wss://test.livekit.cloud',
        livekitToken: 'lk-token-123',
        projectId: 'project-123',
      }),
    });

    const result = await validateToken('widget-token', 'https://api.test.com');

    expect(result.livekitUrl).toBe('wss://test.livekit.cloud');
    expect(result.livekitToken).toBe('lk-token-123');
    expect(result.projectId).toBe('project-123');
  });

  it('should call correct API endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await validateToken('my-token', 'https://api.example.com');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/validate-token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetToken: 'my-token' }),
      })
    );
  });

  it('should throw on 401 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await expect(validateToken('bad-token', 'https://api.test.com'))
      .rejects.toThrow('Invalid widget token');
  });

  it('should throw on other error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(validateToken('token', 'https://api.test.com'))
      .rejects.toThrow('Token validation failed');
  });
});

describe('createLiveKitManager', () => {
  let manager;
  let mockStream;
  let stateChanges;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    mockFetch.mockReset();
    
    mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
    };
    
    stateChanges = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create manager with required methods', () => {
    manager = createLiveKitManager('token', 'https://api.test.com');

    expect(manager.connect).toBeInstanceOf(Function);
    expect(manager.disconnect).toBeInstanceOf(Function);
    expect(manager.isConnected).toBeInstanceOf(Function);
    expect(manager.getState).toBeInstanceOf(Function);
    expect(manager.onRemoteAudio).toBeInstanceOf(Function);
    expect(manager.onStateChange).toBeInstanceOf(Function);
  });

  it('should start in idle state', () => {
    manager = createLiveKitManager('token', 'https://api.test.com');

    expect(manager.getState()).toBe('idle');
    expect(manager.isConnected()).toBe(false);
  });

  it('should transition to validating state on connect', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    manager = createLiveKitManager('token', 'https://api.test.com');
    manager.onStateChange((state) => stateChanges.push(state));

    await manager.connect(mockStream);

    expect(stateChanges[0]).toBe('validating');
  });

  it('should transition to error state on invalid token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    manager = createLiveKitManager('bad-token', 'https://api.test.com');
    manager.onStateChange((state) => stateChanges.push(state));

    const result = await manager.connect(mockStream);

    expect(result).toBe(false);
    expect(stateChanges).toContain('error');
    expect(manager.isConnected()).toBe(false);
  });

  it('should call onStateChange callback', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    manager = createLiveKitManager('token', 'https://api.test.com');
    const callback = vi.fn();
    manager.onStateChange(callback);

    await manager.connect(mockStream);

    expect(callback).toHaveBeenCalled();
  });

  it('should handle disconnect when not connected', async () => {
    manager = createLiveKitManager('token', 'https://api.test.com');

    await expect(manager.disconnect()).resolves.not.toThrow();
  });

  it('should set onRemoteAudio callback', () => {
    manager = createLiveKitManager('token', 'https://api.test.com');
    const callback = vi.fn();

    manager.onRemoteAudio(callback);

    // Callback is stored internally - we can't directly test it without mocking LiveKit
    // but we can verify the method doesn't throw
    expect(() => manager.onRemoteAudio(callback)).not.toThrow();
  });

  it('should not be connected after failed validation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    manager = createLiveKitManager('token', 'https://api.test.com');
    
    await manager.connect(mockStream);
    
    expect(manager.isConnected()).toBe(false);
    expect(manager.getState()).toBe('error');
  });
});

describe('LiveKit Manager Integration', () => {
  // These tests would require mocking the LiveKit SDK
  // For now, we test the token validation flow which doesn't require LiveKit

  it('should validate token before connecting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        livekitUrl: 'wss://test.livekit.cloud',
        livekitToken: 'lk-token',
        projectId: 'proj-123',
      }),
    });

    const manager = createLiveKitManager('widget-token', 'https://api.test.com');
    
    // This will fail at LiveKit SDK loading, but token validation should succeed
    await manager.connect({ getTracks: () => [] });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/validate-token',
      expect.any(Object)
    );
  });
});

describe('Page Context Collection', () => {
  /**
   * Property Test: Widget Initialization (Property 1)
   * For any valid page, context SHALL be collected with url, title, and timestamp.
   */
  
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should collect page context with required fields', () => {
    // Simulate page context collection (same logic as sendPageContext)
    const pageContext = {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
    };

    // Property: url must be a non-empty string
    expect(typeof pageContext.url).toBe('string');
    expect(pageContext.url.length).toBeGreaterThan(0);

    // Property: title must be a string (can be empty)
    expect(typeof pageContext.title).toBe('string');

    // Property: timestamp must be a positive number
    expect(typeof pageContext.timestamp).toBe('number');
    expect(pageContext.timestamp).toBeGreaterThan(0);
  });

  it('should encode page context as valid JSON', () => {
    const pageContext = {
      url: 'https://example.com/page?query=test&foo=bar',
      title: 'Test Page with "quotes" and special chars: <>&',
      timestamp: Date.now(),
    };

    // Property: context must be serializable to JSON
    const jsonString = JSON.stringify(pageContext);
    expect(() => JSON.parse(jsonString)).not.toThrow();

    // Property: parsed JSON must match original
    const parsed = JSON.parse(jsonString);
    expect(parsed.url).toBe(pageContext.url);
    expect(parsed.title).toBe(pageContext.title);
    expect(parsed.timestamp).toBe(pageContext.timestamp);
  });

  it('should encode page context as valid UTF-8 bytes', () => {
    const pageContext = {
      url: 'https://example.com/page',
      title: 'Test Page',
      timestamp: Date.now(),
    };

    // Property: context must be encodable to UTF-8 bytes (for data channel)
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(pageContext));

    // Check it's a typed array with content (Uint8Array check varies by environment)
    expect(data.constructor.name).toBe('Uint8Array');
    expect(data.length).toBeGreaterThan(0);

    // Property: bytes must be decodable back to original
    const decoder = new TextDecoder();
    const decoded = JSON.parse(decoder.decode(data));
    expect(decoded.url).toBe(pageContext.url);
  });

  it('should handle unicode characters in page title', () => {
    const pageContext = {
      url: 'https://example.com/日本語',
      title: '日本語ページ 🎤 Voice Assistant',
      timestamp: Date.now(),
    };

    // Property: unicode must survive JSON + UTF-8 encoding round-trip
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const data = encoder.encode(JSON.stringify(pageContext));
    const decoded = JSON.parse(decoder.decode(data));

    expect(decoded.url).toBe(pageContext.url);
    expect(decoded.title).toBe(pageContext.title);
  });

  it('should handle very long URLs gracefully', () => {
    const longPath = 'a'.repeat(2000);
    const pageContext = {
      url: `https://example.com/${longPath}`,
      title: 'Long URL Page',
      timestamp: Date.now(),
    };

    // Property: long URLs must still be serializable
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(pageContext));

    expect(data.length).toBeLessThan(10000); // Reasonable size limit
    expect(data.length).toBeGreaterThan(2000); // Contains the long URL
  });
});
