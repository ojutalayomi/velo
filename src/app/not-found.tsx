'use client'
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { useEffect } from 'react';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Prevent the browser from recording this page in history
    history.replaceState(null, '', '/');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-8xl font-extrabold text-brand dark:text-brand/90">404</h1>
          <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100">Page Not Found</h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            We couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white font-medium rounded-lg hover:bg-tomatom dark:bg-brand/90 dark:hover:bg-tomatom/90 transition-colors duration-300"
          >
            <Home size={20} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}