"use client";
import Image from "next/image";
import StarRating from "./starRating";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/mousewheel";

import { Mousewheel } from "swiper/modules";

export default function Main({ data }) {
  return (
    <Swiper
      direction="vertical"
      slidesPerView={1}
      mousewheel={true}
      modules={[Mousewheel]}
    >
      {data.results.map((game) => (
        <SwiperSlide key={game.id}>
          <div className="relative h-screen w-screen bg-gradient-to-br from-[#292929] via-[#0c1011] to-[#211b1c] flex justify-center items-center">
            <div className="relative w-[98vw] h-[95vh] rounded-[40px] overflow-hidden shadow-[0px_10px_32px_16px_rgba(0,_0,_0,_0.1)]">
              <Image
                priority
                src={game.background_image}
                alt={game.name}
                fill
                style={{ objectFit: "cover", transform: "scale(1.05)" }}
                className="opacity-45"
              />

              <div className="absolute inset-y-[35%] inset-x-[3%] flex flex-col gap-[10px] items-start h-full w-full justify-start">
                <h1 className="text-[46px] text-[white] font-bold drop-shadow-lg">
                  {game.name}
                </h1>
                <p className="text-[18px] text-[white]">
                  {game.released.split("-")[0]}
                </p>
                <StarRating rating={game.rating} />
                <button className="fancy-button mt-4">
                  <span>Purchase Game</span>
                </button>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
