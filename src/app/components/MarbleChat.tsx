"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import GameCard from "./GameCard";
import { DEFAULT_PALETTE, extractPalette, hueFromString, paletteFromHue, type Palette } from "../lib/color";
import type { Game } from "../lib/game";

type Msg = { role: "user" | "assistant"; content: string };

const CHIPS = ["What's it about?", "Would I like it?", "Games like this?"];
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 0.2, 1)";

const ORB = 96;
const DOCK = 34;
const COL = 640;
const LINE_NUDGE = 4;

const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06060a]";

/*
 * Fragment shader: a thin glass bubble filled with liquid satin.
 *  - the liquid is a few big, smooth layers of ONE colour (the accent) in lighter and deeper tones, with dark gaps between the bands
 *  - the glass wall is clear and thin, with a rainbow edge: white on one side, yellow on the other
 *  - no second colour: the accent fills the whole marble
 *  - a colour change spreads softly outward from the middle (uWipe 0 -> 1)
 */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform float uTalk;
uniform float uWipe;
uniform vec3 uAcc;
uniform vec3 uPrev;
uniform vec2 uTilt;

#define PI 3.14159265

float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float g(float x){ return exp(-x * x); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 hue(vec3 c, float a){
  vec3 k = vec3(.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1. - ca);
}

void main(){
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / (.5 * uRes);
  float R = .6667;
  vec2 q = p / R;
  float r = length(q);
  float aa = 2. / (uRes.y * R);
  float ang = atan(q.y, q.x);

  float pulse = uTalk * (.55 + .45 * sin(uT * 7.3) * sin(uT * 3.1 + 1.));

  /* colour change: the new colour spreads softly outward from the middle */
  float front = uWipe * 2. - .1;
  float m = 1. - smoothstep(front - .5, front, r);
  vec3 accP = mix(uPrev, uAcc, m);
  vec3 a0 = clamp(mix(vec3(dot(accP, vec3(.333))), accP, 1.45), 0., 1.);
  vec3 hot = mix(a0, vec3(1.), .3);                  /* same colour, lighter */
  vec3 pale = mix(a0, vec3(1.), .68);
  vec3 deep = a0 * .24 + vec3(.0, .0, .03);                              /* same colour, deeper */

  /* soft outer glow */
  float hg = exp(-max(r - 1., 0.) * 3.6) * (1. - smoothstep(1.15, 1.5, r));
  vec3 halo = mix(a0, hot, .4 + .3 * sin(ang + uT * .3)) * .3 * hg * (.85 + .5 * pulse);
  float ha = max(halo.r, max(halo.g, halo.b));

  float inside = 1. - smoothstep(1. - aa, 1., r);
  if (inside <= 0.) { gl_FragColor = vec4(halo, ha); return; }

  /* ---------- the liquid: layered satin bands that slowly sweep and fold ---------- */
  const float RL = .925;                       /* radius of the liquid; the glass wall is the rest */
  float rl = min(r / RL, 1.);
  float nzl = sqrt(1. - rl * rl);
  float t = uT * (.2 + .06 * uTalk);

  vec2 w = q / RL;
  w *= 1. + .16 * (1. - nzl);                /* the wall bends the edge of the picture a little */
  w -= uTilt * .06;
  w = rot(t * .55 + .6 * sin(t * .43)) * w;  /* the whole pattern turns, so the big shapes travel around */
  w += .38 * vec2(sin(w.y * 2.0 + t * 1.3 + sin(w.x * 1.6 - t)), sin(w.x * 1.8 - t * 1.1 + sin(w.y * 1.4 + t * .8)));
  float s = w.y * 1.15 + .5 * sin(w.x * 1.7 + t * 1.2) + .26 * sin(w.y * 3.1 - t * .9 + w.x * 1.3);

  /* one colour fills the whole marble: soft satin folds that only change its depth, lit like a glass sphere */
  float fold = .5 + .5 * sin(s * 6. + 1.6 * sin(w.x * 2.2 + t * 1.4));
  fold = smoothstep(.0, 1., fold);                                 /* soft ridges, no hard stripes */
  float sweep = smoothstep(-.9, .8, s);                            /* broad light-to-deep sweep across the glass */
  vec3 col = mix(deep, a0, .3 + .7 * fold);
  col = mix(col, hot, sweep * fold * .5);

  /* sphere lighting: key light from the top left, light passing through toward the bottom right */
  vec3 nrm = vec3(q / RL, nzl);
  vec3 L = normalize(vec3(-.45, .6, .66));
  float diff = clamp(dot(nrm, L), 0., 1.);
  col *= .62 + .7 * diff;
  float thru = pow(clamp(dot(nrm.xy, -L.xy) * .5 + .5, 0., 1.), 2.) * (1. - nzl * .6);
  col += hot * thru * .22;                                         /* soft glow where light exits the far side */
  col *= .8 + .2 * pow(nzl, .6);                                   /* a little depth toward the edge */
  col *= 1. + .3 * pulse;

  /* ---------- the glass wall: clear, thin, with a rainbow edge ---------- */
  float wall = smoothstep(RL - .012, RL + .008, r);
  float rr = clamp((r - RL) / (1. - RL), 0., 1.);
  vec3 wallCol = col * (.62 - .2 * rr) + vec3(.035) + vec3(.05) * rr;
  wallCol += vec3(.06) * g((r - .92) / .03);                       /* the inner face catches a little light */

  float ph = ang + sin(ang * 2.) * .6 + uT * .05 + uTilt.x * .8;
  vec3 film = .55 + .45 * cos(ph + vec3(0., 2.1, 4.2));
  float side = pow(.5 + .5 * cos(ang + uTilt.x * .3), 1.4);
  float white = pow(.5 + .5 * cos(ang - PI + uTilt.x * .3), 5.);
  film = mix(film, vec3(1., .95, .05), side * .7);
  film = mix(film, vec3(1.), white);
  float edge = g((r - .982) / .02);
  float body = g((r - .945) / .05);
  vec3 col2 = mix(col, wallCol, wall);
  col2 += film * edge * (.7 + .9 * (side + white));
  col2 += film * body * .1;
  col2 += vec3(1.) * g(length((q - vec2(-.42, .56)) * vec2(1., 2.2)) / .2) * .16 * (1. - wall);   /* small window reflection */

  col2 += (h2(gl_FragCoord.xy + fract(uT)) - .5) / 255.;
  col2 = clamp(col2, 0., 1.);
  gl_FragColor = mix(vec4(halo, ha), vec4(col2, 1.), inside);
}
`;
const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

const parseRGB = (v: string): [number, number, number] | null => {
  const m = v.match(/[\d.]+/g);
  return m && m.length >= 3 ? [+m[0] / 255, +m[1] / 255, +m[2] / 255] : null;
};

/* one clock for every marble (the button one and the chat one), so the flow carries over when the chat opens and closes */
const clock = { time: 0, last: 0, stamp: -1, tk: 0, nextTk: 0 };
const advance = (now: number, tk: number) => {
  if (now !== clock.stamp) {
    const dt = clock.last ? Math.min((now - clock.last) / 1000, 0.1) : 0;
    clock.last = now;
    clock.stamp = now;
    clock.tk = clock.nextTk;
    clock.nextTk = 0;
    clock.time += dt * (1 + clock.tk * 1.2);
  }
  clock.nextTk = Math.max(clock.nextTk, tk);
  return clock.time;
};

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function Marble({ talking = false, paused = false }: { talking?: boolean; paused?: boolean }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const talk = useRef(talking);
  talk.current = talking;
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const canvas = cvs.current;
    if (!canvas || paused) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uT = gl.getUniformLocation(prog, "uT");
    const uTalk = gl.getUniformLocation(prog, "uTalk");
    const uWipe = gl.getUniformLocation(prog, "uWipe");
    const uAcc = gl.getUniformLocation(prog, "uAcc");
    const uPrev = gl.getUniformLocation(prog, "uPrev");
    const uTilt = gl.getUniformLocation(prog, "uTilt");

    const still = reduced();
    const read = () => parseRGB(getComputedStyle(canvas).getPropertyValue("--accent"));
    let acc: [number, number, number] = read() ?? [0.55, 0.36, 0.96];
    let prev = acc;
    let wipe = 1; // 1 = idle, 0 -> 1 while a colour change spreads
    let tk = 0;
    let time = 0;
    let last = performance.now();
    let raf = 0;
    let n = 0;
    let w = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    // tilt toward the cursor (relative to the orb, saturating at ~300px)
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / 300));
      ty = Math.max(-1, Math.min(1, -(e.clientY - (b.top + b.height / 2)) / 300));
    };
    if (!still) window.addEventListener("pointermove", onMove, { passive: true });

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (n++ % 12 === 0) {
        const next = read();
        if (next && Math.abs(next[0] - acc[0]) + Math.abs(next[1] - acc[1]) + Math.abs(next[2] - acc[2]) > 0.03) {
          prev = wipe > 0.5 ? acc : prev;
          acc = next;
          wipe = still ? 1 : 0;
        }
      }
      if (wipe < 1) wipe = Math.min(1, wipe + dt / 1.3);
      const we = 1 - Math.pow(1 - wipe, 2.2);

      tk += ((talk.current ? 1 : 0) - tk) * (1 - Math.exp(-dt * 4));
      if (!still) time = advance(now, tk);
      const kt = 1 - Math.exp(-dt * 5);
      cx += (tx - cx) * kt;
      cy += (ty - cy) * kt;

      const px = Math.max(1, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)));
      if (px !== w) {
        w = px;
        canvas.width = canvas.height = px;
        gl.viewport(0, 0, px, px);
      }
      gl.uniform2f(uRes, px, px);
      gl.uniform1f(uT, time + 7);
      gl.uniform1f(uTalk, tk);
      gl.uniform1f(uWipe, we);
      gl.uniform3f(uAcc, acc[0], acc[1], acc[2]);
      gl.uniform3f(uPrev, prev[0], prev[1], prev[2]);
      gl.uniform2f(uTilt, cx, cy);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (n === 1) setOk(true);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [paused]);

  return (
    <span className="relative block size-full" aria-hidden="true">
      {!ok && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(180deg, rgb(var(--accent) / 0.55) 0%, rgb(var(--accent)) 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
          }}
        />
      )}
      <canvas ref={cvs} className="pointer-events-none absolute -inset-1/4 size-[150%] max-w-none" />
    </span>
  );
}

/* ---------- motion helpers ---------- */

type Spring = { x: number; v: number };
const step = (s: Spring, target: number, w: number, dt: number) => {
  s.v += (w * w * (target - s.x) - 2 * w * s.v) * dt;
  s.x += s.v * dt;
};
/* same spring, but zeta < 1 overshoots and wobbles before it settles */
const step2 = (s: Spring, target: number, w: number, zeta: number, dt: number) => {
  s.v += (w * w * (target - s.x) - 2 * zeta * w * s.v) * dt;
  s.x += s.v * dt;
};


type Loaded = { game: Game; palette: Palette; ready: Promise<Palette> };
const cardCache = new Map<number, Promise<Loaded | null>>();
const loadCard = (id: number) => {
  let p = cardCache.get(id);
  if (!p) {
    p = fetch(`/api/cards?ids=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Game[]): Loaded | null => {
        const game = rows.find((g) => g.id === id);
        if (!game) return null;
        const item: Loaded = { game, palette: paletteFromHue(hueFromString(game.name)), ready: Promise.resolve(DEFAULT_PALETTE) };
        const src = game.artworks ?? game.cover;
        item.ready = src
          ? extractPalette(src).then((pal) => {
            if (pal) item.palette = pal;
            return item.palette;
          })
          : Promise.resolve(item.palette);
        return item;
      })
      .catch(() => null)
      .then((r) => {
        if (!r) cardCache.delete(id);
        return r;
      });
    cardCache.set(id, p);
  }
  return p;
};

const RecCtx = createContext<{ el: HTMLElement | null; open: (item: Loaded, el: HTMLElement) => void; seen: Set<number> }>({
  el: null,
  open: () => { },
  seen: new Set(),
});
function RecFace({ game }: { game: Game }) {
  const meta = [game.year, game.rating != null ? `${(game.rating / 10).toFixed(1)} / 10` : null].filter(Boolean).join(" · ");
  const genres = game.genres.slice(0, 2).map((g) => g.name).join(" · ");
  return (
    <span className="flex h-full w-full items-center gap-3 whitespace-normal rounded-2xl border border-white/10 bg-[#101018] p-2 pr-3 text-left shadow-[0_12px_32px_-16px_rgba(0,0,0,0.9)]">
      {game.cover ? (
        <img src={game.cover} alt="" className="aspect-[3/4] h-14 shrink-0 rounded-lg border border-white/10 object-cover" />
      ) : (
        <span className="aspect-[3/4] h-14 shrink-0 rounded-lg border border-white/10 bg-white/5" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium leading-5 text-white">{game.name}</span>
        {meta && <span className="block text-xs tabular-nums leading-5 text-neutral-400">{meta}</span>}
        {genres && <span className="block truncate text-xs leading-5 text-neutral-500">{genres}</span>}
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-neutral-500" aria-hidden="true">
        <path d="M7 17L17 7M8 7h9v9" />
      </svg>
    </span>
  );
}

function RecCard({ id, fresh }: { id: number; fresh: boolean }) {
  const ctx = useContext(RecCtx);
  const ref = useRef<HTMLButtonElement>(null);
  const [item, setItem] = useState<Loaded | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    loadCard(id).then((c) => live && setItem(c));
    return () => {
      live = false;
    };
  }, [id]);

  if (item === null) return null;
  if (item === undefined) return <span className="mb-anim mb-skel my-2 block h-[72px] w-full max-w-sm rounded-2xl" aria-label="Loading game" />;
  const hide = ctx.el !== null && ctx.el === ref.current;
  return (
    <span className={`my-2 block w-full max-w-sm ${fresh ? "mb-anim mb-in" : ""}`}>
      <button
        ref={ref}
        type="button"
        aria-label={`Open ${item.game.name}`}
        aria-haspopup="dialog"
        onClick={() => ref.current && ctx.open(item, ref.current)}
        style={{ visibility: hide ? "hidden" : "visible", opacity: ctx.seen.has(id) ? 0.5 : 1 }}
        className={`block h-[72px] w-full cursor-pointer rounded-2xl transition-[transform,filter,opacity] duration-200 hover:brightness-125 active:scale-[0.98] ${ring}`}
      >
        <RecFace game={item.game} />
      </button>
    </span>
  );
}

const EASE_SOFT = "cubic-bezier(0.32, 0.72, 0, 1)";
const MORPH_MS = 820;

function Morph({
  game,
  palette,
  preferred,
  from,
  to,
  onLand,
  onDone,
}: {
  game: Game;
  palette: Palette;
  preferred: Set<number>;
  from: DOMRect;
  to: DOMRect;
  onLand: () => void;
  onDone: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const s0 = Math.max(from.width / to.width, from.height / to.height);

  useLayoutEffect(() => {
    const w = wrap.current;
    const inn = inner.current;
    if (!w || !inn) return;
    if (reduced()) {
      onLand();
      onDone();
      return;
    }
    const px = (r: DOMRect) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const o = { duration: MORPH_MS, easing: EASE_SOFT, fill: "both" as const };
    const run = w.animate([px(from), px(to)], o);
    const zoom = inn.animate(
      [{ transform: `translate(-50%, -50%) scale(${s0})` }, { transform: "translate(-50%, -50%) scale(1)" }],
      o,
    );
    const melt = ghost.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out", fill: "both" });

    const timers: number[] = [];
    let fade: Animation | undefined;
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      onLand();
      timers.push(
        window.setTimeout(() => {
          const f = w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: "ease-out", fill: "forwards" });
          fade = f;
          f.onfinish = onDone;
          timers.push(window.setTimeout(onDone, 520));
        }, 140),
      );
    };
    run.onfinish = land;
    timers.push(window.setTimeout(land, MORPH_MS + 150));

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      [run, zoom, melt, fade].forEach((a) => a?.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrap}
      data-overlay-open
      aria-hidden="true"
      className="pointer-events-none fixed z-[95] overflow-hidden rounded-2xl shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)]"
      style={{ left: from.left, top: from.top, width: from.width, height: from.height }}
    >
      <div
        ref={inner}
        className="absolute left-1/2 top-1/2"
        style={{ width: to.width, height: to.height, transform: `translate(-50%, -50%) scale(${s0})` }}
      >
        {/* content stays hidden (not active): only the art and scrims show, exactly like the deck card before it reveals */}
        <GameCard game={game} preferred={preferred} palette={palette} active={false} />
      </div>
      <div ref={ghost} className="absolute left-0 top-0 z-10" style={{ width: from.width, height: from.height }}>
        <RecFace game={game} />
      </div>
    </div>
  );
}

/* ---------- info cards: the model writes <card>{json}</card>, we draw it ---------- */

type InfoCardData = {
  type?: "story" | "release" | "reception" | "gameplay";
  kind?: string;
  title?: string;
  text?: string;
  date?: string;
  note?: string;
  platforms?: string[];
  critics?: string;
  players?: string;
  facts?: { k: string; v: string }[];
  tags?: string[];
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const strs = (v: unknown, n: number) =>
  Array.isArray(v) ? v.map(str).filter((t): t is string => !!t).slice(0, n) : undefined;

const parseCard = (raw: string): InfoCardData | null => {
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    const facts = Array.isArray(d.facts)
      ? d.facts
        .map((f: { k?: unknown; v?: unknown }) => ({ k: str(f?.k), v: str(f?.v) }))
        .filter((f: { k?: string; v?: string }): f is { k: string; v: string } => !!f.k && !!f.v)
        .slice(0, 6)
      : undefined;
    const type = ["story", "release", "reception", "gameplay"].includes(d.type) ? d.type : undefined;
    const card: InfoCardData = {
      type,
      kind: str(d.kind),
      title: str(d.title),
      text: str(d.text),
      date: str(d.date),
      note: str(d.note),
      platforms: strs(d.platforms, 8),
      critics: str(d.critics),
      players: str(d.players),
      facts,
      tags: strs(d.tags, 6),
    };
    const has = card.title || card.text || card.date || card.critics || card.players || card.facts?.length || card.tags?.length || card.platforms?.length;
    return has ? card : null;
  } catch {
    return null;
  }
};

const ACC = "rgb(var(--accent))";
const CARD_LABEL = { story: "Story", release: "Release", reception: "Reception", gameplay: "Gameplay" } as const;

function Facts({ facts }: { facts: { k: string; v: string }[] }) {
  return (
    <dl className="divide-y divide-white/[0.07] text-[13px] leading-5">
      {facts.map((f, i) => (
        <div key={i} className="flex items-baseline justify-between gap-6 py-2">
          <dt className="shrink-0 text-neutral-500">{f.k}</dt>
          <dd className="text-right text-neutral-100">{f.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function InfoCard({ data, fresh }: { data: InfoCardData; fresh: boolean }) {
  const label = data.kind ?? (data.type ? CARD_LABEL[data.type] : undefined);
  const dots = data.tags && data.tags.length > 0 && (
    <p className="mt-4 text-[13px] leading-5" style={{ color: ACC }}>
      {data.tags.join("  ·  ")}
    </p>
  );
  const facts = data.facts && data.facts.length > 0 && (
    <div className="mt-4 border-t border-white/[0.07]">
      <Facts facts={data.facts} />
    </div>
  );

  let body: ReactNode;
  if (data.type === "release") {
    body = (
      <>
        {data.date && <p className="text-[36px] font-semibold leading-none tracking-tight text-white tabular-nums">{data.date}</p>}
        {(data.note ?? (data.date ? data.title : undefined)) && (
          <p className="mt-2 text-[14px] leading-5 text-neutral-400">{data.note ?? data.title}</p>
        )}
        {!data.date && data.title && <p className="text-[22px] font-semibold leading-7 tracking-tight text-white">{data.title}</p>}
        {data.platforms && data.platforms.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {data.platforms.map((p, i) => (
              <span key={i} className="rounded-md border border-white/[0.14] px-2 py-0.5 text-xs text-neutral-300">
                {p}
              </span>
            ))}
          </div>
        )}
        {data.text && <p className="mt-4 text-[14px] leading-6 text-neutral-300">{data.text}</p>}
        {facts}
      </>
    );
  } else if (data.type === "reception") {
    body = (
      <>
        {data.title && <p className="text-[19px] font-semibold leading-6 tracking-tight text-white">{data.title}</p>}
        {data.facts && data.facts.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {data.facts.slice(0, 3).map((f, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.06] px-3 py-2.5">
                <p className="text-[17px] font-semibold leading-6 tabular-nums text-white">{f.v}</p>
                <p className="text-xs text-neutral-500">{f.k}</p>
              </div>
            ))}
          </div>
        )}
        {data.text && <p className="mt-4 text-[14px] leading-6 text-neutral-300">{data.text}</p>}
        {(data.critics || data.players) && (
          <div className="mt-4 divide-y divide-white/[0.07] border-t border-white/[0.07]">
            {data.critics && (
              <div className="py-3">
                <p className="text-xs text-neutral-500">Critics</p>
                <p className="mt-0.5 text-[14px] leading-6 text-neutral-200">{data.critics}</p>
              </div>
            )}
            {data.players && (
              <div className="py-3">
                <p className="text-xs text-neutral-500">Players</p>
                <p className="mt-0.5 text-[14px] leading-6 text-neutral-200">{data.players}</p>
              </div>
            )}
          </div>
        )}
        {dots}
      </>
    );
  } else if (data.type === "gameplay") {
    body = (
      <>
        {data.title && <p className="text-[19px] font-semibold leading-6 tracking-tight text-white">{data.title}</p>}
        {data.text && <p className="mt-2 text-[14px] leading-6 text-neutral-300">{data.text}</p>}
        {data.facts && data.facts.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.facts.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.06] px-3.5 py-3">
                <p className="text-[17px] font-semibold leading-6 text-white">{f.v}</p>
                <p className="text-xs text-neutral-500">{f.k}</p>
              </div>
            ))}
          </div>
        )}
        {dots}
      </>
    );
  } else {
    body = (
      <>
        {data.title && <p className="text-[22px] font-semibold leading-7 tracking-tight text-white">{data.title}</p>}
        {data.text && <p className="mt-2 text-[15px] leading-7 text-neutral-200">{data.text}</p>}
        {dots}
        {facts}
      </>
    );
  }

  return (
    <div
      className={`relative my-3 block w-full max-w-md overflow-hidden whitespace-normal rounded-3xl border border-white/[0.09] bg-white/[0.04] text-left shadow-[0_20px_50px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl ${fresh ? "mb-anim mb-in" : ""}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgb(var(--accent) / 0.75), transparent)" }}
      />
      <div className="relative p-5">
        {label && (
          <p className="mb-3 flex items-center gap-2 text-[12px] font-medium text-neutral-400">
            <span className="h-px w-5" style={{ background: ACC }} />
            {label}
          </p>
        )}
        {body}
      </div>
    </div>
  );
}

const CARD_SPLIT = /<card>([\s\S]*?)<\/card>/;
const CARD_TAIL = /<(?:c(?:a(?:r(?:d(?:>[\s\S]*)?)?)?)?)?$/;

function Reply({ text, fresh }: { text: string; fresh: boolean }) {
  if (!text) return <span className="mb-anim mb-skel my-1.5 block h-3.5 w-44 rounded-full" aria-label="Thinking" />;

  /* hide whatever is still streaming in: an unfinished [[id]] or an unfinished <card> */
  const lastEnd = text.lastIndexOf("</card>");
  const head = lastEnd === -1 ? "" : text.slice(0, lastEnd + 7);
  let tail = lastEnd === -1 ? text : text.slice(lastEnd + 7);
  const cardOpen = CARD_TAIL.test(tail);
  tail = tail.replace(CARD_TAIL, "");
  const cleanTail = tail.replace(/\[\[?[^\[\]]*$/, "");
  const typingRec = cleanTail !== tail;
  const segs = (head + cleanTail).split(CARD_SPLIT);

  return (
    <>
      {segs.map((seg, si) => {
        if (si % 2 === 1) {
          const data = parseCard(seg);
          return data ? <InfoCard key={`i${si}`} data={data} fresh={fresh} /> : null;
        }
        const parts = seg.split(/\[\[([^\]]*)\]\]/);
        return parts.map((part, pi) => {
          if (pi % 2 === 1) {
            const id = Number(part.match(/\d+/)?.[0]);
            return Number.isInteger(id) && id > 0 ? <RecCard key={`c${si}-${pi}-${id}`} id={id} fresh={fresh} /> : null;
          }
          const trimL = pi > 0 || si > 0;
          const trimR = pi < parts.length - 1 || si < segs.length - 1;
          const t = part.replace(trimL ? /^\s+/ : /^$/, "").replace(trimR ? /\s+$/ : /^$/, "");
          if (!t) return null;
          if (!fresh) return <span key={`${si}-${pi}`}>{t}</span>;
          return (
            <span key={`${si}-${pi}`}>
              {t.split(/(\s+)/).map((w, i) =>
                /^\s*$/.test(w) ? w : (
                  <span key={i} className="mb-anim mb-w">
                    {w}
                  </span>
                ),
              )}
            </span>
          );
        });
      })}
      {typingRec && <span className="mb-anim mb-skel my-2 block h-[72px] w-full max-w-sm rounded-2xl" aria-hidden="true" />}
      {cardOpen && <span className="mb-anim mb-skel my-3 block h-28 w-full max-w-md rounded-2xl" aria-hidden="true" />}
    </>
  );
}

const EMERGE_FROM = {
  opacity: 0,
  transform: "translateY(-64px) scale(0.5)",
  clipPath: "inset(0 calc(50% - 26px) 0 calc(50% - 26px) round 999px)",
};
const EMERGE_TO = { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0 round 999px)" };

const NO_GENRES = new Set<number>();

export default function MarbleChat({
  game,
  accent,
  preferred = NO_GENRES,
  onPick,
}: {
  game?: Game;
  accent: string;
  preferred?: Set<number>;
  onPick?: (game: Game, palette: Palette) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [landing, setLanding] = useState(false);
  const [threads, setThreads] = useState<Record<number, Msg[]>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [resume, setResume] = useState<Game | null>(null); // the game whose chat we step aside from while you look at a recommendation
  const [viewed, setViewed] = useState<Set<number>>(() => new Set());
  const [morph, setMorph] = useState<{ item: Loaded; from: DOMRect; to: DOMRect; el: HTMLElement } | null>(null); // a recommendation turning into the deck card
  const [morphPal, setMorphPal] = useState<Palette>(DEFAULT_PALETTE);

  const drag = useRef({ active: false, sx: 0, sy: 0, tx: 0, ty: 0 });
  const userRef = useRef<HTMLParagraphElement>(null);
  const sentFrom = useRef<DOMRect | null>(null); // where the typed text was when it was sent
  const btnRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fromRect = useRef<DOMRect | null>(null);
  const closing = useRef(false);
  const endSession = useRef(false);
  const sess = useRef<{ pickedId: number; phase: "picking" | "viewing" | "chat" } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const seen = useRef(0);
  const chatGame = resume ?? game;
  const gid = chatGame?.id;
  const msgs = gid != null ? (threads[gid] ?? []) : [];
  const chatting = msgs.length > 0;
  const chattingRef = useRef(chatting);
  chattingRef.current = chatting;

  const openRec = (item: Loaded, el: HTMLElement) => {
    if (morph || closing.current) return;
    const from = el.getBoundingClientRect();
    const stage = document.querySelector("[data-deck-stage]");
    const to =
      stage?.getBoundingClientRect() ??
      new DOMRect((window.innerWidth - Math.min(window.innerWidth * 0.92, 1000)) / 2, window.innerHeight * 0.15, Math.min(window.innerWidth * 0.92, 1000), Math.min(window.innerHeight * 0.72, 600));
    setMorphPal(item.palette);
    item.ready.then(setMorphPal);
    setMorph({ item, from, to, el });
    sess.current = { pickedId: item.game.id, phase: "picking" };
    if (chatGame) setResume(chatGame);
    setViewed((v) => new Set(v).add(item.game.id));
    close();
  };

  useEffect(() => () => abort.current?.abort(), [gid]);

  /* ---------- open ---------- */
  const openChat = (auto = false) => {
    if (!btnRef.current) return;
    if (!auto) {
      sess.current = null;
      if (resume) setResume(null);
    }
    fromRect.current = btnRef.current.getBoundingClientRect();
    closing.current = false;
    const base = auto ? chatGame : game;
    seen.current = base ? (threads[base.id] ?? []).length : 0;
    setReady(false);
    setLanding(false);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const orb = orbRef.current;
    const comp = composerRef.current;
    const root = rootRef.current;
    const from = fromRect.current;
    if (!orb || !comp || !root || !from) return;

    const still = reduced();
    const timers: number[] = [];
    const X: Spring = { x: from.left, v: 0 };
    const Y: Spring = { x: from.top, v: 0 };
    const S: Spring = { x: from.width / ORB, v: 0 };
    const C: Spring = { x: 0, v: 0 };
    const DX: Spring = { x: 0, v: 0 }; // drag offset, snaps back to 0 on release
    const DY: Spring = { x: 0, v: 0 };

    const targets = () => {
      const vv = window.visualViewport;
      const vw = window.innerWidth;
      const vh = vv?.height ?? window.innerHeight;
      const oy = vv?.offsetTop ?? 0;
      const colL = (vw - Math.min(vw * 0.92, COL)) / 2;
      const compH = comp.offsetHeight || 56;
      const introTop = Math.max(88, oy + vh * 0.42 - 120);
      const dockY = oy + vh - compH - Math.max(20, vh * 0.03);

      let tx: number, ty: number, ts: number;
      let cy = chattingRef.current ? dockY : introTop + ORB + 26;
      if (closing.current && btnRef.current) {
        const b = btnRef.current.getBoundingClientRect();
        tx = b.left;
        ty = b.top;
        ts = b.width / ORB;
      } else if (!chattingRef.current) {
        tx = (vw - ORB) / 2;
        ty = introTop;
        ts = 1;
      } else {
        const lr = listRef.current?.getBoundingClientRect();
        const top = aiRef.current?.getBoundingClientRect().top ?? lr?.top ?? 0;
        tx = colL;
        ty = Math.min(Math.max(top - LINE_NUDGE, (lr?.top ?? 0) + 6), dockY - DOCK - 12);
        ts = DOCK / ORB;
      }
      return { tx, ty, ts, cy };
    };

    const apply = () => {
      orb.style.transform = `translate3d(${X.x + DX.x}px, ${Y.x + DY.x}px, 0) scale(${S.x})`;
      comp.style.transform = `translate3d(0, ${C.x}px, 0)`;
    };

    C.x = targets().cy;
    apply();

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const T = targets();
      if (still) {
        X.x = T.tx;
        Y.x = T.ty;
        S.x = T.ts;
        C.x = T.cy;
      } else {
        const out = closing.current || chattingRef.current;
        step(X, T.tx, out ? 11 : 7, dt);
        step(Y, T.ty, out ? 11 : 10, dt);
        step(S, T.ts * (drag.current.active ? 1.12 : 1), 8, dt);
        step(C, T.cy, 9, dt);
      }
      const dg = drag.current;
      if (still) {
        DX.x = dg.active ? dg.tx : 0;
        DY.x = dg.active ? dg.ty : 0;
      } else {
        const w = dg.active ? 28 : 14;
        const z = dg.active ? 1 : 0.4;
        step2(DX, dg.active ? dg.tx : 0, w, z, dt);
        step2(DY, dg.active ? dg.ty : 0, w, z, dt);
      }
      apply();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    /* the rest of the room fades in around it */
    if (!still) {
      scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease-out" });
      root.querySelectorAll("[data-rise]").forEach((el, i) => {
        el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], {
          duration: 700,
          delay: 380 + i * 90,
          easing: EASE,
          fill: "backwards",
        });
      });
    }
    timers.push(
      window.setTimeout(
        () => {
          setReady(true);
          if (!still) {
            formRef.current?.animate(chattingRef.current ? [{ opacity: 0, transform: "translateY(14px)" }, EMERGE_TO] : [EMERGE_FROM, EMERGE_TO], {
              duration: chattingRef.current ? 600 : 1000,
              easing: EASE,
              fill: "backwards",
            });
          }
          timers.push(window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), still ? 0 : 500));
        },
        still ? 0 : 520,
      ),
    );

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [open]);

  const dismiss = () => {
    sess.current = null;
    endSession.current = true;
    close();
  };

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const done = () => {
      setOpen(false);
      setReady(false);
      setLanding(false);
      closing.current = false;
      if (endSession.current) {
        endSession.current = false;
        setResume(null);
      }
    };
    const root = rootRef.current;
    if (reduced() || !root) return done();

    root.querySelectorAll("[data-rise]").forEach((el) =>
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease-in", fill: "forwards" }),
    );
    if (chattingRef.current) {
      composerRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-in", fill: "forwards" });
    } else {
      formRef.current?.animate([EMERGE_TO, EMERGE_FROM], { duration: 420, easing: EASE_IN, fill: "forwards" });
      composerRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 280, easing: "ease-in", fill: "forwards" });
    }
    scrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 560, delay: 160, easing: "ease-in", fill: "forwards" });

    window.setTimeout(() => {
      setLanding(true);
      orbRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-out", fill: "forwards" });
    }, 640);
    window.setTimeout(done, 980);
  };

  const deckId = game?.id;
  useEffect(() => {
    const s = sess.current;
    if (!s || deckId == null || s.phase === "chat") return;
    if (s.phase === "picking") {
      if (deckId === s.pickedId) s.phase = "viewing";
      return;
    }
    if (deckId === s.pickedId) return;
    const t = window.setTimeout(() => {
      if (sess.current !== s) return;
      s.phase = "chat";
      openChat(true);
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  /* telegram-style send: the typed text lifts off the input, and the bubble forms around it as it lands */
  useLayoutEffect(() => {
    const from = sentFrom.current;
    const el = userRef.current;
    if (!from || !el) return;
    sentFrom.current = null;
    if (reduced()) return;
    const b = el.getBoundingClientRect();
    const dx = from.left - (b.left + 16); // 16 = the bubble's left padding, so the text itself starts exactly where it was typed
    const dy = from.top + from.height / 2 - (b.top + b.height / 2);
    const clear = { backgroundColor: "rgba(255,255,255,0)", borderColor: "rgba(255,255,255,0)" };
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, ...clear, offset: 0 },
        { ...clear, offset: 0.5 },
        { transform: "none", backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.08)", offset: 1 },
      ],
      { duration: 560, easing: EASE, fill: "backwards" },
    );
  }, [msgs.length]);

  useEffect(() => {
    if (!open || !chatting) return;
    const list = listRef.current;
    const turn = turnRef.current;
    if (!list || !turn) return;
    const y = turn.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - 12;
    list.scrollTo({ top: y, behavior: reduced() ? "auto" : "smooth" });
  }, [msgs.length, open, chatting]);

  if (!game) return <span className="size-10 shrink-0" aria-hidden="true" />;
  const cg = chatGame as Game;

  /* ---------- chat ---------- */
  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const id = cg.id;
    // the model doesn't need its own card JSON back (and the server caps message length): send a short stand-in instead
    const forModel = (m: Msg): Msg => {
      if (m.role !== "assistant") return m;
      const text = m.content
        .replace(/<card>([\s\S]*?)<\/card>/g, (_, j: string) => {
          try {
            const d = JSON.parse(j);
            return `[showed a card: ${d.title ?? d.kind ?? "info"}]`;
          } catch {
            return "";
          }
        })
        .replace(/<card>[\s\S]*$/, "")
        .trim();
      return { ...m, content: (text || "(info cards shown)").slice(0, 1000) };
    };
    let history: Msg[] = [...(threads[id] ?? []).filter((m) => m.content).map(forModel), { role: "user" as const, content: q }].slice(-12);
    while (history.length > 1 && history[0].role !== "user") history = history.slice(1);

    sentFrom.current = inputRef.current?.getBoundingClientRect() ?? null;
    setThreads((t) => ({
      ...t,
      [id]: [...(t[id] ?? []), { role: "user", content: q }, { role: "assistant", content: "" }],
    }));
    setInput("");
    setBusy(true);
    const ctl = new AbortController();
    abort.current = ctl;
    // never get stuck: if nothing arrives for 25s, give up and unlock the input
    let timedOut = false;
    let idle = 0;
    const poke = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        timedOut = true;
        ctl.abort();
      }, 25_000);
    };
    poke();

    const patch = (fn: (s: string) => string) =>
      setThreads((t) => {
        const list = [...(t[id] ?? [])];
        const last = list[list.length - 1];
        if (last?.role === "assistant") list[list.length - 1] = { ...last, content: fn(last.content) };
        return { ...t, [id]: list };
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId: id, messages: history }),
        signal: ctl.signal,
      });
      if (!res.ok || !res.body) {
        patch(() => (res.status === 429 ? "Easy there, give me a few seconds." : "I couldn't reach my brain just now. Try again?"));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (; ;) {
        const { done, value } = await reader.read();
        if (done) break;
        poke();
        const chunk = dec.decode(value, { stream: true });
        patch((s) => s + chunk);
      }
      patch((s) => s || "I drew a blank. Ask me again?");
    } catch (e) {
      if (timedOut) patch((s) => s || "That took too long. Try again?");
      else if ((e as { name?: string })?.name !== "AbortError") patch((s) => s || "Something went wrong. Try again?");
    } finally {
      window.clearTimeout(idle);
      setBusy(false);
      if (abort.current === ctl) abort.current = null;
    }
  };

  const turns: { u: Msg; a?: Msg; i: number }[] = [];
  for (let i = 0; i < msgs.length; i += 2) turns.push({ u: msgs[i], a: msgs[i + 1], i });

  return (
    <>
      <style>{`
        @keyframes mb-in { from { opacity: 0; transform: translateY(12px); filter: blur(6px) } to { opacity: 1; transform: none; filter: blur(0) } }
        @keyframes mb-word { from { opacity: 0; filter: blur(4px) } to { opacity: 1; filter: blur(0) } }
        @keyframes mb-shim { from { background-position: 100% 0 } to { background-position: -100% 0 } }
        .mb-in { animation: mb-in 700ms ${EASE} both }
        .mb-w { display: inline-block; animation: mb-word 520ms ease-out both }
        .mb-skel { background: linear-gradient(90deg, rgb(var(--accent) / .08), rgb(var(--accent) / .3), rgb(var(--accent) / .08)); background-size: 200% 100%; animation: mb-shim 1.8s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .mb-anim, .mb-in { animation: none !important } }
      `}</style>

      <button
        ref={btnRef}
        type="button"
        aria-label={`Ask about ${game.name}`}
        aria-haspopup="dialog"
        title="Ask about this game"
        onClick={() => openChat()}
        style={
          {
            opacity: open && !landing ? 0 : 1,
            transition: `opacity ${open && landing ? 300 : 0}ms ease-out, transform 500ms cubic-bezier(0.22, 1, 0.36, 1)`,
            "--accent": accent,
          } as CSSProperties
        }
        className={`size-10 shrink-0 cursor-pointer rounded-full [filter:drop-shadow(0_6px_14px_rgba(0,0,0,0.55))] hover:scale-[1.08] active:scale-95 ${ring}`}
      >
        <Marble />
      </button>

      {open &&
        createPortal(
          <div
            ref={rootRef}
            data-overlay-open
            role="dialog"
            aria-modal="true"
            aria-label={`Chat about ${cg.name}`}
            className="fixed inset-0 z-[90]"
            style={{ "--accent": accent } as CSSProperties}
          >
            <div
              ref={scrimRef}
              onClick={dismiss}
              className="absolute inset-0 backdrop-blur-2xl"
              style={{
                background:
                  "radial-gradient(60% 46% at 50% 42%, rgb(var(--accent) / 0.13), transparent 72%), rgba(4, 4, 9, 0.74)",
              }}
            />

            {/* the game being discussed */}
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-16">
              <div
                data-rise
                className="flex max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-4 backdrop-blur-md"
              >
                {cg.cover && (
                  <img src={cg.cover} alt="" className="aspect-[3/4] h-9 shrink-0 rounded-md border border-white/10 object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white">{cg.name}</p>
                  <p className="text-xs tabular-nums text-neutral-500">
                    {[cg.year, cg.rating != null ? `${(cg.rating / 10).toFixed(1)} / 10` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close chat"
              data-rise
              onClick={dismiss}
              className={`absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white ${ring}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-4" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            {/* conversation: top to bottom, the marble rides the left rail beside the newest reply */}
            <div
              ref={listRef}
              data-rise
              role="log"
              aria-live="polite"
              className="absolute inset-x-0 bottom-0 top-[72px] overflow-y-auto overscroll-contain [scrollbar-width:none] [mask-image:linear-gradient(to_bottom,transparent,black_28px,black_calc(100%-124px),transparent_calc(100%-92px))] [&::-webkit-scrollbar]:hidden"
            >
              <div className="mx-auto w-[min(92vw,640px)] pb-[150px] pt-3">
                <RecCtx.Provider value={{ el: morph?.el ?? null, open: openRec, seen: viewed }}>
                  {turns.map(({ u, a, i }, n) => {
                    const last = n === turns.length - 1;
                    const fresh = i >= seen.current;
                    return (
                      <div
                        key={i}
                        ref={last ? turnRef : undefined}
                        className="space-y-5 pb-8"
                        style={last ? { minHeight: "calc(100dvh - 232px)" } : undefined}
                      >
                        <p
                          ref={last ? userRef : undefined}
                          className="ml-auto w-fit max-w-[82%] whitespace-pre-wrap rounded-[20px] rounded-br-md border border-white/[0.08] bg-white/[0.07] px-4 py-2.5 text-[15px] leading-snug text-neutral-100"
                        >
                          {u.content}
                        </p>
                        {a && (
                          <div
                            ref={last ? aiRef : undefined}
                            className={`whitespace-pre-wrap pl-[52px] text-[15px] leading-[26px] text-neutral-100 ${fresh ? "mb-anim mb-in" : ""}`}
                            style={fresh ? { animationDelay: "140ms" } : undefined}
                          >
                            <Reply text={a.content} fresh={fresh} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </RecCtx.Provider>
              </div>
            </div>

            {/* the marble: positioned by the spring loop, never by layout */}
            <div
              ref={orbRef}
              className="absolute left-0 top-0 z-20 origin-top-left cursor-grab touch-none select-none will-change-transform active:cursor-grabbing"
              style={{ width: ORB, height: ORB }}
              onPointerDown={(e) => {
                if (closing.current) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { active: true, sx: e.clientX, sy: e.clientY, tx: 0, ty: 0 };
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d.active) return;
                // rubber band: follows the pointer, but gets heavier the further you pull
                const band = (v: number) => 260 * Math.tanh(v / 260);
                d.tx = band(e.clientX - d.sx);
                d.ty = band(e.clientY - d.sy);
              }}
              onPointerUp={() => {
                drag.current.active = false;
              }}
              onPointerCancel={() => {
                drag.current.active = false;
              }}
            >
              <Marble talking={busy} />
            </div>

            {/* the textbox: grows out of the marble, later docks to the bottom */}
            <div
              ref={composerRef}
              className="pointer-events-none absolute top-0 z-10 will-change-transform"
              style={{ left: "calc(50% - min(46vw, 320px))", width: "min(92vw, 640px)" }}
            >
              <form
                ref={formRef}
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                style={{ opacity: ready ? 1 : 0 }}
                className={`pointer-events-auto relative flex w-full items-center gap-2 rounded-full border border-white/[0.14] bg-[#0b0b12]/70 py-1.5 pl-5 pr-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-[border-color,box-shadow] duration-500 focus-within:border-[rgb(var(--accent)/0.55)] focus-within:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9),0_0_40px_-8px_rgb(var(--accent)/0.5)]`}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={500}
                  placeholder={chatting ? "Ask a follow-up…" : `Ask about ${cg.name}…`}
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-neutral-600"
                />
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={busy || !input.trim()}
                  className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-neutral-950 transition duration-300 hover:bg-neutral-200 active:scale-90 disabled:cursor-not-allowed disabled:scale-90 disabled:opacity-30 ${ring}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </form>

              <div
                className="absolute inset-x-0 top-full mt-4 flex flex-wrap justify-center gap-2 transition-opacity duration-500"
                style={{
                  opacity: ready && !chatting ? 1 : 0,
                  transitionDelay: ready && !chatting ? "350ms" : "0ms",
                  pointerEvents: ready && !chatting ? "auto" : "none",
                }}
              >
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => send(c)}
                    className={`cursor-pointer rounded-full border border-white/15 bg-black/20 px-3.5 py-1.5 text-sm text-neutral-300 backdrop-blur-sm transition duration-300 hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] ${ring}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

          </div>,
          document.body,
        )}

      {morph &&
        createPortal(
          <Morph
            game={morph.item.game}
            palette={morphPal}
            preferred={preferred}
            from={morph.from}
            to={morph.to}
            onLand={() => onPick?.(morph.item.game, morph.item.palette)}
            onDone={() => setMorph(null)}
          />,
          document.body,
        )}
    </>
  );
}
