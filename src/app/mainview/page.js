"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import StarRating from "./starRating";
import GenreView from "./GenreView";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";
import { motion, AnimatePresence } from "framer-motion";
import { fetchGames } from "../lib/fetchGames";
import { getRecommendationEngine } from "../lib/recommendationEngine";

export default function Main({ preferredGenres }) {
  const [games, setGames] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("");

  const engine = useRef(getRecommendationEngine()).current;
  const viewStartTime = useRef(Date.now());
  const currentGameRef = useRef(null);
  const isFetchingRef = useRef(false);

  // 1. Initial fetch - just get games, no complex logic
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const initialGames = await fetchGames({ page: 1, genres: preferredGenres });
        setGames(initialGames);
      } catch (error) {
        console.error("Error fetching games:", error);
      }
      setLoading(false);
    };

    if (preferredGenres) {
      fetchInitial();
    }
  }, [preferredGenres]);

  // 2. Track view time
  const handleSlideChange = (swiper) => {
    const newIndex = swiper.activeIndex;

    if (currentGameRef.current) {
      const viewDuration = (Date.now() - viewStartTime.current) / 1000;
      if (viewDuration < 2) {
        engine.recordSkip(currentGameRef.current);
      } else {
        engine.recordView(currentGameRef.current, viewDuration);
      }
    }

    viewStartTime.current = Date.now();
    currentGameRef.current = games[newIndex];
    setLastActiveIndex(activeIndex);
    setActiveIndex(newIndex);
  };

  // 3. SIMPLE infinite scroll - just keep fetching next page
  useEffect(() => {
    const shouldFetch = activeIndex >= games.length - 3 && !loading && !isFetchingRef.current;

    if (shouldFetch) {
      isFetchingRef.current = true;
      setLoading(true);

      const nextPage = currentPage + 1;

      fetchGames({ page: nextPage, genres: preferredGenres })
        .then((newGames) => {
          if (newGames && newGames.length > 0) {
            // Just add them - no filtering, no complex logic
            setGames(prev => [...prev, ...newGames]);
            setCurrentPage(nextPage);
          }
        })
        .catch(error => {
          console.error('Error fetching:', error);
        })
        .finally(() => {
          setLoading(false);
          isFetchingRef.current = false;
        });
    }
  }, [activeIndex, games.length, loading, currentPage, preferredGenres]);

  // 4. Genre click
  const handleGenreClick = (genre) => {
    engine.recordGenreInterest(genre.slug);
    setSelectedGenre(genre.slug);
  };

  const handleCloseGenreView = () => {
    setSelectedGenre("");
  };

  // Animation helpers
  const getH1TranslateY = (currentIndex) => {
    if (activeIndex === currentIndex) return "translate-y-0 opacity-100";
    if (activeIndex > lastActiveIndex) {
      return currentIndex < activeIndex
        ? "translate-y-[-40px] opacity-0"
        : "translate-y-[40px] opacity-0";
    }
    return currentIndex > activeIndex
      ? "translate-y-[40px] opacity-0"
      : "translate-y-[-40px] opacity-0";
  };

  const getGroupTranslateY = (currentIndex) => {
    if (activeIndex === currentIndex) return "translate-y-0 opacity-100";
    if (activeIndex > lastActiveIndex) {
      return currentIndex < activeIndex
        ? "translate-y-[-10px] opacity-0"
        : "translate-y-[10px] opacity-0";
    }
    return currentIndex > activeIndex
      ? "translate-y-[10px] opacity-0"
      : "translate-y-[-10px] opacity-0";
  };

  const getGenresTranslateX = (currentIndex) => {
    if (activeIndex === currentIndex) return "translate-x-0 opacity-100";
    if (activeIndex > lastActiveIndex) {
      return currentIndex < activeIndex
        ? "translate-x-[-50px] opacity-0"
        : "translate-x-[50px] opacity-0";
    }
    return currentIndex > activeIndex
      ? "translate-x-[50px] opacity-0"
      : "translate-x-[-50px] opacity-0";
  };

  if (loading && games.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0c1011] text-white">
        Loading games...
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-gradient-to-br from-[#292929] via-[#0c1011] to-[#211b1c] overflow-hidden">
      <AnimatePresence>
        {selectedGenre && (
          <GenreView genre={selectedGenre} onClose={handleCloseGenreView} />
        )}
      </AnimatePresence>

      <Swiper
        direction="vertical"
        slidesPerView={1}
        mousewheel={true}
        modules={[Mousewheel]}
        onSlideChange={handleSlideChange}
        className="h-screen w-screen"
        allowTouchMove={!selectedGenre}
      >
        {games.map((game, index) => (
          <SwiperSlide key={`${game.id}-${index}`}>
            <motion.div
              animate={{
                scale: selectedGenre ? 0.95 : 1,
                filter: selectedGenre ? "blur(20px)" : "blur(0px)",
              }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full w-full flex justify-center items-center"
            >
              <div
                className={`relative w-[100vw] md:w-[94vw] h-[100vh] md:h-[90vh] md:rounded-[40px] overflow-hidden shadow-[0px_10px_32px_16px_rgba(0,_0,_0,_0.1)] transition-all duration-700 ${activeIndex === index ? "opacity-100 scale-105" : "opacity-40 scale-95"}`}
              >
                {/* Image with fallback */}
                <div className="relative w-full h-50 md:h-full md:w-full overflow-hidden bg-gray-800">
                  {game.background_image ? (
                    <Image
                      src={game.background_image}
                      alt={game.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 100vh"
                      className={`transition-transform duration-700 ${activeIndex === index ? "scale-105" : "scale-100"} object-cover object-top`}
                      priority={index < 3}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-white text-4xl">🎮</div>
                    </div>
                  )}
                </div>

                <div className="md:hidden absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[#0c1011] via-[#0c1011] to-transparent pointer-events-none"></div>
                <div className="invisible md:visible absolute inset-0 bg-gradient-to-t from-[#00000040] via-[#00000040] to-transparent rounded-[40px] pointer-events-none w-full h-full"></div>

                {/* Content Overlay */}
                <div className="p-[15px] md:p-0 absolute inset-y-[35%] inset-x-[3%] flex flex-col gap-[10px] items-start h-full w-full justify-start">
                  {/* Genre Pills */}
                  {game.genres && game.genres.length > 0 && (
                    <div className="flex items-center gap-[5px] text-[white]">
                      {game.genres.map((genre, i) => (
                        <span
                          key={genre.id}
                          className={`flex items-center gap-[5px] transition-transform duration-500 ease-out ${getGenresTranslateX(index)}`}
                          style={{ transitionDelay: `${i * 100}ms` }}
                        >
                          <span
                            onClick={() => handleGenreClick(genre)}
                            className={`p-[6px] rounded-[30px] transition-colors duration-300 hover:bg-[#5c5b5860] hover:cursor-pointer backdrop-blur-md ${activeIndex == index ? "bg-[#5c5b5840]/60" : "bg-transparent"}`}
                          >
                            {genre.name}
                          </span>
                          {i < game.genres.length - 1 && (
                            <span className="w-[4px] h-[4px] bg-[white] rounded-full inline-block"></span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <h1
                    className={`text-[32px] md:text-[46px] text-white font-bold drop-shadow-lg transition-all duration-700 ${getH1TranslateY(index)}`}
                  >
                    {game.name}
                  </h1>

                  {/* Release Date */}
                  {game.released && (
                    <p
                      className={`text-[14px] md:text-[18px] text-[white] transition-all duration-700 delay-100 ${getGroupTranslateY(index)}`}
                    >
                      {game.released.split("-")[0]}
                    </p>
                  )}

                  {/* Rating & Stores */}
                  <div
                    className={`transition-all flex flex-col gap-[20px] duration-700 delay-200 ${getGroupTranslateY(index)}`}
                  >
                    <StarRating rating={game.rating} />
                    <div className="flex flex-col md:flex-row gap-4 md:justify-center md:items-center md:bg-[#21212160] rounded-[50px] p-[5px]">
                      <button className="fancy-button w-60">
                        <span>Purchase Game</span>
                      </button>
                      {game.stores && game.stores.length > 0 && (
                        <div className="flex gap-[10px]">
                          {game.stores.map((store) => (
                            <Image
                              key={store.id}
                              alt={store.name}
                              width={34}
                              height={34}
                              src={"/" + store.name + ".svg"}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder_icon.svg";
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Loading indicator at bottom */}
      {loading && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm">
          Loading more...
        </div>
      )}
    </div>
  );
}