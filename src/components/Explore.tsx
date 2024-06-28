'use client';
import React from 'react';
import Link from 'next/link'
import NavBar from '../templates/navbar';

const Explore: React.FC = () => {
    return (
      <>
        <NavBar route='explore'/>
        <div id='explore-page'>
            <div className='pre-shorts'>
                <div className='shorts'></div>
            </div>
            <div className='no-trends'>
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
        </div>
      </>
    );
}
export default Explore;