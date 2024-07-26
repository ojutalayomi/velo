'use client'
import React from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';

export const ImageContent: React.FC = () => {
    const { userdata, loading, error, refetchUser } = useUser();
    return (
        <div className="flex items-center">
            <Image src={userdata.dp ? 'https://s3.amazonaws.com/profile-display-images/'+userdata.dp : '/default.jpeg'} className='displayPicture dark:border-slate-200 w-10 h-10 rounded-full mr-3' width={40} height={40} alt='Display Picture'/>
            <div>
              <p className="font-bold">{userdata.username ? userdata.username : 'useranme'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{userdata.firstname ? userdata.firstname + '' + userdata.lastname : 'fullname'}</p>
            </div>
          </div>
    )
}