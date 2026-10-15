"use client";
import { Check, Copy } from "lucide-react";
import React, { useState } from "react";
import MarkdownComponent from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark, ghcolors } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { useTheme } from "@/app/providers/ThemeProvider";

/**
 * Helper function to recursively extract text content from nested React children/nodes.
 * This is CRITICAL when using plugins like rehype-highlight, which inject elements (objects)
 * that break simple Array.join('') and lead to the [object Object] error.
 * @param children The children array/object passed to the component.
 * @returns A concatenated string of all text content.
 */
const getStringContent = (children: React.ReactNode): string => {
  return React.Children.toArray(children).reduce((acc: string, child) => {
    // 💡 FIX 1: Explicitly type accumulator as string
    if (typeof child === "string") {
      return acc + child;
    }

    // If the child is a React element, recursively look inside its props.children
    if (
      React.isValidElement(child) &&
      child.props &&
      (child.props as { children: React.ReactNode }).children
    ) {
      // 💡 FIX 2: Ensure the result of the recursive call is treated as a string before concatenation
      return (
        acc + (getStringContent((child.props as { children: React.ReactNode }).children) as string)
      );
    }

    // Convert numbers/bigints/etc. to string for concatenation. This addresses the "Type 'number' is not assignable to type 'string'"
    if (typeof child === "number" || typeof child === "bigint") {
      return acc + String(child);
    }

    // For any other unexpected object, try simple string conversion as a last resort
    // but the recursive call above should cover most cases.
    return acc + "";
  }, "");
};

const CodeBlock: React.FC<{ language: string; code: string; isDark: boolean }> = ({
  language,
  code,
  isDark,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
        <span className="font-mono text-[11px] font-medium lowercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={isDark ? coldarkDark : ghcolors}
        language={language}
        PreTag="div"
        customStyle={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          margin: 0,
          background: "transparent",
          padding: "0.875rem 1rem",
          fontSize: "0.8125rem",
          lineHeight: 1.6,
          border: "none",
        }}
        codeTagProps={{
          className: "before:content-none after:content-none", 
          style: { fontFamily: "inherit", background: "transparent" } 
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export const Markdown = ({ children }: { children: string }) => {
  const theme = useTheme();
  const isDark = theme.theme === "dark";
  return (
    <MarkdownComponent
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeRaw, rehypeHighlight]}
      components={{
        // Let our own code block own the styling instead of the default <pre>
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = getStringContent(children);
          return match ? (
            <CodeBlock
              language={match[1]}
              code={codeString.replace(/\n$/, "")}
              isDark={isDark}
            />
          ) : (
            <code className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-[0.85em] before:content-none after:content-none dark:bg-white/10">
              {codeString}
            </code>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand"
            >
              {children}
            </a>
          );
        },
        img({ src, alt, title }) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt}
              title={title}
              loading="lazy"
              className="my-2 max-w-full rounded-lg border border-neutral-200 dark:border-neutral-700"
            />
          );
        },
        table({ children }) {
          return (
            <div className="my-3 w-full overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="m-0 w-full border-collapse text-sm">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border-b border-neutral-200 bg-neutral-100 px-3 py-2 text-left font-semibold dark:border-neutral-700 dark:bg-neutral-800">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border-b border-neutral-100 px-3 py-2 align-top dark:border-neutral-800">
              {children}
            </td>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-2 border-l-4 border-brand/40 bg-black/5 py-1 pl-3 italic text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
              {children}
            </blockquote>
          );
        },
        hr() {
          return <hr className="my-4 border-neutral-200 dark:border-neutral-700" />;
        },
      }}
    >
      {children}
    </MarkdownComponent>
  );
};
