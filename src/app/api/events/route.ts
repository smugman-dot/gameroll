import { z } from "zod";
import { createClient } from "../../lib/supabase/server";
const Body = z.object({
  events: z
    .array(
      z.object({
        type: z.enum(["view", "like", "pass", "undo"]),
        gameId: z.number().int(),
        t: z.number(),
        dwellMs: z.number().int().nonnegative().max(3_600_000).optional(),
      }),
    )
    .max(50),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const rows = parsed.data.events.map((e) => ({
    user_id: user.id,
    game_id: e.gameId,
    type: e.type,
    dwell_ms: e.dwellMs ?? null,
    created_at: new Date(e.t).toISOString(),
  }));

  const { error } = await supabase.from("game_events").insert(rows);
  if (error) {
    console.error(error);
    return Response.json({ error: "db error" }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}
