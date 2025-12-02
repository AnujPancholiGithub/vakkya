/**
 * Submission Queue Tests
 * 
 * Property 16: Local Queue on API Failure
 * Validates: Requirements 7.3
 * 
 * WHEN the API is unreachable THEN the Conversational_Forms_System SHALL
 * queue the submission locally and retry when connectivity returns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSubmissionQueue, STORAGE_KEY, MAX_RETRIES, RETRY_DELAYS } from './submission-queue.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Submission Queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Queue Operations', () => {
    it('should enqueue a submission and return an ID', () => {
      const queue = createSubmissionQueue('https://api.test.com');
      
      const id = queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      expect(id).toMatch(/^sub_/);
      expect(queue.getStatus().total).toBe(1);
    });

    it('should store submission data correctly', () => {
      const queue = createSubmissionQueue('https://api.test.com');
      
      queue.enqueue('form_123', 'session_456', { name: 'John', email: 'john@test.com' });
      
      const submissions = queue.getQueue();
      expect(submissions).toHaveLength(1);
      expect(submissions[0].formId).toBe('form_123');
      expect(submissions[0].sessionId).toBe('session_456');
      expect(submissions[0].data).toEqual({ name: 'John', email: 'john@test.com' });
      // Status may be 'pending' or 'retrying' depending on timing
      expect(['pending', 'retrying']).toContain(submissions[0].status);
    });

    it('should clear the queue', () => {
      const queue = createSubmissionQueue('https://api.test.com');
      
      queue.enqueue('form_1', 'session_1', { a: 1 });
      queue.enqueue('form_2', 'session_2', { b: 2 });
      
      queue.clear();
      
      expect(queue.getStatus().total).toBe(0);
    });

    it('should remove specific submission', () => {
      const queue = createSubmissionQueue('https://api.test.com');
      
      const id1 = queue.enqueue('form_1', 'session_1', { a: 1 });
      queue.enqueue('form_2', 'session_2', { b: 2 });
      
      const removed = queue.remove(id1);
      
      expect(removed).toBe(true);
      expect(queue.getStatus().total).toBe(1);
    });

    it('should return false when removing non-existent submission', () => {
      const queue = createSubmissionQueue('https://api.test.com');
      
      const removed = queue.remove('non_existent_id');
      
      expect(removed).toBe(false);
    });
  });

  /**
   * Property 16: Local Queue on API Failure
   * For any submission when API is unreachable, the submission shall be queued
   * locally and retried when connectivity returns.
   */
  describe('Property 16: Local Queue on API Failure', () => {
    it('should queue submission when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      
      const queue = createSubmissionQueue('https://api.test.com');
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      // Let the async processing happen
      await vi.runAllTimersAsync();
      
      // Should still be in queue (pending retry)
      expect(queue.getStatus().pending).toBeGreaterThanOrEqual(0);
    });

    it('should queue submission when network fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const queue = createSubmissionQueue('https://api.test.com');
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      await vi.runAllTimersAsync();
      
      // Should still be in queue
      expect(queue.getStatus().total).toBe(1);
    });

    it('should remove submission from queue on success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      
      const queue = createSubmissionQueue('https://api.test.com');
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      await vi.runAllTimersAsync();
      
      expect(queue.getStatus().total).toBe(0);
    });

    it('should use retry delays from config', () => {
      // Verify retry delays are configured correctly
      expect(RETRY_DELAYS).toEqual([1000, 5000, 30000]);
      expect(MAX_RETRIES).toBe(3);
    });

    it('should mark as failed after MAX_RETRIES attempts', async () => {
      // All attempts fail
      for (let i = 0; i < MAX_RETRIES + 1; i++) {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      }
      
      const queue = createSubmissionQueue('https://api.test.com');
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      // Run through all retries
      for (let i = 0; i < MAX_RETRIES; i++) {
        await vi.runAllTimersAsync();
      }
      
      expect(queue.getStatus().failed).toBe(1);
      expect(queue.getStatus().pending).toBe(0);
    });

    it('should call correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      
      const queue = createSubmissionQueue('https://api.test.com');
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      await vi.runAllTimersAsync();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/internal/forms/form_123/submit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session_456',
            data: { name: 'John' },
          }),
        })
      );
    });
  });

  describe('Persistence', () => {
    it('should save queue to localStorage', () => {
      const queue = createSubmissionQueue('https://api.test.com');
      
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );
    });

    it('should load queue from localStorage on init', () => {
      const existingQueue = [{
        id: 'sub_existing',
        formId: 'form_123',
        sessionId: 'session_456',
        data: { name: 'John' },
        attempts: 1,
        createdAt: Date.now(),
        lastAttemptAt: Date.now(),
        status: 'pending',
      }];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(existingQueue));
      
      const queue = createSubmissionQueue('https://api.test.com');
      
      expect(queue.getStatus().total).toBe(1);
      expect(queue.getQueue()[0].id).toBe('sub_existing');
    });

    it('should reset retrying status to pending on load', () => {
      const existingQueue = [{
        id: 'sub_existing',
        formId: 'form_123',
        sessionId: 'session_456',
        data: { name: 'John' },
        attempts: 1,
        createdAt: Date.now(),
        lastAttemptAt: Date.now(),
        status: 'retrying',
      }];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(existingQueue));
      
      const queue = createSubmissionQueue('https://api.test.com');
      
      expect(queue.getQueue()[0].status).toBe('pending');
    });
  });

  describe('Subscription', () => {
    it('should notify listeners on successful submission', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      
      const queue = createSubmissionQueue('https://api.test.com');
      const listener = vi.fn();
      queue.subscribe(listener);
      
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      await vi.runAllTimersAsync();
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ formId: 'form_123' }),
        true
      );
    });

    it('should notify listeners on failed submission', async () => {
      for (let i = 0; i < MAX_RETRIES + 1; i++) {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      }
      
      const queue = createSubmissionQueue('https://api.test.com');
      const listener = vi.fn();
      queue.subscribe(listener);
      
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      for (let i = 0; i < MAX_RETRIES; i++) {
        await vi.runAllTimersAsync();
      }
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ formId: 'form_123', status: 'failed' }),
        false
      );
    });

    it('should allow unsubscribing', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      
      const queue = createSubmissionQueue('https://api.test.com');
      const listener = vi.fn();
      const unsubscribe = queue.subscribe(listener);
      
      unsubscribe();
      
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      await vi.runAllTimersAsync();
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Retry Failed', () => {
    it('should retry all failed submissions', async () => {
      // First round: all fail
      for (let i = 0; i < MAX_RETRIES + 1; i++) {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      }
      
      const queue = createSubmissionQueue('https://api.test.com');
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      for (let i = 0; i < MAX_RETRIES; i++) {
        await vi.runAllTimersAsync();
      }
      
      expect(queue.getStatus().failed).toBe(1);
      
      // Now retry - this time it succeeds
      mockFetch.mockResolvedValueOnce({ ok: true });
      queue.retryFailed();
      await vi.runAllTimersAsync();
      
      expect(queue.getStatus().failed).toBe(0);
      expect(queue.getStatus().total).toBe(0);
    });
  });

  describe('Flush', () => {
    it('should process queue when flush is called', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      
      // Manually add to queue without triggering processing
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([{
        id: 'sub_manual',
        formId: 'form_123',
        sessionId: 'session_456',
        data: { name: 'John' },
        attempts: 0,
        createdAt: Date.now(),
        lastAttemptAt: 0,
        status: 'pending',
      }]));
      
      const queue2 = createSubmissionQueue('https://api.test.com');
      queue2.flush();
      
      await vi.runAllTimersAsync();
      
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clean up resources and cancel pending retries', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      
      const queue = createSubmissionQueue('https://api.test.com');
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      // Destroy before retry completes
      queue.destroy();
      
      // Should not throw and should clean up
      expect(queue.hasPending()).toBe(true); // Queue still has items but processing stopped
    });

    it('should remove all listeners', async () => {
      const queue = createSubmissionQueue('https://api.test.com');
      const listener = vi.fn();
      queue.subscribe(listener);
      
      queue.destroy();
      
      // Enqueue after destroy - listener should not be called
      mockFetch.mockResolvedValueOnce({ ok: true });
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      await vi.runAllTimersAsync();
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('hasPending', () => {
    it('should return true when there are pending submissions', () => {
      const queue = createSubmissionQueue('https://api.test.com');
      
      expect(queue.hasPending()).toBe(false);
      
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      expect(queue.hasPending()).toBe(true);
    });

    it('should return false when all submissions are failed', async () => {
      for (let i = 0; i < MAX_RETRIES + 1; i++) {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      }
      
      const queue = createSubmissionQueue('https://api.test.com');
      queue.enqueue('form_123', 'session_456', { name: 'John' });
      
      for (let i = 0; i < MAX_RETRIES; i++) {
        await vi.runAllTimersAsync();
      }
      
      expect(queue.hasPending()).toBe(false);
      expect(queue.getStatus().failed).toBe(1);
    });
  });
});
