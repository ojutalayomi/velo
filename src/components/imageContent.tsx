'use client'
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import { Check } from 'lucide-react';

interface Props {
  userdata: any,
  onClick?: any,
  selectedUsers?: any
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

const ImageContent: React.FC<Props> = ({userdata,onClick,selectedUsers = []}) => {
    const url = 'https://s3.amazonaws.com/profile-display-images/';
    return (
      <div className="cursor-pointer px-2 py-1 rounded-full hover:bg-slate-200 hover:dark:bg-zinc-700 transition-colors duration-150 tablets1:duration-300 flex items-center justify-between" onClick={() => onClick(userdata._id)}>
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
            <p className="flex items-center font-bold dark:text-slate-200 text-sm">
              {userdata.name ? userdata.name : `${userdata.firstname} ${userdata.lastname}`}
              {userdata?.verified && 
                <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/>
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">@{userdata.username ? userdata.username : 'useranme'}</p>
          </div>
        </div>
        {selectedUsers.includes(userdata._id) && <Check size={20} className='dark:text-gray-400'/>}
      </div>
    )
}
export default ImageContent;