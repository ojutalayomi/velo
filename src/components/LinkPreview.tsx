/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from "react";

import { axiosApi } from "@/lib/api";

import { Avatar, AvatarImage } from "./ui/avatar";

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
  const [smallImage, setSmallImage] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const fetchPreviewRef = useRef(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (fetchPreviewRef.current) return;
      fetchPreviewRef.current = true;

      axiosApi(process.env.NEXT_PUBLIC_LINK_PREVIEW_URL)
        .post("/preview", {
          url,
        })
        .then((response) => {
          setMetadata(response.data);
          setIsImage(!!response.data.image);
        })
        .catch((error) => {
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

  const text = (
    <div className="min-w-0 flex-1">
      {metadata.title && <h3 className="line-clamp-2 text-sm font-medium">{metadata.title}</h3>}
      {metadata.description && (
        <p className="line-clamp-2 text-xs opacity-80">{metadata.description}</p>
      )}
      <p className="mt-0.5 truncate text-xs opacity-60">{metadata.site_name}</p>
    </div>
  );

  // Small images (logos, favicons) look wrong stretched across the card, so they become a thumbnail.
  if (imageFailed || smallImage) {
    const thumb = imageFailed ? metadata.favicon : metadata.image;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-2 flex items-center gap-3 overflow-hidden rounded-lg bg-black/5 p-2 dark:bg-white/10"
      >
        {thumb && (
          <img
            src={thumb}
            alt={metadata.title || "Link preview"}
            className="size-14 shrink-0 rounded-md bg-white object-contain"
          />
        )}
        {text}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 block overflow-hidden rounded-lg bg-black/5 dark:bg-white/10"
    >
      {metadata.image && (
        <img
          src={metadata.image}
          alt={metadata.title || "Link preview"}
          onLoad={(e) => setSmallImage(e.currentTarget.naturalWidth < 250)}
          onError={() => setImageFailed(true)}
          // Natural ratio, but very tall images are cropped so they can't swamp the chat.
          className="block h-auto max-h-72 w-full object-cover"
        />
      )}
      <div className="flex p-2">{text}</div>
    </a>
  );
}
