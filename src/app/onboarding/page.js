"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SVG Icons
const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const CheckIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);
const SubmitBtn = ({ text, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.03, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)" }}
    whileTap={{ scale: 0.97 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="
          relative
          px-6 py-3
          rounded-2xl
          font-semibold
          text-white
          bg-gradient-to-br from-gray-100/20 to-gray-200/10
          backdrop-blur-lg
          border border-white/20
          shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_12px_rgba(0,0,0,0.1)]
          overflow-hidden
          group
        "
  >
    <span
      className="
          absolute inset-0
          bg-gradient-to-r from-blue-500/30 to-purple-500/30
          opacity-0 group-hover:opacity-100
          transition-opacity duration-500
          blur-xl
        "
    ></span>
    <span className="relative z-10">{text}</span>
  </motion.button>
);

export default function Onboarding() {
  const [genres, setGenres] = useState([]);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    async function fetchGenres() {
      try {
        const res = await fetch("/api/genres");
        const data = await res.json();
        setGenres(data.results || []);
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      }
    }
    fetchGenres();

    const saved = JSON.parse(localStorage.getItem("selectedGenres") || "[]");
    const savedMap = {};
    saved.forEach((g) => (savedMap[g.id] = g));
    setSelected(savedMap);
  }, []);

  // Toggle genre selection
  const toggleSelect = (genre) => {
    setSelected((prev) => {
      const newSelected = { ...prev };
      if (newSelected[genre.id]) {
        delete newSelected[genre.id];
      } else {
        newSelected[genre.id] = {
          id: genre.id,
          slug: genre.slug,
          name: genre.name,
        };
      }
      localStorage.setItem(
        "selectedGenres",
        JSON.stringify(Object.values(newSelected))
      );
      return newSelected;
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#01010c] flex flex-col items-center px-4 pt-16">
      {/* Blobs */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-[350px] h-[350px] rounded-full blur-[120px] opacity-30"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(144, 238, 144, 0.6), transparent 70%)`,
          }}
          animate={{
            x: [-150 + i * 50, 150 - i * 50, -150 + i * 50],
            y: [-100 + i * 30, 100 - i * 30, -100 + i * 30],
            rotate: [0, 360, 0],
          }}
          transition={{
            duration: 25 + i * 5,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Top Text */}
      <div className="flex flex-col items-center gap-2 z-10">
        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
          className="font-bold text-[38px] bg-clip-text text-transparent bg-gradient-to-r from-lime-400 via-green-500 to-lime-600 animate-text-gradient"
        >
          Welcome Gamer!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.5, ease: "easeOut" }}
          className="text-white text-center"
        >
          What games do you play?
        </motion.p>
      </div>

      {/* Genres */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 2.2, ease: "easeOut" }}
        className="flex flex-wrap justify-center gap-3 mt-6 p-12 max-h-[50%] overflow-y-auto w-full z-10"
      >
        {genres.length > 0
          ? genres.map((genre) => (
              <motion.div
                key={genre.id}
                onClick={() => toggleSelect(genre)}
                className={`flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 cursor-pointer transition-all duration-300 ${
                  selected[genre.id]
                    ? "shadow-[0_0_20px_rgba(0,255,100,0.5)]"
                    : ""
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {/* Left Icon */}
                <div className="w-6 h-6 relative flex items-center justify-center">
                  <AnimatePresence>
                    {!selected[genre.id] ? (
                      <motion.div
                        key="plus"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.3, 1] }}
                        exit={{ scale: 0 }}
                        className="absolute"
                      >
                        <PlusIcon />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.4, 1] }}
                        exit={{ scale: 0 }}
                        className="absolute"
                      >
                        <CheckIcon />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-white font-semibold select-none">
                  {genre.name}
                </span>
              </motion.div>
            ))
          : Array(6)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="px-4 py-2 rounded-2xl bg-white/5 opacity-20 w-32 h-10"
                />
              ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 3.2, ease: "easeOut" }}
        className="mt-6 z-10"
      >
        <SubmitBtn text="Start Gaming" onClick={() => console.log("Start!")} />
      </motion.div>

      <style jsx>{`
        @keyframes text-gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-text-gradient {
          background-size: 200% 200%;
          animation: text-gradient 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
