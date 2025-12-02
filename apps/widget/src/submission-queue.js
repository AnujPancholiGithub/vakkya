/**
 * Submission Queue
 * Queues form submissions when API is unreachable and retries when connectivity returns
 * 
 * Validates: Requirements 7.3
 * Property 16: Local Queue on API Failure
 */

const STORAGE_KEY = 'vakkya_submission_queue';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

/**
 * @typedef {Object} QueuedSubmission
 * @property {string} id
 * @property {string} formId
 * @property {string} sessionId
 * @property {Object} data
 * @property {number} attempts
 * @property {number} createdAt
 * @property {number} lastAttemptAt
 * @property {'pending'|'retrying'|'failed'} status
 */

/**
 * Create a submission queue manager
 * @param {string} apiUrl - API server URL
 * @returns {Object} Submission queue manager
 */
export function createSubmissionQueue(apiUrl) {
  /** @type {QueuedSubmission[]} */
  let queue = [];
  
  /** @type {boolean} */
  let isProcessing = false;
  
  /** @type {number|null} */
  let retryTimeoutId = null;
  
  /** @type {Array<(submission: QueuedSubmission, success: boolean) => void>} */
  const listeners = [];

  // Load queue from storage on init
  loadFromStorage();

  /**
   * Generate unique ID for submission
   * @returns {string}
   */
  function generateId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Add a submission to the queue
   * @param {string} formId
   * @param {string} sessionId
   * @param {Object} data
   * @returns {string} Submission ID
   */
  function enqueue(formId, sessionId, data) {
    const submission = {
      id: generateId(),
      formId,
      sessionId,
      data,
      attempts: 0,
      createdAt: Date.now(),
      lastAttemptAt: 0,
      status: 'pending',
    };

    queue.push(submission);
    saveToStorage();
    
    // Start processing if not already
    if (!isProcessing) {
      processQueue();
    }

    return submission.id;
  }

  /**
   * Process the queue - attempt to submit pending items
   */
  async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    
    isProcessing = true;

    // Get next pending submission
    const submission = queue.find(s => s.status === 'pending' || s.status === 'retrying');
    
    if (!submission) {
      isProcessing = false;
      return;
    }

    submission.status = 'retrying';
    submission.attempts++;
    submission.lastAttemptAt = Date.now();
    saveToStorage();

    try {
      const success = await submitToApi(submission);
      
      if (success) {
        // Remove from queue on success
        queue = queue.filter(s => s.id !== submission.id);
        saveToStorage();
        notifyListeners(submission, true);
      } else {
        handleFailure(submission);
      }
    } catch (err) {
      handleFailure(submission);
    }

    isProcessing = false;

    // Continue processing if more items
    if (queue.some(s => s.status === 'pending' || s.status === 'retrying')) {
      processQueue();
    }
  }

  /**
   * Handle submission failure
   * @param {QueuedSubmission} submission
   */
  function handleFailure(submission) {
    if (submission.attempts >= MAX_RETRIES) {
      submission.status = 'failed';
      saveToStorage();
      notifyListeners(submission, false);
    } else {
      submission.status = 'pending';
      saveToStorage();
      
      // Schedule retry with exponential backoff
      const delay = RETRY_DELAYS[Math.min(submission.attempts - 1, RETRY_DELAYS.length - 1)];
      scheduleRetry(delay);
    }
  }

  /**
   * Schedule a retry after delay
   * @param {number} delay
   */
  function scheduleRetry(delay) {
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
    }
    
    retryTimeoutId = setTimeout(() => {
      retryTimeoutId = null;
      processQueue();
    }, delay);
  }

  /**
   * Submit to API
   * @param {QueuedSubmission} submission
   * @returns {Promise<boolean>}
   */
  async function submitToApi(submission) {
    try {
      const response = await fetch(`${apiUrl}/internal/forms/${submission.formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: submission.sessionId,
          data: submission.data,
        }),
      });

      return response.ok;
    } catch (err) {
      // Network error - API unreachable
      return false;
    }
  }

  /**
   * Save queue to localStorage
   */
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('[Vakkya] Failed to save submission queue:', err);
    }
  }

  /**
   * Load queue from localStorage
   */
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        queue = JSON.parse(stored);
        // Reset any "retrying" status to "pending" (in case of page reload during retry)
        queue.forEach(s => {
          if (s.status === 'retrying') {
            s.status = 'pending';
          }
        });
      }
    } catch (err) {
      console.warn('[Vakkya] Failed to load submission queue:', err);
      queue = [];
    }
  }

  /**
   * Clear the queue
   */
  function clear() {
    queue = [];
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
    saveToStorage();
  }

  /**
   * Get queue status
   * @returns {{pending: number, failed: number, total: number}}
   */
  function getStatus() {
    return {
      pending: queue.filter(s => s.status === 'pending' || s.status === 'retrying').length,
      failed: queue.filter(s => s.status === 'failed').length,
      total: queue.length,
    };
  }

  /**
   * Get all queued submissions
   * @returns {QueuedSubmission[]}
   */
  function getQueue() {
    return [...queue];
  }

  /**
   * Retry all failed submissions
   */
  function retryFailed() {
    queue.forEach(s => {
      if (s.status === 'failed') {
        s.status = 'pending';
        s.attempts = 0;
      }
    });
    saveToStorage();
    processQueue();
  }

  /**
   * Remove a specific submission from queue
   * @param {string} submissionId
   * @returns {boolean}
   */
  function remove(submissionId) {
    const initialLength = queue.length;
    queue = queue.filter(s => s.id !== submissionId);
    if (queue.length !== initialLength) {
      saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Subscribe to submission results
   * @param {(submission: QueuedSubmission, success: boolean) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  /**
   * Notify listeners of submission result
   * @param {QueuedSubmission} submission
   * @param {boolean} success
   */
  function notifyListeners(submission, success) {
    listeners.forEach(listener => listener(submission, success));
  }

  /**
   * Check if there are pending submissions
   * @returns {boolean}
   */
  function hasPending() {
    return queue.some(s => s.status === 'pending' || s.status === 'retrying');
  }

  /**
   * Force process queue (e.g., when connectivity returns)
   */
  function flush() {
    if (!isProcessing) {
      processQueue();
    }
  }

  /**
   * Destroy the queue and clean up resources
   * Call this when the widget is destroyed to prevent memory leaks
   */
  function destroy() {
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
    listeners.length = 0;
    isProcessing = false;
  }

  return {
    enqueue,
    clear,
    getStatus,
    getQueue,
    retryFailed,
    remove,
    subscribe,
    hasPending,
    flush,
    destroy,
  };
}

// Export storage key for testing
export { STORAGE_KEY, MAX_RETRIES, RETRY_DELAYS };
