/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface LinkPreviewProps {
  url: string;
}

interface Metadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchPreviewRef = useRef(false);

  useEffect(() => {
    const fetchMetadata = async () => {
        if (fetchPreviewRef.current) return;
        fetchPreviewRef.current = true;

        try {
            const response = await fetch('/api/link-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await response.json();
            setMetadata(data);
            fetchPreviewRef.current = false;
        } catch (error) {
            console.error('Error fetching metadata:', error);
        } finally {
            setLoading(false);
        }
    };

    fetchMetadata();
  }, [url]);

  if (loading) return null;
  if (!metadata) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block mt-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="flex items-center p-3 gap-3">
        {(metadata.image || metadata.favicon) && (
          <div className="flex-shrink-0">
            <img
              src={metadata.image || metadata.favicon}
              alt={metadata.title || 'Link preview'}
              width={40}
              height={40}
              className="rounded object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {metadata.title && (
            <h3 className="text-sm font-medium truncate">{metadata.title}</h3>
          )}
          {metadata.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {metadata.description}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
            {url}
          </p>
        </div>
      </div>
    </a>
  );
}
