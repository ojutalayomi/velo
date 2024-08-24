'use client'
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';

interface Props {
  [x: string]: any
}

export const UserProfileLazyLoader = () => {

  return (
    <div className="flex items-center">
      <div className="relative w-7 h-7 mr-3">
        <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
      </div>
      <div>
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
};

const ImageContent: React.FC<Props> = ({userdata}) => {
    const url = 'https://s3.amazonaws.com/profile-display-images/';
    return (
      <div className="flex items-center">
        <Image 
          src={
          userdata.dp || userdata.displayPicture  
          ? (userdata.dp ? url+userdata.dp : (
            userdata.displayPicture.includes('ila-') 
            ? '/default.jpeg'
            : url +  userdata.displayPicture
            )) 
          : '/default.jpeg'} 
          className='displayPicture dark:border-slate-200 w-7 h-7 rounded-full mr-3' 
          width={40} height={40} alt='Display Picture'
        />
        <div>
          <p className="font-bold dark:text-slate-200 text-sm">@{userdata.username ? userdata.username : 'useranme'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{userdata.name ? userdata.name : `${userdata.firstname} ${userdata.lastname}`}</p>
        </div>
      </div>
    )
}
export default ImageContent;