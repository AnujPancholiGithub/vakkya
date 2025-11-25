/**
 * Audio processor using Web Audio API
 * Analyzes microphone input for waveform visualization
 */

/**
 * @typedef {Object} AudioProcessor
 * @property {Function} connect - Connect a MediaStream
 * @property {Function} disconnect - Disconnect and clean up
 * @property {Function} getFrequencyData - Get current frequency data
 * @property {Function} isConnected - Check if connected
 */

/**
 * Create an audio processor for analyzing microphone input
 * @returns {AudioProcessor}
 */
export function createAudioProcessor() {
  /** @type {AudioContext|null} */
  let audioContext = null;
  
  /** @type {AnalyserNode|null} */
  let analyser = null;
  
  /** @type {MediaStreamAudioSourceNode|null} */
  let sourceNode = null;
  
  /** @type {Uint8Array|null} */
  let frequencyData = null;
  
  let connected = false;

  /**
   * Connect a MediaStream for analysis
   * @param {MediaStream} stream - Microphone stream
   * @returns {boolean} True if connected successfully
   */
  function connect(stream) {
    if (connected) {
      console.warn('[Vakkya] Audio processor already connected');
      return true;
    }

    try {
      // Create audio context
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser node
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128; // Small FFT for performance
      analyser.smoothingTimeConstant = 0.8;
      
      // Create frequency data buffer
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      
      // Connect stream to analyser
      sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);
      
      connected = true;
      return true;
    } catch (err) {
      console.error('[Vakkya] Failed to connect audio processor:', err);
      disconnect();
      return false;
    }
  }

  /**
   * Disconnect and clean up resources
   */
  function disconnect() {
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    
    if (analyser) {
      analyser.disconnect();
      analyser = null;
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    
    frequencyData = null;
    connected = false;
  }

  /**
   * Get current frequency data for visualization
   * @returns {Uint8Array} Frequency data array
   */
  function getFrequencyData() {
    if (!analyser || !frequencyData) {
      return new Uint8Array(64);
    }
    
    analyser.getByteFrequencyData(frequencyData);
    return frequencyData;
  }

  /**
   * Check if processor is connected
   * @returns {boolean}
   */
  function isConnected() {
    return connected;
  }

  return {
    connect,
    disconnect,
    getFrequencyData,
    isConnected,
  };
}


