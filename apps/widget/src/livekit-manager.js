/**
 * LiveKit manager - handles room connection and audio streaming
 * Uses dynamic import to lazy-load LiveKit SDK
 * 
 * Validates: Requirements 3.5, 10.1, 10.2, 10.3
 */

import { AUDIO_CONSTRAINTS } from './config.js';
import {
  serializeMessage,
  deserializeMessage,
  createKeyboardInputMessage,
  createFieldConfirmedMessage,
  createFieldRejectedMessage,
  createFormAbandonedMessage,
  createSubmissionApprovedMessage,
  createEditRequestedMessage,
  createPageContextMessage,
  createUserTranscriptionMessage,
} from './data-channel-protocol.js';

/** @type {typeof import('livekit-client')|null} */
let LiveKitClient = null;

const LIVEKIT_CDN_URL = 'https://unpkg.com/livekit-client@2.5.0/dist/livekit-client.umd.js';

/**
 * @typedef {Object} LiveKitManager
 * @property {Function} connect - Connect to LiveKit room
 * @property {Function} disconnect - Disconnect from room
 * @property {Function} isConnected - Check connection status
 * @property {Function} onRemoteAudio - Set callback for remote audio
 * @property {Function} onStateChange - Set callback for state changes
 */

/**
 * @typedef {'idle'|'validating'|'connecting'|'connected'|'disconnected'|'error'} ConnectionState
 */

/**
 * Load script from URL
 * @param {string} url
 * @returns {Promise<void>}
 */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.LivekitClient) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load LiveKit SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Lazy load the LiveKit client SDK from CDN
 * @returns {Promise<typeof import('livekit-client')>}
 */
async function loadLiveKitSDK() {
  if (LiveKitClient) return LiveKitClient;
  
  try {
    // Try dynamic import first (for dev/test environments)
    try {
      LiveKitClient = await import('livekit-client');
      return LiveKitClient;
    } catch {
      // Fall back to CDN loading for production
      await loadScript(LIVEKIT_CDN_URL);
      LiveKitClient = window.LivekitClient;
      if (!LiveKitClient) {
        throw new Error('LiveKit SDK not available');
      }
      return LiveKitClient;
    }
  } catch (err) {
    console.error('[Vakkya] Failed to load LiveKit SDK:', err);
    throw new Error('Failed to load voice SDK');
  }
}

/**
 * Validate widget token with API server
 * @param {string} token - Widget token
 * @param {string} apiUrl - API server URL
 * @returns {Promise<{livekitUrl: string, livekitToken: string, projectId: string}>}
 */
async function validateToken(token, apiUrl) {
  const response = await fetch(`${apiUrl}/validate-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ widgetToken: token }),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid widget token');
    }
    throw new Error('Token validation failed');
  }
  
  const data = await response.json();
  return {
    livekitUrl: data.livekitUrl,
    livekitToken: data.livekitToken,
    projectId: data.projectId,
  };
}

/**
 * Fetch active form for a project (legacy single-form endpoint)
 * @param {string} projectId - Project ID
 * @param {string} apiUrl - API server URL
 * @returns {Promise<Object|null>} Form schema or null if no active form
 */
async function fetchActiveForm(projectId, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/internal/projects/${projectId}/active-form`);
    
    if (response.status === 404) {
      // No active form for this project
      return null;
    }
    
    if (!response.ok) {
      console.warn('[Vakkya] Failed to fetch active form:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.form || null;
  } catch (err) {
    console.warn('[Vakkya] Error fetching active form:', err);
    return null;
  }
}

/**
 * Form schema cache for session duration
 * Property 2: Form Schema Caching
 * @type {Map<string, {forms: Object[], fetchedAt: number}>}
 */
const formSchemaCache = new Map();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch all active forms for a project (V2 multi-form endpoint)
 * Property 1: Lazy Loading Guarantee - only called when voice session starts
 * Property 2: Form Schema Caching - caches for session duration
 * Property 3: Graceful Degradation - returns empty array on failure
 * 
 * @param {string} projectId - Project ID
 * @param {string} apiUrl - API server URL
 * @returns {Promise<Object[]>} Array of form schemas (empty on failure)
 */
async function fetchAllForms(projectId, apiUrl) {
  // Check cache first (Property 2)
  const cached = formSchemaCache.get(projectId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS) {
    return cached.forms;
  }

  try {
    const response = await fetch(`${apiUrl}/internal/projects/${projectId}/forms/all`);
    
    if (!response.ok) {
      console.warn('[Vakkya] Failed to fetch forms:', response.status);
      // Property 3: Graceful degradation - return empty array, continue in RAG mode
      return [];
    }
    
    const data = await response.json();
    const forms = data.forms || [];
    
    // Cache the result (Property 2)
    formSchemaCache.set(projectId, {
      forms,
      fetchedAt: Date.now(),
    });
    
    return forms;
  } catch (err) {
    console.warn('[Vakkya] Error fetching forms:', err);
    // Property 3: Graceful degradation - return empty array, continue in RAG mode
    return [];
  }
}

/**
 * Clear form schema cache (for testing or session reset)
 */
function clearFormCache() {
  formSchemaCache.clear();
}

/**
 * Get cached forms for a project (for testing)
 * @param {string} projectId
 * @returns {{forms: Object[], fetchedAt: number}|undefined}
 */
function getCachedForms(projectId) {
  return formSchemaCache.get(projectId);
}

/**
 * Create a LiveKit manager instance
 * @param {string} widgetToken - Widget token for authentication
 * @param {string} apiUrl - API server URL
 * @returns {LiveKitManager}
 */
export function createLiveKitManager(widgetToken, apiUrl) {
  /** @type {import('livekit-client').Room|null} */
  let room = null;
  
  /** @type {import('livekit-client').LocalAudioTrack|null} */
  let localAudioTrack = null;
  
  /** @type {MediaStream|null} */
  let micStream = null;
  
  /** @type {ConnectionState} */
  let state = 'idle';
  
  /** @type {Function|null} */
  let onRemoteAudioCallback = null;
  
  /** @type {Function|null} */
  let onStateChangeCallback = null;
  
  /** @type {boolean} */
  let isReconnecting = false;
  
  /** @type {number|null} */
  let reconnectTimeoutId = null;
  
  /** @type {Object|null} */
  let cachedTokenData = null;
  
  /** @type {Function|null} */
  let onFormAvailableCallback = null;
  
  /** @type {import('livekit-client').RemoteAudioTrack|null} */
  let remoteAudioTrack = null;
  
  /** @type {Object|null} */
  let activeForm = null;
  
  /** @type {Object[]} */
  let availableForms = [];
  
  /** @type {Function|null} */
  let onAgentMessageCallback = null;
  
  /** @type {Function|null} */
  let onTranscriptionCallback = null;
  
  /** @type {boolean} */
  let formsLoaded = false;

  /**
   * Update connection state
   * @param {ConnectionState} newState
   * @param {string} [error]
   */
  function setState(newState, error) {
    state = newState;
    if (onStateChangeCallback) {
      onStateChangeCallback(newState, error);
    }
  }

  /**
   * Connect to LiveKit room
   * Property 1: Lazy Loading - forms fetched only when voice session starts
   * Property 2: Parallel fetch - forms fetched alongside LiveKit connection
   * Property 3: Graceful degradation - continues in RAG mode if forms fail
   * 
   * @param {MediaStream} stream - Microphone stream
   * @returns {Promise<boolean>}
   */
  async function connect(stream) {
    if (state === 'connected' || state === 'connecting') {
      return true;
    }

    micStream = stream;

    try {
      // Step 1: Validate token with API
      setState('validating');
      const tokenData = await validateToken(widgetToken, apiUrl);
      
      // Cache token data for reconnection
      cachedTokenData = tokenData;
      
      // Step 2: Start parallel operations (Property 1.2: parallel fetch)
      setState('connecting');
      
      // Fetch forms in parallel with LiveKit SDK loading (Property 1, 2)
      const [lk, forms] = await Promise.all([
        loadLiveKitSDK(),
        fetchAllForms(tokenData.projectId, apiUrl),
      ]);
      
      // Store fetched forms internally for agent access (Property 3: graceful degradation - empty array on failure)
      // Forms are NOT automatically displayed - agent controls when to activate them via data channel
      // Validates: Requirements 1.1, 1.2 (No Automatic Form Display)
      availableForms = forms;
      formsLoaded = true;
      
      // For backward compatibility, set activeForm to first form if available
      // Note: This only stores the form internally - it does NOT trigger UI display
      if (forms.length > 0) {
        activeForm = forms[0];
      }

      // Step 3: Create room
      room = new lk.Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event handlers
      setupRoomEventHandlers(lk);

      // Step 4: Connect to room
      await room.connect(tokenData.livekitUrl, tokenData.livekitToken);

      // Step 5: Publish local audio track
      localAudioTrack = await lk.createLocalAudioTrack(AUDIO_CONSTRAINTS);
      
      await room.localParticipant.publishTrack(localAudioTrack);

      // Step 6: Send page URL via data channel
      sendPageContext();

      setState('connected');
      return true;
    } catch (err) {
      console.error('[Vakkya] Connection failed:', err);
      setState('error', err.message);
      await disconnect();
      return false;
    }
  }

  /**
   * Set up room event handlers
   * @param {typeof import('livekit-client')} lk
   */
  function setupRoomEventHandlers(lk) {
    if (!room) return;

    // Handle remote track subscription
    room.on(lk.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === lk.Track.Kind.Audio) {
        handleRemoteAudioTrack(track);
      }
    });

    // Handle disconnection
    room.on(lk.RoomEvent.Disconnected, (reason) => {
      console.log('[Vakkya] Disconnected:', reason);
      
      // Don't attempt reconnection if user explicitly disconnected or no cached token
      if (state === 'disconnected' || !micStream || !cachedTokenData) {
        setState('disconnected');
        return;
      }
      
      // Attempt automatic reconnection using cached token data
      attemptReconnection(cachedTokenData, lk);
    });

    // Handle connection quality changes
    room.on(lk.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant.isLocal && quality === lk.ConnectionQuality.Poor) {
        console.warn('[Vakkya] Poor connection quality');
      }
    });

    // Handle data channel messages from agent
    room.on(lk.RoomEvent.DataReceived, (payload, participant) => {
      // Only process messages from remote participants (agent)
      if (participant && !participant.isLocal) {
        handleAgentMessage(payload);
      }
    });

    // Handle transcription events (Requirements 3.2)
    room.on(lk.RoomEvent.TranscriptionReceived, (transcriptions, participant) => {
      transcriptions.forEach((transcription) => {
        handleTranscription(transcription, participant);
      });
    });
  }

  /**
   * Handle incoming data channel message from agent
   * Validates: Requirements 10.1, 10.2
   * @param {Uint8Array} payload
   */
  function handleAgentMessage(payload) {
    const message = deserializeMessage(payload);
    if (!message) return;

    if (onAgentMessageCallback) {
      onAgentMessageCallback(message);
    }
  }

  /**
   * Handle transcription event from LiveKit
   * Requirements 3.2: Display user speech as message bubbles
   * Requirements 3.3: Display agent speech as message bubbles
   * @param {Object} transcription - LiveKit transcription object
   * @param {Object} participant - Participant who spoke
   */
  function handleTranscription(transcription, participant) {
    if (!participant) return;

    const content = transcription.text || '';
    const isFinal = transcription.final || false;

    if (participant.isLocal) {
      // User transcription (Requirements 3.2)
      if (onTranscriptionCallback) {
        onTranscriptionCallback(content, isFinal);
      }

      // Send transcription to agent via data channel
      if (isFinal && content.trim()) {
        const message = createUserTranscriptionMessage(content, isFinal);
        publishMessage(message);
      }
    } else {
      // Agent transcription (Requirements 3.3)
      // NOTE: Agent messages are sent via data channel from voice agent
      // Do NOT duplicate here - the data channel message is authoritative
      // This transcription is just for logging/debugging
      if (isFinal && content.trim()) {
        console.log('[Vakkya] Agent transcription (via LiveKit):', content.substring(0, 50) + '...');
      }
    }
  }

  /**
   * Handle remote audio track (agent TTS)
   * @param {import('livekit-client').RemoteAudioTrack} track
   */
  function handleRemoteAudioTrack(track) {
    // Clean up previous remote track if exists
    if (remoteAudioTrack) {
      remoteAudioTrack.detach();
    }
    
    // Store reference for cleanup
    remoteAudioTrack = track;
    
    // Attach track to audio element for playback
    const audioElement = track.attach();
    audioElement.play().catch(err => {
      console.warn('[Vakkya] Audio autoplay blocked:', err);
    });

    if (onRemoteAudioCallback) {
      onRemoteAudioCallback(audioElement, track);
    }
  }

  /**
   * Send page context via data channel
   */
  function sendPageContext() {
    if (!room || !room.localParticipant) return;

    try {
      const message = createPageContextMessage(
        window.location.href,
        document.title
      );
      const data = serializeMessage(message);
      room.localParticipant.publishData(data, { reliable: true });
    } catch (err) {
      console.warn('[Vakkya] Failed to send page context:', err);
    }
  }

  /**
   * Publish a message to the agent via data channel
   * Validates: Requirements 10.3
   * @param {Object} message - Message to send
   * @returns {boolean} True if sent successfully
   */
  function publishMessage(message) {
    if (!room || !room.localParticipant) {
      console.warn('[Vakkya] Cannot publish message: not connected');
      return false;
    }

    try {
      const data = serializeMessage(message);
      room.localParticipant.publishData(data, { reliable: true });
      return true;
    } catch (err) {
      console.warn('[Vakkya] Failed to publish message:', err);
      return false;
    }
  }

  /**
   * Send keyboard input to agent
   * @param {string} fieldName
   * @param {unknown} value
   * @returns {boolean}
   */
  function sendKeyboardInput(fieldName, value) {
    return publishMessage(createKeyboardInputMessage(fieldName, value));
  }

  /**
   * Send field confirmation to agent
   * @param {string} fieldName
   * @returns {boolean}
   */
  function sendFieldConfirmed(fieldName) {
    return publishMessage(createFieldConfirmedMessage(fieldName));
  }

  /**
   * Send field rejection to agent
   * @param {string} fieldName
   * @returns {boolean}
   */
  function sendFieldRejected(fieldName) {
    return publishMessage(createFieldRejectedMessage(fieldName));
  }

  /**
   * Send form abandonment to agent
   * @returns {boolean}
   */
  function sendFormAbandoned() {
    return publishMessage(createFormAbandonedMessage());
  }

  /**
   * Send submission approval to agent
   * @returns {boolean}
   */
  function sendSubmissionApproved() {
    return publishMessage(createSubmissionApprovedMessage());
  }

  /**
   * Send edit request to agent
   * @param {string} fieldName
   * @returns {boolean}
   */
  function sendEditRequested(fieldName) {
    return publishMessage(createEditRequestedMessage(fieldName));
  }

  /**
   * Attempt automatic reconnection after unexpected disconnect
   * Requirement 7.1: Preserve data and attempt reconnection
   * @param {Object} tokenData - Cached token data from initial connection
   * @param {typeof import('livekit-client')} lk - LiveKit SDK
   */
  async function attemptReconnection(tokenData, lk) {
    if (isReconnecting) return;
    
    isReconnecting = true;
    setState('connecting'); // Show reconnecting state
    
    const maxAttempts = 3;
    const delays = [1000, 3000, 5000]; // 1s, 3s, 5s
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`[Vakkya] Reconnection attempt ${attempt + 1}/${maxAttempts}`);
        
        // Wait before retry
        if (attempt > 0) {
          await new Promise(resolve => {
            reconnectTimeoutId = setTimeout(resolve, delays[attempt - 1]);
          });
        }
        
        // Create new room instance
        room = new lk.Room({
          adaptiveStream: true,
          dynacast: true,
        });
        
        // Set up event handlers
        setupRoomEventHandlers(lk);
        
        // Reconnect to room
        await room.connect(tokenData.livekitUrl, tokenData.livekitToken);
        
        // Republish local audio track
        if (localAudioTrack) {
          await room.localParticipant.publishTrack(localAudioTrack);
        }
        
        // Success!
        isReconnecting = false;
        setState('connected');
        console.log('[Vakkya] Reconnection successful');
        
        // Notify widget to restore form state if needed
        if (onStateChangeCallback) {
          onStateChangeCallback('reconnected');
        }
        
        return;
      } catch (err) {
        console.warn(`[Vakkya] Reconnection attempt ${attempt + 1} failed:`, err);
        
        if (attempt === maxAttempts - 1) {
          // All attempts failed
          isReconnecting = false;
          setState('error', 'Reconnection failed');
          console.error('[Vakkya] All reconnection attempts failed');
        }
      }
    }
  }

  /**
   * Disconnect from room and clean up
   */
  async function disconnect() {
    // Cancel any pending reconnection
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
    isReconnecting = false;
    
    // Detach and clean up remote audio track
    if (remoteAudioTrack) {
      remoteAudioTrack.detach();
      remoteAudioTrack = null;
    }
    
    // Unpublish and stop local track
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack = null;
    }

    // Disconnect from room
    if (room) {
      await room.disconnect();
      room = null;
    }

    // Release microphone
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      micStream = null;
    }

    if (state !== 'error') {
      setState('disconnected');
    }
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  function isConnected() {
    return state === 'connected';
  }

  /**
   * Get current state
   * @returns {ConnectionState}
   */
  function getState() {
    return state;
  }

  /**
   * Set callback for remote audio
   * @param {Function} callback
   */
  function onRemoteAudio(callback) {
    onRemoteAudioCallback = callback;
  }

  /**
   * Set callback for state changes
   * @param {Function} callback
   */
  function onStateChange(callback) {
    onStateChangeCallback = callback;
  }

  /**
   * Set callback for when a form is available
   * @param {Function} callback - Called with form schema when available
   */
  function onFormAvailable(callback) {
    onFormAvailableCallback = callback;
  }

  /**
   * Set callback for agent messages
   * Validates: Requirements 10.1, 10.2
   * @param {Function} callback - Called with AgentToWidgetMessage
   */
  function onAgentMessage(callback) {
    onAgentMessageCallback = callback;
  }

  /**
   * Set callback for user transcriptions
   * Requirements 3.2: Real-time transcription display
   * @param {Function} callback - Called with (content: string, isFinal: boolean)
   */
  function onTranscription(callback) {
    onTranscriptionCallback = callback;
  }

  /**
   * Get the active form (if any) - legacy single form
   * @returns {Object|null}
   */
  function getActiveForm() {
    return activeForm;
  }

  /**
   * Get all available forms for the project
   * Property 4: Multi-Form Availability
   * @returns {Object[]}
   */
  function getAvailableForms() {
    return availableForms;
  }

  /**
   * Check if forms have been loaded
   * @returns {boolean}
   */
  function areFormsLoaded() {
    return formsLoaded;
  }

  /**
   * Get form by ID from available forms
   * @param {string} formId
   * @returns {Object|null}
   */
  function getFormById(formId) {
    return availableForms.find(f => f.id === formId) || null;
  }

  return {
    connect,
    disconnect,
    isConnected,
    getState,
    onRemoteAudio,
    onStateChange,
    onFormAvailable,
    onAgentMessage,
    onTranscription,
    getActiveForm,
    getAvailableForms,
    areFormsLoaded,
    getFormById,
    // Data channel methods
    publishMessage,
    sendKeyboardInput,
    sendFieldConfirmed,
    sendFieldRejected,
    sendFormAbandoned,
    sendSubmissionApproved,
    sendEditRequested,
  };
}

// Export for testing
export { loadLiveKitSDK, validateToken, fetchActiveForm, fetchAllForms, clearFormCache, getCachedForms };
