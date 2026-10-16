const UPSTREAM = "https://www.jiosaavn.com/api.php";

const isAllowedRequest = (url) => {
  const method = url.searchParams.get("__call") || "";
  return /^[a-zA-Z0-9.]+$/.test(method);
};

export async function onRequest(context) {
  const { request } = context;
  const incoming = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!isAllowedRequest(incoming)) {
    return Response.json(
      { error: "A valid __call API method is required" },
      { status: 400 }
    );
  }

  const target = new URL(UPSTREAM);
  target.search = incoming.search;

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: {
        Accept: request.headers.get("Accept") || "application/json",
      },
    });

    const headers = new Headers(upstream.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "public, max-age=60");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return Response.json(
      { error: "Unable to reach the music API" },
      { status: 502 }
    );
  }
}
