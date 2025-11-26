/**
 * Waveform visualization using Canvas API
 * Displays audio levels as animated bars
 */

const WAVEFORM_COLOR = '#FFFFFF';
const BAR_COUNT = 32;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 4;
const IDLE_MIN_VALUE = 20;
const IDLE_MAX_VALUE = 60;

/**
 * @typedef {Object} WaveformRenderer
 * @property {Function} start - Start animation loop
 * @property {Function} stop - Stop animation loop
 * @property {Function} setData - Update frequency data
 * @property {Function} destroy - Clean up resources
 */

/**
 * Create a waveform renderer for the given canvas
 * @param {HTMLCanvasElement} canvas
 * @returns {WaveformRenderer}
 */
export function createWaveformRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let animationId = null;
  let frequencyData = new Uint8Array(BAR_COUNT);
  let isRunning = false;
  
  /**
   * Draw a single frame
   */
  function draw() {
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = (width - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw bars
    ctx.fillStyle = WAVEFORM_COLOR;
    
    for (let i = 0; i < BAR_COUNT; i++) {
      const value = frequencyData[i] || 0;
      const normalizedValue = value / 255;
      const barHeight = Math.max(MIN_BAR_HEIGHT, normalizedValue * (height - 8));
      
      const x = i * (barWidth + BAR_GAP);
      const y = (height - barHeight) / 2;
      
      // Draw rounded bar
      const radius = Math.min(barWidth / 2, 3);
      drawRoundedRect(ctx, x, y, barWidth, barHeight, radius);
    }
  }
  
  /**
   * Animation loop
   */
  function animate() {
    if (!isRunning) return;
    
    draw();
    animationId = requestAnimationFrame(animate);
  }
  
  /**
   * Start the animation loop
   */
  function start() {
    if (isRunning) return;
    isRunning = true;
    animate();
  }
  
  /**
   * Stop the animation loop
   */
  function stop() {
    isRunning = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }
  
  /**
   * Update frequency data for visualization
   * @param {Uint8Array} data - Frequency data from analyser
   */
  function setData(data) {
    if (data && data.length > 0) {
      // Resample to BAR_COUNT if needed
      if (data.length !== BAR_COUNT) {
        const step = data.length / BAR_COUNT;
        for (let i = 0; i < BAR_COUNT; i++) {
          frequencyData[i] = data[Math.floor(i * step)];
        }
      } else {
        frequencyData.set(data);
      }
    }
  }
  
  /**
   * Clean up resources
   */
  function destroy() {
    stop();
    frequencyData = new Uint8Array(0);
  }
  
  return { start, stop, setData, destroy };
}

/**
 * Draw a rounded rectangle
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Generate idle animation data (subtle movement when not speaking)
 * @returns {Uint8Array}
 */
export function generateIdleData() {
  const data = new Uint8Array(BAR_COUNT);
  const time = Date.now() / 1000;
  
  for (let i = 0; i < BAR_COUNT; i++) {
    // Create gentle wave pattern
    const wave = Math.sin(time * 2 + i * 0.3) * 0.5 + 0.5;
    data[i] = Math.floor(wave * (IDLE_MAX_VALUE - IDLE_MIN_VALUE) + IDLE_MIN_VALUE);
  }
  
  return data;
}
