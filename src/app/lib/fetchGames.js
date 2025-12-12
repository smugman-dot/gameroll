import setPlatform from "./setPlatform";

export async function fetchGames({ page = 1, genres = "", search = "", seed = "" }) {
  // Pass the seed to the API call. This random number forces the API server
  // (the code handling /api/games) to return a different or re-ordered set of games, 
  // providing freshness. **Note: True randomness depends on the server utilizing this 'seed' 
  // parameter for sorting or cache-busting.**
  const url = `/api/games?page=${page}&genres=${genres}&search=${encodeURIComponent(search)}&seed=${seed}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch games");
  }

  const data = await res.json();
  console.log("API response:", data.results[0]);
  return data.results.map((game) => ({
    id: game.id,
    name: game.name,
    released: game.released,
    background_image: game.background_image,
    rating: game.rating,
    stores: setPlatform(game.platforms || []),
    genres: game.genres,
  }));
}