# Vakkya Widget

Embeddable voice assistant widget for any website.

## Integration

Add this single line to your website:

```html
<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" data-token="your-project-token"></script>
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

### Required Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-token` | Your project token from the dashboard | `data-token="your-project-token"` |

### Optional Attributes

| Attribute | Default | Options | Description |
|-----------|---------|---------|-------------|
| `data-api-url` | `https://api.vakkya.com` | Any URL | Custom API URL (useful for development) |
| `data-accent-color` | `#3B82F6` | Any valid CSS color | Primary accent color for the widget |
| `data-theme` | `light` | `light`, `dark` | Widget theme mode |
| `data-position` | `bottom-right` | `bottom-right`, `bottom-left` | Widget button position |

### Color Customization Examples

The `data-accent-color` attribute accepts any valid CSS color format:

**Hex Colors:**
```html
<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" 
  data-token="your-token" 
  data-accent-color="#8B5CF6"></script>
```

**RGB/RGBA:**
```html
<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" 
  data-token="your-token" 
  data-accent-color="rgba(59, 130, 246, 0.9)"></script>
```

**HSL/HSLA:**
```html
<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" 
  data-token="your-token" 
  data-accent-color="hsl(217, 91%, 60%)"></script>
```

**Named Colors:**
```html
<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" 
  data-token="your-token" 
  data-accent-color="purple"></script>
```

### Complete Configuration Examples

**Purple Dark Theme:**
```html
<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" 
  data-token="your-token"
  data-accent-color="#8B5CF6"
  data-theme="dark"
  data-position="bottom-right"></script>
```

**Green Light Theme (Left Position):**
```html
<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" 
  data-token="your-token"
  data-accent-color="#10B981"
  data-theme="light"
  data-position="bottom-left"></script>
```

### Demo Files

The project includes several demo files showcasing different configurations:

- `demo-index.html` - Index page with links to all demos
- `demo.html` - Complete documentation with all options
- `demo-purple-dark.html` - Purple accent with dark theme
- `demo-pink-light.html` - Pink accent with light theme
- `demo-green-left.html` - Green accent with left position
- `demo-orange-dark.html` - Orange accent with dark theme

Run the development server and visit these files to see the different configurations in action.

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
