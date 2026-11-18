"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from "react";
import GameCard from "./GameCard";
import { GameSchema } from "../lib/igdb";
import { normalizeGame, type Game } from "../lib/game";
import { supabase, ensureSession } from "../lib/supabase/client";
import { loadFeed } from "../lib/feed";
import {
  DEFAULT_PALETTE,
  extractPalette,
  hueFromString,
  paletteFromHex,
  paletteFromHue,
  type Palette,
} from "../lib/color";
import { z } from "zod"
import { track, flushNow } from "../lib/track";
type Dir = 1 | -1;
type Entry = { id: number; dir: Dir };
type Drag = { x0: number; y0: number; lastX: number; lastT: number; vx: number; dx: number; dy: number };

const VISIBLE = 3;
const DISTANCE = 0.28;
const MAX_DISTANCE = 170;
const VELOCITY = 0.5;
const FLY_MS = 360;
const STORAGE_KEY = "GAME_DECISIONS";
const REFILL_AT = 195;
const KEEP = 3;
const COOLDOWN = 3;

const WIDTH = "w-[min(92vw,1000px)]";
const rise = "animate-[rise_0.9s_cubic-bezier(0.16,1,0.3,1)_backwards]";
const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06060a]";

const TRANSITION = "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease";

const restStyle = (i: number): CSSProperties => {
  if (i === 0) return { zIndex: VISIBLE, transform: "none", opacity: 1, transition: TRANSITION };
  if (i === 1) {
    return {
      zIndex: VISIBLE - i,
      opacity: "var(--pabs, 0)",
      transform: "scale(calc(0.94 + 0.06 * var(--pabs, 0)))",
      transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
    };
  }
  return { zIndex: VISIBLE - i, opacity: 0, transform: "scale(0.9)", transition: TRANSITION };
};

const pad = (n: number) => String(n).padStart(2, "0");

const quiet =
  "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 transition-[color,background-color,border-color,transform,scale,opacity,box-shadow] duration-200 hover:border-white/25 hover:text-white enabled:hover:shadow-[0_0_28px_-4px_rgb(var(--accent)/0.6)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-neutral-300";

const lit = "scale-90 border-white/40 text-white shadow-[0_0_36px_0_rgb(var(--accent)/0.85)]";

function Kbd({ children, dark, lit }: { children: ReactNode; dark?: boolean; lit?: boolean }) {
  return (
    <kbd
      className={`hidden rounded border px-1.5 py-0.5 text-[10px] font-normal leading-none transition-colors duration-150 sm:inline-block ${lit
        ? "border-[rgb(var(--accent))] text-[rgb(var(--accent))]"
        : dark
          ? "border-black/20 text-neutral-600"
          : "border-white/15 text-neutral-500"
        }`}
    >
      {children}
    </kbd>
  );
}

export default function SwipeDeck({
  preferred,
  paused = false,
}: {
  preferred: Set<number>;
  paused?: boolean;
}) {
  const [feed, setFeed] = useState<Game[] | null>(null);
  const games = feed ?? [];
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<Entry[]>([]);
  const [announce, setAnnounce] = useState("");
  const [flash, setFlash] = useState<"skip" | "like" | "undo" | null>(null);
  const [navFlash, setNavFlash] = useState<"prev" | "next" | null>(null);
  const [shots, setShots] = useState<Record<number, number>>({});
  const [palettes, setPalettes] = useState<Record<number, Palette>>({});
  const stage = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const indexRef = useRef(0);
  const reentry = useRef<0 | 1 | -1>(0);
  const drag = useRef<Drag | null>(null);
  const prefKey = [...preferred].sort((a, b) => a - b).join(",");
  const prefIds = () => (prefKey ? prefKey.split(",").map(Number) : []);
  const headerRef = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    setLift(paused ? Math.min(0, 76 - el.getBoundingClientRect().top) : 0);
  }, [paused]);

  const slide: CSSProperties = {
    transform: paused ? "translateX(-85vw)" : undefined,
    opacity: paused ? 0 : 1,

    filter: paused ? "blur(4px)" : undefined,
    transition:
      "transform 520ms cubic-bezier(0.55, 0, 0.2, 1), opacity 260ms ease-in 30ms, filter 300ms ease",
  };

  useEffect(() => {
    let cancelled = false;
    loadFeed(prefIds()).then((g) => !cancelled && setFeed(g));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefKey]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);


  useEffect(() => {
    const latest = new Map<number, Dir>();
    history.forEach((h) => latest.set(h.id, h.dir));
    const liked: number[] = [];
    const passed: number[] = [];
    latest.forEach((dir, id) => (dir === 1 ? liked : passed).push(id));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ liked, passed }));
    } catch { }
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    games.slice(index, index + VISIBLE).forEach(async (g) => {
      const src = g.artworks ?? g.cover;
      if (!src) return;
      const p = await extractPalette(src);
      if (p && !cancelled) setPalettes((prev) => (prev[g.id] ? prev : { ...prev, [g.id]: p }));
    });
    return () => {
      cancelled = true;
    };
  }, [index, games]);

  const paletteOf = (g?: Game): Palette => {
    if (!g) return DEFAULT_PALETTE;
    return palettes[g.id] ?? paletteFromHue(hueFromString(g.name));
  };

  const currentGame = games[index];
  const done = index < 0 || index >= games.length || !currentGame;
  const topPalette = done ? DEFAULT_PALETTE : paletteOf(currentGame);
  const shownAt = useRef(0);
  const lastViewed = useRef<number | null>(null);

  useEffect(() => {
    if (!currentGame || lastViewed.current === currentGame.id) return;
    lastViewed.current = currentGame.id;
    shownAt.current = Date.now();
    track({ type: "view", gameId: currentGame.id });
  }, [currentGame]);

  const accentKey = topPalette.accent.join(" ");
  const loKey = topPalette.lo.join(",");
  const hiKey = topPalette.hi.join(",");

  useEffect(() => {
    const norm = (k: string) => k.split(",").map((v) => Number(v) / 255);
    window.dispatchEvent(new CustomEvent("halftone:theme", { detail: { lo: norm(loKey), hi: norm(hiKey) } }));
  }, [loKey, hiKey]);

  const fly = useCallback(
    (dir: Dir, dy = -24) => {
      const el = top.current;
      if (!el || busy.current) return;
      busy.current = true;
      stage.current?.style.setProperty("--pabs", "1");

      el.style.transition = `transform ${FLY_MS}ms cubic-bezier(0.3, 0.6, 0.3, 1), opacity ${FLY_MS}ms ease-in`;
      el.style.transform = `translate3d(${dir * window.innerWidth}px, ${dy}px, 0) rotate(${dir * 14}deg)`;
      el.style.opacity = "0";
      el.style.setProperty("--p", String(dir));

      window.setTimeout(() => {
        const game = games[indexRef.current];
        if (game) {
          setHistory((h) => [...h, { id: game.id, dir }]);
          track({
            type: dir === 1 ? "like" : "pass",
            gameId: game.id,
            dwellMs: Date.now() - shownAt.current,
          });

          setAnnounce(`${dir === 1 ? "Interested in" : "Skipped"} ${game.name}`);
        }
        setIndex((i) => i + 1);
        busy.current = false;
      }, FLY_MS);
    },
    [games]
  );

  const undo = useCallback(() => {
    if (busy.current) return;
    const last = history[history.length - 1];
    if (!last) return;
    track({ type: "undo", gameId: last.id });
    reentry.current = last.dir;
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  }, [history]);

  const stepShot = useCallback(
    (x: number) => {
      const g = games[indexRef.current];
      if (!g) return;
      const n = (g.artworks ?? g.cover ? 1 : 0) + (g.screenshots?.length ?? 0);
      if (n < 2) return;
      setShots((s) => {
        const cur = s[g.id] ?? 0;
        const next = x < 0.33 ? Math.max(0, cur - 1) : Math.min(n - 1, cur + 1);
        return next === cur ? s : { ...s, [g.id]: next };
      });
    },
    [games]
  );
  useLayoutEffect(() => {
    stage.current?.style.setProperty("--pabs", "0");

    const dir = reentry.current;
    if (!dir) return;
    reentry.current = 0;
    top.current?.animate(
      [
        { transform: `translate3d(${dir * window.innerWidth * 0.5}px, 0, 0) rotate(${dir * 10}deg)`, opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }
    );
  }, [index]);
  useEffect(() => {
    if (document.querySelector("[data-deck-paused],[aria-expanded='true']")) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[data-overlay-open]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tap = (k: "skip" | "like" | "undo") => {
        setFlash(k);
        window.setTimeout(() => setFlash(null), 180);
      };
      if (e.key === "ArrowRight") {
        e.preventDefault();
        tap("like");
        fly(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        tap("skip");
        fly(-1);
      } else if (e.key === "z" || e.key === "Z" || e.key === "Backspace") {
        e.preventDefault();
        tap("undo");
        undo();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setNavFlash("next");
        window.setTimeout(() => setNavFlash(null), 180);
        stepShot(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setNavFlash("prev");
        window.setTimeout(() => setNavFlash(null), 180);
        stepShot(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fly, undo, stepShot]);

  const threshold = (el: HTMLElement) => Math.min(el.offsetWidth * DISTANCE, MAX_DISTANCE);
  const tilt = (e: RPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--tx", `${(0.5 - py) * 6}deg`);
    el.style.setProperty("--ty", `${(px - 0.5) * 8}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const untilt = (el: HTMLElement) => {
    el.style.setProperty("--tx", "0deg");
    el.style.setProperty("--ty", "0deg");
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (busy.current || e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    el.style.transition = "none";
    untilt(el);
    drag.current = { x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastT: e.timeStamp, vx: 0, dx: 0, dy: 0 };
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) {
      if (e.pointerType === "mouse") tilt(e);
      return;
    }
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.vx = d.vx * 0.7 + ((e.clientX - d.lastX) / dt) * 0.3;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    d.dx = dx;
    d.dy = dy;

    const el = e.currentTarget;
    const p = Math.max(-1, Math.min(1, dx / threshold(el)));
    el.style.transform = `translate3d(${dx}px, ${dy * 0.35}px, 0) rotate(${(dx / el.offsetWidth) * 12}deg)`;
    el.style.setProperty("--p", String(p));
    stage.current?.style.setProperty("--pabs", String(Math.abs(p)));
  };

  const onEnd = (e: RPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const el = e.currentTarget;
    if (!cancelled && Math.abs(d.dx) < 6 && Math.abs(d.dy) < 6) {
      const r = el.getBoundingClientRect();
      stepShot((e.clientX - r.left) / r.width);
    }

    const far = Math.abs(d.dx) > threshold(el);
    const fast = Math.abs(d.vx) > VELOCITY && Math.abs(d.dx) > 24;
    if (!cancelled && (far || fast)) {
      fly(((fast ? d.vx : d.dx) > 0 ? 1 : -1) as Dir, d.dy * 0.35);
      return;
    }
    el.style.transition = "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "none";
    el.style.setProperty("--p", "0");
    stage.current?.style.setProperty("--pabs", "0");
  };


  const visible = games.slice(index, index + VISIBLE);
  const liked = history.filter((h) => h.dir === 1).length;
  const progress = games.length ? Math.min(index, games.length) / games.length : 0;


  const restart = () => {
    lastRefill.current = 0;
    setFeed(null);
    setIndex(0);
    setHistory([]);
    loadFeed(prefIds()).then(setFeed);
  };
  const refilling = useRef(false);
  const lastRefill = useRef(0);

  useEffect(() => {
    if (feed === null || refilling.current) return;
    if (feed.length - index > REFILL_AT) return;
    if (index - lastRefill.current < COOLDOWN) return;

    refilling.current = true;
    lastRefill.current = index;

    (async () => {
      await flushNow(); // save swipes so the ranking sees them
      const fresh = await loadFeed(prefIds());
      setFeed((cur) => {
        if (!cur) return cur;
        const head = cur.slice(0, indexRef.current + KEEP);
        const used = new Set(head.map((g) => g.id));
        return [...head, ...fresh.filter((g) => !used.has(g.id))];
      });
    })().finally(() => {
      refilling.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, feed]);

  if (feed === null) {
    return <div className="grid min-h-dvh place-items-center text-sm text-neutral-500">Loading…</div>;
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 pt-20 pb-6">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-40 transition-[background-color] duration-1000 ease-out [mask-image:radial-gradient(65%_60%_at_50%_45%,black,transparent_80%)]"
        style={{ backgroundColor: `rgb(${accentKey} / 0.45)` }}
      />

      {/* header */}
      <div
        ref={headerRef}
        className={`${rise} ${WIDTH} relative z-[45]`}
        style={{
          animationDelay: "100ms",
          transform: `translateY(${lift}px)`,
          transition: "transform 800ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <header className="flex items-center justify-between">
          <div className="flex">
            <div className="flex items-center gap-3">
              <img src="/favicon.ico" width={24} height={24} alt="" className="size-6 rounded-md" />
            </div>

          </div>
          <div className="flex items-center gap-4">
            <div
              className="text-xs tabular-nums text-neutral-500 transition-opacity duration-300" style={{ opacity: paused ? 0 : 1 }}>
              <span
                key={index}
                className="inline-block animate-[rise_0.5s_cubic-bezier(0.16,1,0.3,1)_backwards] text-neutral-300"
              >
                {pad(Math.min(index + 1, games.length))}
              </span> / {pad(games.length)}
            </div>
          </div>
        </header>
        <div className="mb-4 mt-3 h-px overflow-hidden bg-white/10">
          <div
            className="h-full transition-[width,background-color] duration-700 ease-out"
            style={{ width: `${progress * 100}%`, backgroundColor: `rgb(${accentKey})` }}
          />
        </div>
      </div>

      <div className={rise} style={{ animationDelay: "250ms", ...slide }}>
        <div ref={stage} className={`relative h-[min(72vh,600px)] ${WIDTH} [--pabs:0]`}>
          {done ? (
            <div className="absolute inset-0 grid place-items-center rounded-2xl border border-white/10 bg-[#0a0910] p-8 text-center">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-white">You&apos;re all caught up</p>
                <p className="mt-2 text-sm text-neutral-400">
                  You were interested in {liked} {liked === 1 ? "game" : "games"}.
                </p>
                <button
                  type="button"
                  onClick={restart}
                  className={`mt-6 rounded-xl border border-white bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 active:scale-95 ${ring}`}
                >
                  Start over
                </button>
              </div>
            </div>
          ) : (
            visible.map((g, i) => (
              <div
                key={g.id}
                ref={i === 0 ? top : undefined}
                style={restStyle(i)}
                aria-label={g.name}
                className={`absolute inset-0 ${i === 0
                  ? "group cursor-grab touch-none select-none will-change-transform active:cursor-grabbing"
                  : "pointer-events-none"
                  }`}
                {...(i === 0
                  ? {
                    onPointerDown: onDown,
                    onPointerMove: onMove,
                    onPointerUp: (e: RPointerEvent<HTMLDivElement>) => onEnd(e, false),
                    onPointerCancel: (e: RPointerEvent<HTMLDivElement>) => onEnd(e, true),
                    onPointerLeave: (e: RPointerEvent<HTMLDivElement>) => untilt(e.currentTarget),
                  }
                  : {})}
              >
                <div className="h-full w-full transition-transform duration-300 ease-out [transform:perspective(1200px)_rotateX(var(--tx,0deg))_rotateY(var(--ty,0deg))]">
                  <GameCard
                    key={g.id}
                    game={g}
                    preferred={preferred}
                    palette={paletteOf(g)}
                    active={i === 0}
                    shot={shots[g.id] ?? 0}
                    onSelect={(n) => setShots((s) => ({ ...s, [g.id]: n }))}
                    navFlash={i === 0 ? navFlash : null}
                    delay={index === 0 && history.length === 0 ? 400 : 0}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className={`${rise} mt-6 flex items-center justify-center gap-3`}
        style={{ animationDelay: "450ms", "--accent": accentKey, ...slide } as CSSProperties}
      >
        <button
          type="button"
          disabled={done}
          onClick={() => fly(-1)}
          className={`${quiet} ${ring} ${flash === "skip" ? lit : ""}`}
        >
          <Kbd lit={flash === "skip"}>←</Kbd>Skip
        </button>

        <button
          type="button"
          aria-label="Undo"
          title="Undo"
          disabled={history.length === 0}
          onClick={undo}
          className={`${quiet} px-3 ${ring} ${flash === "undo" ? lit : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10a6 6 0 010 12h-3" />
          </svg>
        </button>

        <button
          type="button"
          disabled={done}
          onClick={() => fly(1)}
          className={`inline-flex items-center gap-2 rounded-xl border border-white bg-white px-5 py-2 text-sm font-medium text-neutral-950 shadow-[0_0_40px_-8px_rgb(var(--accent)/0.6)] transition-[background-color,transform,scale,opacity,box-shadow] duration-200 hover:bg-neutral-200 enabled:hover:shadow-[0_0_44px_-2px_rgb(var(--accent)/0.9)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${ring} ${flash === "like" ? "scale-90 shadow-[0_0_56px_0_rgb(var(--accent))]" : ""}`}
        >
          Interested <Kbd dark lit={flash === "like"}>→</Kbd>
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
