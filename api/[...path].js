const UPSTREAM = "https://www.jiosaavn.com/api.php";

const isAllowedRequest = (url) => {
  const method = url.searchParams.get("__call") || "";
  return /^[a-zA-Z0-9.]+$/.test(method);
};

export default async function handler(req, res) {
  const requestUrl = new URL(
    req.url || "/api",
    `https://${req.headers.host || "localhost"}`
  );

  if (req.method === "OPTIONS") {
    res
      .status(204)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .setHeader("Access-Control-Max-Age", "86400")
      .end();
    return;
  }

  if (req.method !== "GET") {
    res
      .status(405)
      .setHeader("Allow", "GET, OPTIONS")
      .json({ error: "Method not allowed" });
    return;
  }

  if (!isAllowedRequest(requestUrl)) {
    res.status(400).json({ error: "A valid __call API method is required" });
    return;
  }

  const target = new URL(UPSTREAM);
  target.search = requestUrl.search;

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: {
        Accept: req.headers.accept || "application/json",
      },
    });

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    };

    const contentType = upstream.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    res.status(upstream.status);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

    const body = Buffer.from(await upstream.arrayBuffer());
    res.end(body);
  } catch (error) {
    res.status(502).json({
      error: error?.message || "Unable to reach the music API",
    });
  }
}
