---
name: deploy-app
description: Build and deploy the samplefinder-admin Vite/React app to Vercel. Use when the user asks to deploy the app, ship to production, or run a production build and deploy.
---

# Deploy the App

## What gets deployed

- **App**: samplefinder-admin (Vite + React SPA)
- **Platform**: Vercel (configured via `vercel.json` with SPA rewrites)
- **Build**: `tsc -b && vite build` → output in `dist/`

## Pre-deploy checklist

1. **Environment variables**  
   Production needs all `VITE_*` vars set in the Vercel project (Dashboard → Project → Settings → Environment Variables). Reference: `.env.example`.

2. **Optional**: Run lint before deploying:
   ```bash
   yarn lint
   ```

## Deploy workflow

### Option A: Vercel CLI (recommended for one-off or manual deploys)

1. Install CLI if needed: `npm i -g vercel`
2. Build and deploy:
   ```bash
   yarn build
   vercel --prod
   ```
   Or let Vercel build on their servers (no local build required):
   ```bash
   vercel --prod
   ```

### Option B: Git-based (CI/CD)

Push to the branch connected to Vercel (e.g. `main`). Vercel runs `yarn build` (or the build command set in the project) and deploys automatically.

**Build command in Vercel**: `yarn build` or `npm run build`  
**Output directory**: `dist`

## After deploy

- Confirm the deployment URL in Vercel dashboard or CLI output.
- If the app fails at runtime, check that all `VITE_*` environment variables are set for the Production environment in Vercel.
