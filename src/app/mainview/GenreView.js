import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { fetchGames } from "../lib/fetchGames";

const RatingBadge = ({ rating }) => {
  const color =
    rating >= 90
      ? "bg-green-500"
      : rating >= 75
        ? "bg-yellow-500"
        : "bg-gray-500";

  return (
    <div
      className={`px-2 py-0.5 rounded-md ${color} text-black font-bold text-xs flex items-center gap-1`}
    >
      <span>{rating ?? "N/A"}</span>
    </div>
  );
};

function GameCard({ game, index, onHover, onClick }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      key={game.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.3,
        delay: prefersReduced ? 0 : index * 0.05,
      }}
      onMouseEnter={() => onHover(game)}
      onClick={onClick}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer bg-gray-900 border border-white/5 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2"
    >
      <Image
        src={game.background_image}
        alt={game.name}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-110"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />

      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
          <RatingBadge rating={game.metacritic} />
        </div>

        <h3 className="text-white font-bold text-lg md:text-xl leading-tight mb-1 line-clamp-2 drop-shadow-md">
          {game.name}
        </h3>

        <div className="hidden group-hover:block mt-2 pt-2 border-t border-white/20">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>{game.released?.split("-")[0]}</span>
            <span className="font-bold uppercase tracking-wider">
              Jump to Game →
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
export default function GenreView({ genre, onClose, onGameSelect }) {
  const [games, setGames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hoveredGame, setHoveredGame] = useState(null);
  useEffect(() => {
    setGames([]);
    setCurrentPage(1);
    setHoveredGame(null);
    loadPage(1);
  }, [genre]);

  const loadPage = async (page) => {
    setLoading(true);
    try {
      const data = await fetchGames({ page, genres: genre });

      if (!data?.length) return;

      setGames((prev) => {
        const existingIds = new Set(prev.map((g) => g.id));
        const newItems = data.filter((g) => !existingIds.has(g.id));

        if (!hoveredGame && newItems.length) setHoveredGame(newItems[0]);

        return [...prev, ...newItems];
      });

      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      alert("Could not load more games. Check the Network tab.");
    } finally {
      setLoading(false);
    }
  };

  const debounceTimer = useRef(null);
  const containerRef = useRef(null);

  const handleScroll = (e) => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = e.target; // TS: as HTMLDivElement

    if (!loading && scrollHeight - scrollTop <= clientHeight + 200) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => loadPage(currentPage + 1), 250);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0c1011]"
    >
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6 bg-gradient-to-b from-black/80 to-transparent sticky top-0">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 uppercase tracking-tighter">
          {genre}
        </h2>
        <button
          onClick={onClose}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all duration-300 backdrop-blur-md border border-white/10"
        >
          <span className="text-sm font-bold">Close</span>
          <svg
            className="w-5 h-5 transition-transform group-hover:rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1={18} y1={6} x2={6} y2={18} />
            <line x1={6} y1={6} x2={18} y2={18} />
          </svg>
        </button>
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto px-6 md:px-12 pb-24 scrollbar-hide"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 max-w-[1800px] mx-auto">
          {games.map((g, i) => (
            <GameCard
              key={g.id}
              game={g}
              index={i}
              onHover={setHoveredGame}
              onClick={onGameSelect}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
