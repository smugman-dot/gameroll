export async function fetchGames({
  page = 1,
  genres = "",
  search = "",
  seed = Date.now(),
  poolPages = 3,
  pageSize = 20,
}) {
  const hashString = (s) =>
    s.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) >>> 0;

  function mulberry32(seedNum) {
    let t = seedNum >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const seededRandForId = (seedVal, id) => {
    const combined = String(seedVal) + "-" + String(id);
    const h = hashString(combined);
    return mulberry32(h)();
  };

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  const SESSION_STORAGE_KEY = "game_feed_seen_session";
  let seenMap = {};
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    seenMap = raw ? JSON.parse(raw) : {};
    console.log("[fetchGames] Seen map:", seenMap);
  } catch (e) {
    seenMap = {};
  }

  const basePageDistance = Math.floor(seededRandForId(seed, 999) * 10);
  const pagesToFetch = [];
  for (let i = 0; i < 2; i++) {
    pagesToFetch.push(Number(page) + (i * (basePageDistance + 1)));
  }

  const fetchPromises = pagesToFetch.map((p) => {
    const url = `/api/games?page=${p}&page_size=${pageSize}&genres=${encodeURIComponent(
      genres,
    )}&search=${encodeURIComponent(search)}`;
    return fetch(url, { cache: "no-store" }).then(async (r) => {
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(`Failed fetch page ${p}: ${r.status} ${text}`);
      }
      return r.json();
    });
  });

  const responses = await Promise.allSettled(fetchPromises);
  const pool = [];
  for (const res of responses) {
    if (res.status === "fulfilled" && res.value.results) {
      pool.push(...res.value.results);
    }
  }

  const byId = new Map();
  for (const g of pool) {
    if (!g || !g.id) continue;
    if (!byId.has(g.id)) byId.set(g.id, g);
    else {
      const prev = byId.get(g.id);
      const prevScore = (prev.metacritic || 0) + (prev.rating || 0);
      const curScore = (g.metacritic || 0) + (g.rating || 0);
      if (curScore > prevScore) byId.set(g.id, g);
    }
  }

  const candidates = Array.from(byId.values());
  if (candidates.length === 0) return [];

  const maxAdded = Math.max(...candidates.map((c) => c.added || 0), 1);
  const now = Date.now();

  function yearsSince(releaseDate) {
    if (!releaseDate) return 10;
    const t = Date.parse(releaseDate);
    if (Number.isNaN(t)) return 10;
    return Math.max(0, (now - t) / (1000 * 60 * 60 * 24 * 365));
  }

  const scored = candidates
    .map((g) => {
      const met = clamp((g.metacritic ?? 50) / 100);
      const rat = clamp((g.rating ?? 3) / 5);
      const added = clamp((g.added ?? 0) / maxAdded);
      const recency = clamp(1 / (1 + yearsSince(g.released)));
      const relevance =
        search && typeof g.name === "string" && search.length
          ? (() => {
            const q = search.toLowerCase();
            const name = g.name.toLowerCase();
            if (name === q) return 1;
            if (name.startsWith(q)) return 0.9;
            if (name.includes(q)) return 0.7;
            return 0;
          })()
          : 0;

      const rand = seededRandForId(seed, g.id);
      const seenCount = seenMap[g.id] ?? 0;

      let seenPenalty = 0;
      if (seenCount >= 2) {
        seenPenalty = -10;
      } else if (seenCount === 1) {
        seenPenalty = -0.5;
      }

      const score =
        met * 0.15 +
        rat * 0.05 +
        recency * 0.05 +
        (1 - added) * 0.05 +
        relevance * 0.1 +
        rand * 0.5 +
        seenPenalty;

      return { game: g, score, rand, seenCount };
    })
    .filter((s) => {
      const g = s.game;
      return (
        (g.metacritic && g.metacritic >= 30) ||
        (g.rating && g.rating >= 2) ||
        g.background_image
      );
    });

  if (scored.length === 0) return [];

  scored.sort((a, b) => b.score - a.score || b.rand - a.rand);

  const selected = [];
  const genreCount = {};
  const maxPerGenre = Math.ceil(pageSize / 3);
  const usedIds = new Set();

  for (let i = 0; selected.length < pageSize && i < scored.length; i++) {
    const candidate = scored[i];
    const g = candidate.game;
    if (usedIds.has(g.id)) continue;

    const genresList = (g.genres || []).map((x) => x.name || x).filter(Boolean);
    let blocked = false;
    for (const gn of genresList) {
      if ((genreCount[gn] || 0) >= maxPerGenre) {
        blocked = true;
        break;
      }
    }

    if (blocked) continue;

    selected.push(candidate);
    usedIds.add(g.id);
    for (const gn of genresList) {
      genreCount[gn] = (genreCount[gn] || 0) + 1;
    }
  }

  let idx = 0;
  while (selected.length < pageSize && idx < scored.length) {
    const c = scored[idx++];
    if (!usedIds.has(c.game.id)) {
      selected.push(c);
      usedIds.add(c.game.id);
    }
  }

  const out = selected.map((it) => {
    const g = it.game;

    return {
      id: g.id,
      name: g.name,
      released: g.released || "N/A",
      background_image: g.background_image || "",
      rating: g.rating || 0,
      metacritic: g.metacritic ?? null,
      stores: g.platforms,
      genres: g.genres || [],
      description: g.description_raw || "",
      _score: Number(it.score.toFixed(4)),
      _seenCount: it.seenCount,
    };
  });

  return out;
}
export function markGamesAsSeen(ids = []) {
  const SESSION_STORAGE_KEY = "game_feed_seen_session";
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    for (const id of ids) {
      map[id] = (map[id] || 0) + 1;
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(map));
  } catch (e) { }
}

export async function fetchIGDBStores(gameName) {
  try {
    const res = await fetch(`/api/igdb?game=${encodeURIComponent(gameName)}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Frontend: API responded with error", res.status);
      return [];
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Frontend: Failed to fetch IGDB stores", err);
    return [];
  }
}

export async function fetchGameDetails(gameId) {
  try {
    const res = await fetch(`/api/games?id=${gameId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch game details");
    return await res.json();
  } catch (err) {
    console.error("Error fetching game details:", err);
    return null;
  }
}
export async function fetchGameScreenshots(gameId) {
  try {
    const res = await fetch(`/api/games?id=${gameId}&screenshots=true`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch screenshots");
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error("Error fetching screenshots:", err);
    return [];
  }
}
