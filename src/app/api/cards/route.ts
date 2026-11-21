import { createClient } from "../../lib/supabase/server";
import { normalizeGame } from "../../lib/game";

export async function GET(req: Request) {
  const ids = [
    ...new Set(
      (new URL(req.url).searchParams.get("ids") ?? "")
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ].slice(0, 8);
  if (!ids.length) return Response.json([]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { data } = await supabase.from("games").select("*").in("id", ids);
  return Response.json(
    (data ?? []).map((r) => normalizeGame(r as any)),
    { headers: { "cache-control": "private, max-age=300" } },
  );
}
