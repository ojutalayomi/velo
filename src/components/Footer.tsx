"use client";
import Link from "next/link";
import React from "react";

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <div className="my-8! mx-4 space-y-2 text-xs text-gray-400">
      <div className="flex flex-wrap gap-x-2">
        <Link href="/about" className="hover:underline">
          About
        </Link>
        ·
        <Link href="/help-support" className="hover:underline">
          Help
        </Link>
        ·
        <Link href="/press" className="hover:underline">
          Press
        </Link>
        ·
        <Link href="/developers" className="hover:underline">
          API
        </Link>
        ·
        <Link href="/jobs" className="hover:underline">
          Jobs
        </Link>
        ·
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        ·
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
      </div>
      <div className="flex gap-x-2">
        <Link href="/locations" className="hover:underline">
          Locations
        </Link>
        ·
        <Link href="/locations#language" className="hover:underline">
          Language
        </Link>
        ·<span>NIGERIA</span>
      </div>
      <p>© {year} VELO</p>
    </div>
  );
};
