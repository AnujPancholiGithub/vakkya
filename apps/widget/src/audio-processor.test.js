import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAudioProcessor } from './audio-processor.js';

describe('createAudioProcessor', () => {
  let mockAudioContext;
  let mockAnalyser;
  let mockSourceNode;
  let originalAudioContext;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockAnalyser = {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: 64,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
      }),
    };

    mockSourceNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockAudioContext = {
      state: 'running',
      createAnalyser: vi.fn(() => mockAnalyser),
      createMediaStreamSource: vi.fn(() => mockSourceNode),
      close: vi.fn(() => Promise.resolve()),
    };

    originalAudioContext = window.AudioContext;
    window.AudioContext = vi.fn(() => mockAudioContext);
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    vi.restoreAllMocks();
  });

  it('should create processor with required methods', () => {
    const processor = createAudioProcessor();

    expect(processor.connect).toBeInstanceOf(Function);
    expect(processor.disconnect).toBeInstanceOf(Function);
    expect(processor.getFrequencyData).toBeInstanceOf(Function);
    expect(processor.isConnected).toBeInstanceOf(Function);
  });

  it('should not be connected initially', () => {
    const processor = createAudioProcessor();

    expect(processor.isConnected()).toBe(false);
  });

  it('should connect to MediaStream', () => {
    const processor = createAudioProcessor();
    const mockStream = { getTracks: () => [] };

    const result = processor.connect(mockStream);

    expect(result).toBe(true);
    expect(processor.isConnected()).toBe(true);
  });

  it('should create AudioContext on connect', () => {
    const processor = createAudioProcessor();
    const mockStream = { getTracks: () => [] };

    processor.connect(mockStream);

    expect(window.AudioContext).toHaveBeenCalled();
  });

  it('should create AnalyserNode with correct settings', () => {
    const processor = createAudioProcessor();
    const mockStream = { getTracks: () => [] };

    processor.connect(mockStream);

    expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    expect(mockAnalyser.fftSize).toBe(128);
    expect(mockAnalyser.smoothingTimeConstant).toBe(0.8);
  });

  it('should connect stream source to analyser', () => {
    const processor = createAudioProcessor();
    const mockStream = { getTracks: () => [] };

    processor.connect(mockStream);

    expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
    expect(mockSourceNode.connect).toHaveBeenCalledWith(mockAnalyser);
  });

  it('should return true and warn if already connected', () => {
    const processor = createAudioProcessor();
    const mockStream = { getTracks: () => [] };

    processor.connect(mockStream);
    const result = processor.connect(mockStream);

    expect(result).toBe(true);
    expect(console.warn).toHaveBeenCalledWith('[Vakkya] Audio processor already connected');
  });

  it('should disconnect and clean up resources', () => {
    const processor = createAudioProcessor();
    const mockStream = { getTracks: () => [] };

    processor.connect(mockStream);
    processor.disconnect();

    expect(mockSourceNode.disconnect).toHaveBeenCalled();
    expect(mockAnalyser.disconnect).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
    expect(processor.isConnected()).toBe(false);
  });

  it('should handle disconnect when not connected', () => {
    const processor = createAudioProcessor();

    expect(() => processor.disconnect()).not.toThrow();
  });

  it('should return frequency data when connected', () => {
    const processor = createAudioProcessor();
    const mockStream = { getTracks: () => [] };

    processor.connect(mockStream);
    const data = processor.getFrequencyData();

    expect(data).toBeInstanceOf(Uint8Array);
    expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled();
  });

  it('should return empty array when not connected', () => {
    const processor = createAudioProcessor();

    const data = processor.getFrequencyData();

    expect(data).toBeInstanceOf(Uint8Array);
    expect(data.length).toBe(64);
  });

  it('should handle AudioContext creation error', () => {
    window.AudioContext = vi.fn(() => {
      throw new Error('AudioContext not supported');
    });

    const processor = createAudioProcessor();
    const mockStream = { getTracks: () => [] };

    const result = processor.connect(mockStream);

    expect(result).toBe(false);
    expect(processor.isConnected()).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});


