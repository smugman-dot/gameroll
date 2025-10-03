import { motion } from "framer-motion";
import Image from "next/image";

const mockGames = [
  {
    id: 1,
    name: "Cyberpunk 2077",
    rating: 4.1,
    background_image:
      "https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c62.jpg",
  },
  {
    id: 2,
    name: "The Witcher 3",
    rating: 4.8,
    background_image:
      "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg",
  },
  {
    id: 3,
    name: "Red Dead Redemption 2",
    rating: 4.7,
    background_image:
      "https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg",
  },
  {
    id: 4,
    name: "Elden Ring",
    rating: 4.9,
    background_image:
      "https://media.rawg.io/media/games/5ec/5ecac5cb026ec26a56efcc546364e348.jpg",
  },
  {
    id: 5,
    name: "God of War",
    rating: 4.8,
    background_image:
      "https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg",
  },
  {
    id: 6,
    name: "Hades",
    rating: 4.6,
    background_image:
      "https://media.rawg.io/media/games/1f4/1f47a270b8f241e4676b14d39ec620f7.jpg",
  },
  {
    id: 7,
    name: "Hollow Knight",
    rating: 4.5,
    background_image:
      "https://media.rawg.io/media/games/4cf/4cfc6b7f1850590a4634b08bfab308ab.jpg",
  },
  {
    id: 8,
    name: "Portal 2",
    rating: 4.9,
    background_image:
      "https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188742.jpg",
  },
  {
    id: 9,
    name: "BioShock Infinite",
    rating: 4.4,
    background_image:
      "https://media.rawg.io/media/games/fc1/fc1307a2774506b5bd65d7e8424664a7.jpg",
  },
];

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  return (
    <div className="flex items-center text-yellow-400">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`f${i}`}>★</span>
      ))}
      {halfStar && <span>☆</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`e${i}`} className="text-gray-500">
          ★
        </span>
      ))}
      <span className="ml-2 text-xs text-gray-300">{rating.toFixed(1)}</span>
    </div>
  );
};

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

export default function GenreView({ genre, onClose }) {
  return (
    <motion.div
      key="genre-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 md:p-6 overflow-y-scroll overflow-x-hidden  [&::-webkit-scrollbar]:w-2
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
          {mockGames.map((game, index) => (
            <GameCard key={game.id} game={game} index={index} />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
