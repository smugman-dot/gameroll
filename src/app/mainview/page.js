"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import StarRating from "./starRating";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";

export default function Main({ data }) {
  const [games, setGames] = useState(data.results);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const pagesCache = useRef(new Map());

  async function FetchPageCached(page) {
    if (pagesCache.current.has(page)) return pagesCache.current.get(page);
    const res = await fetch(`http://localhost:3000/api/games?page=${page}`, {
      cache: "no-store",
    });
    const newData = await res.json();
    pagesCache.current.set(page, newData);
    return newData;
  }

  // Preload next page a few slides before the end
  useEffect(() => {
    if (activeIndex >= games.length - 3 && !loading) {
      setLoading(true);
      const nextPage = currentPage + 1;
      FetchPageCached(nextPage).then((newData) => {
        // Only take necessary fields
        const filteredData = newData.results.map((game) => ({
          id: game.id,
          name: game.name,
          released: game.released,
          background_image: game.background_image,
          rating: game.rating,
        }));
        setGames((prev) => [...prev, ...filteredData]);
        setCurrentPage(nextPage);
        setLoading(false);
      });
    }
  }, [activeIndex]);

  return (
    <Swiper
      direction="vertical"
      slidesPerView={1}
      mousewheel={true}
      modules={[Mousewheel]}
      onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
      className="h-screen w-screen"
    >
      {games.map((game, index) => (
        <SwiperSlide key={game.id}>
          <div className="relative h-screen w-screen bg-gradient-to-br from-[#292929] via-[#0c1011] to-[#211b1c] flex justify-center items-center">
            <div
              className={`relative w-[94vw] h-[90vh] rounded-[40px] overflow-hidden shadow-[0px_10px_32px_16px_rgba(0,_0,_0,_0.1)]
                transition-all duration-700 
                ${
                  activeIndex === index
                    ? "opacity-100 scale-105"
                    : "opacity-40 scale-95"
                }
              `}
            >
              <Image
                src={game.background_image}
                alt={game.name}
                fill
                sizes="(max-width: 768px) 100vw, 94vw"
                style={{ objectFit: "cover" }}
                className={`swiper-lazy transition-transform duration-700 ${
                  activeIndex === index ? "scale-105" : "scale-100"
                }`}
                priority={activeIndex === index} // preload only active slide
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#00000040] via-[#00000040] to-transparent rounded-[40px] pointer-events-none w-full h-full"></div>

              <div className="absolute inset-y-[35%] inset-x-[3%] flex flex-col gap-[10px] items-start h-full w-full justify-start">
                <h1
                  className={`text-[46px] text-[white] font-bold drop-shadow-lg transition-all duration-700 ${
                    activeIndex === index
                      ? "translate-y-0 opacity-100"
                      : "translate-y-10 opacity-0"
                  }`}
                >
                  {game.name}
                </h1>
                <p
                  className={`text-[18px] text-[white] transition-all duration-700 delay-100 ${
                    activeIndex === index
                      ? "translate-y-0 opacity-100"
                      : "translate-y-5 opacity-0"
                  }`}
                >
                  {game.released?.split("-")[0]}
                </p>
                <div
                  className={`transition-all duration-700 delay-200 ${
                    activeIndex === index
                      ? "translate-y-0 opacity-100"
                      : "translate-y-5 opacity-0"
                  }`}
                >
                  <StarRating rating={game.rating} />
                  <button className="fancy-button mt-4">
                    <span>Purchase Game</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
