"use client";

import type { CSSProperties, MouseEvent } from "react";

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
  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      onClick={onToggle}
      onMouseMove={onMove}
      className="group relative flex rounded-xl transition-transform duration-150 [--x:50%] [--y:50%] active:scale-95"
    >
      <span
        className={`relative flex flex-1 items-center overflow-hidden rounded-xl border px-4 py-2 text-base font-medium transition-colors duration-300 group-hover:text-white ${selected
          ? "border-white/35 bg-neutral-700 text-white"
          : "border-white/10 bg-neutral-900 text-neutral-400"
          }`}
      >
        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(120px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.09),transparent_70%)]" />
        <span className="relative">{name}</span>
      </span>
      <span
        aria-hidden="true"
        style={ringStyle}
        className="pointer-events-none absolute inset-0 rounded-xl p-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(90px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.75),transparent_70%)]"
      />
    </button>
  );
}
