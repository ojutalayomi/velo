'use client';
import React from 'react';
import Link from 'next/link';

const hashtagMentionTokenOrUrlRegex = /([#@\$]\w+|https?:\/\/[^\s]+|www\.[^\s]+)/g;

export const renderTextWithLinks = (text: string) => {
  const safeText = text || '';

  const parts = safeText.split(hashtagMentionTokenOrUrlRegex);

  return parts.map((part, i) => {
    if (/^#\w+/.test(part)) {
      // Hashtag link
      return (
        <Link
          key={`hashtag-${i}`}
          href={`/hashtag/${encodeURIComponent(part.slice(1))}?src=hashtag_click`}
          className="text-brand hover:underline transition-all duration-150"
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
          className="text-blue-500 hover:underline transition-all duration-150"
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
          className="text-blue-500 hover:underline transition-all duration-150"
          onClick={() => console.log(`Mention clicked: ${part}`)}
        >
          {part}
        </Link>
      );
    } else if (/^(https?:\/\/|www\.)/.test(part)) {
      // URL link
      const url = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <Link
          key={`url-${i}`}
          href={url}
          className="text-blue-600 hover:underline transition-all duration-150"
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