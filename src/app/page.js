"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Nav from "./navbar/page";
import Main from "./mainview/page";
import "./globals.css";
import { inter } from "./fonts/font";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedGenres = JSON.parse(
      localStorage.getItem("preferredGenres") || "[]"
    );

    if (!storedGenres || storedGenres.length === 0) {
      router.push("/onboarding");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch("/api/games", { cache: "no-store" });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch games:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );

  return (
    <div className="flex flex-col w-screen h-screen max-h-screen">
      {data && <Main data={data} />}
    </div>
  );
}
