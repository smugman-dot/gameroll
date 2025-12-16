"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Onboarding() {
  const [genres, setGenres] = useState([]);
  const [selected, setSelected] = useState({});
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedGenresRaw = localStorage.getItem("preferredGenres");
    const storedGenres = storedGenresRaw ? JSON.parse(storedGenresRaw) : [];

    if (storedGenres.length >= 3) {
      router.replace("/");
      return;
    }

    async function fetchGenres() {
      try {
        const res = await fetch("/api/genres");
        const data = await res.json();
        setGenres(data.results || []);
      } catch (err) {
        console.error("Failed to fetch genres:", err);
        // Fallback data
        setGenres([
          { id: 1, name: "Action", slug: "action" },
          { id: 2, name: "Indie", slug: "indie" },
          { id: 3, name: "Adventure", slug: "adventure" },
          { id: 4, name: "RPG", slug: "role-playing-games-rpg" },
          { id: 5, name: "Strategy", slug: "strategy" },
          { id: 6, name: "Shooter", slug: "shooter" },
          { id: 7, name: "Casual", slug: "casual" },
          { id: 8, name: "Simulation", slug: "simulation" },
          { id: 9, name: "Puzzle", slug: "puzzle" },
          { id: 10, name: "Arcade", slug: "arcade" },
          { id: 11, name: "Platformer", slug: "platformer" },
          { id: 12, name: "Racing", slug: "racing" },
          { id: 13, name: "Sports", slug: "sports" },
          { id: 14, name: "Fighting", slug: "fighting" },
          { id: 15, name: "Family", slug: "family" },
        ]);
      }
    }
    fetchGenres();
  }, [router]);

  const toggleSelect = (genre) => {
    setSelected((prev) => {
      const newSelected = { ...prev };
      if (newSelected[genre.id]) {
        delete newSelected[genre.id];
      } else {
        newSelected[genre.id] = { id: genre.id, slug: genre.slug, name: genre.name };
      }
      return newSelected;
    });
  };

  const handleStartGaming = () => {
    if (Object.keys(selected).length < 3) return;

    localStorage.setItem("preferredGenres", JSON.stringify(Object.values(selected)));
    setIsExiting(true);

    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  const selectedCount = Object.keys(selected).length;
  const isValid = selectedCount >= 3;
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0c1011] text-white font-sans selection:bg-white/20">

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">

        <motion.div
          animate={{
            x: [0, 50, -30, 0],
            y: [0, 30, 50, 0],
            scale: [1, 1.2, 0.9, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"
        />

        <motion.div
          animate={{
            x: [0, -40, 20, 0],
            y: [0, -60, -20, 0],
            scale: [1, 1.1, 0.95, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -right-20 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen"
        />

        {/* Moving Center Accent */}
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)]"
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      <AnimatePresence>
        {!isExiting && (
          <motion.div
            className="relative z-10 flex flex-col h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex-1 overflow-y-auto w-full scrollbar-hide">
              <div className="max-w-7xl mx-auto px-6 pt-12 md:pt-20 pb-40">

                {/* Header */}
                <div className="flex flex-col gap-4 mb-10 md:mb-16">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-5xl md:text-7xl font-bold tracking-tighter"
                  >
                    Curate your <br />
                    <span className="text-white/30">Experience.</span>
                  </motion.h1>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-3 text-lg md:text-xl text-white/50 font-light"
                  >
                    <div className="h-[1px] w-12 bg-white/20"></div>
                    <p>Select <span className="text-white font-medium">{Math.max(0, 3 - selectedCount)}</span> more genres</p>
                  </motion.div>
                </div>

                {/* Grid */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
                >
                  {genres.map((genre) => {
                    const isSelected = !!selected[genre.id];
                    return (
                      <motion.button
                        key={genre.id}
                        variants={itemVariants}
                        onClick={() => toggleSelect(genre)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          relative group flex flex-col items-center justify-center h-32 md:h-40 rounded-[32px] border transition-all duration-500
                          ${isSelected
                            ? "bg-white border-white text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] z-10"
                            : "bg-[#ffffff05] border-white/5 text-white/40 hover:bg-[#ffffff0a] hover:border-white/10 hover:text-white"
                          }
                        `}
                      >
                        <span className={`relative z-10 font-medium text-lg md:text-xl tracking-wide transition-colors duration-300 ${isSelected ? "font-bold" : ""}`}>
                          {genre.name}
                        </span>

                        {/* Status Dot */}
                        <div className={`mt-2 w-1.5 h-1.5 rounded-full transition-all duration-300 ${isSelected ? "bg-black" : "bg-white/10 group-hover:bg-white/50"}`} />
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>
            </div>
            <div className="fixed bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[#0c1011] via-[#0c1011]/90 to-transparent pointer-events-none z-20" />

            <div className="fixed bottom-0 left-0 w-full p-6 md:p-10 z-30 flex items-end justify-between pointer-events-none">
              <div className="max-w-7xl mx-auto w-full flex items-center justify-between">

                <motion.div
                  className="hidden md:flex flex-col gap-1 pointer-events-auto"
                  animate={{ opacity: isValid ? 1 : 0.5 }}
                >
                  <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/30">Selection</span>
                  <span className="text-2xl font-medium">{selectedCount} <span className="text-white/30">/ 3</span></span>
                </motion.div>
                <div className="w-full md:w-auto pointer-events-auto">
                  <button
                    onClick={handleStartGaming}
                    disabled={!isValid}
                    className="shiny-button w-full md:min-w-[200px]"
                  >
                    <span>{isValid ? "Enter World" : "Pick 3 to Start"}</span>
                    {isValid && (
                      <motion.svg
                        initial={{ x: -5, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </motion.svg>
                    )}
                    <div className="shiny-button-shine"></div>
                  </button>
                </div>

              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}