import React from 'react'
import MarkdownComponent from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark, gruvboxLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

import { useTheme } from '@/app/providers/ThemeProvider'

export const Markdown = ({ children }: { children: string }) => {
  const theme = useTheme();
  const isDark = theme.theme === "dark";
  return (
    <MarkdownComponent remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw, rehypeHighlight]} components={{
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      code({ node, className, children, ref, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = React.Children.toArray(children)
        .map(child => {
          return typeof child === 'string' ? child : String((child as any).props?.children || '');
        })
        .join('');
        return match ? (
          <SyntaxHighlighter
            {...props}
            style={isDark ? coldarkDark : gruvboxLight}
            language={match[1]}
            PreTag="div"
          >
            {codeString.replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code {...props} className={className}>
            {codeString}
          </code>
        );
      },
  }}>
      {children}
    </MarkdownComponent>
  )
}