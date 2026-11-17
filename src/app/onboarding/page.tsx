"use client"

import { GENRES } from '../lib/genres.ts'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Bg from "../components/bg";
import GenreButton from "../components/GenreButton";
import ContinueButton from '../components/ContinueBtn.tsx';
import { wideFont } from '../fonts.ts';
import Card from "../components/Card";
import HalftoneBg from "../components/HalftoneBg";

const NEXT_ROUTE = "/home";
const LEAVE_MS = 1300;

const rise = "animate-[rise_0.9s_cubic-bezier(0.16,1,0.3,1)_backwards]";

const out = "transition-all duration-700 ease-in";
const gone = "opacity-0 blur-md scale-95 -translate-y-4";

const TITLE_AT = 400;
const GENRES_AT = 750;
const STAGGER = 40;
const MAX_STAGGER = 800;

export default function Onboarding() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    router.prefetch(NEXT_ROUTE);
  }, [router]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      e.preventDefault();
      document.querySelector<HTMLButtonElement>("[data-continue]")?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector("[data-logo]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent("halftone:wave", {
          detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        })
      );
    }, 900);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = () => {
    if (leaving) return;
    localStorage.setItem("GENRE_PREFERENCES", JSON.stringify([...selected]));
    setLeaving(true);
    setTimeout(() => router.push("/home"), LEAVE_MS);
  };

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const continueAt =
    GENRES_AT + Math.min(GENRES.length * STAGGER, MAX_STAGGER) + 150;

  const n = selected.size;
  const hint =
    n === 0 ? "Pick a few genres you like"
      : n < 3 ? `${3 - n} more for better picks`
        : "Looking good";
  return (
    <Bg leaving={leaving}>
      <HalftoneBg className="fixed inset-0 -z-10" />

      <div
        className="flex items-center justify-center p-18 pb-0 animate-[logoIn_1.3s_cubic-bezier(0.16,1,0.3,1)_backwards]"
        style={{ animationDelay: "150ms" }}
      >
        <Card src="/favicon.ico" size={128} />
      </div>
      <div className={leaving ? "pointer-events-none" : ""}>

        <p
          aria-label="Welcome!"
          className={`${wideFont.className} w-full px-24 pb-4 pt-24 text-center text-4xl text-white`}
          style={{ scale: "1.6 1", transformOrigin: "center" }}
        >
          {"Welcome!".split("").map((ch, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="inline-block animate-[letterIn_0.9s_cubic-bezier(0.16,1,0.3,1)_backwards]"
              style={{ animationDelay: `${TITLE_AT + i * 55}ms` }}
            >
              {ch}
            </span>
          ))}
        </p>
        <div className={rise} style={{ animationDelay: `${TITLE_AT + 8 * 55 + 150}ms` }}>
          <p key={hint} aria-live="polite" className="animate-[riseSoft_0.4s_ease-out] pb-8 text-center text-sm text-neutral-400">
            {hint}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 p-12">
          {GENRES.map((i, idx) => (
            <div
              key={i.id}
              className={`${rise} ${out} ${leaving ? gone : ""}`}
              style={{
                animationDelay: `${GENRES_AT + Math.min(idx * STAGGER, MAX_STAGGER)}ms`,
                transitionDelay: leaving ? `${Math.min(idx * 18, 360)}ms` : "0ms",
              }}
            >
              <GenreButton
                name={i.name}
                selected={selected.has(i.id)}
                onToggle={() => toggle(i.id)}
              />
            </div>
          ))}

          <div
            className={`${rise} transition-all duration-500 ease-in ${leaving ? "translate-x-32 opacity-0" : ""
              }`}
            style={{ animationDelay: `${continueAt}ms` }}
          >
            <ContinueButton
              disabled={selected.size === 0}
              count={selected.size}
              onClick={handleContinue}
            >
              Continue
            </ContinueButton>
          </div>
        </div>
      </div>

      <div
        className={`pointer-events-none fixed inset-0 z-50 bg-[#06060a] transition-opacity duration-500 ease-in ${leaving ? "opacity-100 delay-[700ms]" : "opacity-0"
          }`}
      />
    </Bg>
  );
}
