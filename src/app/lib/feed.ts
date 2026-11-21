import { supabase, ensureSession } from "./supabase/client";
import { normalizeGame, type Game } from "./game";
import { flushNow } from "./track";

const POOL = 200;
const WINDOW = 50;

function shuffle<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function loadFeed(preferred: number[]): Promise<Game[]> {
  await flushNow(); // make sure a just-played game is saved before we read it back
  await ensureSession();

  // games already played are never shown again
  const { data: playedRows } = await supabase.from("game_decisions").select("game_id").eq("type", "played");
  const played = new Set((playedRows ?? []).map((r) => r.game_id as number));

  const { data: ranked, error } = await supabase.rpc("recommend_vector", {
    p_preferred: preferred,
    p_limit: POOL + Math.min(played.size, 500), // over-fetch so filtering doesn't shrink the feed
  });
  if (error || !ranked?.length) {
    if (error) console.error("recommend_games failed:", error.message);
    return [];
  }

  const ids: number[] = ranked
    .map((r: { game_id: number }) => r.game_id)
    .filter((id: number) => !played.has(id))
    .slice(0, POOL);
  if (!ids.length) return [];
  const { data: rows, error: err2 } = await supabase.from("games").select("*").in("id", ids);
  if (err2 || !rows) {
    console.error("games fetch failed:", err2?.message);
    return [];
  }

  const byId = new Map(rows.map((r) => [r.id as number, r]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  const out: typeof ordered = [];
  for (let i = 0; i < ordered.length; i += WINDOW) {
    out.push(...shuffle(ordered.slice(i, i + WINDOW)));
  }
  return out.map((r) => normalizeGame(r as any));
}
