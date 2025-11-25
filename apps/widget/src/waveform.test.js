import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWaveformRenderer, generateIdleData } from './waveform.js';

describe('createWaveformRenderer', () => {
  let canvas;
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      clearRect: vi.fn(),
      fillStyle: '',
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
    };
    
    canvas = document.createElement('canvas');
    canvas.width = 288;
    canvas.height = 80;
    
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create renderer with required methods', () => {
    const renderer = createWaveformRenderer(canvas);
    
    expect(renderer.start).toBeInstanceOf(Function);
    expect(renderer.stop).toBeInstanceOf(Function);
    expect(renderer.setData).toBeInstanceOf(Function);
    expect(renderer.destroy).toBeInstanceOf(Function);
  });

  it('should get 2d context from canvas', () => {
    createWaveformRenderer(canvas);
    
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
  });

  it('should start animation loop', () => {
    const mockRAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    
    const renderer = createWaveformRenderer(canvas);
    renderer.start();
    
    expect(mockRAF).toHaveBeenCalled();
    
    renderer.stop();
  });

  it('should stop animation loop', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    const mockCAF = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    
    const renderer = createWaveformRenderer(canvas);
    renderer.start();
    renderer.stop();
    
    expect(mockCAF).toHaveBeenCalled();
  });

  it('should not start multiple animation loops', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    
    const renderer = createWaveformRenderer(canvas);
    renderer.start();
    renderer.start(); // Second call should be ignored
    
    // Only one initial call (subsequent calls are from the loop itself)
    expect(rafSpy).toHaveBeenCalledTimes(1);
    
    renderer.stop();
  });

  it('should accept frequency data', () => {
    const renderer = createWaveformRenderer(canvas);
    const data = new Uint8Array([100, 150, 200, 50]);
    
    expect(() => renderer.setData(data)).not.toThrow();
  });

  it('should handle empty data', () => {
    const renderer = createWaveformRenderer(canvas);
    
    expect(() => renderer.setData(new Uint8Array(0))).not.toThrow();
  });

  it('should handle null data', () => {
    const renderer = createWaveformRenderer(canvas);
    
    expect(() => renderer.setData(null)).not.toThrow();
  });

  it('should clean up on destroy', () => {
    const mockCAF = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    
    const renderer = createWaveformRenderer(canvas);
    renderer.start();
    renderer.destroy();
    
    expect(mockCAF).toHaveBeenCalled();
  });

  it('should clear canvas on each frame', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    
    const renderer = createWaveformRenderer(canvas);
    renderer.start();
    
    // Manually trigger a draw by calling the animation
    // The first requestAnimationFrame call triggers the draw
    expect(mockCtx.clearRect).toHaveBeenCalled();
    
    renderer.stop();
  });
});

describe('generateIdleData', () => {
  it('should return Uint8Array', () => {
    const data = generateIdleData();
    
    expect(data).toBeInstanceOf(Uint8Array);
  });

  it('should return array with 32 elements', () => {
    const data = generateIdleData();
    
    expect(data.length).toBe(32);
  });

  it('should return values within expected range', () => {
    const data = generateIdleData();
    
    for (const value of data) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
    }
  });

  it('should generate different values over time', async () => {
    const data1 = generateIdleData();
    
    // Wait a bit for time-based animation to change
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const data2 = generateIdleData();
    
    // At least some values should be different
    let hasDifference = false;
    for (let i = 0; i < data1.length; i++) {
      if (data1[i] !== data2[i]) {
        hasDifference = true;
        break;
      }
    }
    expect(hasDifference).toBe(true);
  });
});
