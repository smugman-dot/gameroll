"use client";
import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { GENRES } from "../lib/genres";
import type { Game } from "../lib/game";
import type { Palette } from "../lib/color";
import { wideFont } from "../fonts";

const GENRE_NAME = new Map<number, string>(GENRES.map((g) => [g.id, g.name]));

const RISE = "animate-[rise_0.8s_cubic-bezier(0.16,1,0.3,1)_backwards]";

const MIN_RATIO = 1.5;

export type { Game };

const steamUrl = (name: string) =>
  `https://store.steampowered.com/search/?term=${encodeURIComponent(name)}`;

const titleSize = (name: string) => {
  const n = name.length;
  if (n <= 18) return "text-4xl md:text-6xl";
  if (n <= 26) return "text-3xl md:text-5xl";
  if (n <= 36) return "text-2xl md:text-4xl";
  return "text-xl md:text-3xl";
};

function ArtFallback({ palette }: { palette: Palette }) {
  const a = palette.accent.join(" ");
  const lo = palette.lo.join(" ");
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(90% 120% at 85% 15%, rgb(${a} / 0.55), transparent 60%), radial-gradient(70% 90% at 100% 100%, rgb(${lo} / 0.55), transparent 70%), #0a0910`,
      }}
    >
      <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.4)_1.4px,transparent_1.5px)] [background-size:14px_14px] [mask-image:radial-gradient(70%_100%_at_90%_30%,black,transparent_75%)]" />
    </div>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0 fill-current md:size-5" aria-hidden="true">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8L12 2.5z" />
    </svg>
  );
}

function Stars({ value }: { value: number }) {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <div
      className="relative inline-flex"
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
      title={`${(value * 2).toFixed(1)} / 10`}
    >
      <div className="flex gap-1 text-white/20">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} />
        ))}
      </div>
      <div
        className="absolute inset-y-0 left-0 flex gap-1 overflow-hidden text-[rgb(var(--accent))]"
        style={{ width: `${pct}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} />
        ))}
      </div>
    </div>
  );
}

function NavArrow({
  side,
  lit,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  lit: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous image" : "Next image"}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-30 hidden size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border backdrop-blur-sm transition-[color,background-color,border-color,box-shadow,scale,opacity] duration-200 md:grid ${side === "left" ? "left-2.5" : "right-2.5"
        } ${lit
          ? "scale-90 border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.25)] text-[rgb(var(--accent))] shadow-[0_0_28px_0_rgb(var(--accent)/0.8)]"
          : "border-white/15 bg-black/35 text-white/70 enabled:hover:border-[rgb(var(--accent))] enabled:hover:bg-[rgb(var(--accent)/0.15)] enabled:hover:text-[rgb(var(--accent))] enabled:hover:shadow-[0_0_24px_-2px_rgb(var(--accent)/0.7)] enabled:active:scale-90"
        } disabled:cursor-default disabled:opacity-20`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
        <path d={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

async function getArtwork(gameName: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/steamgriddb?name=${encodeURIComponent(gameName)}`);
    const data = await response.json();
    if (!response.ok) {
      console.error("Artwork API error:", data);
      return [];
    }
    return (data.heroes ?? []).map((item: { url: string }) => item.url);
  } catch (error) {
    console.error("Failed to get artwork:", error);
    return [];
  }
}

const artCache = new Map<string, Promise<string[]>>();
const getArtworkCached = (name: string) => {
  if (!artCache.has(name)) artCache.set(name, getArtwork(name));
  return artCache.get(name)!;
};

export default function GameCard({
  game,
  preferred,
  palette,
  active = false,
  delay = 0,
  shot = 0,
  onSelect,
  navFlash = null,
}: {
  game: Game;
  preferred: Set<number>;
  palette: Palette;
  active?: boolean;
  delay?: number;
  shot?: number;
  onSelect?: (index: number) => void;
  navFlash?: "prev" | "next" | null;
}) {
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [logoBroken, setLogoBroken] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);
  const [steamArtwork, setSteamArtwork] = useState<string[]>([]);

  const [open, setOpen] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const [fullH, setFullH] = useState(0);
  const descRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const markBad = (src: string) => setFailed((f) => (f[src] ? f : { ...f, [src]: true }));

  const heroBad = !game.artworks || !!failed[game.artworks];

  useEffect(() => {
    if (!heroBad) return;
    let cancelled = false;
    getArtworkCached(game.name).then((r) => {
      if (!cancelled) setSteamArtwork(r);
    });
    return () => {
      cancelled = true;
    };
  }, [game.name, heroBad]);

  const images = [
    ...(game.artworks && !heroBad ? [game.artworks] : []),
    ...(heroBad ? steamArtwork.slice(0, 3) : []),
    ...(game.screenshots ?? []),
  ].filter((s) => !failed[s]);

  const current = Math.min(shot, images.length - 1);

  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight);
      if (!lh) return;
      const lines = window.matchMedia("(min-width: 768px)").matches ? 5 : 4;
      setOverflowing(el.scrollHeight > lh * lines + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [game.summary]);

  const openDesc = () => {
    const el = descRef.current;
    if (!el) return;
    const cap = Math.min(380, Math.round(window.innerHeight * 0.55));
    setFullH(Math.min(el.scrollHeight, cap));
    setScrollable(false);
    setOpen(true);
  };

  const closeDesc = () => {
    if (descRef.current) descRef.current.scrollTop = 0;
    setScrollable(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDesc();
    };
    const onDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) closeDesc();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!active) closeDesc();
  }, [active]);

  const stars = game.rating != null ? game.rating / 20 : null;
  const matches = game.genres.filter((g) => preferred.has(g.id)).length;
  const initials = game.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const rise = active ? RISE : "opacity-0";
  const at = (ms: number): CSSProperties | undefined =>
    active ? { animationDelay: `${delay + ms}ms` } : undefined;

  const dim = `transition-[opacity,filter] duration-500 ${open ? "!opacity-20 blur-[3px]" : ""}`;

  return (
    <article
      style={{ "--accent": palette.accent.join(" ") } as CSSProperties}
      className="relative h-full w-full rounded-2xl border border-white/10 bg-[#0a0910] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)]"
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 transition-[filter] duration-200 [filter:grayscale(max(calc(var(--p,0)*-1),0))]">
          <div className="absolute inset-0 origin-center transition-transform duration-300 [transform:translateX(calc(var(--p,0)*-8px))_scale(1.04)]">
            {images.length ? (
              images.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  draggable={false}
                  onError={() => markBad(src)}
                  onLoad={(e) => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                    if (w && h && w / h < MIN_RATIO) markBad(src);
                  }}
                  className={`absolute inset-0 size-full select-none object-cover object-[center_30%] transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0"
                    }`}
                />
              ))
            ) : (
              <ArtFallback palette={palette} />
            )}
          </div>
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,7,14,0.96)_0%,rgba(8,7,14,0.9)_24%,rgba(8,7,14,0.72)_42%,rgba(8,7,14,0.42)_60%,rgba(8,7,14,0.14)_80%,transparent_100%)] md:hidden" />
        {/* mobile: soft scrim up top so the progress bars and logo stay readable on bright art */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent md:hidden" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(75%_100%_at_20%_52%,rgba(8,7,14,0.6),transparent_78%),linear-gradient(to_right,rgba(8,7,14,0.93)_0%,rgba(8,7,14,0.88)_14%,rgba(8,7,14,0.74)_28%,rgba(8,7,14,0.52)_42%,rgba(8,7,14,0.3)_56%,rgba(8,7,14,0.13)_70%,rgba(8,7,14,0.04)_85%,transparent_100%)] md:block" />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col justify-between gap-6 px-5 pb-6 pt-9 [text-shadow:0_2px_22px_rgba(0,0,0,0.65)] md:w-[52%] md:p-10 md:pl-16">
        {/* top: logo / cover only */}
        <div className={`${rise} w-fit`} style={at(0)}>
          {game.logo && !logoBroken ? (
            <img
              src={game.logo}
              alt=""
              draggable={false}
              onError={() => setLogoBroken(true)}
              className="h-12 max-w-[60%] select-none object-contain object-left drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)] md:h-14"
            />
          ) : game.cover && !coverBroken ? (
            <img
              src={game.cover}
              alt=""
              draggable={false}
              onError={() => setCoverBroken(true)}
              className={`aspect-[3/4] h-24 select-none rounded-lg border border-white/15 object-cover shadow-[0_12px_30px_-8px_rgba(0,0,0,0.85)] md:h-32 [@media(max-height:800px)]:md:h-24 ${images.length ? "max-md:hidden" : ""}`}
            />
          ) : (
            <div
              className={`${wideFont.className} grid size-12 place-items-center rounded-xl border border-[rgb(var(--accent)/0.4)] bg-[rgb(var(--accent)/0.14)] text-sm tracking-wide text-[rgb(var(--accent))] md:size-14 md:text-base`}
            >
              {initials}
            </div>
          )}
        </div>

        <div className="space-y-4 md:space-y-5">
          <h2
            className={`${wideFont.className} ${rise} ${dim} ${titleSize(game.name)} leading-[1.02] tracking-tight text-white`}
            style={at(70)}
          >
            <a
              href={steamUrl(game.name)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${game.name} on Steam`}
              onPointerDown={(e) => e.stopPropagation()}
              className={`group/title -mx-3 -my-1.5 inline-flex max-w-[calc(100%+1.5rem)] cursor-pointer items-start gap-[0.3em] rounded-[0.55em] px-3 py-1.5 outline-none transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-out hover:bg-white/10 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.14)] hover:backdrop-blur-md focus-visible:bg-white/10 focus-visible:shadow-[0_0_0_2px_rgb(var(--accent))] ${open ? "pointer-events-none" : ""
                }`}
            >
              <span className="line-clamp-3">{game.name}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="mt-[0.28em] size-[0.5em] shrink-0 -translate-x-2 translate-y-1 text-[rgb(var(--accent))] opacity-0 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/title:translate-x-0 group-hover/title:translate-y-0 group-hover/title:opacity-100 group-focus-visible/title:translate-x-0 group-focus-visible/title:translate-y-0 group-focus-visible/title:opacity-100"
              >
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </a>
          </h2>

          <div className={`${rise} ${dim} flex flex-wrap items-center gap-x-4 gap-y-2`} style={at(140)}>
            {stars != null && (
              <>
                <Stars value={stars} />
                <span className="rounded-full bg-[rgb(var(--accent)/0.15)] px-2.5 py-0.5 text-sm font-semibold tabular-nums text-[rgb(var(--accent))]">
                  {(stars * 2).toFixed(1)}
                </span>
              </>
            )}
            {game.year && <span className="text-sm tracking-wide text-neutral-400">{game.year}</span>}
            {matches > 0 && (
              <span className="basis-full text-[13px] text-neutral-300 md:basis-auto md:text-sm">
                Matches {matches} of your {matches === 1 ? "genre" : "genres"}
              </span>
            )}
          </div>

          <div className={`${rise} ${dim} flex flex-wrap gap-2`} style={at(210)}>
            {game.genres.slice(0, 4).map((genre) => (
              <span
                key={genre.id}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${preferred.has(genre.id)
                  ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--accent))]"
                  : "border-white/30 text-neutral-200"
                  }`}
              >
                {GENRE_NAME.get(genre.id) ?? genre.name}
              </span>
            ))}
          </div>

          {game.summary && (
            <div className={`${rise} relative`} style={at(280)}>
              <div aria-hidden="true" className="invisible max-w-[46ch]">
                <div className="max-h-[5.69rem] overflow-hidden text-sm leading-relaxed md:max-h-[8.12rem] md:text-base">
                  {game.summary}
                </div>
                {overflowing && <span className="mt-2 inline-block text-xs">Read more</span>}
              </div>

              <div
                ref={panelRef}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute bottom-0 left-0 z-20 w-full max-w-[46ch]"
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -bottom-4 -inset-x-5 -top-5 -z-10 origin-bottom rounded-[28px] border border-white/10 bg-[#070b1c]/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_-24px_rgb(var(--accent)/0.55)] backdrop-blur-xl transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
                    }`}
                />

                <div
                  ref={descRef}
                  style={open ? { maxHeight: fullH } : undefined}
                  onClick={() => overflowing && !open && openDesc()}
                  onTransitionEnd={(e) => {
                    if (e.propertyName === "max-height" && open) setScrollable(true);
                  }}
                  className={`overflow-hidden text-sm leading-relaxed outline-none transition-[max-height,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:text-base ${open
                    ? `text-neutral-100 ${scrollable ? "overflow-y-auto pr-2 [scrollbar-width:thin]" : ""}`
                    : `max-h-[5.69rem] text-neutral-300/90 md:max-h-[8.12rem] ${overflowing ? "cursor-pointer hover:text-neutral-100" : ""}`
                    }`}
                >
                  {game.summary}
                </div>

                {overflowing && (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => (open ? closeDesc() : openDesc())}
                    className="mt-2 inline-block cursor-pointer text-xs font-medium text-[rgb(var(--accent))] outline-none transition-opacity hover:opacity-80 focus-visible:underline"
                  >
                    {open ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {active && images.length > 1 && (
        <>
          <NavArrow
            side="left"
            lit={navFlash === "prev"}
            disabled={current <= 0}
            onClick={() => onSelect?.(current - 1)}
          />
          <NavArrow
            side="right"
            lit={navFlash === "next"}
            disabled={current >= images.length - 1}
            onClick={() => onSelect?.(current + 1)}
          />
        </>
      )}

      {images.length > 1 && (
        <div className="pointer-events-none absolute inset-x-6 top-2.5 z-20 flex gap-1.5 md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:w-56">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i === current ? "bg-white" : "bg-white/30"
                }`}
            />
          ))}
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(520px_circle_at_var(--gx,50%)_var(--gy,50%),rgba(255,255,255,0.07),transparent_60%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-2xl shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.9),inset_0_0_90px_rgb(var(--accent)/0.35)] transition-opacity duration-200 [opacity:max(var(--p,0),0)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-2xl bg-black transition-opacity duration-200 [opacity:max(calc(var(--p,0)*-0.4),0)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-5 z-20 rounded-lg border border-white/30 bg-black/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-opacity duration-200 [opacity:clamp(0,calc(var(--p,0)*1.6),1)]"
      >
        Interested
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-5 z-20 rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-300 transition-opacity duration-200 [opacity:clamp(0,calc(var(--p,0)*-1.6),1)]"
      >
        Skip
      </span>
    </article>
  );
}
