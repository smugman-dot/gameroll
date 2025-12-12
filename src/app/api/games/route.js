export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || 1;
  const search = searchParams.get("search") || "";
  const genres = searchParams.get("genres") || "";
  const id = searchParams.get("id") || "";
  const seed = searchParams.get("seed") || ""; // Accept seed parameter
  const screenshots = searchParams.get("screenshots") === "true";

  let url = `https://api.rawg.io/api/games`;

  // Build URL based on parameters
  if (id) {
    // If requesting a specific game or its screenshots
    if (screenshots) {
      url += `/${id}/screenshots?key=${process.env.API_KEY}`;
    } else {
      url += `/${id}?key=${process.env.API_KEY}`;
    }
  } else if (search) {
    url += `?key=${process.env.API_KEY}&page=${page}&page_size=20&search=${encodeURIComponent(search)}`;
  } else if (genres) {
    url += `?key=${process.env.API_KEY}&page=${page}&page_size=20&genres=${genres}`;
  } else {
    url += `?key=${process.env.API_KEY}&page=${page}&page_size=20`;
  }

  // Add ordering parameter for variety (only if not requesting specific game by id)
  if (!id) {
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
  }

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      console.error("RAWG API error:", data);
      throw new Error(data.detail || "RAWG API error");
    }

    return Response.json(data);
  } catch (err) {
    console.error("API route error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}