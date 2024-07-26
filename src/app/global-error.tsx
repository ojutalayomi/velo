'use client'
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
    
  return (
    <html>
      <body>
        <div id='root'>
          <div id='detail' className={`flex items-center justify-center w-dvw h-dvh`}  >
            <h2>Something went wrong!</h2>
            <button onClick={() => reset()}>Try again</button>
          </div>
        </div>
      </body>
    </html>
  )
}