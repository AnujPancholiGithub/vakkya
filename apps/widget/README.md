# Vakkya Widget

Embeddable voice assistant widget for any website.

## Integration

Add this single line to your website:

```html
<script src="https://cdn.vakkya.ai/widget.js" data-token="your-project-token"></script>
```

The widget will appear as a floating button in the bottom-right corner.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Configuration

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-token` | Yes | Your project token from the dashboard |
| `data-api-url` | No | Custom API URL (default: https://api.vakkya.ai) |

## Bundle Size

- Widget core: ~5KB gzipped
- LiveKit SDK: ~120KB (loaded on-demand from CDN)

The widget only loads the LiveKit SDK when the user clicks the voice button, keeping initial page load fast.

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

Requires WebRTC support for voice functionality.

## Deployment

```bash
# Deploy to Cloudflare R2
./scripts/deploy.sh
```

Requires `wrangler` CLI and Cloudflare account configuration.
