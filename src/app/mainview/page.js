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

export default function Main({ preferredGenres }) {
  const [games, setGames] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // selectedGenre is for when a user clicks a specific tag (e.g. "Shooter")
  const [selectedGenre, setSelectedGenre] = useState("");

  // 1. Initial Fetch based on props (User Preferences)
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const initialData = await fetchGames({
          page: 1,
          genres: preferredGenres,
        });
        setGames(initialData);
      } catch (error) {
        console.error("Error fetching initial games:", error);
      }
      setLoading(false);
    };

    if (preferredGenres) {
      fetchInitial();
    }
  }, [preferredGenres]);

  // 2. Infinite Scroll Logic
  useEffect(() => {
    // Trigger when within 3 slides of the end
    if (activeIndex >= games.length - 3 && !loading && games.length > 0) {
      setLoading(true);
      const nextPage = currentPage + 1;

      // Determine what to fetch: Specific genre click OR User preferences
      const genresToFetch = selectedGenre || preferredGenres;

      fetchGames({ page: nextPage, genres: genresToFetch }).then((newGames) => {
        // Filter duplicates just in case
        const uniqueNewGames = newGames.filter(
          (ng) => !games.some((og) => og.id === ng.id),
        );

        setGames((prev) => [...prev, ...uniqueNewGames]);
        setCurrentPage(nextPage);
        setLoading(false);
      });
    }
  }, [
    activeIndex,
    games,
    loading,
    selectedGenre,
    preferredGenres,
    currentPage,
  ]);

  const handleSlideChange = (swiper) => {
    setLastActiveIndex(activeIndex);
    setActiveIndex(swiper.activeIndex);
  };

  // 3. Handle clicking a specific genre pill
  const handleGenreClick = (genre) => {
    setSelectedGenre(genre.slug);
    setCurrentPage(1);
    setGames([]); // Clear games for smooth transition
    setLoading(true);

    fetchGames({ page: 1, genres: genre.slug }).then((data) => {
      setGames(data);
      setLoading(false);
    });
  };

  // 4. Handle closing the genre view (Return to Feed)
  const handleCloseGenreView = () => {
    setSelectedGenre(""); // Clear specific selection
    setCurrentPage(1);
    setGames([]); // Clear to reload feed
    setLoading(true);

    // Fetch user preferences again
    fetchGames({ page: 1, genres: preferredGenres }).then((data) => {
      setGames(data);
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
        Loading games...
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
