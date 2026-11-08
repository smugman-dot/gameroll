import { z } from "zod";

const NamedList = z.array(z.object({ id: z.number(), name: z.string() }));

export const GameSchema = z.object({
  id: z.number(),
  name: z.string(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  first_release_date: z.number().optional(),
  cover: z.object({ id: z.number(), url: z.string() }).optional(),
  artworks: z.array(z.object({ id: z.number(), url: z.string() })).optional(),
  age_ratings: z
    .array(z.object({ id: z.number(), rating_category: z.number() }))
    .optional(),
  involved_companies: z
    .array(
      z.object({
        id: z.number(),
        company: z.object({ id: z.number(), name: z.string() }),
      }),
    )
    .optional(),
  aggregated_rating: z.number().optional(),
  screenshots: z
    .array(z.object({ id: z.number(), url: z.string() }))
    .optional(),
  summary: z.string().optional(),
  themes: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  storyline: z.string().optional(),
  slug: z.string().optional(),
  game_type: z.number().optional(),
  keywords: NamedList.optional(),
  player_perspectives: NamedList.optional(),
  game_modes: NamedList.optional(),
  platforms: NamedList.optional(),
  franchises: NamedList.optional(),
  collections: NamedList.optional(),
  total_rating: z.number().optional(),
  total_rating_count: z.number().optional(),
  similar_games: z.array(z.number()).optional(),
  videos: z
    .array(z.object({ id: z.number(), video_id: z.string() }))
    .optional(),
});

const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

let cachedToken: { access_token: string; expiresAt: number } | null = null;

export const img = (url: string, size = "t_cover_big") =>
  "https:" + url.replace("t_thumb", size);

export async function getToken(): Promise<string> {
  if (!cachedToken || cachedToken.expiresAt <= Date.now()) {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT}&client_secret=${process.env.IGDB_KEY}&grant_type=client_credentials`,
      { method: "POST" },
    );
    if (!tokenRes.ok) {
      return;
    }

    const parsed = TokenSchema.safeParse(await tokenRes.json());
    if (!parsed.success) throw new Error(parsed.error.message);
    cachedToken = {
      access_token: parsed.data.access_token,
      expiresAt: Date.now() + parsed.data.expires_in * 1000,
    };
    return cachedToken.access_token;
  }
}
