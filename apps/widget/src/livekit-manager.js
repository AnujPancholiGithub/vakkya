/**
 * LiveKit manager - handles room connection and audio streaming
 * Uses dynamic import to lazy-load LiveKit SDK
 */

import { AUDIO_CONSTRAINTS } from './config.js';

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
  
  /** @type {import('livekit-client').RemoteAudioTrack|null} */
  let remoteAudioTrack = null;

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
      // projectId available in tokenData if needed for future features

      // Step 2: Load LiveKit SDK
      setState('connecting');
      const lk = await loadLiveKitSDK();

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
      setState('disconnected');
    });

    // Handle connection quality changes
    room.on(lk.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant.isLocal && quality === lk.ConnectionQuality.Poor) {
        console.warn('[Vakkya] Poor connection quality');
      }
    });
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
      const pageContext = {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(pageContext));
      
      room.localParticipant.publishData(data, { reliable: true });
    } catch (err) {
      console.warn('[Vakkya] Failed to send page context:', err);
    }
  }

  /**
   * Disconnect from room and clean up
   */
  async function disconnect() {
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

  return {
    connect,
    disconnect,
    isConnected,
    getState,
    onRemoteAudio,
    onStateChange,
  };
}

// Export for testing
export { loadLiveKitSDK, validateToken };
