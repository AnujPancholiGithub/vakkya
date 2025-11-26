# Vakkya Voice Widget

A single-line embeddable voice assistant that transforms any website into a voice-enabled experience.

## What It Does

The Vakkya widget adds a floating voice button to your website. When users click it:

1. **Requests microphone permission** - Prompts user for mic access
2. **Connects to voice AI** - Establishes real-time audio connection via LiveKit
3. **Enables voice conversation** - Users speak naturally, AI responds with voice
4. **Shows visual feedback** - Waveform visualization during conversation

## Quick Start

Add this single line before `</body>`:

```html
<script 
  src="https://cdn.vakkya.ai/widget.js" 
  data-token="YOUR_PROJECT_TOKEN">
</script>
```

That's it. A voice button appears in the bottom-right corner.

## Configuration Options

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-token` | Yes | Your project token from Vakkya dashboard |
| `data-api-url` | No | Custom API URL (default: `https://api.vakkya.ai`) |

## Use Case Examples

### 1. Documentation Site - Voice FAQ

Help users find answers without searching:

```html
<!-- docs.example.com -->
<html>
<head>
  <title>Product Documentation</title>
</head>
<body>
  <h1>Getting Started Guide</h1>
  <p>Your documentation content...</p>
  
  <!-- Voice assistant for docs -->
  <script 
    src="https://cdn.vakkya.ai/widget.js" 
    data-token="docs_project_token_here">
  </script>
</body>
</html>
```

**User experience:** Visitor clicks voice button → asks "How do I reset my password?" → AI responds with answer from your uploaded docs.

### 2. E-commerce - Product Assistant

Help shoppers find products:

```html
<!-- shop.example.com -->
<html>
<body>
  <div class="product-grid">
    <!-- Your products -->
  </div>
  
  <!-- Voice shopping assistant -->
  <script 
    src="https://cdn.vakkya.ai/widget.js" 
    data-token="shop_project_token_here">
  </script>
</body>
</html>
```

**User experience:** Visitor asks "Do you have running shoes under $100?" → AI responds with relevant products.

### 3. Service Business - Booking Assistant

Handle inquiries 24/7:

```html
<!-- clinic.example.com -->
<html>
<body>
  <h1>Welcome to City Dental</h1>
  <p>Book your appointment today</p>
  
  <!-- Voice booking assistant -->
  <script 
    src="https://cdn.vakkya.ai/widget.js" 
    data-token="clinic_project_token_here">
  </script>
</body>
</html>
```

**User experience:** Visitor asks "What are your hours?" or "Do you accept insurance?" → AI responds instantly.

### 4. SaaS Product - Support Widget

Reduce support tickets:

```html
<!-- app.example.com -->
<html>
<body>
  <div id="app">
    <!-- Your SaaS application -->
  </div>
  
  <!-- Voice support -->
  <script 
    src="https://cdn.vakkya.ai/widget.js" 
    data-token="saas_project_token_here">
  </script>
</body>
</html>
```

**User experience:** User asks "How do I export my data?" → AI walks them through the process.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Website                           │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  Page Content                        │   │
│   │                                                      │   │
│   │                                                      │   │
│   │                                                      │   │
│   │                                                      │   │
│   │                                          ┌───────┐   │   │
│   │                                          │  🎤   │   │   │
│   │                                          │ Voice │   │   │
│   │                                          │Button │   │   │
│   └─────────────────────────────────────────┴───────┴───┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Click
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Voice UI Expanded                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Voice Assistant                              [X]   │   │
│   │  ┌───────────────────────────────────────────────┐  │   │
│   │  │         ∿∿∿ Waveform Visualization ∿∿∿        │  │   │
│   │  └───────────────────────────────────────────────┘  │   │
│   │                    Listening...                     │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ User speaks
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  User Audio → STT → RAG Context → LLM → TTS → AI Response   │
└─────────────────────────────────────────────────────────────┘
```

## Widget States

| State | Description | Visual |
|-------|-------------|--------|
| **Idle** | Button visible, waiting for click | 🎤 floating button |
| **Connecting** | Establishing connection | "Connecting..." |
| **Listening** | Ready for user speech | "Listening..." + waveform |
| **Speaking** | AI is responding | "Speaking..." + waveform |
| **Error** | Something went wrong | Error message displayed |

## Technical Details

- **Bundle size:** ~5KB gzipped (LiveKit SDK loaded on-demand)
- **Shadow DOM:** Widget styles are isolated, won't affect your site
- **Z-index:** Maximum (2147483647) to stay on top
- **Mobile responsive:** Adapts to screen size
- **Accessibility:** ARIA labels, keyboard navigation

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 14+ |
| Edge | 80+ |

Requires WebRTC support for voice functionality.

## Getting Your Token

1. Sign up at [dashboard.vakkya.ai](https://dashboard.vakkya.ai)
2. Create a new project
3. Upload your documents (PDF, TXT, MD)
4. Copy the project token
5. Add the widget script to your site

## Development/Testing

For local development, override the API URL:

```html
<script 
  src="https://cdn.vakkya.ai/widget.js" 
  data-token="your_token"
  data-api-url="http://localhost:3000">
</script>
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget doesn't appear | Check browser console for errors, verify token is set |
| "Microphone access denied" | User must allow mic permission |
| "Connection failed" | Check network, verify API is reachable |
| "Invalid configuration" | Verify `data-token` is correct |

## Security

- All connections over HTTPS
- Token validated server-side
- Domain whitelisting supported
- No user data stored in widget
