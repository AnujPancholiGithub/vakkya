import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWidgetError, safeExecute, safeWidgetInit, isRecoverableError } from './errors.js';

describe('createWidgetError', () => {
  it('should classify permission denied error', () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';

    const result = createWidgetError(error);

    expect(result.code).toBe('mic_denied');
    expect(result.userMessage).toContain('Microphone access was denied');
  });

  it('should classify microphone not found error', () => {
    const error = new Error('Requested device not found');
    error.name = 'NotFoundError';

    const result = createWidgetError(error);

    expect(result.code).toBe('mic_not_found');
    expect(result.userMessage).toContain('No microphone found');
  });

  it('should classify invalid token error', () => {
    const error = new Error('Invalid widget token');

    const result = createWidgetError(error);

    expect(result.code).toBe('invalid_token');
    expect(result.userMessage).toContain('Invalid configuration');
  });

  it('should classify SDK load error', () => {
    const error = new Error('Failed to load voice SDK');

    const result = createWidgetError(error);

    expect(result.code).toBe('sdk_load_failed');
    expect(result.userMessage).toContain('Failed to load');
  });

  it('should classify connection error', () => {
    const error = new Error('Connection timeout');

    const result = createWidgetError(error);

    expect(result.code).toBe('connection_failed');
    expect(result.userMessage).toContain('Connection failed');
  });

  it('should classify unknown errors', () => {
    const error = new Error('Something weird happened');

    const result = createWidgetError(error);

    expect(result.code).toBe('unknown');
    expect(result.userMessage).toContain('Something went wrong');
  });

  it('should preserve original error message', () => {
    const error = new Error('Original message');

    const result = createWidgetError(error);

    expect(result.message).toBe('Original message');
  });

  it('should handle errors without message', () => {
    const error = new Error();

    const result = createWidgetError(error);

    expect(result.code).toBe('unknown');
  });
});

describe('safeExecute', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return result on success', async () => {
    const fn = () => 'success';

    const result = await safeExecute(fn, () => {});

    expect(result).toBe('success');
  });

  it('should return result from async function', async () => {
    const fn = async () => 'async success';

    const result = await safeExecute(fn, () => {});

    expect(result).toBe('async success');
  });

  it('should return null on error', async () => {
    const fn = () => { throw new Error('test'); };

    const result = await safeExecute(fn, () => {});

    expect(result).toBeNull();
  });

  it('should call error handler with widget error', async () => {
    const fn = () => { throw new Error('Permission denied'); };
    const onError = vi.fn();

    await safeExecute(fn, onError);

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      code: expect.any(String),
      message: 'Permission denied',
      userMessage: expect.any(String),
    }));
  });

  it('should log error to console', async () => {
    const fn = () => { throw new Error('test error'); };

    await safeExecute(fn, () => {});

    expect(console.error).toHaveBeenCalled();
  });

  it('should not throw even if error handler throws', async () => {
    const fn = () => { throw new Error('original'); };
    const onError = () => { throw new Error('handler error'); };

    await expect(safeExecute(fn, onError)).resolves.toBeNull();
  });

  it('should handle null error handler', async () => {
    const fn = () => { throw new Error('test'); };

    await expect(safeExecute(fn, null)).resolves.toBeNull();
  });
});

describe('safeWidgetInit', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call init function', () => {
    const initFn = vi.fn();

    safeWidgetInit(initFn);

    expect(initFn).toHaveBeenCalled();
  });

  it('should not throw on init error', () => {
    const initFn = () => { throw new Error('init failed'); };

    expect(() => safeWidgetInit(initFn)).not.toThrow();
  });

  it('should log error on init failure', () => {
    const initFn = () => { throw new Error('init failed'); };

    safeWidgetInit(initFn);

    expect(console.error).toHaveBeenCalledWith(
      '[Vakkya] Widget initialization failed:',
      expect.any(Error)
    );
  });
});

describe('isRecoverableError', () => {
  it('should return true for connection_failed', () => {
    expect(isRecoverableError('connection_failed')).toBe(true);
  });

  it('should return true for unknown', () => {
    expect(isRecoverableError('unknown')).toBe(true);
  });

  it('should return false for mic_denied', () => {
    expect(isRecoverableError('mic_denied')).toBe(false);
  });

  it('should return false for invalid_token', () => {
    expect(isRecoverableError('invalid_token')).toBe(false);
  });

  it('should return false for sdk_load_failed', () => {
    expect(isRecoverableError('sdk_load_failed')).toBe(false);
  });
});
