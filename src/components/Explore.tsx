'use client';
import React from 'react';
import Link from 'next/link'
import NavBar from './navbar';
import { useSelector } from 'react-redux';
import { useUser } from '@/hooks/useUser';

const NoTrend: React.FC = () => {
  return (
    <div className='no-trends dark:text-slate-200'>
      <div className='header'>
        <strong>No Trends</strong>
      </div>
      <div className='info'>
        <b>No new trends for you</b>
        <p>It seems like there’s not a lot to show you right now, but you can see trends for other areas</p>
        <Link className='link' href='home'>
          <button>Home</button>
        </Link>
      </div>
    </div>
  )
}

const Explore: React.FC = () => {
  const { userdata, loading, error, refetchUser } = useUser();
    return (
      <>
        <NavBar route='explore'/>
        <div id='explore-page'>
            <div className='pre-shorts'>
                <div className='shorts'></div>
            </div>
            <NoTrend/>
        </div>
      </>
    );
}
export default Explore;