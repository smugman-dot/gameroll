export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || 1;
  const search = searchParams.get("search") || "";

  const url = `https://api.rawg.io/api/games?key=${
    process.env.API_KEY
  }&page=${page}&page_size=20&search=${encodeURIComponent(search)}`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("RAWG API error");
    const data = await r.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
