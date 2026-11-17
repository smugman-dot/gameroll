import { createClient } from "@supabase/supabase-js";
import { GameSchema, getToken } from "../src/app/lib/igdb";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PAGE = 500;
const MAX_GAMES = 5000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(offset: number, token: string): Promise<unknown[]> {
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: `fields name, summary, storyline, slug, game_type, first_release_date,
      genres.name, themes.name, keywords.name, player_perspectives.name,
      game_modes.name, platforms.name, franchises.name, collections.name,
      cover.url, artworks.url, screenshots.url, videos.video_id,
      age_ratings.rating_category, involved_companies.company.name,
      aggregated_rating, total_rating, total_rating_count, similar_games;
      where total_rating_count > 50 & cover != null;
      sort total_rating_count desc;
      limit ${PAGE};
      offset ${offset};`,
  });

  if (res.status === 429) {
    await sleep(2000);
    return fetchPage(offset, token);
  }
  if (!res.ok) throw new Error(`IGDB ${res.status}: ${await res.text()}`);
  return (await res.json()) as unknown[];
}

async function main() {
  const token = await getToken();
  let offset = 0;
  let saved = 0;

  while (offset < MAX_GAMES) {
    const raw = await fetchPage(offset, token);
    if (raw.length === 0) break;

    const rows = [];
    for (const item of raw) {
      const parsed = GameSchema.safeParse(item);
      if (!parsed.success) {
        console.log(
          "Skipping invalid game:",
          (item as { name?: string })?.name,
        );
        continue;
      }
      const g = parsed.data;
      rows.push({
        igdb_id: g.id,
        name: g.name,
        summary: g.summary ?? null,
        storyline: g.storyline ?? null,
        slug: g.slug ?? null,
        game_type: g.game_type ?? null,
        genres: g.genres ?? null,
        themes: g.themes ?? null,
        keywords: g.keywords ?? null,
        player_perspectives: g.player_perspectives ?? null,
        game_modes: g.game_modes ?? null,
        platforms: g.platforms ?? null,
        franchises: g.franchises ?? null,
        collections: g.collections ?? null,
        first_release_date: g.first_release_date ?? null,
        cover: g.cover ?? null,
        artworks: g.artworks ?? null,
        screenshots: g.screenshots ?? null,
        videos: g.videos ?? null,
        age_ratings: g.age_ratings ?? null,
        involved_companies: g.involved_companies ?? null,
        aggregated_rating: g.aggregated_rating ?? null,
        total_rating: g.total_rating ?? null,
        total_rating_count: g.total_rating_count ?? null,
        similar_games: g.similar_games ?? null,
      });
    }

    const { error } = await supabase
      .from("games")
      .upsert(rows, { onConflict: "igdb_id" });
    if (error) throw error;

    saved += rows.length;
    console.log(`Saved ${saved} games (offset ${offset})`);

    if (raw.length < PAGE) break;
    offset += PAGE;
    await sleep(300);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
