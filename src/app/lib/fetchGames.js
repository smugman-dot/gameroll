import setPlatform from "./setPlatform";

export async function fetchGames({ page = 1, genres = "", search = "" }) {
  const res = await fetch(
    `/api/games?page=${page}&genres=${genres}&search=${encodeURIComponent(
      search
    )}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch games");
  }

  const data = await res.json();

  return data.results.map((game) => ({
    id: game.id,
    name: game.name,
    released: game.released,
    background_image: game.background_image,
    rating: game.rating,
    stores: setPlatform(game.platforms),
    genres: game.genres,
  }));
}

export async function fetchGamesCached(options, cacheRef) {
  const { page = 1, genres = "", search = "" } = options;
  const cacheKey = `page:${page}-genres:${genres}-search:${search}`;

  if (cacheRef.current.has(cacheKey)) {
    return cacheRef.current.get(cacheKey);
  }

  const results = await fetchGames({ page, genres, search });
  cacheRef.current.set(cacheKey, results);
  return results;
}
