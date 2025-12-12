"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import StarRating from "./starRating";
import GenreView from "./GenreView";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";
import { motion, AnimatePresence } from "framer-motion";
import { fetchGames, fetchGameDetails, fetchGameScreenshots } from "../lib/fetchGames";
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { getRecommendationEngine } from "../lib/recommendationEngine";

// TODO: fix stuttery scrolling in mobile

export default function Main({ preferredGenres }) {
  const [games, setGames] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [gameDetails, setGameDetails] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [screenshotIndex, setScreenshotIndex] = useState(0);
  const [prevEl, setPrevEl] = useState(null);
  const [nextEl, setNextEl] = useState(null);

  const engine = useRef(getRecommendationEngine()).current;
  const viewStartTime = useRef(Date.now());
  const currentGameRef = useRef(null);
  const isFetchingRef = useRef(false);
  const screenshotSwiperRef = useRef(null);

  // Strip HTML tags from description
  const stripHtmlTags = (text) => {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '');
  };

  // 1. Initial fetch
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        console.log("Fetching initial games for genres:", preferredGenres);
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

  useEffect(() => {
    const shouldFetch = activeIndex >= games.length - 3 && !loading && !isFetchingRef.current;

    if (shouldFetch) {
      isFetchingRef.current = true;
      setLoading(true);

      const nextPage = currentPage + 1;

      fetchGames({ page: nextPage, genres: preferredGenres })
        .then((newGames) => {
          if (newGames && newGames.length > 0) {
            setGames(prev => [...prev, ...newGames])
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
  }, [activeIndex, games.length, preferredGenres]);

  // Load game details and screenshots ONLY when panel is visible
  useEffect(() => {
    if (!showDetails) return; // Don't load if panel is hidden

    const loadGameInfo = async () => {
      if (games.length === 0 || !games[activeIndex]) return;

      const currentGame = games[activeIndex];
      setDetailsLoading(true);
      setScreenshotIndex(0);

      try {
        const [details, shots] = await Promise.all([
          fetchGameDetails(currentGame.id),
          fetchGameScreenshots(currentGame.id)
        ]);

        setGameDetails(details);
        setScreenshots(shots || []);
      } catch (error) {
        console.error("Error loading game details:", error);
        setGameDetails(null);
        setScreenshots([]);
      } finally {
        setDetailsLoading(false);
      }
    };

    loadGameInfo();
  }, [activeIndex, games, showDetails]);

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
                className={`relative w-[100vw] lg:w-[94vw] h-[100vh] lg:h-[90vh] lg:rounded-[40px] overflow-hidden shadow-[0px_10px_32px_16px_rgba(0,_0,_0,_0.1)] transition-all duration-700 ${activeIndex === index ? "opacity-100 lg:scale-105 scale-100" : "opacity-40 scale-95"}`}
              >
                {/* Image with fallback */}
                <div className="relative w-full h-1/2 lg:h-full lg:w-full overflow-hidden bg-gray-800">
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

                <div className="lg:hidden absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0c1011] via-[#0c1011] to-transparent pointer-events-none"></div>
                <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#00000040] via-[#00000040] to-transparent rounded-[40px] pointer-events-none w-full h-full"></div>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col lg:flex-row justify-center items-center">
                  <div className="p-4 sm:p-6 lg:p-0 absolute lg:inset-y-[35%] lg:inset-x-[3%] inset-x-[3%] inset-y-[10%] flex flex-col gap-2 sm:gap-4 lg:gap-[10px] items-start h-auto w-full justify-start overflow-visible lg:overflow-visible max-h-[35vh] lg:max-h-none pb-0 lg:pb-0 z-10 lg:pointer-events-none">
                    {/* Genre Pills */}
                    {game.genres && game.genres.length > 0 && (
                      <div className="flex flex-wrap lg:flex-row items-center gap-2 lg:gap-[5px] text-white text-xs sm:text-sm lg:text-base">
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
                      className={`text-2xl sm:text-3xl lg:text-[46px] text-white font-bold drop-shadow-lg transition-all duration-700 ${getH1TranslateY(index)}`}
                    >
                      {game.name}
                    </h1>

                    {/* Rating & Stores */}
                    <div
                      className={`transition-all flex flex-col gap-3 sm:gap-4 lg:gap-[20px] duration-700 delay-200 w-full lg:w-auto ${getGroupTranslateY(index)}`}
                    >
                      <StarRating rating={game.rating} />
                      <div className="flex flex-col gap-3 lg:flex-row lg:justify-center lg:items-center lg:bg-[#21212160] lg:rounded-[50px] lg:p-[5px]">
                        <button className="fancy-button w-full lg:w-60 text-sm lg:text-base">
                          <span>Purchase Game</span>
                        </button>
                        {game.stores && game.stores.length > 0 && (
                          <div className="flex gap-2 lg:gap-[10px] flex-wrap lg:flex-nowrap">
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
                  {/* Right Side Details Panel */}
                  <motion.div
                    animate={{ x: showDetails ? 0 : 400 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="hidden lg:block absolute right-0 top-0 h-full w-96 bg-gradient-to-l from-black/80 via-black/70 to-transparent backdrop-blur-md border-l border-white/10 overflow-hidden"
                  >

                    {/* Panel Content */}
                    <div className="h-full overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                      {detailsLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-white/50 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white/70 mx-auto mb-2"></div>
                            <p className="text-sm">Loading details...</p>
                          </div>
                        </div>
                      ) : gameDetails ? (
                        <div className="space-y-6">

                          {/* Description */}
                          {gameDetails.description && (
                            <div>
                              <h3 className="text-white font-semibold mb-2 text-xs sm:text-sm uppercase tracking-wider">About</h3>
                              <p className="text-white/70 text-xs sm:text-sm leading-relaxed line-clamp-4">
                                {stripHtmlTags(gameDetails.description_raw || gameDetails.description)}
                              </p>
                            </div>
                          )}

                          {/* Metacritic Score */}
                          {gameDetails.metacritic && (
                            <div className="bg-yellow-600/20 border border-yellow-600/40 rounded-lg p-2 sm:p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-white/70 text-xs sm:text-sm">Metacritic</span>
                                <span className="text-yellow-400 font-bold text-base sm:text-lg">{gameDetails.metacritic}</span>
                              </div>
                            </div>
                          )}

                          {/* Developers */}
                          {gameDetails.developers && gameDetails.developers.length > 0 && (
                            <div>
                              <h3 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm uppercase tracking-wider">Developer</h3>
                              <p className="text-white/70 text-xs sm:text-sm">{gameDetails.developers[0]?.name || 'Unknown'}</p>
                            </div>
                          )}

                          {/* Publishers */}
                          {gameDetails.publishers && gameDetails.publishers.length > 0 && (
                            <div>
                              <h3 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm uppercase tracking-wider">Publisher</h3>
                              <p className="text-white/70 text-xs sm:text-sm">{gameDetails.publishers[0]?.name || 'Unknown'}</p>
                            </div>
                          )}

                          {/* Website */}
                          {gameDetails.website && (
                            <a
                              href={gameDetails.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm rounded-lg transition-colors"
                            >
                              Visit Website →
                            </a>
                          )}

                          {/* Screenshots Carousel - Play Store Style */}
                          {screenshots.length > 0 && (
                            <div>
                              <h3 className="text-white font-semibold mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-wider">Screenshots</h3>

                              {/* Swiper Container with Peek Effect */}
                              <div className="relative">
                                <Swiper
                                  onSwiper={(swiper) => {
                                    setSwiperInstance(swiper);
                                  }}
                                  onSlideChange={(swiper) => setScreenshotIndex(swiper.activeIndex)}
                                  spaceBetween={12}
                                  slidesPerView={1.15}
                                  centeredSlides={true}
                                  modules={[]}
                                  className="w-full"
                                  allowTouchMove={true}
                                  grabCursor={true}
                                  style={{ padding: '0' }}
                                >
                                  {screenshots.map((screenshot, idx) => (
                                    <SwiperSlide key={idx} className="flex justify-center">
                                      <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-gray-900 h-40 sm:h-48 md:h-56 lg:aspect-video lg:h-auto">
                                        <Image
                                          src={screenshot.image || ''}
                                          alt={`Screenshot ${idx + 1}`}
                                          fill
                                          className="object-cover"
                                          priority={idx === 0}
                                          draggable={false}
                                        />
                                        {/* Subtle gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-2xl" />
                                      </div>
                                    </SwiperSlide>
                                  ))}
                                </Swiper>

                                {/* Counter */}
                                <div className="mt-2 sm:mt-3 text-center text-white/60 text-xs font-semibold">
                                  {screenshotIndex + 1} / {screenshots.length}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-white/50">
                          <p>No details available</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Mobile Details Section */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 lg:hidden bg-gradient-to-t from-[#0c1011] via-[#0c1011] to-transparent overflow-y-auto p-4 sm:p-6 scrollbar-hide z-20">
                    {detailsLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-white/50 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white/70 mx-auto mb-2"></div>
                          <p className="text-sm">Loading details...</p>
                        </div>
                      </div>
                    ) : gameDetails ? (
                      <div className="space-y-4">
                        {/* Description */}
                        {gameDetails.description && (
                          <div>
                            <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wider">About</h3>
                            <p className="text-white/70 text-xs leading-relaxed line-clamp-4">
                              {stripHtmlTags(gameDetails.description_raw || gameDetails.description)}
                            </p>
                          </div>
                        )}

                        {/* Metacritic Score */}
                        {gameDetails.metacritic && (
                          <div className="bg-yellow-600/20 border border-yellow-600/40 rounded-lg p-2 hidden sm:block">
                            <div className="flex items-center justify-between">
                              <span className="text-white/70 text-xs">Metacritic</span>
                              <span className="text-yellow-400 font-bold text-sm">{gameDetails.metacritic}</span>
                            </div>
                          </div>
                        )}

                        {/* Developers */}
                        {gameDetails.developers && gameDetails.developers.length > 0 && (
                          <div className="hidden sm:block">
                            <h3 className="text-white font-semibold mb-1 text-xs uppercase tracking-wider">Developer</h3>
                            <p className="text-white/70 text-xs">{gameDetails.developers[0]?.name || 'Unknown'}</p>
                          </div>
                        )}

                        {/* Publishers */}
                        {gameDetails.publishers && gameDetails.publishers.length > 0 && (
                          <div className="hidden sm:block">
                            <h3 className="text-white font-semibold mb-1 text-xs uppercase tracking-wider">Publisher</h3>
                            <p className="text-white/70 text-xs">{gameDetails.publishers[0]?.name || 'Unknown'}</p>
                          </div>
                        )}

                        {/* Website */}
                        {gameDetails.website && (
                          <a
                            href={gameDetails.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors hidden sm:block"
                          >
                            Visit Website →
                          </a>
                        )}

                        {/* Screenshots Carousel */}
                        {screenshots.length > 0 && (
                          <div>
                            <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wider">Screenshots</h3>

                            {/* Swiper Container */}
                            <div className="relative">
                              <Swiper
                                onSwiper={(swiper) => {
                                  setSwiperInstance(swiper);
                                }}
                                onSlideChange={(swiper) => setScreenshotIndex(swiper.activeIndex)}
                                spaceBetween={12}
                                slidesPerView={1.15}
                                centeredSlides={true}
                                modules={[]}
                                className="w-full"
                                allowTouchMove={true}
                                grabCursor={true}
                                style={{ padding: '0' }}
                              >
                                {screenshots.map((screenshot, idx) => (
                                  <SwiperSlide key={idx} className="flex justify-center">
                                    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-gray-900 h-40 sm:h-48 md:h-56 lg:aspect-video lg:h-auto">
                                      <Image
                                        src={screenshot.image || ''}
                                        alt={`Screenshot ${idx + 1}`}
                                        fill
                                        className="object-cover"
                                        priority={idx === 0}
                                        draggable={false}
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-2xl" />
                                    </div>
                                  </SwiperSlide>
                                ))}
                              </Swiper>
                              <div className="mt-2 text-center text-white/60 text-xs font-semibold">
                                {screenshotIndex + 1} / {screenshots.length}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/50">
                        <p className="text-xs">No details available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Loading indicator at bottom */}
      {loading && (
        <div className="absolute bottom-4 sm:bottom-6 lg:bottom-10 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 sm:px-4 py-2 rounded-full backdrop-blur-sm text-xs sm:text-sm">
          Loading more...
        </div>
      )}
    </div>
  );
}