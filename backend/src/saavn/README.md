# Saavn Fastify routes

`routes.ts` registers the Saavn controller routes. Register this plugin under the `/music` prefix if the frontend endpoint builders in `src/services/api/backendMusicEndpoints.js` are used; the plugin's root route (`/`) then becomes `/music/`.

Important: the route definitions supplied so far do not include every route exposed by `backendMusicEndpoints.js` (for example `/music/song/:songId/stream`, `/music/collection/:seokey`, `/music/album-list`, `/music/occasions`, `/music/languages`, and `/music/radio`). Implement those handlers before calling the matching frontend endpoints.

The existing `src/services/api/endpoints.js` continues to use the `/api/jiosaavn` proxy. It was deliberately left unchanged to avoid breaking the current app while the Fastify API is being integrated.
