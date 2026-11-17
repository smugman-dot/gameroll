
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const gameName = request.nextUrl.searchParams.get('name');

    if (!gameName) {
      return NextResponse.json(
        { error: 'Missing game name' },
        { status: 400 }
      );
    }

    const apiKey = process.env.STEAMGRIDDB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'SteamGridDB API key is not configured' },
        { status: 500 }
      );
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
    };

    const searchRes = await fetch(
      `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(gameName)}`,
      { headers }
    );

    if (!searchRes.ok) {
      throw new Error(`Search failed: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const gameId = searchData.data?.[0]?.id;

    if (!gameId) {
      return NextResponse.json({ heroes: [] });
    }

    const heroesRes = await fetch(
      `https://www.steamgriddb.com/api/v2/heroes/game/${gameId}`,
      { headers }
    );

    if (!heroesRes.ok) {
      throw new Error(`Heroes request failed: ${heroesRes.status}`);
    }

    const heroesData = await heroesRes.json();

    return NextResponse.json({
      heroes: heroesData.data || [],
    });

  } catch (error) {
    console.error("SteamGridDB ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : String(error),
      },
      { status: 500 }
    );
  }
}
