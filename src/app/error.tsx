'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-gray-500">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-oura-600 text-white rounded-xl text-sm font-medium hover:bg-oura-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
