import { z } from "zod";

const NamedList = z.array(z.object({ id: z.number(), name: z.string() }));

export const GameSchema = z
  .object({
    id: z.number(),
    igdb_id: z.number().nullish(),
    name: z.string(),
    genres: z.array(z.object({ id: z.number(), name: z.string() })).nullish(),
    first_release_date: z.number().nullish(),
    cover: z.object({ id: z.number(), url: z.string() }).nullish(),
    artworks: z.array(z.object({ id: z.number(), url: z.string() })).nullish(),
    age_ratings: z
      .array(
        z.object({
          id: z.number(),
          rating_category: z.number().nullish(),
        }),
      )
      .nullish(),
    involved_companies: z
      .array(
        z.object({
          id: z.number(),
          company: z.object({ id: z.number(), name: z.string() }),
        }),
      )
      .nullish(),
    aggregated_rating: z.number().nullish(),
    screenshots: z
      .array(z.object({ id: z.number(), url: z.string() }))
      .nullish(),
    summary: z.string().nullish(),
    themes: z.array(z.object({ id: z.number(), name: z.string() })).nullish(),
    storyline: z.string().nullish(),
    slug: z.string().nullish(),
    game_type: z.number().nullish(),
    keywords: NamedList.nullish(),
    player_perspectives: NamedList.nullish(),
    game_modes: NamedList.nullish(),
    platforms: NamedList.nullish(),
    franchises: NamedList.nullish(),
    collections: NamedList.nullish(),
    total_rating: z.number().nullish(),
    total_rating_count: z.number().nullish(),
    similar_games: z.array(z.number()).nullish(),
    videos: z
      .array(z.object({ id: z.number(), video_id: z.string() }))
      .nullish(),
  })
  .passthrough();


const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

let cachedToken: { access_token: string; expiresAt: number } | null = null;

export const img = (url: string, size = "t_cover_big") =>
  "https:" + url.replace("t_thumb", size);

export async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.access_token;

  const tokenRes = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT}&client_secret=${process.env.IGDB_KEY}&grant_type=client_credentials`,
    { method: "POST" },
  );
  if (!tokenRes.ok) throw new Error(`Twitch token request failed: ${tokenRes.status}`);

  const parsed = TokenSchema.safeParse(await tokenRes.json());
  if (!parsed.success) throw new Error(parsed.error.message);
  cachedToken = {
    access_token: parsed.data.access_token,
    expiresAt: Date.now() + (parsed.data.expires_in - 60) * 1000,
  };
  return cachedToken.access_token;
}
