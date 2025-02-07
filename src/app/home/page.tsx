'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import { Moon, Search, Sun } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import ImageContent from '@/components/imageContent';
import Homepage from '@/components/Home1';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Home = () => {
  const { userdata } = useUser();

  return (
    <div className="h-screen flex">
      <div className="md:w-3/5 overflow-hidden w-full">
        <Homepage />
      </div>
      <div className="min-h-screen hidden md:block flex-1 dark:bg-zinc-900 dark:text-slate-200 bg-gray-50">
        <div className="max-w-md max-h-full mx-auto overflow-auto space-y-2">
          {/* Search Bar */}
          <div className="dark:bg-zinc-900 bg-gray-50 px-4 py-2 sticky top-0 w-full">
            <div className='relative'>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search people"
                className="w-full bg-white dark:bg-zinc-800 border-0 shadow-sm rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          {/* User Profile */}
          <div className="mx-4">
            <ImageContent userdata={userdata}/>
          </div>

          {/* Suggestions Section */}
          <div className="bg-white dark:bg-zinc-800 mx-4 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Suggested for you</h2>
              <a href="#" className="text-brand text-sm hover:text-brand/80 transition-colors">
                See All
              </a>
            </div>

            <div className="space-y-4">
              {['lizboldempire', 'w_u_m_h_y', 'ubochiomannie', 'itzqueenhanu', 'salakoadenikeomolara'].map((username, index) => (
                <div key={username} className="flex gap-3 items-center justify-between group">
                  <div className="relative">
                    <Image 
                      src="/default.jpeg" 
                      alt={username} 
                      height={40} 
                      width={40} 
                      className="rounded-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-800"></div>
                  </div>
                  <div className='flex-1 overflow-auto'>
                    <div>
                      <p className="font-medium text-sm truncate">{username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {index === 3 ? 'New to Velo' : 'Suggested for you'}
                      </p>
                    </div>
                  </div>
                  <Button variant={"link"} className="text-brand text-sm font-medium hover:text-brand/80 transition-colors">
                    Follow
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
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
            <p>© {new Date().getFullYear()} VELO</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;