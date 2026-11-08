"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Home from "./home/page";
import "./globals.css";

export default function Home() {
  const [preferredGenres, setPreferredGenres] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedGenresRaw = localStorage.getItem("GENRE_PREFERENCES");
    const storedGenres = storedGenresRaw ? JSON.parse(storedGenresRaw) : [];

    if (!storedGenres || storedGenres.length === 0) {
      router.push("/onboarding");
      return;
    }

    const genreSlugString = storedGenres.map((g) => g.slug).join(",");

    setPreferredGenres(genreSlugString);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0c1011] text-white">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-screen h-screen max-h-screen">
      {preferredGenres && <Home />}
    </div>
  );
}
