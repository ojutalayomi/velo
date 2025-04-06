'use client'

import { RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string } | null,
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center px-4 w-full">
      <div className="w-full max-w-lg text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-extrabold text-brand dark:text-brand/90">Error</h1>
          <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            We apologize for the inconvenience. An unexpected error has occurred.
          </p>
          {error?.digest && (
            <p className="text-sm text-gray-500 mt-2">Error ID: {error.digest}</p>
          )}
        </div>

        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white font-medium rounded-lg hover:bg-tomatom dark:bg-brand/90 dark:hover:bg-tomatom/90 transition-colors duration-300"
        >
          <RefreshCw size={20} />
          Try Again
        </button>
      </div>
    </div>
  )
}