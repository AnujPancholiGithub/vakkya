# Design Document - Widget (Simplified MVP)

## Overview

The Widget is a minimal vanilla JavaScript embeddable component that provides voice interaction. It uses Shadow DOM for style isolation, lazy-loads LiveKit SDK, and provides a simple voice UI with waveform visualization. This MVP focuses on core voice functionality without advanced features.

**Key Design Goals:**
- Minimal bundle size (<100KB gzipped)
- Lazy load LiveKit SDK on button click
- Shadow DOM for style isolation
- Simple waveform visualization
- Send page URL only (no complex context extraction)

## Architecture

### Component Lifecycle

```
1. Page Load
   ├─ Parse data-token attribute
   ├─ Create Shadow DOM
   ├─ Render floating button
   └─ Wait for click

2. Button Click
   ├─ Request microphone permission
   ├─ Lazy load LiveKit SDK
   ├─ Validate token with API
   ├─ Connect to LiveKit room
   ├─ Send page URL via data channel
   └─ Start listening

3. Voice Interaction
   ├─ Capture audio from microphone
   ├─ Send audio to LiveKit
   ├─ Receive audio from LiveKit
   ├─ Play audio through speakers
   └─ Update waveform

4. Session End
   ├─ Disconnect from LiveKit
   ├─ Release microphone
   └─ Collapse to button
```

## Components and Interfaces

### 1. Widget Initializer

**Purpose:** Parse config and bootstrap widget.

```javascript
class WidgetInitializer {
  constructor() {
    this.config = this.parseConfig();
    this.shadowRoot = this.createShadowDOM();
  }

  parseConfig() {
    return {
      token: string
    };
  }
}
```

### 2. Button Component

**Purpose:** Render floating button.

```javascript
class ButtonComponent {
  render() {
    // Create button element
    // Fixed bottom-right position
    // Blue color (#3B82F6)
  }

  onClick() {
    // Request microphone
    // Expand to voice UI
  }
}
```

### 3. Voice UI Component

**Purpose:** Render voice interface with waveform.

```javascript
class VoiceUIComponent {
  render() {
    // Create UI container
    // Render waveform canvas
    // Render close button
  }

  updateWaveform(audioData) {
    // Draw waveform on canvas
  }

  onClose() {
    // Disconnect and collapse
  }
}
```

### 4. LiveKit Manager

**Purpose:** Handle LiveKit connection and audio.

```javascript
class LiveKitManager {
  async connect(token) {
    // Lazy load LiveKit SDK
    const { Room } = await import('livekit-client');
    // Connect to room
  }

  async publishAudio(stream) {
    // Publish microphone audio
  }

  subscribeToAudio(callback) {
    // Subscribe to agent audio
  }

  sendData(data) {
    // Send page URL via data channel
  }

  disconnect() {
    // Clean up
  }
}
```

### 5. Audio Processor

**Purpose:** Process audio for waveform.

```javascript
class AudioProcessor {
  constructor() {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
  }

  getWaveformData() {
    // Get frequency data for visualization
  }
}
```

### 6. Error Handler

**Purpose:** Handle errors gracefully.

```javascript
class ErrorHandler {
  handleMicrophoneError(error) {
    // Show permission error
  }

  handleConnectionError(error) {
    // Show connection error
  }

  handleTokenError(error) {
    // Show invalid token error
  }
}
```

## Data Models

### Widget Configuration

```javascript
interface WidgetConfig {
  token: string; // Required
}
```

### Widget State

```javascript
interface WidgetState {
  status: 'collapsed' | 'connecting' | 'connected' | 'error';
  error: string | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Automatic initialization
*For any* page with widget script tag containing data-token, the widget should initialize and render button on page load.
**Validates: Requirements 1.1**

### Property 2: Microphone permission requirement
*For any* voice session start, the widget should request microphone permission before connecting to LiveKit.
**Validates: Requirements 2.3**

### Property 3: Permission denial handling
*For any* microphone permission denial, the widget should display error and not connect to LiveKit.
**Validates: Requirements 2.4**

### Property 4: Graceful disconnection
*For any* session end, the widget should disconnect from LiveKit and release microphone.
**Validates: Requirements 5.1, 5.4**

### Property 5: Invalid token handling
*For any* invalid widget token, the widget should display error and not attempt LiveKit connection.
**Validates: Requirements 6.1**

### Property 6: Error isolation
*For any* widget error, the host page should continue functioning normally.
**Validates: Requirements 6.5**

### Property 7: Bundle size limit
*For any* widget build, the gzipped bundle size should be less than 100KB (excluding lazy-loaded LiveKit SDK).
**Validates: Requirements 7.1**

### Property 8: Lazy loading LiveKit
*For any* page load, LiveKit SDK should only load when user clicks button.
**Validates: Requirements 7.2**

## Error Handling

### Error Categories

**Permission Errors:**
- Microphone permission denied
- Microphone not available

**Connection Errors:**
- Invalid widget token
- LiveKit connection failed
- Network disconnection

**Configuration Errors:**
- Missing data-token attribute

### Error Handling Strategy

- Show clear error messages in UI
- Log errors to console
- Never crash host page
- Provide retry options where applicable

## Testing Strategy

### Unit Testing

**Framework:** Vitest with jsdom

**Coverage:**
- Configuration parsing
- State management
- Error handling

### Property-Based Testing

**Framework:** fast-check

**Configuration:** Minimum 100 iterations

**Tests:**
- Property 1: Automatic initialization
- Property 7: Bundle size limit

### Integration Testing

**Framework:** Playwright

**Coverage:**
- Full widget lifecycle
- Microphone permission flow
- LiveKit connection
- Error scenarios

## Performance Considerations

### Bundle Size Optimization

- Use Rollup for tree-shaking
- Minify with Terser
- Lazy load LiveKit SDK (~80KB)
- Target: <20KB initial, <100KB total

### Runtime Performance

- Debounce events where needed
- Use requestAnimationFrame for waveform
- Clean up listeners on disconnect

## Deployment

### Build Configuration

**Vite:**
```javascript
export default {
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'VakkyaWidget',
      fileName: 'widget',
      formats: ['iife']
    },
    minify: 'terser'
  }
}
```

### CDN Deployment

- Upload to Cloudflare R2
- Enable CDN
- Set cache TTL: 1 hour
- Enable gzip compression
- Set CORS headers

### URL Structure

```
https://cdn.vakkya.ai/widget.js
```
