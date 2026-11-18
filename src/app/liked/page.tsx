"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, ensureSession } from "../lib/supabase/client";
import { normalizeGame, type Game } from "../lib/game";
import { track, flushNow } from "../lib/track";

const steamUrl = (name: string) =>
  `https://store.steampowered.com/search/?term=${encodeURIComponent(name)}`;

export default function LikedPage() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      await ensureSession();
      const { data: likes, error } = await supabase
        .from("game_decisions")
        .select("game_id, created_at")
        .eq("type", "like")
        .order("created_at", { ascending: false });

      if (error) console.error("liked load failed:", error.message);
      if (!likes?.length) return setGames([]);

      const ids = likes.map((l) => l.game_id as number);
      const { data: rows } = await supabase.from("games").select("*").in("id", ids);
      const byId = new Map((rows ?? []).map((r) => [r.id as number, r]));
      setGames(
        ids
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((r) => normalizeGame(r as any)),
      );
    })();
  }, []);

  const remove = (id: number) => {
    setLeaving((s) => new Set(s).add(id));
    track({ type: "undo", gameId: id });
    flushNow();
    window.setTimeout(() => {
      setGames((gs) => gs?.filter((g) => g.id !== id) ?? gs);
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 350);
  };

  return (
    <main className="mx-auto min-h-dvh w-[min(92vw,1000px)] overflow-x-clip py-8 text-white">
      <style>{`
        @keyframes likedIn {
          from { opacity: 0; transform: translateX(90px) rotate(5deg) scale(0.94); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes likedOut {
          to { opacity: 0; transform: translateX(-80px) rotate(-6deg) scale(0.92); }
        }
        @media (prefers-reduced-motion: reduce) {
          .liked-card { animation: none !important; }
        }
      `}</style>

      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Interested</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {games ? `${games.length} ${games.length === 1 ? "game" : "games"}` : "Loading…"}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-sm text-neutral-300 transition hover:border-white/25 hover:text-white"
        >
          Back to swiping
        </Link>
      </header>

      {games?.length === 0 && (
        <p className="py-24 text-center text-sm text-neutral-500">
          Nothing here yet. Swipe right on a few games.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {games?.map((g, i) => (
          <li
            key={g.id}
            className="liked-card group flex flex-col gap-2"
            style={{
              animation: leaving.has(g.id)
                ? "likedOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards"
                : `likedIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 14) * 60}ms backwards`,
            }}
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
              {g.cover && (
                <img
                  src={g.cover}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {g.rating != null && (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
                  {(g.rating / 10).toFixed(1)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-medium leading-snug">{g.name}</p>
              <p className="text-xs text-neutral-500">{g.year ?? ""}</p>
            </div>
            <div className="mt-auto flex gap-2">
              <a
                href={steamUrl(g.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg border border-white/10 py-1.5 text-center text-xs text-neutral-300 transition hover:border-white/25 hover:text-white"
              >
                Steam ↗
              </a>
              <button
                type="button"
                onClick={() => remove(g.id)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-white/25 hover:text-white"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
