// components/ContinueButton.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

const HOP_MS = 520; // length of the hop
const CALL_AFTER = 260; // when onClick fires (so the hop is seen before you navigate)

export default function ContinueButton({
  disabled = false,
  onClick,
  count = 0,
  children = "Continue",
}: {
  disabled?: boolean;
  onClick?: () => void;
  /** how many things are selected; shown as "Continue · 3" */
  count?: number;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const num = useRef<HTMLSpanElement>(null);

  // the number pops every time it changes
  useEffect(() => {
    if (count <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    num.current?.animate(
      [
        { transform: "scale(1.6)", opacity: 0.3 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 280, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
    );
  }, [count]);

  const handleClick = () => {
    const el = ref.current;
    if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.animate(
        [
          { transform: "translateX(0) scale(1)" },
          { transform: "translateX(18px) scale(0.96)", offset: 0.4 },
          { transform: "translateX(0) scale(1)" },
        ],
        { duration: HOP_MS, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
      );
      setTimeout(() => onClick?.(), CALL_AFTER);
    } else {
      onClick?.();
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      data-continue=""
      disabled={disabled}
      onClick={handleClick}
      className={`group inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06060a] ${disabled
          ? "cursor-not-allowed border-white/5 bg-white/5 text-white/25"
          : "border-white bg-white text-neutral-950 shadow-[0_0_40px_-8px_rgba(255,255,255,0.35)] hover:bg-neutral-200"
        }`}
    >
      <span>
        {children}
        {count > 0 && (
          <>
            <span className="mx-1.5 opacity-40">·</span>
            <span ref={num} className="inline-block tabular-nums">
              {count}
            </span>
          </>
        )}
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`size-4 transition-transform duration-300 ${disabled ? "" : "group-hover:translate-x-1"
          }`}
        aria-hidden="true"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}
