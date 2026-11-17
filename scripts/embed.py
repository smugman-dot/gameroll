import os, json, psycopg
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device="cuda")  # "cpu" if no GPU

def names(v, limit=None):
    if isinstance(v, str):
        try: v = json.loads(v)
        except Exception: return []
    out = [(x.get("name") if isinstance(x, dict) else str(x)) for x in (v or [])]
    out = [n for n in out if n]
    return out[:limit] if limit else out

def text_for(r):
    parts = [
        "Genres: " + ", ".join(names(r["genres"])),
        "Themes: " + ", ".join(names(r["themes"])),
        "Keywords: " + ", ".join(names(r["keywords"], 15)),
        "Perspectives: " + ", ".join(names(r["player_perspectives"])),
        "Modes: " + ", ".join(names(r["game_modes"])),
        r["summary"] or "",
    ]
    return "\n".join(parts)

with psycopg.connect(
  host="aws-1-eu-central-1.pooler.supabase.com",
  port=5432,
  dbname="postgres",
  user="postgres.qwkselzeevubloxwudqz",
  password=os.environ["DB_PASSWORD"],
) as conn:
    cur = conn.cursor()
    cur.execute("""select id, genres, themes, keywords, player_perspectives, game_modes, summary
                   from games where embedding is null""")
    cols = [d.name for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    print(f"{len(rows)} games to embed")

    B = 256
    for i in range(0, len(rows), B):
        batch = rows[i:i + B]
        vecs = model.encode([text_for(r) for r in batch],
                            normalize_embeddings=True, batch_size=64)
        cur.executemany(
            "update games set embedding = %s::extensions.vector where id = %s",
            [("[" + ",".join(f"{x:.6f}" for x in v) + "]", r["id"]) for v, r in zip(vecs, batch)],
        )
        conn.commit()
        print(f"{min(i + B, len(rows))}/{len(rows)}")
