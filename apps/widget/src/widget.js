/**
 * Main widget class - orchestrates all widget functionality
 */

import { parseConfig } from './config.js';
import { createContainer, destroyContainer } from './container.js';
import { createButton, requestMicrophonePermission, releaseMicrophone } from './button.js';
import { createVoiceUI } from './voice-ui.js';
import { createFormUI } from './form-ui.js';
import { createWaveformRenderer, generateIdleData } from './waveform.js';
import { createAudioProcessor } from './audio-processor.js';
import { createLiveKitManager } from './livekit-manager.js';
import { safeExecute } from './errors.js';

/**
 * @typedef {Object} WidgetState
 * @property {'idle'|'connecting'|'active'|'error'} status
 * @property {string|null} error
 * @property {'voice'|'form'|null} mode - Current interaction mode
 */

export class VakkyaWidget {
  constructor(scriptElement) {
    this.config = parseConfig(scriptElement);
    this.container = null;
    this.host = null;
    this.shadow = null;
    
    /** @type {WidgetState} */
    this.state = {
      status: 'idle',
      error: null,
      mode: null,
    };
    
    this.initialized = false;
    this._animating = false;
    
    // Components
    this.button = null;
    this.voiceUI = null;
    this.formUI = null;
    this.formSchema = null;
    this.waveformRenderer = null;
    this.audioProcessor = null;
    this.livekitManager = null;
    this.micStream = null;
  }

  /**
   * Initialize the widget
   * @returns {boolean} True if initialization succeeded
   */
  init() {
    if (this.initialized) {
      console.warn('[Vakkya] Widget already initialized');
      return true;
    }

    if (!this.config) {
      this.state.status = 'error';
      this.state.error = 'Invalid configuration';
      return false;
    }

    try {
      const { host, shadow, container } = createContainer();
      this.host = host;
      this.shadow = shadow;
      this.container = container;
      
      // Create and add button
      this.button = createButton(shadow);
      this.button.addEventListener('click', () => this.handleButtonClick());
      container.appendChild(this.button);
      
      // Create LiveKit manager
      this.livekitManager = createLiveKitManager(this.config.token, this.config.apiUrl);
      this.livekitManager.onStateChange((state, error) => this.handleConnectionStateChange(state, error));
      this.livekitManager.onRemoteAudio((audioElement) => this.handleRemoteAudio(audioElement));
      
      this.initialized = true;
      return true;
    } catch (err) {
      console.error('[Vakkya] Failed to initialize widget:', err);
      this.state.status = 'error';
      this.state.error = 'Initialization failed';
      return false;
    }
  }

  /**
   * Handle button click - expand to voice UI
   */
  async handleButtonClick() {
    if (this.state.status === 'connecting' || this.state.status === 'active') {
      return;
    }

    // Allow retry from error state
    if (this.state.status === 'error') {
      this.state.status = 'idle';
      this.state.error = null;
    }

    await safeExecute(async () => {
      // Request microphone permission
      this.micStream = await requestMicrophonePermission();
      
      if (!this.micStream) {
        this.showError('mic_denied');
        return;
      }

      // Show voice UI
      this.showVoiceUI();
      
      // Connect audio processor
      this.audioProcessor = createAudioProcessor();
      this.audioProcessor.connect(this.micStream);
      
      // Start waveform animation
      this.startWaveformAnimation();
      
      // Connect to LiveKit
      this.state.status = 'connecting';
      const connected = await this.livekitManager.connect(this.micStream);
      
      if (!connected) {
        // Error will be handled by onStateChange callback
        return;
      }
      
      this.state.status = 'active';
    }, (error) => {
      this.showError(error.code);
    });
  }

  /**
   * Show the voice UI
   */
  showVoiceUI() {
    if (this.voiceUI) return;
    
    // Hide button
    if (this.button) {
      this.button.style.display = 'none';
    }
    
    // Create voice UI
    this.voiceUI = createVoiceUI(this.shadow, () => this.handleClose());
    this.container.appendChild(this.voiceUI.element);
    
    // Create waveform renderer
    this.waveformRenderer = createWaveformRenderer(this.voiceUI.canvas);
  }

  /**
   * Start waveform animation loop
   */
  startWaveformAnimation() {
    if (!this.waveformRenderer) return;
    
    this.waveformRenderer.start();
    this._animating = true;
    
    // Update waveform with audio data
    const updateWaveform = () => {
      if (!this._animating || !this.waveformRenderer) return;
      
      if (this.audioProcessor && this.audioProcessor.isConnected()) {
        this.waveformRenderer.setData(this.audioProcessor.getFrequencyData());
      } else {
        this.waveformRenderer.setData(generateIdleData());
      }
      
      if (this._animating && (this.state.status === 'active' || this.state.status === 'connecting')) {
        requestAnimationFrame(updateWaveform);
      }
    };
    
    requestAnimationFrame(updateWaveform);
  }

  /**
   * Handle connection state changes
   * @param {string} state
   * @param {string} [error]
   */
  handleConnectionStateChange(state, error) {
    if (this.voiceUI) {
      if (state === 'validating' || state === 'connecting') {
        this.voiceUI.setStatus('connecting');
      } else if (state === 'connected') {
        this.voiceUI.setStatus('listening');
      } else if (state === 'error') {
        this.voiceUI.showError(error || 'Connection failed');
        this.state.status = 'error';
        this.state.error = error;
      }
    }
  }

  /**
   * Handle remote audio from agent
   * @param {HTMLAudioElement} audioElement
   */
  handleRemoteAudio(audioElement) {
    if (this.voiceUI) {
      this.voiceUI.setStatus('speaking');
    }
    
    // When audio ends, go back to listening
    audioElement.addEventListener('ended', () => {
      if (this.voiceUI && this.state.status === 'active') {
        this.voiceUI.setStatus('listening');
      }
    });
  }

  /**
   * Handle close button click
   */
  async handleClose() {
    // Stop animation loop first
    this._animating = false;
    
    // Disconnect from LiveKit
    if (this.livekitManager) {
      await this.livekitManager.disconnect();
    }
    
    // Stop waveform
    if (this.waveformRenderer) {
      this.waveformRenderer.destroy();
      this.waveformRenderer = null;
    }
    
    // Disconnect audio processor
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }
    
    // Release microphone
    if (this.micStream) {
      releaseMicrophone(this.micStream);
      this.micStream = null;
    }
    
    // Remove voice UI
    if (this.voiceUI) {
      this.voiceUI.element.remove();
      this.voiceUI = null;
    }
    
    // Remove form UI
    if (this.formUI) {
      this.formUI.element.remove();
      this.formUI = null;
    }
    
    // Show button again
    if (this.button) {
      this.button.style.display = 'flex';
    }
    
    this.state.status = 'idle';
    this.state.error = null;
    this.state.mode = null;
  }

  /**
   * Show error in UI
   * @param {string} errorCode
   */
  showError(errorCode) {
    const messages = {
      mic_denied: 'Microphone access denied',
      mic_not_found: 'No microphone found',
      connection_failed: 'Connection failed',
      invalid_token: 'Invalid configuration',
      sdk_load_failed: 'Failed to load',
      unknown: 'Something went wrong',
    };
    
    if (this.voiceUI) {
      this.voiceUI.showError(messages[errorCode] || messages.unknown);
    }
    
    this.state.status = 'error';
    this.state.error = errorCode;
  }

  /**
   * Destroy the widget and clean up resources
   */
  async destroy() {
    await this.handleClose();
    
    if (this.host) {
      destroyContainer(this.host);
      this.host = null;
      this.shadow = null;
      this.container = null;
    }
    
    this.button = null;
    this.livekitManager = null;
    this.formSchema = null;
    this.initialized = false;
    this.state = { status: 'idle', error: null, mode: null };
  }

  /**
   * Show form UI for conversational forms
   * @param {Object} schema - Form schema from API
   */
  showFormUI(schema) {
    if (this.formUI) return;
    
    this.formSchema = schema;
    this.state.mode = 'form';
    
    // Hide button
    if (this.button) {
      this.button.style.display = 'none';
    }
    
    // Hide voice UI if showing
    if (this.voiceUI) {
      this.voiceUI.element.style.display = 'none';
    }
    
    // Create form UI
    this.formUI = createFormUI(this.shadow, schema, {
      onClose: () => this.handleClose(),
      onSubmit: (answers) => this.handleFormSubmit(answers),
      onAnswer: (fieldName, value) => this.handleFormAnswer(fieldName, value),
    });
    
    this.container.appendChild(this.formUI.element);
  }

  /**
   * Handle form submission
   * @param {Object} answers - Collected form answers
   */
  async handleFormSubmit(answers) {
    // Send form data to voice agent via data channel if connected
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.sendFormData({
        type: 'form_complete',
        formId: this.formSchema?.id,
        answers,
      });
    }
  }

  /**
   * Handle individual form answer
   * @param {string} fieldName
   * @param {any} value
   */
  handleFormAnswer(fieldName, value) {
    // Send answer to voice agent via data channel
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.sendFormData({
        type: 'form_answer',
        fieldName,
        value,
      });
    }
  }

  /**
   * Send form data via LiveKit data channel
   * @param {Object} data
   */
  sendFormData(data) {
    if (!this.livekitManager) return;
    
    try {
      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify(data));
      // Note: This requires adding publishData method to livekitManager
      // For now, form data is handled locally
    } catch (err) {
      console.warn('[Vakkya] Failed to send form data:', err);
    }
  }

  /**
   * Set form answer from voice input (called by voice agent)
   * @param {string} fieldName
   * @param {any} value
   */
  setFormAnswer(fieldName, value) {
    if (this.formUI) {
      this.formUI.setAnswer(fieldName, value);
    }
  }

  /**
   * Get current form field (for voice agent coordination)
   * @returns {Object|null}
   */
  getCurrentFormField() {
    return this.formUI ? this.formUI.getCurrentField() : null;
  }

  /**
   * Get current widget state
   * @returns {WidgetState}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get widget configuration
   * @returns {import('./config.js').WidgetConfig|null}
   */
  getConfig() {
    return this.config ? { ...this.config } : null;
  }
}
