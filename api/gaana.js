const UPSTREAM = 'https://gaana.com/apiv2';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(204).end();
  }
  if (!['GET', 'POST'].includes(req.method || 'GET')) {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const incoming = new URL(req.url || '/api/gaana', `https://${req.headers.host || 'localhost'}`);
  incoming.searchParams.delete('path');
  const target = new URL(UPSTREAM);
  target.search = incoming.search;
  try {
    const headers = {
      'User-Agent': USER_AGENT,
      Accept: req.headers.accept || 'application/json, text/plain, */*',
      Origin: 'https://gaana.com',
      Referer: 'https://gaana.com/',
      'X-Requested-With': 'XMLHttpRequest',
    };
    let body;
    if (req.method === 'POST') {
      headers['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded;charset=UTF-8';
      if (typeof req.body === 'string' || req.body instanceof Uint8Array) body = req.body;
      else if (req.body && typeof req.body === 'object') body = new URLSearchParams(req.body).toString();
    }
    const upstream = await fetch(target, { method: req.method, headers, body, signal: AbortSignal.timeout(12000) });
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const data = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60');
    return res.send(data);
  } catch (error) {
    return res.status(502).json({ error: 'Unable to reach Gaana API', message: error?.message || 'Upstream request failed' });
  }
}
