import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { fetchGamesCached } from "../lib/fetchGames";

const GameCard = ({ game, index }) => {
  const cardVariants = {
    hidden: (i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return {
        opacity: 0,
        translateZ: -1200,
        x: (col - 1) * 300,
        y: (row - 1) * 250,
        rotateY: (col - 1) * 60,
        rotateX: (row - 1) * -60,
        scale: 0.8,
      };
    },
    visible: (i) => ({
      opacity: 1,
      translateZ: 0,
      x: 0,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 15,
        mass: 0.8,
        delay: 0.1 + i * 0.06,
      },
    }),
  };

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      className="group flex flex-col bg-[#202020] rounded-lg overflow-hidden shadow-xl"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={game.background_image}
          alt={game.name}
          fill
          className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          sizes="(max-width: 768px) 45vw, 30vw"
        />
      </div>
      <div
        className="w-full p-2 md:p-3 bg-[#2a2a2a] transition-transform duration-500 ease-in-out group-hover:scale-105"
        style={{ transformOrigin: "top" }}
      >
        <h3 className="text-white font-bold text-xs md:text-sm truncate">
          {game.name}
        </h3>
      </div>
    </motion.div>
  );
};

const globalCache = new Map();

export default function GenreView({ genre, onClose }) {
  const [games, setGames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const pagesCache = useRef(globalCache);

  useEffect(() => {
    const key = genre;

    const loadInitial = async () => {
      if (pagesCache.current.has(key)) {
        const cached = pagesCache.current.get(key);
        setGames(cached.games);
        setCurrentPage(cached.page);
        setLoading(false);
        return;
      }

      setLoading(true);
      const firstPage = await fetchGamesCached(
        { page: 1, genres: genre },
        pagesCache
      );

      const cacheData = { games: firstPage, page: 1 };
      pagesCache.current.set(key, cacheData);

      setGames(firstPage);
      setCurrentPage(1);
      setLoading(false);
    };

    loadInitial();
  }, [genre]);

  const handleScroll = async (e) => {
    const bottom =
      e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;

    if (bottom && !loading) {
      const key = genre;
      setLoading(true);
      const nextPage = currentPage + 1;
      const moreGames = await fetchGamesCached(
        { page: nextPage, genres: genre },
        pagesCache
      );

      const updatedGames = [...games, ...moreGames];

      pagesCache.current.set(key, { games: updatedGames, page: nextPage });

      setGames(updatedGames);
      setCurrentPage(nextPage);
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="genre-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      onScroll={handleScroll}
      className="absolute inset-0 z-10 flex flex-col items-center justify-start p-3 md:p-6 overflow-y-scroll overflow-x-hidden
        [&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-track]:rounded-full
        [&::-webkit-scrollbar-track]:bg-gray-100
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-gray-300
        dark:[&::-webkit-scrollbar-track]:bg-neutral-700
        dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
      style={{ perspective: "2500px", transformStyle: "preserve-3d" }}
    >
      <button
        onClick={onClose}
        className="sticky top-2 self-end md:top-4 md:right-4 text-white text-3xl z-20 hover:scale-110 transition-transform"
        aria-label="Close"
      >
        &times;
      </button>

      <div className="w-full max-w-lg md:max-w-4xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold text-white mb-6 md:mb-8 drop-shadow-lg"
        >
          {genre.name} Games
        </motion.h2>

        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6"
          style={{ transformStyle: "preserve-3d" }}
        >
          {games.map((game, index) => (
            <GameCard key={game.id} game={game} index={index} />
          ))}
        </motion.div>

        {loading && <p className="text-white mt-4">Loading more games...</p>}
      </div>
    </motion.div>
  );
}
