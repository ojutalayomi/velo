'use client'
import React from 'react';
import Homepage from '@/components/Home1';
import LeftSideBar from '@/components/LeftSideBar';

const Home = () => {

  return (
    <div className="h-screen flex">
      <div className="md:w-3/5 overflow-hidden w-full">
        <Homepage />
      </div>
      <LeftSideBar/>
    </div>
  );
};

export default Home;