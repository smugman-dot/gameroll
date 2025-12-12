import setPlatform from "./setPlatform";

export async function fetchGames({ page = 1, genres = "", search = "", seed = "" }) {
  const url = `/api/games?page=${page}&genres=${genres}&search=${encodeURIComponent(search)}&seed=${seed}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch games");
  }

  const data = await res.json();
  console.log("API response:", data.results?.[0]);
  return data.results.map((game) => ({
    id: game.id || 0,
    name: game.name || "Unknown",
    released: game.released || "N/A",
    background_image: game.background_image || "",
    rating: game.rating || 0,
    stores: setPlatform(game.platforms || []),
    genres: game.genres || [],
    description: game.description_raw || "",
    metacritic: game.metacritic || null,
  }));
}
export async function fetchGameDetails(gameId) {
  try {
    const res = await fetch(`/api/games?id=${gameId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch game details");
    return await res.json();
  } catch (err) {
    console.error("Error fetching game details:", err);
    return null;
  }
}
export async function fetchGameScreenshots(gameId) {
  try {
    const res = await fetch(`/api/games?id=${gameId}&screenshots=true`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch screenshots");
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error("Error fetching screenshots:", err);
    return [];
  }
}