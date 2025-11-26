# Vakkya Dashboard

Developer console for managing voice agent projects.

## Development

```bash
pnpm install
pnpm dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | API server URL | Yes |

## Deployment (Cloudflare Pages)

1. Connect GitHub repository to Cloudflare Pages
2. Configure build settings:
   - Build command: `pnpm --filter @vakkya/dashboard build`
   - Build output directory: `apps/dashboard/.next`
   - Root directory: `/`
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: Production API URL

## Testing

```bash
pnpm test
```
