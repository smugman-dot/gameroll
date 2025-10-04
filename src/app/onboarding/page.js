"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SVG Icons
const PlusIcon = () => (
  <svg
    width="16"
    height="16"
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
    width="16"
    height="16"
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

// Green Button Component
const GreenButton = ({ text, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 1.2, delay: 3 }}
    className="px-6 py-3 rounded-2xl font-bold text-[#03045E] text-lg
               bg-gradient-to-r from-[#B8FB3C] to-[#6EFF3C]
               shadow-lg shadow-[#B8FB3C]/40
               hover:from-[#A6E82F] hover:to-[#8CE500]
               transition-all duration-300 ease-out"
  >
    {text}
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
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStart = () => {
    alert("Let's go! Selected genres: " + JSON.stringify(selected));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#01010c] flex justify-center items-center px-4">
      {/* Animated Blobs */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-[350px] h-[350px] rounded-full blur-[120px] opacity-30"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(184, 251, 60, 0.6), transparent 70%)`,
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

      {/* Fixed Text */}
      <div className="absolute top-[20%] w-full flex flex-col items-center gap-2 z-10">
        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
          className="font-bold text-[38px] bg-clip-text text-transparent relative z-10 bg-gradient-to-r from-lime-400 via-green-500 to-lime-600 animate-text-gradient"
        >
          Welcome Gamer!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.5, ease: "easeOut" }}
          className="text-white relative z-10 text-center"
        >
          What games do you play?
        </motion.p>
      </div>

      {/* Genres */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 2.2, ease: "easeOut" }}
        className="flex flex-wrap justify-center gap-3 mt-[10%] relative z-10 min-h-[200px]"
      >
        {genres.length > 0
          ? genres.map((genre) => (
              <motion.div
                key={genre.id}
                onClick={() => toggleSelect(genre.id)}
                className={`flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 cursor-pointer transition-all duration-300
                  ${
                    selected[genre.id]
                      ? "shadow-[0_0_20px_rgba(184,251,60,0.5)]"
                      : ""
                  }
                `}
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

                {/* Name */}
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

      {/* Start Button */}
      <div className="absolute bottom-[10%] flex justify-center w-full z-10">
        <GreenButton text="Start Gaming" onClick={handleStart} />
      </div>

      {/* Extra CSS Animations */}
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
