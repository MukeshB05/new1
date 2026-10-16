const UPSTREAM = 'https://gaana.com/apiv2';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  }});
  if (!['GET', 'POST'].includes(request.method)) return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, POST, OPTIONS' } });
  const incoming = new URL(request.url);
  const target = new URL(UPSTREAM);
  target.search = incoming.search;
  try {
    const headers = new Headers({ 'User-Agent': USER_AGENT, Accept: request.headers.get('Accept') || 'application/json, text/plain, */*', Origin: 'https://gaana.com', Referer: 'https://gaana.com/', 'X-Requested-With': 'XMLHttpRequest' });
    const init = { method: request.method, headers, signal: AbortSignal.timeout(12000) };
    if (request.method === 'POST') {
      const contentType = request.headers.get('Content-Type') || 'application/x-www-form-urlencoded;charset=UTF-8';
      headers.set('Content-Type', contentType);
      init.body = await request.arrayBuffer();
    }
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Cache-Control', 'public, max-age=30, s-maxage=60');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    return Response.json({ error: 'Unable to reach Gaana API', message: error?.message || 'Upstream request failed' }, { status: 502, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
