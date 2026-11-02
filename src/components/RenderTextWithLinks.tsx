"use client";
import Link from "next/link";

const hashtagMentionTokenOrUrlRegex = /([#@\\$]\w+|https?:\/\/[^\s]+|www\.[^\s]+)/g;

export const renderTextWithLinks = (text: string, validMentionUsernames?: string[]) => {
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
          onClick={(e) => {
            e.stopPropagation();
            console.log(`Hashtag clicked: ${part}`);
          }}
        >
          {part}
        </Link>
      );
    } else if (/^\$\w+/.test(part)) {
      // Cashtag link
      return (
        <Link
          key={`cashtag-${i}`}
          href={`/search?q=${encodeURIComponent(part.slice(1))}&src=cashtag_click`}
          className="text-brand transition-all duration-150 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            console.log(`Cashtag clicked: ${part}`);
          }}
        >
          {part}
        </Link>
      );
    } else if (/^@\w+/.test(part)) {
      // Mention link
      const username = part.slice(1);
      const isConfirmed = validMentionUsernames?.some(
        (u) => u.toLowerCase() === username.toLowerCase()
      );
      return (
        <Link
          key={`mention-${i}`}
          href={`/${encodeURIComponent(username)}?src=mention_click`}
          className={
            isConfirmed
              ? "font-semibold text-brand bg-brand/10 rounded px-0.5 transition-all duration-150 hover:underline"
              : "text-brand transition-all duration-150 hover:underline"
          }
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {part}
        </Link>
      );
    } else if (/^(https?:\/\/|www\.)/.test(part)) {
      // URL link
      const url = part.startsWith("www.") ? `https://${part}` : part;
      return (
        <a
          key={`url-${i}`}
          href={url}
          className="text-blue-600 transition-all duration-150 hover:underline"
          rel="noopener noreferrer"
          target="_blank"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    return part;
  });
};
