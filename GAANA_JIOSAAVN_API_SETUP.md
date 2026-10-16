# JioSaavn + Gaana API integration

## JioSaavn
- Browser endpoint: `/api/jiosaavn`
- Vercel handler: `api/[...path].js`
- Cloudflare Pages handler: `functions/api/[[path]].js`
- Vite development proxy: `vite.config.js`
- Client service: `src/services/api/saavnApi.js`

The JioSaavn proxy accepts only GET requests and requires a valid `__call` query parameter.

## Gaana
- Browser endpoint: `/api/gaana`
- Vercel handler: `api/gaana.js`
- Cloudflare Pages handler: `functions/api/gaana.js`
- Client service: `src/services/api/gaanaApi.js`
- Upstream base URL: `https://gaana.com/apiv2`

Example client usage:

```js
import { saavnApi, gaanaApi } from './src/services/api/index.js';
const results = await saavnApi.search('A R Rahman');
const gaanaResults = await gaanaApi.search('A R Rahman', { type: 'search' });
```

Gaana's `apiv2` is a parameter-driven upstream API and its actions/response structures can change. `gaanaApi.request(params)` forwards the parameters you supply; convenience methods are starting points, not a guarantee that every Gaana action accepts the same parameter names. The existing `backend/src/gaana/controller.ts` is retained as reference code, but it is not the runtime API handler in this frontend deployment.

## Deployments
- **Vercel:** deploy the repository as usual; API files in `api/` are serverless functions.
- **Cloudflare Pages:** deploy the repository with build command `npm run build` and output directory `dist`; functions in `functions/api/` serve `/api/*`.
- **Local development:** `npm run dev`; Vite proxies `/api/jiosaavn`. Gaana requests use the Pages/Vercel function in production; local Vite does not run Cloudflare functions automatically. Configure a local `/api/gaana` proxy if you need Gaana requests during `vite dev`.
