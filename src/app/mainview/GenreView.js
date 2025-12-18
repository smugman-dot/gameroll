import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { fetchGames } from "../lib/fetchGames";

const RatingBadge = ({ rating }) => {
  const color = rating >= 90 ? "bg-green-500" : rating >= 75 ? "bg-yellow-500" : "bg-gray-500";
  return (
    <div className={`px-2 py-0.5 rounded-md ${color} text-black font-bold text-xs flex items-center gap-1`}>
      <span>{rating || "N/A"}</span>
    </div>
  );
};

const GameCard = ({ game, index, onHover, onClick }) => {
  return (
    <motion.div
      layoutId={`card-${game.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => onHover(game)}
      onClick={() => onClick(game)}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer bg-gray-900 border border-white/5 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2"
    >
      <Image
        src={game.background_image}
        alt={game.name}
        fill
        onError={(e) => {
          e.currentTarget.src = "/placeholder_icon.svg";
        }}
        sizes="(max-width: 768px) 50vw, 20vw"
        className="object-cover transition-transform duration-700 group-hover:scale-110"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />

      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
          <RatingBadge rating={game.metacritic} />
        </div>

        <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
          <h3 className="text-white font-bold text-lg md:text-xl leading-tight mb-1 line-clamp-2 drop-shadow-md">
            {game.name}
          </h3>

          <div className="h-0 overflow-hidden group-hover:h-auto transition-all duration-300 opacity-0 group-hover:opacity-100">
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
              <span className="text-xs text-gray-300">{game.released?.split("-")[0]}</span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Jump to Game →</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function GenreView({ genre, onClose, onGameSelect }) {
  const [games, setGames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hoveredGame, setHoveredGame] = useState(null);
  const [randomSeed] = useState(Math.random().toString());

  const containerRef = useRef(null);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      const firstPage = await fetchGames({ page: 1, genres: genre, seed: randomSeed });
      setGames(firstPage);
      if (firstPage.length > 0) setHoveredGame(firstPage[0]);
      setCurrentPage(1);
      setLoading(false);
    };
    loadInitial();
  }, [genre, randomSeed]);

  const handleScroll = async (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 200;
    if (bottom && !loading) {
      setLoading(true);
      const nextPage = currentPage + 1;
      const moreGames = await fetchGames({ page: nextPage, genres: genre, seed: randomSeed });
      setGames(prev => [...prev, ...moreGames]);
      setCurrentPage(nextPage);
      setLoading(false);
    }
  };

  const handleGameClick = (game) => {
    onGameSelect(game);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0c1011]"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <AnimatePresence mode="popLayout">
          {hoveredGame && (
            <motion.div
              key={hoveredGame.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <Image
                src={hoveredGame.background_image}
                alt="bg"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder_icon.svg";
                }}
                fill
                className="object-cover blur-[80px] scale-110"
                priority
              />
              <div className="absolute inset-0 bg-black/40" />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("/noise.png")' }}></div>
      </div>

      <div className="relative z-20 px-6 py-6 md:px-12 md:py-8 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent sticky top-0">
        <div>
          <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 uppercase tracking-tighter">
            {genre}
          </h2>
          <p className="text-white/60 text-sm md:text-base mt-1">Click any game to jump to it in your feed</p>
        </div>
        <button
          onClick={onClose}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all duration-300 backdrop-blur-md border border-white/10"
        >
          <span className="text-sm font-bold">Close</span>
          <svg className="w-5 h-5 transition-transform group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto px-6 md:px-12 pb-24 scrollbar-hide"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 max-w-[1800px] mx-auto">
          <AnimatePresence mode="popLayout">
            {games.map((game, index) => (
              <GameCard
                key={`${game.id}-${index}`}
                game={game}
                index={index}
                onHover={setHoveredGame}
                onClick={handleGameClick}
              />
            ))}
          </AnimatePresence>
        </div>

        {loading && (
          <div className="w-full flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
}