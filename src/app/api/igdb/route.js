import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const gameName = searchParams.get("game");

    if (!gameName) return NextResponse.json({ error: "No game name provided" }, { status: 400 });

    try {

        const tokenRes = await fetch(
            `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT}&client_secret=${process.env.IGDB_KEY}&grant_type=client_credentials`,
            { method: "POST" }
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
        });

        const gameData = await gameRes.json();


        if (!gameData || gameData.length === 0) return NextResponse.json([]);

        const websites = gameData[0].websites || [];
        const stores = websites.map(site => {
            let name = "Website";
            if (site.category === 13) name = "Steam";
            if (site.category === 16) name = "Epic Games";
            if (site.category === 17) name = "GOG";
            if (site.category === 1) name = "Official";
            return { name, url: site.url };
        });

        return NextResponse.json(stores);

    } catch (err) {
        console.error("❌ API Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}