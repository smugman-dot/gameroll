"use client";

import { useRef, type CSSProperties, type PointerEvent } from "react";

const MAX_TILT = 16;
const PRESSED = 0.84;

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Card({
  src,
  size = 128,
  alt = "",
}: {
  src: string;
  size?: number;
  alt?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hold = useRef<Animation | null>(null);
  const pressed = useRef(false);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    card.style.setProperty("--rx", `${(0.5 - py) * MAX_TILT * 2}deg`);
    card.style.setProperty("--ry", `${(px - 0.5) * MAX_TILT * 2}deg`);
    card.style.setProperty("--gx", `${px * 100}%`);
    card.style.setProperty("--gy", `${py * 100}%`);
  };

  const onLeave = () => {
    const card = ref.current;
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  };

  const press = (e: PointerEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pressed.current = true;
    if (reduced()) return;
    hold.current?.cancel();
    hold.current = card.animate(
      [{ scale: "1" }, { scale: String(PRESSED) }],
      { duration: 140, easing: "ease-out", fill: "forwards" }
    );
  };

  const release = () => {
    const card = ref.current;
    if (!card || !pressed.current) return;
    pressed.current = false;
    if (reduced()) return;

    const cs = getComputedStyle(card).scale;
    const from = cs === "none" ? "1" : cs.split(" ")[0];
    hold.current?.cancel();
    hold.current = null;

    card.animate(
      [
        { scale: from, easing: "ease-out" },
        { scale: "1.12", offset: 0.45, easing: "ease-in-out" },
        { scale: "0.97", offset: 0.75, easing: "ease-in-out" },
        { scale: "1" },
      ],
      { duration: 600 }
    );
  };

  const glareShape: CSSProperties = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };

  return (
    <div className="motion-safe:animate-[bob_5s_ease-in-out_infinite]">
      <div
        className="group -m-6 cursor-pointer select-none p-6 [perspective:700px]"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div
          ref={ref}
          data-logo=""
          style={{ width: size, height: size }}
          className="relative transition-transform duration-500 ease-out [--s:1] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_scale(var(--s))] group-hover:duration-150 group-hover:[--s:1.06]"
        >
          <img
            src={src}
            alt={alt}
            width={size}
            height={size}
            draggable={false}
            className="block size-full select-none drop-shadow-[0_18px_28px_rgba(99,102,241,0.14)]"
          />

          <div
            aria-hidden="true"
            style={glareShape}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_var(--gx,50%)_var(--gy,50%),rgba(255,255,255,0.3),transparent_55%)]"
          />
        </div>
      </div>
    </div>
  );
}
