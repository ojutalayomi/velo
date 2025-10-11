"use client";
import Link from "next/link";
import React from "react";

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <div className="!my-8 mx-4 space-y-2 text-xs text-gray-400">
      <div className="flex flex-wrap gap-x-2">
        <a href="#" className="hover:underline">
          About
        </a>
        ·
        <Link href="/help-support" className="hover:underline">
          Help
        </Link>
        ·
        <a href="#" className="hover:underline">
          Press
        </a>
        ·
        <a href="#" className="hover:underline">
          API
        </a>
        ·
        <a href="#" className="hover:underline">
          Jobs
        </a>
        ·
        <a href="#" className="hover:underline">
          Privacy
        </a>
        ·
        <a href="#" className="hover:underline">
          Terms
        </a>
      </div>
      <div className="flex gap-x-2">
        <a href="#" className="hover:underline">
          Locations
        </a>
        ·
        <a href="#" className="hover:underline">
          Language
        </a>
        ·<span>NIGERIA</span>
      </div>
      <p>© {year} VELO</p>
    </div>
  );
};
