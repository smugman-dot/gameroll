import { GENRES } from "./genres";
import { GameSchema } from "./igdb";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type Game = z.infer<typeof GameSchema>;

const PAGE_SIZE = 20;

export async function getGames(page = 0, pageSize = PAGE_SIZE): Promise<Game[]> {
  const rawPrefs = localStorage.getItem("GENRE_PREFERENCES");
  const parsedPrefs: unknown[] = rawPrefs ? JSON.parse(rawPrefs) : [];

  const preferredIds = parsedPrefs
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));

  if (preferredIds.length === 0) return [];

  const orFilter = preferredIds
    .map((id) => `genres.cs.${JSON.stringify([{ id }])}`)
    .join(",");

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .or(orFilter)
    .order("id", { ascending: true })
    .range(from, to);

  if (error) throw error;

  return z.array(GameSchema).parse(data ?? []);
}


export const igdbImage = (
  imageId: string,
  size: "cover_big" | "logo_med" | "720p" | "1080p" | "original" = "cover_big",
  ext: "jpg" | "png" = "jpg"
) => `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.${ext}`;

export const igdbFromUrl = (
  url: string,
  size: "cover_big" | "logo_med" | "720p" | "1080p" | "original" = "1080p",
  ext?: "jpg" | "png"
) => {
  const full = url.startsWith("//") ? `https:${url}` : url;
  const sized = full.replace(/t_[a-z0-9_]+/, `t_${size}`);
  return ext ? sized.replace(/\.(jpg|png)$/, `.${ext}`) : sized;
};

