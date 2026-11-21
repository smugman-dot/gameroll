"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import SwipeDeck from "./SwipeDeck";
import { supabase, ensureSession } from "../lib/supabase/client";
import { normalizeGame, type Game } from "../lib/game";
import { GENRES } from "../lib/genres";
import { track, flushNow } from "../lib/track";

type View = "discover" | "liked";

const GENRE_NAME = new Map<number, string>(GENRES.map((g) => [g.id, g.name]));

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 0.2, 1)";
const INTRO_MS = 1300; // how long the liked grid's entrance plays after opening

const steamUrl = (name: string) =>
  `https://store.steampowered.com/search/?term=${encodeURIComponent(name)}`;

/* ---------------------------------- nav ---------------------------------- */

function CompassIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      style={{ transform: `rotate(${active ? 0 : -120}deg)`, transition: `transform 600ms ${EASE}` }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      style={{
        transform: `scale(${active ? 1.15 : 1})`,
        fill: active ? "currentColor" : "transparent",
        transition: `transform 500ms ${EASE}, fill 400ms ease`,
      }}
      aria-hidden="true"
    >
      <path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11z" />
    </svg>
  );
}

function NavTabs({
  view,
  onChange,
  onWarm,
}: {
  view: View;
  onChange: (v: View) => void;
  onWarm: () => void;
}) {
  const tabs: { id: View; label: string }[] = [
    { id: "discover", label: "Discover" },
    { id: "liked", label: "Liked" },
  ];

  return (
    <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      <div
        role="tablist"
        className="pointer-events-auto relative flex rounded-full border border-white/10 bg-neutral-900/70 p-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-32 rounded-full bg-white shadow-[0_0_30px_-6px_rgba(255,255,255,0.55)]"
          style={{
            transform: view === "liked" ? "translateX(100%)" : "translateX(0)",
            transition: `transform 550ms ${EASE}`,
          }}
        />
        {tabs.map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              onPointerEnter={t.id === "liked" ? onWarm : undefined}
              onFocus={t.id === "liked" ? onWarm : undefined}
              className={`relative z-10 flex w-32 cursor-pointer items-center justify-center gap-2 rounded-full py-2 text-xs font-medium uppercase tracking-[0.18em] transition-[color,scale] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 active:scale-95 ${active ? "text-neutral-950" : "text-neutral-400 hover:text-white"
                }`}
            >
              {t.id === "discover" ? <CompassIcon active={active} /> : <HeartIcon active={active} />}
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* --------------------------------- shell --------------------------------- */

export default function AppShell({ preferred }: { preferred: Set<number> }) {
  const [view, setView] = useState<View>("discover");
  const [games, setGames] = useState<Game[] | null>(null);
  const [opens, setOpens] = useState(0); // bumps on every open so the entrance replays
  const [intro, setIntro] = useState(false); // true while the open animation plays
  const [leaving, setLeaving] = useState<Set<number>>(new Set());

  const items = useRef(new Map<number, HTMLLIElement>());
  const prevPos = useRef(new Map<number, { x: number; y: number }>());
  const introTimer = useRef<number | undefined>(undefined);
  const introOn = useRef(false);
  const lastWarm = useRef(0);

  const load = useCallback(async () => {
    await flushNow(); // save the latest swipes before reading them back
    await ensureSession();
    const { data: likes, error } = await supabase
      .from("game_decisions")
      .select("game_id, created_at")
      .eq("type", "like")
      .order("created_at", { ascending: false });

    if (error) console.error("liked load failed:", error.message);

    let list: Game[] = [];
    if (likes?.length) {
      const ids = likes.map((l) => l.game_id as number);
      const { data: rows } = await supabase.from("games").select("*").in("id", ids);
      const byId = new Map((rows ?? []).map((r) => [r.id as number, r]));
      list = ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((r) => normalizeGame(r as any));
    }
    setGames(list);
  }, []);

  useEffect(() => {
    load(); // prefetch so the first open is instant
  }, [load]);

  /** start fetching as soon as the pointer is over the Liked tab, ~150-400ms before the click lands */
  const warm = useCallback(() => {
    if (Date.now() - lastWarm.current < 2000) return;
    lastWarm.current = Date.now();
    load();
  }, [load]);

  const startIntro = useCallback(() => {
    introOn.current = true;
    setIntro(true);
    window.clearTimeout(introTimer.current);
    introTimer.current = window.setTimeout(() => {
      introOn.current = false;
      setIntro(false);
    }, INTRO_MS);
  }, []);

  // a list that arrives mid-entrance gets its own full entrance
  useEffect(() => {
    if (introOn.current) startIntro();
  }, [games, startIntro]);

  useEffect(() => () => window.clearTimeout(introTimer.current), []);

  const go = (v: View) => {
    if (v === view) return;
    setView(v);
    if (v === "liked") {
      setOpens((n) => n + 1);
      startIntro();
      lastWarm.current = Date.now();
      load();
    }
  };

  /* FLIP: cards glide to their new slot (on the <li>), new cards pop in (on the inner card) */
  useLayoutEffect(() => {
    if (!games) return;
    const next = new Map<number, { x: number; y: number }>();
    items.current.forEach((el, id) => next.set(id, { x: el.offsetLeft, y: el.offsetTop }));

    const animate = view === "liked" && matchMedia("(prefers-reduced-motion: no-preference)").matches;
    if (animate) {
      const firstFill = prevPos.current.size === 0;
      games.forEach((g, i) => {
        const el = items.current.get(g.id);
        const pos = next.get(g.id);
        if (!el || !pos) return;
        const old = prevPos.current.get(g.id);
        if (!old) {
          if (intro) return; // the entrance animation already handles it
          (el.firstElementChild as HTMLElement | null)?.animate(
            [
              { opacity: 0, transform: firstFill ? "translateY(120px) scale(0.94)" : "translateY(-40px) scale(0.8)", filter: "blur(6px)" },
              { opacity: 1, transform: "none", filter: "blur(0)" },
            ],
            { duration: 750, delay: firstFill ? Math.min(i, 8) * 45 : 60, easing: EASE, fill: "backwards" },
          );
        } else if (old.x !== pos.x || old.y !== pos.y) {
          el.animate(
            [{ transform: `translate(${old.x - pos.x}px, ${old.y - pos.y}px)` }, { transform: "none" }],
            { duration: 650, easing: EASE },
          );
        }
      });
    }
    prevPos.current = next;
  }, [games, view, intro]);

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
    }, 450);
  };

  /* ---- game detail: the card's cover grows into the sheet and shrinks back into the card ---- */
  const [detail, setDetail] = useState<{ game: Game; rect: DOMRect } | null>(null);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const morphRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const closingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [revealing, setRevealing] = useState(false);
  const thumbRef = useRef<HTMLImageElement>(null);

  const openDetail = (game: Game, li: HTMLElement) => {
    if (detail) return;
    const cover = li.querySelector("[data-cover]") as HTMLElement | null;
    setDetail({ game, rect: (cover ?? li).getBoundingClientRect() });
  };

  const px = (r: DOMRect | { left: number; top: number; width: number; height: number }) => ({
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });

  const COVER_SHADOW = "0 20px 40px -20px rgba(0,0,0,0.9)";
  const THUMB_SHADOW = "0 12px 30px -8px rgba(0,0,0,0.85)";
  const COVER_BORDER = "rgba(255,255,255,0.1)";
  const THUMB_BORDER = "rgba(255,255,255,0.15)";

  useLayoutEffect(() => {
    const p = panelRef.current;
    const m = morphRef.current;
    if (!detail || !p || !m) return;
    if (scrollRef.current) scrollRef.current.dataset.quiet = ""; // keep the scrollbar invisible while the sheet is moving
    const r = detail.rect;
    const pr = p.getBoundingClientRect();
    const gh = ghostRef.current;
    const th = thumbRef.current;
    const tr = th?.getBoundingClientRect();
    const DUR = 700;

    // sheet background: starts as the card cover's rectangle, grows to the panel's
    Object.assign(m.style, px(pr), { borderRadius: "28px" });
    const ma = m.animate(
      [{ ...px(r), borderRadius: "12px" }, { ...px(pr), borderRadius: "28px" }],
      { duration: DUR, easing: EASE },
    );
    // once settled: show the scrollbar and keep the sheet background glued to the panel's real size
    let ro: ResizeObserver | undefined;
    const sync = () => {
      if (!closingRef.current) Object.assign(m.style, px(p.getBoundingClientRect()));
    };
    ma.onfinish = () => {
      if (closingRef.current) return;
      if (scrollRef.current) delete scrollRef.current.dataset.quiet;
      ro = new ResizeObserver(sync);
      ro.observe(p);
    };
    window.addEventListener("resize", sync);

    // the cover itself travels from the card to its place in the sheet (same radius, border and shadow as both ends)
    if (gh && th && tr) {
      Object.assign(gh.style, px(tr), {
        borderRadius: "8px",
        borderColor: THUMB_BORDER,
        boxShadow: THUMB_SHADOW,
        visibility: "visible",
      });
      const a = gh.animate(
        [
          { ...px(r), borderRadius: "12px", borderColor: COVER_BORDER, boxShadow: COVER_SHADOW },
          { ...px(tr), borderRadius: "8px", borderColor: THUMB_BORDER, boxShadow: THUMB_SHADOW },
        ],
        { duration: DUR, easing: EASE },
      );
      a.onfinish = () => {
        th.style.opacity = "1";
        gh.style.visibility = "hidden";
      };
      // the rating pill fades away early instead of being scaled with the image
      badgeRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease-out", fill: "forwards" });
    }

    // everything else rises in behind it
    p.querySelectorAll("[data-rise]").forEach((el, i) => {
      el.animate(
        [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }],
        { duration: 600, delay: 240 + i * 50, easing: EASE, fill: "backwards" },
      );
    });
    scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: "ease-out" });

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [detail]);

  const closeDetail = (after?: () => void) => {
    const p = panelRef.current;
    const m = morphRef.current;
    if (!detail || !p || !m || closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (scrollRef.current) {
      scrollRef.current.dataset.quiet = ""; // scrollbar goes first
      scrollRef.current.scrollTop = 0;
    }

    const li = items.current.get(detail.game.id);
    const cover = li?.querySelector("[data-cover]") as HTMLElement | null;
    const r = cover?.getBoundingClientRect() ?? detail.rect;
    const pr = p.getBoundingClientRect();
    const gh = ghostRef.current;
    const th = thumbRef.current;
    const tr = th?.getBoundingClientRect();
    const DUR = 520;

    const done = () => {
      setRevealing(false);
      setDetail(null);
      setClosing(false);
      closingRef.current = false;
      after?.();
    };
    // the real cover is already in place under the (opaque) ghost, which then fades out: both show the same image, so nothing blinks
    const reveal = () => {
      setRevealing(true);
      ghostRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" });
      window.setTimeout(done, 210);
    };

    p.querySelectorAll("[data-rise]").forEach((el) =>
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-in", fill: "forwards" }),
    );
    scrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: "ease-in", fill: "forwards" });

    const ma = m.animate(
      [
        { ...px(pr), borderRadius: "28px", opacity: 1 },
        { opacity: 1, offset: 0.55 },
        { ...px(r), borderRadius: "12px", opacity: 0 },
      ],
      { duration: DUR, easing: EASE_IN, fill: "forwards" },
    );

    if (gh && th && tr) {
      th.style.opacity = "0";
      Object.assign(gh.style, px(tr), {
        borderRadius: "8px",
        borderColor: THUMB_BORDER,
        boxShadow: THUMB_SHADOW,
        visibility: "visible",
      });
      badgeRef.current?.animate(
        [{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }],
        { duration: DUR, easing: "linear", fill: "forwards" },
      );
      const ga = gh.animate(
        [
          { ...px(tr), borderRadius: "8px", borderColor: THUMB_BORDER, boxShadow: THUMB_SHADOW },
          { ...px(r), borderRadius: "12px", borderColor: COVER_BORDER, boxShadow: COVER_SHADOW },
        ],
        { duration: DUR, easing: EASE_IN, fill: "forwards" },
      );
      ga.onfinish = reveal;
    } else {
      ma.onfinish = done;
    }
  };

  /* ---- screenshot lightbox: the clicked screenshot grows out of the row ---- */
  const [lb, setLb] = useState<{ i: number; rect: DOMRect | null; nw: number; nh: number } | null>(null);
  const lbOpen = lb !== null;
  const shotRefs = useRef<(HTMLImageElement | null)[]>([]);
  const lbImgRef = useRef<HTMLImageElement>(null);
  const lbScrimRef = useRef<HTMLDivElement>(null);
  const lbUiRef = useRef<HTMLDivElement>(null);
  const lbClosing = useRef(false);
  const shots = detail ? detail.game.screenshots.slice(0, 8) : [];

  const openLb = (i: number, el: HTMLImageElement) =>
    setLb({ i, rect: el.getBoundingClientRect(), nw: el.naturalWidth || 16, nh: el.naturalHeight || 9 });

  useLayoutEffect(() => {
    if (!lb || !lb.rect) return;
    const img = lbImgRef.current;
    if (!img) return;
    const r = lb.rect;
    const f = img.getBoundingClientRect();
    img.animate(
      [
        {
          transform: `translate(${r.left + r.width / 2 - (f.left + f.width / 2)}px, ${r.top + r.height / 2 - (f.top + f.height / 2)}px) scale(${r.width / f.width}, ${r.height / f.height})`,
        },
        { transform: "none" },
      ],
      { duration: 550, easing: EASE },
    );
    lbScrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: "ease-out" });
    lbUiRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 250, easing: "ease-out", fill: "backwards" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbOpen]);

  const stepLb = (d: number) =>
    setLb((l) => {
      if (!l) return l;
      const n = Math.min(shots.length - 1, Math.max(0, l.i + d));
      return n === l.i ? l : { ...l, i: n, rect: null };
    });

  const closeLb = () => {
    const img = lbImgRef.current;
    if (!lb || !img || lbClosing.current) return;
    lbClosing.current = true;
    const th = shotRefs.current[lb.i];
    th?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const tr = th?.getBoundingClientRect();
    const f = img.getBoundingClientRect();
    const done = () => {
      setLb(null);
      lbClosing.current = false;
    };
    lbScrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-in", fill: "forwards" });
    lbUiRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: "forwards" });
    const visible = tr && tr.bottom > 0 && tr.top < window.innerHeight && tr.right > 0 && tr.left < window.innerWidth;
    const a = visible
      ? img.animate(
        [
          { transform: "none" },
          {
            transform: `translate(${tr.left + tr.width / 2 - (f.left + f.width / 2)}px, ${tr.top + tr.height / 2 - (f.top + f.height / 2)}px) scale(${tr.width / f.width}, ${tr.height / f.height})`,
          },
        ],
        { duration: 450, easing: EASE_IN, fill: "forwards" },
      )
      : img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
    a.onfinish = done;
  };

  useEffect(() => {
    if (!lbOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowRight") stepLb(1);
      else if (e.key === "ArrowLeft") stepLb(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbOpen, lb?.i]);

  useEffect(() => {
    if (view !== "liked") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || lbOpen) return;
      if (detail) closeDetail();
      else setView("discover");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, detail, closing, lbOpen]);

  const showLiked = view === "liked";
  const heroSrc = detail ? (detail.game.artworks ?? detail.game.screenshots[0] ?? detail.game.cover) : null;

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <style>{`
        @keyframes likedUp {
          from { opacity: 0; transform: translateY(120px) scale(0.94); filter: blur(6px); }
          to   { opacity: 1; transform: none; filter: blur(0); }
        }
        @keyframes likedOut {
          to { opacity: 0; transform: scale(0.95); filter: blur(10px); }
        }
        @keyframes lbFade {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .liked-card > * { animation: none !important; }
        }

        /* slim, rounded scrollbars (add the nice-scroll class to any scrolling element) */
        .nice-scroll::-webkit-scrollbar { width: 12px; height: 12px; }
        .nice-scroll::-webkit-scrollbar-track { background: transparent; }
        .nice-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.14);
          border: 4px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }
        .nice-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.34);
          background-clip: padding-box;
        }
        .nice-scroll::-webkit-scrollbar-corner { background: transparent; }
        /* hide thumbs while the sheet moves. NOTE: never set scrollbar-color here for webkit/blink: in Chrome 121+
           it switches the element from the 12px ::-webkit-scrollbar to the native one, which changes the
           scrollbar width and makes the text reflow ("teleport") */
        .nice-scroll[data-quiet]::-webkit-scrollbar-thumb,
        .nice-scroll[data-quiet] .nice-scroll::-webkit-scrollbar-thumb { background: transparent !important; }
        @supports not selector(::-webkit-scrollbar) {
          .nice-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.25) transparent; }
          .nice-scroll[data-quiet], .nice-scroll[data-quiet] .nice-scroll { scrollbar-color: transparent transparent; }
        }
      `}</style>

      <NavTabs view={view} onChange={go} onWarm={warm} />

      {/* the deck keeps its state; SwipeDeck slides its own cards away and lifts its header under the nav */}
      <div data-deck-paused={showLiked ? "" : undefined} inert={showLiked} aria-hidden={showLiked}>
        <SwipeDeck preferred={preferred} paused={showLiked} />
      </div>

      {/* liked games: starts below the lifted header so cards scroll beneath it */}
      <section
        aria-hidden={!showLiked}
        inert={!showLiked}
        className={`nice-scroll fixed inset-x-0 bottom-0 top-[8.5rem] z-40 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_28px)] transition-[opacity,visibility] duration-300 ${showLiked ? "visible opacity-100 delay-100" : "invisible opacity-0"
          }`}
      >
        <div className="mx-auto w-[min(92vw,1000px)] pb-16 pt-6">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Liked games</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {games ? `${games.length} ${games.length === 1 ? "game" : "games"}` : "Loading…"}
            </p>
          </header>

          {games === null && (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-white/5" />
              ))}
            </ul>
          )}

          {games?.length === 0 && (
            <p className="py-24 text-center text-sm text-neutral-500">
              Nothing here yet. Swipe right on a few games.
            </p>
          )}

          {games && games.length > 0 && (
            <ul key={opens} className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {games.map((g, i) => (
                <li
                  key={g.id}
                  ref={(el) => {
                    if (el) items.current.set(g.id, el);
                    else items.current.delete(g.id);
                  }}
                  className="liked-card"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`More about ${g.name}`}
                    onClick={(e) => openDetail(g, e.currentTarget.parentElement as HTMLElement)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        openDetail(g, e.currentTarget.parentElement as HTMLElement);
                      }
                    }}
                    className="group flex h-full cursor-pointer flex-col gap-2 rounded-xl outline-none transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06060a] active:scale-[0.97]"
                    style={
                      leaving.has(g.id)
                        ? { animation: "likedOut 0.45s cubic-bezier(0.3, 0, 0.6, 1) forwards" }
                        : intro
                          ? { animation: `likedUp 0.8s ${EASE} ${120 + Math.min(i, 8) * 45}ms backwards` }
                          : undefined
                    }
                  >
                    <div
                      data-cover
                      className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9)] transition-shadow duration-300 group-hover:shadow-[0_28px_50px_-18px_rgba(0,0,0,0.95)]"
                      style={{
                        opacity: detail?.game.id === g.id && !revealing ? 0 : 1,
                        transition: "none",
                      }}
                    >
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
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-white">{g.name}</p>
                      <p className="text-xs text-neutral-500">{g.year ?? ""}</p>
                    </div>
                    <div className="mt-auto flex gap-2">
                      <a
                        href={steamUrl(g.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 rounded-lg border border-white/10 py-1.5 text-center text-xs text-neutral-300 transition hover:border-white/25 hover:text-white"
                      >
                        Steam ↗
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(g.id);
                        }}
                        className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-white/25 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* detail sheet: lives outside the masked section so it can cover the nav too */}
      {detail && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4 md:p-8">
          <div
            ref={scrimRef}
            onClick={() => closeDetail()}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* the sheet's background: grows out of the card cover */}
          <div
            ref={morphRef}
            aria-hidden="true"
            className="pointer-events-none fixed border border-white/10 bg-[#070b1c] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)]"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={detail.game.name}
            className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px]"
          >
            <div data-rise className="relative h-52 shrink-0 overflow-hidden md:h-72">
              {heroSrc ? (
                <img src={heroSrc} alt="" className="size-full object-cover object-[center_30%]" />
              ) : (
                <div className="size-full bg-[radial-gradient(90%_120%_at_85%_15%,rgba(120,100,255,0.4),transparent_60%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b1c] via-[#070b1c]/55 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#070b1c]/90 to-transparent" />
            </div>

            <button
              type="button"
              aria-label="Close"
              data-rise
              onClick={() => closeDetail()}
              className="absolute right-4 top-4 z-10 grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-4" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="relative -mt-16 flex min-h-0 flex-1 flex-col md:-mt-20">
              <div className="flex shrink-0 items-end gap-4 px-6 md:gap-6 md:px-9">
                {detail.game.cover && (
                  <img
                    ref={thumbRef}
                    src={detail.game.cover}
                    alt=""
                    className="aspect-[3/4] h-28 shrink-0 rounded-lg border border-white/15 object-cover opacity-0 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.85)] md:h-36"
                  />
                )}
                <div data-rise className="min-w-0 pb-1">
                  <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.7),0_4px_24px_rgba(0,0,0,0.8)] md:text-3xl">
                    {detail.game.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.8),0_2px_14px_rgba(0,0,0,0.7)]">
                    {detail.game.rating != null && (
                      <span className="rounded-full bg-black/40 px-2.5 py-0.5 font-semibold tabular-nums text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-sm [text-shadow:none]">
                        {(detail.game.rating / 10).toFixed(1)}
                      </span>
                    )}
                    {detail.game.year && <span>{detail.game.year}</span>}
                  </div>
                </div>
              </div>

              {/* only this part scrolls; its scrollbar gutter is always reserved, so nothing reflows when the bar appears */}
              <div
                ref={scrollRef}
                className="nice-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 pl-6 pr-3 pt-5 [scrollbar-gutter:stable] md:pl-9 md:pr-6"
              >
                <div data-rise className="flex flex-wrap gap-2">
                  {detail.game.genres.map((g) => (
                    <span key={g.id} className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-neutral-300">
                      {GENRE_NAME.get(g.id) ?? g.name}
                    </span>
                  ))}
                </div>

                {detail.game.summary && (
                  <p data-rise className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-neutral-200">
                    {detail.game.summary}
                  </p>
                )}

                {detail.game.storyline && (
                  <div data-rise>
                    <h4 className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Storyline</h4>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-neutral-300">
                      {detail.game.storyline}
                    </p>
                  </div>
                )}

                {shots.length > 0 && (
                  <div
                    data-rise
                    className="nice-scroll -ml-6 -mr-3 mt-7 flex snap-x scroll-pl-6 scroll-pr-3 gap-3 overflow-x-scroll pb-2 pl-6 pr-3 [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)] md:-ml-9 md:-mr-6 md:scroll-pl-9 md:scroll-pr-6 md:pl-9 md:pr-6"
                  >
                    {shots.map((s, i) => (
                      <img
                        key={s}
                        ref={(el) => {
                          shotRefs.current[i] = el;
                        }}
                        src={s}
                        alt=""
                        loading="lazy"
                        onClick={(e) => openLb(i, e.currentTarget)}
                        style={{ opacity: lb?.i === i ? 0 : 1 }}
                        className="h-32 shrink-0 cursor-zoom-in snap-start rounded-xl border border-white/10 object-cover transition-[filter] duration-200 hover:brightness-110 md:h-40"
                      />
                    ))}
                  </div>
                )}

                <div data-rise className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={steamUrl(detail.game.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 active:scale-95"
                  >
                    View on Steam ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const id = detail.game.id;
                      closeDetail(() => remove(id));
                    }}
                    className="cursor-pointer rounded-xl border border-white/10 bg-neutral-900 px-5 py-2 text-sm font-medium text-neutral-300 transition hover:border-white/25 hover:text-white active:scale-95"
                  >
                    Remove from liked
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* the cover in flight: sits above everything so it is never clipped by the panel */}
          {detail.game.cover && (
            <div
              ref={ghostRef}
              aria-hidden="true"
              className="pointer-events-none fixed z-10 overflow-hidden border border-white/10 bg-neutral-900"
              style={{ visibility: "hidden" }}
            >
              <img src={detail.game.cover} alt="" className="size-full object-cover" />
              {detail.game.rating != null && (
                <span
                  ref={badgeRef}
                  className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-white backdrop-blur-sm"
                >
                  {(detail.game.rating / 10).toFixed(1)}
                </span>
              )}
            </div>
          )}

          {lb && shots[lb.i] && (
            <div className="fixed inset-0 z-[80] grid place-items-center">
              <div ref={lbScrimRef} onClick={closeLb} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <img
                key={lb.i}
                ref={lbImgRef}
                src={shots[lb.i]}
                alt=""
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                className={`relative rounded-xl object-contain shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)] ${lb.rect ? "" : "max-h-[84dvh] max-w-[92vw]"}`}
                style={
                  lb.rect
                    ? (() => {
                      const k = Math.min((window.innerWidth * 0.92) / lb.nw, (window.innerHeight * 0.84) / lb.nh);
                      return { width: lb.nw * k, height: lb.nh * k };
                    })()
                    : { animation: "lbFade 300ms ease-out" }
                }
              />
              <div ref={lbUiRef} className="pointer-events-none absolute inset-0">
                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeLb}
                  className="pointer-events-auto absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-4" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
                {(["prev", "next"] as const).map((side) => {
                  const dis = side === "prev" ? lb.i === 0 : lb.i === shots.length - 1;
                  return (
                    <button
                      key={side}
                      type="button"
                      aria-label={side === "prev" ? "Previous screenshot" : "Next screenshot"}
                      disabled={dis}
                      onClick={() => stepLb(side === "prev" ? -1 : 1)}
                      className={`pointer-events-auto absolute top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white disabled:cursor-default disabled:opacity-20 ${side === "prev" ? "left-4" : "right-4"}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
                        <path d={side === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
                      </svg>
                    </button>
                  );
                })}
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs tabular-nums text-neutral-300 backdrop-blur-sm">
                  {lb.i + 1} / {shots.length}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
