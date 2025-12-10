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

  // Recommendation engine
  const engine = useRef(getRecommendationEngine()).current;

  // Track view time for current game
  const viewStartTime = useRef(Date.now());
  const currentGameRef = useRef(null);

  // 1. Initial Fetch - Get large pool of games
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        // Fetch multiple pages to get a good pool (100 games)
        const pages = [1, 2, 3, 4, 5];
        const allFetches = pages.map(page =>
          fetchGames({ page, genres: preferredGenres })
        );

        const results = await Promise.all(allFetches);
        const allGames = results.flat();

        // Let recommendation engine rank and organize them
        const smartFeed = engine.getSmartFeed(allGames);
        setGames(smartFeed);
      } catch (error) {
        console.error("Error fetching initial games:", error);
      }
      setLoading(false);
    };

    if (preferredGenres) {
      fetchInitial();
    }
  }, [preferredGenres]);

  // 2. Track view time when slide changes
  const handleSlideChange = (swiper) => {
    const newIndex = swiper.activeIndex;

    // Record analytics for previous game
    if (currentGameRef.current) {
      const viewDuration = (Date.now() - viewStartTime.current) / 1000; // seconds

      if (viewDuration < 2) {
        // Quick skip = user not interested
        engine.recordSkip(currentGameRef.current);
      } else {
        // Longer view = user interested
        engine.recordView(currentGameRef.current, viewDuration);
      }
    }

    // Set up tracking for new game
    viewStartTime.current = Date.now();
    currentGameRef.current = games[newIndex];

    setLastActiveIndex(activeIndex);
    setActiveIndex(newIndex);
  };

  // 3. Infinite scroll - fetch more and re-rank
  useEffect(() => {
    if (activeIndex >= games.length - 5 && !loading && games.length > 0) {
      setLoading(true);
      const nextPage = currentPage + 1;

      fetchGames({
        page: nextPage,
        genres: preferredGenres
      }).then((newGames) => {
        // Rank new games with engine
        const rankedNew = engine.rankGames(newGames);

        // Filter out duplicates
        const uniqueNew = rankedNew.filter(
          ng => !games.some(og => og.id === ng.id)
        );

        setGames(prev => [...prev, ...uniqueNew]);
        setCurrentPage(nextPage);
        setLoading(false);
      });
    }
  }, [activeIndex, games, loading, preferredGenres, currentPage]);

  // 4. Handle genre click
  const handleGenreClick = (genre) => {
    // Track that user is interested in this genre
    engine.recordGenreInterest(genre.slug);

    setSelectedGenre(genre.slug);
    setCurrentPage(1);
    setGames([]);
    setLoading(true);

    // Fetch games in this genre
    const pages = [1, 2, 3];
    Promise.all(pages.map(page =>
      fetchGames({ page, genres: genre.slug })
    )).then(results => {
      const allGames = results.flat();
      const smartFeed = engine.getSmartFeed(allGames);
      setGames(smartFeed);
      setLoading(false);
    });
  };

  // 5. Close genre view
  const handleCloseGenreView = () => {
    setSelectedGenre("");
    setCurrentPage(1);
    setGames([]);
    setLoading(true);

    // Fetch fresh feed based on updated preferences
    const pages = [1, 2, 3, 4, 5];
    Promise.all(pages.map(page =>
      fetchGames({ page, genres: preferredGenres })
    )).then(results => {
      const allGames = results.flat();
      const smartFeed = engine.getSmartFeed(allGames);
      setGames(smartFeed);
      setLoading(false);
    });
  };

  // --- Animation Helpers ---
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

  if (loading && games.length === 0)
    return (
      <div className="flex justify-center items-center h-screen bg-[#0c1011] text-white">
        Loading your personalized feed...
      </div>
    );

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
                {/* Image */}
                <div className="relative w-full h-50 md:h-full md:w-full overflow-hidden">
                  <Image
                    src={game.background_image}
                    alt={game.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 100vh"
                    className={`transition-transform duration-700 ${activeIndex === index ? "scale-105" : "scale-100"} object-cover object-top`}
                    priority={activeIndex === index}
                  />
                </div>

                <div className="md:hidden absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[#0c1011] via-[#0c1011] to-transparent pointer-events-none"></div>
                <div className="invisible md:visible absolute inset-0 bg-gradient-to-t from-[#00000040] via-[#00000040] to-transparent rounded-[40px] pointer-events-none w-full h-full"></div>

                {/* Content Overlay */}
                <div className="p-[15px] md:p-0 absolute inset-y-[35%] inset-x-[3%] flex flex-col gap-[10px] items-start h-full w-full justify-start">
                  {/* Genre Pills */}
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

                  {/* Title */}
                  <h1
                    className={`text-[32px] md:text-[46px] text-white font-bold drop-shadow-lg transition-all duration-700 ${getH1TranslateY(index)}`}
                  >
                    {game.name}
                  </h1>

                  {/* Release Date */}
                  <p
                    className={`text-[14px] md:text-[18px] text-[white] transition-all duration-700 delay-100 ${getGroupTranslateY(index)}`}
                  >
                    {game.released?.split("-")[0]}
                  </p>

                  {/* Rating & Stores */}
                  <div
                    className={`transition-all flex flex-col gap-[20px] duration-700 delay-200 ${getGroupTranslateY(index)}`}
                  >
                    <StarRating rating={game.rating} />
                    <div className="flex flex-col md:flex-row gap-4 md:justify-center md:items-center md:bg-[#21212160] rounded-[50px] p-[5px]">
                      <button className="fancy-button w-60">
                        <span>Purchase Game</span>
                      </button>
                      <div className="flex gap-[10px]">
                        {game.stores &&
                          game.stores.map((store) => (
                            <Image
                              key={store.id}
                              alt="platform"
                              width={34}
                              height={34}
                              src={"/" + store.name + ".svg"}
                              onError={(e) =>
                                (e.currentTarget.style.display = "none")
                              }
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}