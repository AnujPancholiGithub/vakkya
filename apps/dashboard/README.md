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

## Deployment (Vercel)

1. Import project from GitHub in Vercel dashboard
2. Configure project settings:
   - Framework Preset: Next.js
   - Root Directory: `apps/dashboard`
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: `https://vakkyaapi-production.up.railway.app`
4. Deploy

Vercel will auto-detect Next.js and use the `vercel.json` configuration.

## Testing

```bash
pnpm test
```
