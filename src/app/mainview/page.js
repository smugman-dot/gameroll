"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import StarRating from "./starRating";
import GenreView from "./GenreView";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";
import setPlatform from "./setPlatform";
import { motion, AnimatePresence } from "framer-motion";

export default function Main() {
  const [games, setGames] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [selectedGenre, setSelectedGenre] = useState(null);

  const pagesCache = useRef(new Map());

  async function FetchPageCached(page) {
    if (pagesCache.current.has(page)) return pagesCache.current.get(page);
    const res = await fetch(`/api/games?page=${page}`, { cache: "no-store" });
    const newData = await res.json();
    pagesCache.current.set(page, newData);
    return newData;
  }

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      const initialData = await FetchPageCached(1);
      const filteredData = initialData.results.map((game) => ({
        id: game.id,
        name: game.name,
        released: game.released,
        background_image: game.background_image,
        rating: game.rating,
        stores: setPlatform(game.platforms),
        genres: game.genres,
      }));
      setGames(filteredData);
      setLoading(false);
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    if (activeIndex >= games.length - 3 && !loading && games.length > 0) {
      setLoading(true);
      const nextPage = currentPage + 1;
      FetchPageCached(nextPage).then((newData) => {
        const filteredData = newData.results.map((game) => ({
          id: game.id,
          name: game.name,
          released: game.released,
          background_image: game.background_image,
          rating: game.rating,
          stores: setPlatform(game.platforms),
          genres: game.genres,
        }));
        setGames((prev) => [...prev, ...filteredData]);
        setCurrentPage(nextPage);
        setLoading(false);
      });
    }
  }, [activeIndex, games, loading]);

  const handleSlideChange = (swiper) => {
    setLastActiveIndex(activeIndex);
    setActiveIndex(swiper.activeIndex);
  };

  const handleGenreClick = (genre) => {
    setSelectedGenre(genre);
  };

  const handleCloseGenreView = () => {
    setSelectedGenre(null);
  };

  const getH1TranslateY = (currentIndex) => {
    if (activeIndex === currentIndex) return "translate-y-0 opacity-100";
    if (activeIndex > lastActiveIndex) {
      return currentIndex < activeIndex
        ? "translate-y-[-40px] opacity-0"
        : "translate-y-[40px] opacity-0";
    }
    if (activeIndex < lastActiveIndex) {
      return currentIndex > activeIndex
        ? "translate-y-[40px] opacity-0"
        : "translate-y-[-40px] opacity-0";
    }
    return "translate-y-[40px] opacity-0";
  };

  const getGroupTranslateY = (currentIndex) => {
    if (activeIndex === currentIndex) return "translate-y-0 opacity-100";
    if (activeIndex > lastActiveIndex) {
      return currentIndex < activeIndex
        ? "translate-y-[-10px] opacity-0"
        : "translate-y-[10px] opacity-0";
    }
    if (activeIndex < lastActiveIndex) {
      return currentIndex > activeIndex
        ? "translate-y-[10px] opacity-0"
        : "translate-y-[-10px] opacity-0";
    }
    return "translate-y-[10px] opacity-0";
  };

  const getGenresTranslateX = (currentIndex) => {
    if (activeIndex === currentIndex) return "translate-x-0 opacity-100";
    if (activeIndex > lastActiveIndex) {
      return currentIndex < activeIndex
        ? "translate-x-[-50px] opacity-0"
        : "translate-x-[50px] opacity-0";
    }
    if (activeIndex < lastActiveIndex) {
      return currentIndex > activeIndex
        ? "translate-x-[50px] opacity-0"
        : "translate-x-[-50px] opacity-0";
    }
    return "translate-x-[50px] opacity-0";
  };
  // ...

  if (loading && games.length === 0)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
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
          <SwiperSlide key={game.id}>
            <motion.div
              animate={{
                scale: selectedGenre ? 0.95 : 1,
                filter: selectedGenre ? "blur(20px)" : "blur(0px)",
              }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full w-full flex justify-center items-center"
            >
              <div
                className={`relative w-[100vw] md:w-[94vw] h-[100vh] md:h-[90vh] md:rounded-[40px] overflow-hidden shadow-[0px_10px_32px_16px_rgba(0,_0,_0,_0.1)]
                transition-all duration-700
                ${
                  activeIndex === index
                    ? "opacity-100 scale-105"
                    : "opacity-40 scale-95"
                }
              `}
              >
                <div className="relative w-full h-[90dvh] md:h-full md:w-full overflow-hidden">
                  <Image
                    src={game.background_image}
                    alt={game.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 100vh"
                    className={`transition-transform duration-700
                        ${activeIndex === index ? "scale-105" : "scale-100"} 
                        object-cover object-top`}
                    priority={activeIndex === index}
                  />
                </div>
                <div className="md:hidden absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[#0c1011] via-[#0c1011] to-transparent pointer-events-none"></div>
                <div className="invisible md:visible absolute inset-0 bg-gradient-to-t from-[#00000040] via-[#00000040] to-transparent rounded-[40px] pointer-events-none w-full h-full"></div>
                <div className="p-[15px] md:p-0 absolute inset-y-[35%] inset-x-[3%] flex flex-col gap-[10px] items-start h-full w-full justify-start">
                  <div className="flex items-center gap-[5px] text-[white]">
                    {game.genres.map((genre, i) => (
                      <span
                        key={genre.id}
                        className={`flex items-center gap-[5px] transition-transform duration-500 ease-out ${getGenresTranslateX(
                          index
                        )}`}
                        style={{ transitionDelay: `${i * 100}ms` }}
                      >
                        <span
                          onClick={() => handleGenreClick(genre)}
                          className={`p-[6px] rounded-[30px] transition-colors duration-300 
                              hover:bg-[#5c5b5860] hover:cursor-pointer backdrop-blur-md ${
                                activeIndex == index
                                  ? "bg-[#5c5b5840]/60"
                                  : "bg-transparent"
                              }`}
                        >
                          {genre.name}
                        </span>
                        {i < game.genres.length - 1 && (
                          <span className="w-[4px] h-[4px] bg-[white] rounded-full inline-block"></span>
                        )}
                      </span>
                    ))}
                  </div>
                  <h1
                    className={`text-[32px] md:text-[46px] text-white font-bold drop-shadow-lg transition-all duration-700 ${getH1TranslateY(
                      index
                    )}`}
                  >
                    {game.name}
                  </h1>
                  <p
                    className={`text-[14px] md:text-[18px] text-[white] transition-all duration-700 delay-100 ${getGroupTranslateY(
                      index
                    )}`}
                  >
                    {game.released?.split("-")[0]}
                  </p>
                  <div
                    className={`transition-all flex flex-col gap-[20px] duration-700 delay-200 ${getGroupTranslateY(
                      index
                    )}`}
                  >
                    <StarRating rating={game.rating} />
                    <div className="flex flex-col md:flex-row gap-4 md:justify-center md:items-center md:bg-[#21212160] rounded-[50px] p-[5px]">
                      <button className="fancy-button w-60">
                        <span>Purchase Game</span>
                      </button>
                      <div className="flex gap-[10px]">
                        {game.stores.map((store) => (
                          <Image
                            key={store.id}
                            alt="platform"
                            width={34}
                            height={34}
                            src={"/" + store.name + ".svg"}
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
