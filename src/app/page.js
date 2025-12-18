"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Main from "./mainview/page";
import "./globals.css";

export default function Home() {
  const [preferredGenres, setPreferredGenres] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Get the raw array from localStorage
    const storedGenresRaw = localStorage.getItem("preferredGenres");
    const storedGenres = storedGenresRaw ? JSON.parse(storedGenresRaw) : [];

    // 2. If empty, kick them to onboarding
    if (!storedGenres || storedGenres.length === 0) {
      router.push("/onboarding");
      return;
    }

    // 3. Transform [{id:1, slug:"action"}, {id:2, slug:"rpg"}] -> "action,rpg"
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
      {/* Main Feed */}
      {preferredGenres && <Main preferredGenres={preferredGenres} />}
    </div>
  );
}
