export async function GET() {
  let url = `https://api.rawg.io/api/genres?key=${process.env.API_KEY}`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("RAWG API error");
    const data = await r.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
