// components/GenreButton.tsx
"use client";

import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";

// punches out everything except a 1px ring, so the light only shows on the border
const RING_MASK = "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";
const ringStyle: CSSProperties = {
  WebkitMask: RING_MASK,
  mask: RING_MASK,
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
};

export default function GenreButton({
  name,
  selected = false,
  onToggle,
}: {
  name: string;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const first = useRef(true);

  // a little pop when it becomes selected (skipped on first render)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!selected) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    btn.current?.animate(
      [{ scale: "1" }, { scale: "1.1", offset: 0.4 }, { scale: "1" }],
      { duration: 340, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
    );
  }, [selected]);

  // track the cursor so the highlight follows it
  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  return (
    <button
      ref={btn}
      type="button"
      role="switch"
      aria-checked={selected}
      onClick={onToggle}
      onMouseMove={onMove}
      className="group relative flex rounded-xl transition-transform duration-150 [--x:50%] [--y:50%] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06060a]"
    >
      {/* button face, with a real 1px border (always pixel-snapped) */}
      <span
        className={`relative flex flex-1 items-center overflow-hidden rounded-xl border px-4 py-2 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-300 group-hover:text-white ${selected
            ? "border-violet-400/50 bg-violet-500/15 text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)]"
            : "border-white/10 bg-neutral-900 text-neutral-400"
          }`}
      >
        {/* soft inner glow */}
        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(120px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.09),transparent_70%)]" />
        <span className="relative">{name}</span>
      </span>

      {/* border light that follows the cursor (ring only) */}
      <span
        aria-hidden="true"
        style={ringStyle}
        className="pointer-events-none absolute inset-0 rounded-xl p-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(90px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.75),transparent_70%)]"
      />

      {/* check badge: springs in when selected (sits on the corner, so nothing shifts) */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-violet-500 text-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${selected ? "scale-100" : "scale-0"
          }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-2.5"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    </button>
  );
}
