/**
 * Shadow DOM container for widget isolation
 * Ensures widget styles don't leak to/from host page
 */

const BASE_STYLES = `
  :host {
    all: initial;
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: #1a1a1a;
  }
  
  *, *::before, *::after {
    box-sizing: border-box;
  }
  
  .vakkya-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    left: auto;
    z-index: 2147483647;
  }
  
  /* Position: bottom-left */
  :host([data-position="bottom-left"]) .vakkya-widget {
    right: auto;
    left: 20px;
  }
  
  @media (max-width: 480px) {
    .vakkya-widget {
      bottom: 16px;
      right: 16px;
      left: auto;
    }
    
    :host([data-position="bottom-left"]) .vakkya-widget {
      right: auto;
      left: 16px;
    }
  }
`;

/**
 * Create the Shadow DOM container for the widget
 * @returns {{ host: HTMLElement, shadow: ShadowRoot, container: HTMLElement }}
 */
export function createContainer() {
  // Create host element
  const host = document.createElement('div');
  host.id = 'vakkya-widget-host';
  
  // Attach shadow root for style isolation
  const shadow = host.attachShadow({ mode: 'open' });
  
  // Inject base styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = BASE_STYLES;
  shadow.appendChild(styleSheet);
  
  // Create main container
  const container = document.createElement('div');
  container.className = 'vakkya-widget';
  shadow.appendChild(container);
  
  // Append to body
  document.body.appendChild(host);
  
  return { host, shadow, container };
}

/**
 * Remove the widget container from the DOM
 * @param {HTMLElement} host - The host element to remove
 */
export function destroyContainer(host) {
  if (host && host.parentNode) {
    host.parentNode.removeChild(host);
  }
}
