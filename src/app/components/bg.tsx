"use client";

import { useEffect, useRef, type ReactNode } from "react";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const IDLE_AFTER = 4000;
const WANDER_EVERY: [number, number] = [2200, 4500];
const BASE_R = 220;
const BASE_L = 400;
const BASE_A = 0.05;
const SURPRISE = { r: 110, l: 160, a: 0.08 };
const INTRO_MS = 1800;

export default function BeautifulDiv({
  children,
  className = "",
  leaving = false,
}: {
  children?: ReactNode;
  className?: string;
  leaving?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const leavingAt = useRef(0);

  useEffect(() => {
    leavingAt.current = leaving ? performance.now() : 0;
  }, [leaving]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pickTarget = () => ({
      x: rand(0.12, 0.88) * el.clientWidth,
      y: rand(0.12, 0.88) * el.clientHeight,
    });

    let x = el.clientWidth / 2;
    let y = el.clientHeight / 2;
    let target = pickTarget();
    let nextPick = performance.now() + rand(...WANDER_EVERY);
    let lastMove = -Infinity;
    let active = false;
    let surprise = 0;
    let last = performance.now();
    const start = last;
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const f = dt / 16.67;
      if (active && now - lastMove > IDLE_AFTER) {
        active = false;
        target = pickTarget();
        nextPick = now + rand(...WANDER_EVERY);
      }

      if (!active && now > nextPick) {
        target = pickTarget();
        nextPick = now + rand(...WANDER_EVERY);
      }
      const speed = active ? 0.1 + surprise * 0.12 : 0.012;
      const k = 1 - Math.pow(1 - speed, f);
      x += (target.x - x) * k;
      y += (target.y - y) * k;

      surprise *= Math.pow(0.95, f);
      if (surprise < 0.001) surprise = 0;

      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      const p = Math.min(1, (now - start) / INTRO_MS);
      const c = leavingAt.current ? Math.min(1, (now - leavingAt.current) / 900) : 0;
      const open = (1 - Math.pow(1 - p, 3)) * (1 - c * c);

      el.style.setProperty("--gr", `${(BASE_R + surprise * SURPRISE.r) * open}px`);
      el.style.setProperty("--lr", `${(BASE_L + surprise * SURPRISE.l) * open}px`);
      el.style.setProperty("--la", `${(BASE_A + surprise * SURPRISE.a) * open}`);

      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!active) {
        active = true;
        surprise = 1;
      }
      lastMove = performance.now();
    };

    const onLeave = () => {
      lastMove = -Infinity; // wander again straight away
    };

    const ring = (cx: number, cy: number, size: number, grow: number, delay: number) => {
      const d = document.createElement("div");
      d.className =
        "pointer-events-none absolute -z-10 rounded-full border border-white/20";
      d.style.width = d.style.height = `${size}px`;
      d.style.left = `${cx - size / 2}px`;
      d.style.top = `${cy - size / 2}px`;
      el.appendChild(d);
      const a = d.animate(
        [
          { transform: "scale(0.2)", opacity: 0.5 },
          { transform: `scale(${grow})`, opacity: 0 },
        ],
        { duration: 1000, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
      );
      a.onfinish = () => d.remove();
    };

    const onDown = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      ring(cx, cy, 120, 4, 0);
      ring(cx, cy, 120, 2.5, 90);
      lastMove = performance.now();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`relative isolate min-h-dvh w-full overflow-hidden bg-[#06060a] [--mx:50%] [--my:50%] [--gr:220px] [--lr:400px] [--la:0.05] motion-safe:animate-[fadeIn_1.2s_ease-out_backwards] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:56px_56px] [-webkit-mask-image:radial-gradient(var(--gr)_circle_at_var(--mx)_var(--my),black,transparent)] [mask-image:radial-gradient(var(--gr)_circle_at_var(--mx)_var(--my),black,transparent)]" />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--lr)_circle_at_var(--mx)_var(--my),rgba(99,102,241,var(--la)),transparent_70%)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-[18%] size-44 rounded-full bg-[#4f5bff] opacity-25 blur-[90px] motion-safe:animate-[sweep_22s_linear_infinite]" />
        <div className="absolute left-0 top-[52%] size-36 rounded-full bg-[#8b5cf6] opacity-20 blur-[80px] motion-safe:animate-[sweep_28s_linear_infinite] [animation-delay:-11s]" />
        <div className="absolute left-0 top-[78%] size-32 rounded-full bg-[#22b8d8] opacity-15 blur-[80px] motion-safe:animate-[sweep_34s_linear_infinite] [animation-delay:-22s]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
