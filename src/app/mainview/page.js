"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import StarRating from "./starRating";
import GenreView from "./GenreView";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";
import { motion, AnimatePresence } from "framer-motion";
import {
  markGamesAsSeen,
  fetchGames,
  fetchGameDetails,
  fetchGameScreenshots,
  fetchIGDBStores,
} from "../lib/fetchGames";
import "swiper/css/pagination";
import "swiper/css/navigation";
import {
  choosePrimaryStoreLink,
  iconFilenameForStore,
  isMobileDevice,
} from "../lib/PlatformHelpers.js";
import { getRecommendationEngine } from "../lib/recommendationEngine";
import { useMemo } from "react";

// TODO:
// fix horrible search engine
// fix recommendation engine
// try to prevent game repition in different sessions
// fix screenshot flicker when scrolling

export default function Main({ preferredGenres }) {
  const seed = useMemo(() => {
    const s = Date.now() + Math.floor(Math.random() * 10000000);
    return s;
  }, []);
  const [games, setGames] = useState([]);
  const [gameDetails, setGameDetails] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [storeLinks, setStores] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const slideVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 260, damping: 20, bounce: 0.3 },
    },
  };
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [screenshotIndex, setScreenshotIndex] = useState(0);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [activeScreenshot, setActiveScreenshot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const engine = useRef(getRecommendationEngine()).current;
  const viewStartTime = useRef(Date.now());
  const currentGameRef = useRef(null);
  const isFetchingRef = useRef(false);
  const pendingSlideIndexRef = useRef(null);
  const mainSwiperRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const stripHtmlTags = (text) => {
    if (!text) return "";
    return text.replace(/<[^>]*>/g, "");
  };
  const sessionCache = useRef({});

  const normalize = (s = "") => s.toString().toLowerCase().trim();

  const simpleRankResults = (results = [], query = "") => {
    if (!query) return results;
    const q = normalize(query);

    return [...results].sort((a, b) => {
      const nameA = normalize(a.name);
      const nameB = normalize(b.name);

      if (nameA === q) return -1;
      if (nameB === q) return 1;

      if (nameA.startsWith(q) && !nameB.startsWith(q)) return -1;
      if (nameB.startsWith(q) && !nameA.startsWith(q)) return 1;

      return 0;
    });
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const q = searchQuery.trim();

    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await fetchGames({ page: 1, search: q, seed: seed });

        if (normalize(searchQuery) === normalize(q)) {
          const ranked = simpleRankResults(results || [], q);
          setSearchResults(ranked.slice(0, 8));
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        if (normalize(searchQuery) === normalize(q)) {
          setIsSearching(false);
        }
      }
    }, 500);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, seed]);

  const handleSelectSearchResult = (game) => {
    setSearchQuery("");
    setShowSearch(false);
    setSearchResults([]);

    const existingIndex = games.findIndex((g) => g.id === game.id);

    if (existingIndex !== -1) {
      if (mainSwiperRef.current) {
        mainSwiperRef.current.slideTo(existingIndex);
      } else {
        setActiveIndex(existingIndex);
      }
    } else {
      const insertIndex = activeIndex + 1;
      pendingSlideIndexRef.current = insertIndex;

      setGames((prev) => {
        const newGames = [...prev];
        newGames.splice(insertIndex, 0, game);
        return newGames;
      });
    }
  };

  // 1. Initial Load
  useEffect(() => {
    if (!preferredGenres) return;

    const fetchInitial = async () => {
      setLoading(true);
      try {
        // Pick a random starting page (1-3) for each session for diversity
        const randomPage = Math.floor(Math.random() * 3) + 1;
        const initialGames = await fetchGames({
          page: randomPage,
          genres: preferredGenres,
          seed: seed,
        });
        setGames(initialGames || []);
      } catch (error) {
        console.error("Error fetching games:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [preferredGenres, seed]);

  useEffect(() => {
    const shouldFetch =
      activeIndex >= games.length - 3 &&
      !loading &&
      !isFetchingRef.current &&
      games.length > 0;

    if (shouldFetch) {
      isFetchingRef.current = true;
      setLoading(true);
      const nextPage = currentPage + 1;

      fetchGames({ page: nextPage, genres: preferredGenres, seed: seed })
        .then((newGames) => {
          if (newGames?.length > 0) {
            setGames((prev) => [...prev, ...newGames]);
            setCurrentPage(nextPage);
          }
        })
        .finally(() => {
          setLoading(false);
          isFetchingRef.current = false;
        });
    }
  }, [activeIndex, games.length, preferredGenres, currentPage, seed]);

  useEffect(() => {
    if (pendingSlideIndexRef.current !== null && mainSwiperRef.current) {
      mainSwiperRef.current.update?.();
      mainSwiperRef.current.slideTo(pendingSlideIndexRef.current);
      pendingSlideIndexRef.current = null;
    }
  }, [games]);

  useEffect(() => {
    if (games[activeIndex]) {
      markGamesAsSeen([games[activeIndex].id]);
    }
  }, [activeIndex, games]);

  useEffect(() => {
    if (!showDetails || games.length === 0 || !games[activeIndex]) return;

    const currentGame = games[activeIndex];
    const gameId = currentGame.id;

    if (sessionCache.current[gameId]) {
      const cached = sessionCache.current[gameId];
      setGameDetails(cached.details);
      setScreenshots(cached.shots);
      setStores(cached.stores);
      setDetailsLoading(false);
      setScreenshotIndex(0);
      return;
    }

    const loadGameInfo = async () => {
      setDetailsLoading(true);
      setScreenshotIndex(0);

      try {
        const [details, shots, rawStores] = await Promise.all([
          fetchGameDetails(gameId),
          fetchGameScreenshots(gameId),
          fetchIGDBStores(currentGame.name),
        ]);

        const filteredStores = (rawStores || []).filter((link) => {
          if (!link.url) return false;
          const url = link.url.toLowerCase();
          return [
            "steam",
            "gog",
            "epic",
            "playstation",
            "xbox",
            "nintendo",
          ].some((s) => url.includes(s));
        });

        sessionCache.current[gameId] = {
          details: details,
          shots: shots || [],
          stores: filteredStores,
        };

        setGameDetails(details);
        setScreenshots(shots || []);
        setStores(filteredStores);
      } catch (error) {
        console.error("Error loading details:", error);
        setGameDetails(null);
        setScreenshots([]);
        setStores([]);
      } finally {
        setDetailsLoading(false);
      }
    };

    loadGameInfo();
  }, [activeIndex, games, showDetails]);

  const handleGenreClick = (genre) => {
    engine.recordGenreInterest(genre.slug);
    setSelectedGenre(genre.slug);
  };
  const handleCloseGenreView = () => {
    setSelectedGenre("");
  };

  const handleSlideChange = (swiper) => {
    const newIndex = swiper.activeIndex;
    const nextGame = games[newIndex];

    if (
      currentGameRef.current &&
      nextGame &&
      currentGameRef.current.id !== nextGame.id
    ) {
      const viewDuration = (Date.now() - viewStartTime.current) / 1000;

      // Mark the previous game as seen
      markGamesAsSeen([currentGameRef.current.id]);

      if (viewDuration < 2) {
        engine.recordSkip(currentGameRef.current);
      } else {
        engine.recordView(currentGameRef.current, viewDuration);
      }
    }

    viewStartTime.current = Date.now();
    currentGameRef.current = nextGame;

    if (nextGame) {
      const cachedData = sessionCache.current[nextGame.id];

      if (cachedData) {
        setGameDetails(cachedData.details);
        setScreenshots(cachedData.shots);
        setStores(cachedData.stores);
        setDetailsLoading(false);
      } else {
        setGameDetails(null);
        setScreenshots([]);
        setStores([]);
        setDetailsLoading(true);
      }
    }
    setLastActiveIndex(activeIndex);
    setActiveIndex(newIndex);
  };

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

  const closeSearchSafely = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  return (
    <div className="relative h-screen w-screen bg-gradient-to-br from-[#292929] via-[#0c1011] to-[#211b1c] overflow-hidden">
      {/* Search Button */}
      <motion.button
        onClick={() => setShowSearch(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="top-4 left-4 fixed sm:top-9 sm:left-7 z-40 bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-full hover:bg-white/20 transition-all shadow-lg"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </motion.button>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-xl search-scroll"
            onClick={closeSearchSafely}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              {/* Search Input */}
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for games..."
                  autoFocus
                  className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-gray-500"
                />
                <button
                  onClick={closeSearchSafely}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Search Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white"></div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {searchResults.map((game) => (
                      <motion.div
                        key={game.id}
                        whileHover={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                        }}
                        onClick={() => handleSelectSearchResult(game)}
                        className="p-4 cursor-pointer flex items-center gap-4 transition-colors"
                      >
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                          {game.background_image && (
                            <Image
                              src={game.background_image}
                              alt={game.name}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate">
                            {game.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {game.released?.split("-")[0]}
                            </span>
                            {game.rating && (
                              <>
                                <span className="text-xs text-gray-600">•</span>
                                <span className="text-xs text-yellow-400">
                                  ★ {game.rating}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-gray-600"
                        >
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </motion.div>
                    ))}
                  </div>
                ) : searchQuery.trim().length >= 2 ? (
                  <div className="py-12 text-center text-gray-500">
                    No games found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    Start typing to search games...
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedGenre && (
          <GenreView
            genre={selectedGenre}
            onClose={handleCloseGenreView}
            onGameSelect={handleSelectSearchResult}
          />
        )}
      </AnimatePresence>
      <div className="p-50 absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-900 to-black opacity-80 z-0 animate-gradient-xy pointer-events-none mix-blend-multiply" />

      <Swiper
        direction="vertical"
        slidesPerView={1}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 1,
          thresholdDelta: 50,
          thresholdTime: 1000,
        }}
        modules={[Mousewheel]}
        onSlideChange={handleSlideChange}
        className="z-10 h-screen w-screen"
        allowTouchMove={!selectedGenre && !showSearch}
      >
        {games.map((game, index) => (
          <SwiperSlide key={`${game.id}-${index}`}>
            <motion.div
              className="relative w-full h-full overflow-hidden shadow-lg z-10"
              variants={slideVariants}
              initial="hidden"
              animate={activeIndex === index ? "visible" : "hidden"}
            >
              {/* Blurred background */}
              <div
                className={`absolute inset-0 ${
                  selectedGenre ? "blur-lg" : ""
                } bg-cover`}
                style={{ backgroundImage: `url(${game.background_image})` }}
              />

              <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
                <div className="lg:hidden absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0c1011] via-[#0c1011] to-transparent pointer-events-none"></div>
                <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#00000040] via-[#00000040] to-transparent pointer-events-none w-full h-full"></div>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col lg:flex-row justify-center items-center">
                  <div className="p-5 sm:p-6 lg:p-0 absolute lg:inset-y-[35%] lg:inset-x-[3%] inset-y-[12%] flex flex-col gap-2 sm:gap-4 lg:gap-[10px] items-start h-auto w-full justify-start overflow-visible lg:overflow-visible max-h-[35vh] lg:max-h-none pb-0 lg:pb-0 z-10 lg:pointer-events-none">
                    {/* Genre Pills */}
                    {game.genres && game.genres.length > 0 && (
                      <div className="flex flex-wrap lg:flex-row items-center gap-2 lg:gap-[5px] text-white text-xs sm:text-sm lg:text-base pointer-events-auto">
                        {game.genres.map((genre, i) => (
                          <span
                            key={genre.id}
                            className={`flex items-center gap-[5px] transition-transform duration-500 ease-out ${getGenresTranslateX(index)}`}
                            style={{ transitionDelay: `${i * 100}ms` }}
                          >
                            <span
                              onClick={() => handleGenreClick(genre)}
                              className={`p-[6px] px-3 rounded-[30px] transition-all duration-300 hover:bg-white hover:text-black hover:scale-105 hover:cursor-pointer backdrop-blur-md border border-white/10 ${activeIndex == index ? "bg-[#5c5b5840]/60" : "bg-transparent"}`}
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
                      className={`transition-all flex flex-col gap-3 sm:gap-4 lg:gap-[20px] duration-700 delay-200 w-full lg:w-auto pointer-events-auto ${getGroupTranslateY(index)}`}
                    >
                      <StarRating rating={game.rating} />

                      <div className="flex flex-col gap-3 lg:flex-row lg:justify-center lg:items-center lg:bg-[#21212160] lg:backdrop-blur-md lg:border lg:border-white/5 lg:rounded-[50px] lg:p-[8px]">
                        {gameDetails && (
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-center lg:gap-4 w-full">
                            {/* Primary "Get Now" button */}
                            <button
                              type="button"
                              onClick={() => {
                                const primary = choosePrimaryStoreLink(
                                  storeLinks,
                                  isMobileDevice(),
                                );
                                if (primary)
                                  window.open(
                                    primary.url,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                              }}
                              className="group relative w-full lg:w-auto bg-white text-black px-8 py-3 rounded-full font-bold text-sm lg:text-base transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 overflow-hidden"
                              disabled={storeLinks.length === 0}
                            >
                              <svg
                                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                              </svg>
                              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent z-0"></div>
                              <span className="relative z-10">Get Now</span>
                            </button>

                            {/* Individual clickable store icons */}
                            {storeLinks.length > 0 && (
                              <div className="flex gap-2 lg:gap-[10px] flex-wrap lg:flex-nowrap px-2 mt-2 lg:mt-0 justify-center">
                                {storeLinks.map((store) => (
                                  <a
                                    key={store.url || store.name}
                                    href={store.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={store.name}
                                    className="sm:opacity-70 opacity-100 hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <Image
                                      alt={store.name}
                                      width={28}
                                      height={28}
                                      src={iconFilenameForStore(store)}
                                      className="sm:filter sm:invert md:filter md:invert drop-shadow-md"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "/placeholder_icon.svg";
                                      }}
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
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
                              <h3 className="text-white font-semibold mb-2 text-xs sm:text-sm uppercase tracking-wider">
                                About
                              </h3>
                              <p className="text-white/70 text-xs sm:text-sm leading-relaxed line-clamp-4">
                                {stripHtmlTags(
                                  gameDetails.description_raw ||
                                    gameDetails.description,
                                )}
                              </p>
                            </div>
                          )}

                          {/* Metacritic Score */}
                          {gameDetails.metacritic && (
                            <div className="bg-yellow-600/20 border border-yellow-600/40 rounded-lg p-2 sm:p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-white/70 text-xs sm:text-sm">
                                  Metacritic
                                </span>
                                <span className="text-yellow-400 font-bold text-base sm:text-lg">
                                  {gameDetails.metacritic}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Developers */}
                          {gameDetails.developers &&
                            gameDetails.developers.length > 0 && (
                              <div>
                                <h3 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm uppercase tracking-wider">
                                  Developer
                                </h3>
                                <p className="text-white/70 text-xs sm:text-sm">
                                  {gameDetails.developers[0]?.name || "Unknown"}
                                </p>
                              </div>
                            )}

                          {/* Publishers */}
                          {gameDetails.publishers &&
                            gameDetails.publishers.length > 0 && (
                              <div>
                                <h3 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm uppercase tracking-wider">
                                  Publisher
                                </h3>
                                <p className="text-white/70 text-xs sm:text-sm">
                                  {gameDetails.publishers[0]?.name || "Unknown"}
                                </p>
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

                          {/* Screenshots Carousel */}
                          {screenshots.length > 0 && (
                            <div>
                              <h3 className="text-white font-semibold mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-wider">
                                Screenshots
                              </h3>

                              <div className="relative">
                                <Swiper
                                  onSwiper={(swiper) => {
                                    setSwiperInstance(swiper);
                                  }}
                                  onSlideChange={(swiper) =>
                                    setScreenshotIndex(swiper.activeIndex)
                                  }
                                  spaceBetween={12}
                                  slidesPerView={1.15}
                                  centeredSlides={true}
                                  modules={[]}
                                  className="w-full"
                                  allowTouchMove={true}
                                  grabCursor={true}
                                  style={{ padding: "0" }}
                                >
                                  {screenshots.map((screenshot, idx) => (
                                    <SwiperSlide
                                      key={idx}
                                      className="flex justify-center"
                                    >
                                      <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-gray-900 h-40 sm:h-48 md:h-56 lg:aspect-video lg:h-auto">
                                        <Image
                                          src={screenshot.image}
                                          alt="Screenshot"
                                          fill
                                          className="object-cover cursor-zoom-in"
                                          onClick={() => {
                                            setActiveScreenshot(
                                              screenshot.image,
                                            );
                                            setShowScreenshotModal(true);
                                          }}
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
                  <div className="absolute bottom-[10vh] left-0 right-0 h-1/2 lg:hidden bg-gradient-to-t from-[#0c1011] via-[#0c1011] to-transparent overflow-y-auto p-4 sm:p-6 scrollbar-hide z-20">
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
                            <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wider">
                              About
                            </h3>
                            <p className="text-white/70 text-xs leading-relaxed line-clamp-4">
                              {stripHtmlTags(
                                gameDetails.description_raw ||
                                  gameDetails.description,
                              )}
                            </p>
                          </div>
                        )}

                        {/* Metacritic Score */}
                        {gameDetails.metacritic && (
                          <div className="bg-yellow-600/20 border border-yellow-600/40 rounded-lg p-2 hidden sm:block">
                            <div className="flex items-center justify-between">
                              <span className="text-white/70 text-xs">
                                Metacritic
                              </span>
                              <span className="text-yellow-400 font-bold text-sm">
                                {gameDetails.metacritic}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Developers */}
                        {gameDetails.developers &&
                          gameDetails.developers.length > 0 && (
                            <div className="hidden sm:block">
                              <h3 className="text-white font-semibold mb-1 text-xs uppercase tracking-wider">
                                Developer
                              </h3>
                              <p className="text-white/70 text-xs">
                                {gameDetails.developers[0]?.name || "Unknown"}
                              </p>
                            </div>
                          )}

                        {/* Publishers */}
                        {gameDetails.publishers &&
                          gameDetails.publishers.length > 0 && (
                            <div className="hidden sm:block">
                              <h3 className="text-white font-semibold mb-1 text-xs uppercase tracking-wider">
                                Publisher
                              </h3>
                              <p className="text-white/70 text-xs">
                                {gameDetails.publishers[0]?.name || "Unknown"}
                              </p>
                            </div>
                          )}

                        {/* Website */}
                        {gameDetails.website && (
                          <a
                            href={gameDetails.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-center rounded-lg transition-colors hidden sm:block"
                          >
                            Visit Website →
                          </a>
                        )}

                        {/* Screenshots Carousel */}
                        {screenshots.length > 0 && (
                          <div>
                            <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wider">
                              Screenshots
                            </h3>

                            {/* Swiper Container */}
                            <div className="relative">
                              <Swiper
                                onSwiper={(swiper) => {
                                  setSwiperInstance(swiper);
                                }}
                                onSlideChange={(swiper) =>
                                  setScreenshotIndex(swiper.activeIndex)
                                }
                                spaceBetween={12}
                                slidesPerView={1.15}
                                centeredSlides={true}
                                modules={[]}
                                className="w-full"
                                allowTouchMove={true}
                                grabCursor={true}
                                style={{ padding: "0" }}
                              >
                                {screenshots.map((screenshot, idx) => (
                                  <SwiperSlide
                                    key={idx}
                                    className="flex justify-center"
                                  >
                                    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-gray-900 h-40 sm:h-48 md:h-56 lg:aspect-video lg:h-auto">
                                      <Image
                                        src={screenshot.image}
                                        alt="Screenshot"
                                        fill
                                        className="object-cover cursor-zoom-in"
                                        onClick={() => {
                                          setActiveScreenshot(screenshot.image);
                                          setShowScreenshotModal(true);
                                        }}
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

      <AnimatePresence>
        {showScreenshotModal && activeScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setShowScreenshotModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-[90vw] max-h-[90vh]"
            >
              <div className="relative w-[90vw] h-[90vh]">
                <Image
                  src={activeScreenshot}
                  alt="Screenshot fullscreen"
                  fill
                  className="object-contain rounded-xl shadow-2xl"
                  priority
                />
              </div>

              <button
                onClick={() => setShowScreenshotModal(false)}
                className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="absolute bottom-4 sm:bottom-6 lg:bottom-10 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 sm:px-4 py-2 rounded-full backdrop-blur-sm text-xs sm:text-sm">
          Loading more...
        </div>
      )}
    </div>
  );
}
