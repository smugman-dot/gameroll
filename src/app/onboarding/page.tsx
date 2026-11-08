"use client"

import { GENRES } from '../lib/genres.ts'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Bg from "../components/bg";
import GenreButton from "../components/GenreButton";
import ContinueButton from '../components/ContinueBtn.tsx';
import { wideFont } from '../fonts.ts';

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

  return (
    <Bg leaving={leaving}>
      <div className={leaving ? "pointer-events-none" : ""}>
        <div
          className={`${rise} ${out} ${leaving ? gone : ""}`}
          style={{
            animationDelay: `${TITLE_AT}ms`,
            transitionDelay: leaving ? "150ms" : "0ms",
          }}
        >
          <p
            className={`${wideFont.className} w-full p-24 pb-14 text-center text-4xl text-white`}
            style={{ transform: "scaleX(1.6)", transformOrigin: "center" }}
          >
            Welcome!
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
            <ContinueButton disabled={selected.size === 0} onClick={handleContinue}>
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
