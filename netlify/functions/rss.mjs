export default async (req) => {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response("Missing ?url=", { status: 400 });
  }
  try {
    const r = await fetch(target, { headers: { "User-Agent": "infoscreen" } });
    const text = await r.text();
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "s-maxage=120, stale-while-revalidate=300"
      }
    });
  } catch (e) {
    return new Response("Upstream error", { status: 502 });
  }
};
