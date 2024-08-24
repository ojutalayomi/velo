'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import { Moon, Search, Sun } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import ImageContent from '@/components/imageContent';

const Interface = () => {
  const { userdata, loading, error, refetchUser } = useUser();

  return (
    <div className={`min-h-screen dark:bg-black dark:text-white bg-white text-black`}>
      <div className="max-w-md mx-auto p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-gray-100 dark:bg-zinc-900 dark:shadow-sm dark:shadow-slate-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Suggested for you</h2>
          <a href="#" className="text-brand">See All</a>
        </div>

        {['lizboldempire', 'w_u_m_h_y', 'ubochiomannie', 'itzqueenhanu', 'salakoadenikeomolara'].map((username, index) => (
          <div key={username} className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Image src={`/default.jpeg`} alt={username} height={32} width={32} className="w-8 h-8 rounded-full mr-3" />
              <div>
                <p className="font-semibold">{username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {index === 3 ? 'New to Velo' : 'Suggested for you'}
                </p>
              </div>
            </div>
            <button className="text-brand font-semibold">Follow</button>
          </div>
        ))}

        <div className="mt-8 text-xs text-gray-500 dark:text-gray-400">
          <p>About · Help · Press · API · Jobs · Privacy · Terms ·</p>
          <p>Locations · Language · NIGERIA</p>
          <p className="mt-4">© 2024 VELO</p>
        </div>
      </div>
    </div>
  );
};

export default Interface;