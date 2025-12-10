export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || 1;
  const search = searchParams.get("search") || "";
  const genres = searchParams.get("genres") || "";
  const seed = searchParams.get("seed") || ""; // Accept seed parameter

  let url = `https://api.rawg.io/api/games?key=${process.env.API_KEY}&page=${page}&page_size=20`;

  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (genres) url += `&genres=${genres}`;

  // Add ordering parameter for variety
  // Use seed to determine ordering strategy for randomness
  const orderingOptions = [
    "-rating",
    "-released",
    "-added",
    "-metacritic",
    "name",
    "-updated"
  ];

  // Use seed to pick an ordering if provided, otherwise use a random one
  let ordering;
  if (seed) {
    // Create a pseudo-random index based on seed
    const seedNum = parseInt(seed.replace(/[^0-9]/g, '').substring(0, 8)) || 0;
    ordering = orderingOptions[seedNum % orderingOptions.length];
  } else {
    ordering = orderingOptions[Math.floor(Math.random() * orderingOptions.length)];
  }

  url += `&ordering=${ordering}`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("RAWG API error");
    const data = await r.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}