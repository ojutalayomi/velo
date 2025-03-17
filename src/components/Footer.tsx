'use client'
import React from 'react';

export const Footer = () => {
  const year = new Date().getFullYear();
  
  return (
    <div className="!my-8 mx-4 text-xs text-gray-400 space-y-2">
        <div className="flex flex-wrap gap-x-2">
            <a href="#" className="hover:underline">About</a>·
            <a href="#" className="hover:underline">Help</a>·
            <a href="#" className="hover:underline">Press</a>·
            <a href="#" className="hover:underline">API</a>·
            <a href="#" className="hover:underline">Jobs</a>·
            <a href="#" className="hover:underline">Privacy</a>·
            <a href="#" className="hover:underline">Terms</a>
        </div>
        <div className="flex gap-x-2">
            <a href="#" className="hover:underline">Locations</a>·
            <a href="#" className="hover:underline">Language</a>·
            <span>NIGERIA</span>
        </div>
        <p>© {year} VELO</p>
    </div>
  );
};