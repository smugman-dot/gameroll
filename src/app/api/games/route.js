import { NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

const CACHE_PREFIX = "rawg:";
const normalizeKey = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const redis = Redis.fromEnv();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || 1;
  const search = searchParams.get("search") || "";
  const genres = searchParams.get("genres") || "";
  const id = searchParams.get("id") || "";
  const screenshots = searchParams.get("screenshots") === "true";

  let url = `https://api.rawg.io/api/games`;
  let cacheKey = null;

  if (id) {
    if (screenshots) {
      url += `/${id}/screenshots?key=${process.env.API_KEY}`;
      cacheKey = `${CACHE_PREFIX}shots:${id}`;
    } else {
      url += `/${id}?key=${process.env.API_KEY}`;
      cacheKey = `${CACHE_PREFIX}detail:${id}`;
    }
  } else {
    let queryParams = { page, search, genres };
    let queryHash = Object.entries(queryParams)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}-${normalizeKey(String(value))}`)
      .join(':');

    url += `?key=${process.env.API_KEY}&page=${page}&page_size=20`;

    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    } else if (genres) {
      url += `&genres=${genres}`;
    }

    cacheKey = `${CACHE_PREFIX}list:${queryHash}`;
  }

  try {
    if (cacheKey) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`[Upstash Cache] RAWG HIT for key: ${cacheKey}`);
        return NextResponse.json(cachedData);
      }
      console.log(`[Upstash Cache] RAWG MISS for key: ${cacheKey}`);
    }

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      console.error("RAWG API error:", data);
      throw new Error(data.detail || "RAWG API error");
    }

    if (cacheKey) {
      await redis.set(cacheKey, data);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("API route error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}