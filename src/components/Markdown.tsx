import MarkdownComponent from 'react-markdown'
import rehypeRaw from 'rehype-raw' // NEW
import remarkBreaks from 'remark-breaks' // NEW
import remarkGfm from 'remark-gfm'

export const Markdown = ({ children }: { children: string }) => {
  return (
    <MarkdownComponent remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>{children}</MarkdownComponent>
  )
}