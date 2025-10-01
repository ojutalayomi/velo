"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Play, Heart, Layers } from "lucide-react";

// Moved outside the component and using a seeded random number generator
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const generateExploreItems = () => {
  return Array(30)
    .fill(null)
    .map((_, i) => ({
      id: i,
      type: i % 5 === 0 ? "video" : "image",
      likes: Math.floor(seededRandom(i) * 1000000),
    }));
};

const Explore = () => {
  // Use useMemo to ensure consistent rendering across server and client
  const exploreItems = useMemo(() => generateExploreItems(), []);

  return (
    <div className="bg-white dark:bg-neutral-950 h-full min-h-screen">
      {/* Header */}
      <header className="sticky top-0 bg-white dark:bg-neutral-900 dark:border-black-200 border-b border-gray-300 px-4 py-2 z-10">
        <div className="max-w-screen-sm mx-auto">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-gray-100 dark:bg-zinc-900 dark:shadow-sm dark:shadow-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
        </div>
      </header>

      {/* Explore Grid */}
      <main className="h-[93%] max-w-screen-sm mx-auto overflow-auto p-1">
        <div className="grid grid-cols-3 tablets:grid-cols-4 tablets1:grid-cols-5 gap-1">
          {exploreItems.map((item) => (
            <div key={item.id} className="relative aspect-square">
              <Image
                src={`/300x300.png`}
                alt={`Explore item ${item.id + 1}`}
                height={300}
                width={300}
                className="w-full h-full object-cover"
              />
              {item.type === "video" && (
                <Play className="absolute top-2 right-2 text-white" size={20} />
              )}
              {item.id === 3 && <Layers className="absolute top-2 right-2 text-white" size={20} />}
              {(item.id === 0 || item.id === 8) && (
                <div className="absolute bottom-2 left-2 flex items-center text-white text-sm">
                  <Heart size={14} className="mr-1" />
                  {item.likes.toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Explore;
