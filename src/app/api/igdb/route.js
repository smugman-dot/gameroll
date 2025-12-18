import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const CACHE_PREFIX = "igdb:stores:";
const normalizeKey = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const redis = Redis.fromEnv();
const EMPTY_CACHE_TTL = 60 * 60 * 24;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const gameName = searchParams.get("game");

  if (!gameName)
    return NextResponse.json(
      { error: "No game name provided" },
      { status: 400 },
    );

  const cacheKey = CACHE_PREFIX + normalizeKey(gameName);

  try {
    const cachedStores = await redis.get(cacheKey);

    if (cachedStores) {
      if (Array.isArray(cachedStores) && cachedStores.length === 0) {
        console.log(`[Upstash Cache] HIT, but stored as EMPTY. Re-checking...`);
      } else {
        console.log(`[Upstash Cache] HIT with ${cachedStores.length} stores.`);
        return NextResponse.json(cachedStores);
      }
    }

    console.log(`[Upstash Cache] MISS. Hitting IGDB.`);

    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT}&client_secret=${process.env.IGDB_KEY}&grant_type=client_credentials`,
      { method: "POST", cache: "no-store" },
    );
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const queryBody = `
            fields name, websites.url, websites.category;
            search "${gameName}";
            limit 1;
        `;

    const gameRes = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.IGDB_CLIENT,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: queryBody,
      cache: "no-store",
    });

    const gameData = await gameRes.json();

    const websites = (gameData && gameData[0]?.websites) || [];
    const stores = websites.map((site) => {
      let name = "Website";
      if (site.category === 13) name = "Steam";
      if (site.category === 16) name = "Epic Games";
      if (site.category === 17) name = "GOG";
      if (site.category === 1) name = "Official";
      return { name, url: site.url };
    });

    if (stores.length === 0) {
      await redis.set(cacheKey, stores, { ex: EMPTY_CACHE_TTL });
      console.log(`[Upstash Cache] Wrote EMPTY result with 24h expiration.`);
    } else {
      await redis.set(cacheKey, stores);
      console.log(
        `[Upstash Cache] Wrote permanent result with ${stores.length} stores.`,
      );
    }

    return NextResponse.json(stores);
  } catch (err) {
    const errorCacheKey = `rawg:error:${normalizeKey(gameName)}`;
    await redis.set(errorCacheKey, [], { ex: 60 * 60 });

    console.error("❌ API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
