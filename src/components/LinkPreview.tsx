/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface LinkPreviewProps {
  url: string;
  direction?: "row" | "col";
}

interface Metadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

export function LinkPreview({ url, direction }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const fetchPreviewRef = useRef(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (fetchPreviewRef.current) return;
      fetchPreviewRef.current = true;

      try {
        const response = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await response.json();
        setMetadata(data);
        setIsImage(data.image ? true : false);
        fetchPreviewRef.current = false;
      } catch (error) {
        console.error("Error fetching metadata:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (loading || error) return null;
  if (!metadata || (!isImage && !metadata.favicon)) return null;

  if (direction === "row")
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block my-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div className="flex items-center p-3 gap-3">
          {(isImage || metadata.favicon) && (
            <Avatar className="rounded object-cover">
              <AvatarImage
                className="rounded object-cover"
                src={isImage ? metadata.image : metadata.favicon}
                alt={metadata.title || "Link preview"}
              />
              <AvatarFallback>{metadata.title || "Link preview"}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            {metadata.title && <h3 className="text-sm font-medium truncate">{metadata.title}</h3>}
            {metadata.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {metadata.description}
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">{url}</p>
          </div>
        </div>
      </a>
    );

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block my-2 rounded-lg backdrop-blur-2xl overflow-hidden bg-transparent shadow-bar"
    >
      <div className="flex flex-col items-center p-2 gap-3 h-full">
        {(isImage || metadata.favicon) && (
          <div className="flex flex-1 w-full">
            <Avatar className="aspect-square h-auto flex-1 rounded object-cover">
              <AvatarImage
                className="object-cover rounded-none"
                src={isImage ? metadata.image : metadata.favicon}
                alt={metadata.title || "Link preview"}
              />
              <AvatarFallback className="text-brand rounded-none">
                {metadata.title || "Link preview"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="flex-1 max-w-full">
          {metadata.title && <h3 className="text-sm font-medium truncate">{metadata.title}</h3>}
          {metadata.description && (
            <p className="text-sm line-clamp-2 truncate">{metadata.description}</p>
          )}
          <p className="text-xs truncate mt-1">{url}</p>
        </div>
      </div>
    </a>
  );
}
