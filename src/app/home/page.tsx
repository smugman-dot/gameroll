"use client";

import { useEffect, useState } from "react";
import Bg from "../components/bg";
import SwipeDeck from "../components/SwipeDeck";
import { GameSchema } from "../lib/igdb";
import { getGames } from "../lib/games";
import { z } from "zod";

export type Game = z.infer<typeof GameSchema>;

export default function MainView() {
  const [feed, setFeed] = useState<{
    games: Game[];
    preferred: Set<number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let picked: number[] = [];
    try {
      const parsed = JSON.parse(
        localStorage.getItem("GENRE_PREFERENCES") ?? "[]"
      );
      if (Array.isArray(parsed)) {
        picked = parsed.map(Number).filter((n) => !Number.isNaN(n));
      }
    } catch { }

    const preferred = new Set<number>(picked);

    getGames()
      .then((fetchedGames) => {
        setFeed({ games: fetchedGames, preferred });
      })
      .catch((err) => console.error("Failed to load games:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Bg>
      {loading && <div>Loading games...</div>}
      {!loading && feed && (
        <SwipeDeck games={feed.games} preferred={feed.preferred} />
      )}
    </Bg>
  );
}
