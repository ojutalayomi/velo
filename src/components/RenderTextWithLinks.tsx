"use client";
import Link from "next/link";
import React from "react";

const hashtagMentionTokenOrUrlRegex = /([#@\\$]\w+|https?:\/\/[^\s]+|www\.[^\s]+)/g;

export const renderTextWithLinks = (text: string) => {
  const safeText = text || "";

  const parts = safeText.split(hashtagMentionTokenOrUrlRegex);

  return parts.map((part, i) => {
    if (/^#\w+/.test(part)) {
      // Hashtag link
      return (
        <Link
          key={`hashtag-${i}`}
          href={`/hashtag/${encodeURIComponent(part.slice(1))}?src=hashtag_click`}
          className="text-brand transition-all duration-150 hover:underline"
          onClick={() => console.log(`Hashtag clicked: ${part}`)}
        >
          {part}
        </Link>
      );
    } else if (/^\$\w+/.test(part)) {
      // Cashtag link
      return (
        <Link
          key={`cashtag-${i}`}
          href={`/search?q=${encodeURIComponent(part.slice(1))}?src=cashtag_click`}
          className="text-blue-500 transition-all duration-150 hover:underline"
          onClick={() => console.log(`Cashtag clicked: ${part}`)}
        >
          {part}
        </Link>
      );
    } else if (/^@\w+/.test(part)) {
      // Mention link
      return (
        <Link
          key={`mention-${i}`}
          href={`/${encodeURIComponent(part.slice(1))}?src=mention_click`}
          className="text-blue-500 transition-all duration-150 hover:underline"
          onClick={() => console.log(`Mention clicked: ${part}`)}
        >
          {part}
        </Link>
      );
    } else if (/^(https?:\/\/|www\.)/.test(part)) {
      // URL link
      const url = part.startsWith("www.") ? `https://${part}` : part;
      return (
        <Link
          key={`url-${i}`}
          href={url}
          className="text-blue-600 transition-all duration-150 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => console.log(`URL clicked: ${part}`)}
        >
          {part}
        </Link>
      );
    }

    return part;
  });
};
