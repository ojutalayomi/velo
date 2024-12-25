'use client'

import { RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-gray-100">
        <div id="root">
          <div className="min-h-screen flex flex-col items-center justify-center text-gray-800">
            <h1 className="text-6xl font-bold mb-4">Oops!</h1>
            <h2 className="text-2xl mb-8">Something went wrong</h2>
            <div className="max-w-md text-center mb-8">
              <p>We apologize for the inconvenience. An unexpected error has occurred.</p>
              {error.digest && (
                <p className="text-sm text-gray-500 mt-2">Error ID: {error.digest}</p>
              )}
            </div>
            <button
              onClick={() => reset()}
              className="flex items-center bg-brand text-white px-6 py-3 rounded-md hover:bg-tomatom transition duration-300 font-medium"
            >
              <RefreshCw size={18} className="mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}