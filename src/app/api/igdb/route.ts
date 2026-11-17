import { z } from "zod";
import { GameSchema, getToken } from "../../lib/igdb";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  const token = await getToken();
  console.log(typeof token, token.slice(0, 6));
  const gameRes = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_KEY!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: `fields name, summary, storyline, slug, game_type, first_release_date,
  genres.name, themes.name, keywords.name, player_perspectives.name,
  game_modes.name, platforms.name, franchises.name, collections.name,
  cover.url, artworks.url, screenshots.url, videos.video_id,
  age_ratings.rating_category, involved_companies.company.name,
  aggregated_rating, total_rating, total_rating_count, similar_games; search "${query}"; limit 1;`,
  });
  if (!gameRes.ok) {
    console.log(gameRes.status, await gameRes.text());
    return Response.json({ error: "IGDB request failed" }, { status: 502 });
  }
  const gameData = await gameRes.json();
  const games = z.array(GameSchema).safeParse(gameData);
  if (!games.success) {
    return Response.json(
      { error: "Unexpected IGDB response" },
      { status: 502 },
    );
  }
  return Response.json(games.data);
}
