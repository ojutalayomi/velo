'use client'
import React from 'react';
import {useRouter} from 'next/navigation';
import { Home, RefreshCw } from 'lucide-react';

const NotFound: React.FC = () => {
    const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 flex flex-col items-center justify-center text-gray-800">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-2xl mb-8">Oops! Page not found</p>
      <div className="max-w-md text-center mb-8">
        <p>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
      </div>
      <div className="flex space-x-4">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center bg-brand text-white px-4 py-2 rounded-md hover:bg-tomatom transition duration-300"
        >
          <Home size={18} className="mr-2" />
          Go Home
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition duration-300"
        >
          <RefreshCw size={18} className="mr-2" />
          Refresh Page
        </button>
      </div>
    </div>
  );
};

export default NotFound;