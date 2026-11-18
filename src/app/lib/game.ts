import type { z } from "zod";
import type { GameSchema } from "./igdb";

type Raw = z.infer<typeof GameSchema>;

const igdbImg = (url: string, size: string) =>
  (url.startsWith("//") ? "https:" : "") + url.replace(/\/t_[a-z0-9_]+\//, `/${size}/`);

export function normalizeGame(g: Raw) {
  const art = g.artworks?.[0]?.url;
  const cover = g.cover?.url;
  const rating = g.total_rating ?? g.aggregated_rating ?? null; // 0–100

  return {
    id: g.id,
    name: g.name,
    summary: g.summary ?? "",
    storyline: g.storyline ?? "",
    genres: g.genres ?? [],
    rating,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
    cover: cover ? igdbImg(cover, "t_cover_big") : null,
    artworks: art ? igdbImg(art, "t_1080p") : null, // single hero image
    screenshots: (g.screenshots ?? []).map((s) => igdbImg(s.url, "t_1080p")),
    logo: null as string | null,
  };
}

export type Game = ReturnType<typeof normalizeGame>;
