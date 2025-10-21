/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from "react";

import { axiosApi } from "@/lib/api";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface LinkPreviewProps {
  url: string;
  direction?: "row" | "col";
}

interface Metadata {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  site_name?: string;
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

      axiosApi(process.env.NEXT_PUBLIC_LINK_PREVIEW_URL).post("/preview", {
        url
      })
      .then(response => {
        setMetadata(response.data);
        setIsImage(!!response.data.image);
      })
      .catch(error => {
        console.error("Error fetching metadata:", error);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
    };

    (async () => fetchMetadata())();
  }, [url]);

  if (loading || error) return null;
  if (!metadata || (!isImage && !metadata.favicon)) return null;

  if (direction === "row")
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-2 block overflow-hidden rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <div className="flex items-center gap-3 p-3">
          {metadata.image && (
            <Avatar className="rounded object-cover">
              <AvatarImage
                className="rounded object-cover"
                src={isImage ? metadata.image : metadata.favicon}
                alt={metadata.title || "Link preview"}
              />
              <AvatarFallback>{metadata.title || "Link preview"}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            {metadata.title && <h3 className="truncate text-sm font-medium">{metadata.title}</h3>}
            {metadata.description && (
              <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {metadata.description}
              </p>
            )}
            <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">{url}</p>
          </div>
        </div>
      </a>
    );

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 block overflow-hidden rounded-lg bg-transparent shadow-bar backdrop-blur-2xl"
    >
      <div className="flex h-full flex-col items-center gap-3 p-2">
        {metadata.image && (
          <div className="flex w-full flex-1">
            <Avatar className="aspect-square h-auto flex-1 rounded object-cover">
              <AvatarImage
                className="rounded-none object-cover"
                src={metadata.image}
                alt={metadata.title || "Link preview"}
              />
              <AvatarFallback className="rounded-none text-brand">
                {metadata.title || "Link preview"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="max-w-full flex-1">
          {metadata.title && <h3 className="truncate text-sm font-medium">{metadata.title}</h3>}
          {metadata.description && (
            <p className="line-clamp-2 truncate text-sm">{metadata.description}</p>
          )}
          <p className="mt-1 truncate text-xs">{metadata.site_name}</p>
        </div>
      </div>
    </a>
  );
}
