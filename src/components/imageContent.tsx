'use client'
import React from 'react';
import { Check } from 'lucide-react';
import { Statuser } from './VerificationComponent';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UserData } from '@/redux/userSlice';

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

  if (!userdata._id) return <UserProfileLazyLoader />
    return (
      <div className="cursor-pointer px-2 py-1 rounded-full hover:bg-slate-200 hover:dark:bg-zinc-700 transition-colors duration-150 tablets1:duration-300 flex items-center justify-between" onClick={() => onClick(userdata._id)}>
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{userdata.name?.slice(0,2) || `${userdata.firstname?.[0] || ''} ${userdata.lastname?.[0] || ''}`}</AvatarFallback>
            <AvatarImage 
              src={
              userdata.dp || userdata.displayPicture  
              ? (userdata.dp ? userdata.dp : (
                userdata.displayPicture.includes('ila-') 
                ? ''
                : userdata.displayPicture
                )) 
              : ''} 
              className='displayPicture dark:border-slate-200 size-10 rounded-full mr-3' 
              alt='Display Picture' 
            />
          </Avatar>
          <div>
            <p className="flex items-center font-bold dark:text-slate-200 gap-1 text-sm">
              {userdata.name ? userdata.name : `${userdata.firstname} ${userdata.lastname}`}
              {userdata?.verified && 
                <Statuser className='size-4' />
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