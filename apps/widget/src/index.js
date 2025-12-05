/**
 * Vakkya Widget - Embeddable voice assistant
 * 
 * Usage:
 * <script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" data-token="your-project-token"></script>
 */

import { VakkyaWidget } from './widget.js';
import { findWidgetScript } from './config.js';

(function() {
  'use strict';
  
  try {
    // Find the script tag that loaded this widget
    const scriptElement = document.currentScript || findWidgetScript();
    
    if (!scriptElement) {
      console.error('[Vakkya] Widget must be loaded via script tag with data-token attribute');
      return;
    }
    
    // Create and initialize widget
    const widget = new VakkyaWidget(scriptElement);
    
    if (!widget.init()) {
      console.error('[Vakkya] Widget initialization failed');
      return;
    }
    
    // Expose widget instance for debugging (development only)
    if (typeof window !== 'undefined') {
      window.__VAKKYA_WIDGET__ = widget;
    }
    
  } catch (err) {
    // Never crash the host page
    console.error('[Vakkya] Widget error:', err);
  }
})();
