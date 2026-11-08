"use client";

import { useRef, type ReactNode } from "react";

const HOP_MS = 520;
const CALL_AFTER = 260;

export default function ContinueButton({
  disabled = false,
  onClick,
  children = "Continue",
}: {
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);

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
      disabled={disabled}
      onClick={handleClick}
      className={`group inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-500 ease-out ${disabled
        ? "cursor-not-allowed border-white/5 bg-white/5 text-white/25"
        : "border-white bg-white text-neutral-950 shadow-[0_0_40px_-8px_rgba(255,255,255,0.35)] hover:bg-neutral-200"
        }`}
    >
      {children}
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
