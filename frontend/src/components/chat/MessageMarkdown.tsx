"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface MessageMarkdownProps {
  content: string;
}

export default function MessageMarkdown({ content }: MessageMarkdownProps) {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-700/50 border border-gray-700/50 rounded-lg" {...props} /></div>,
        th: ({node, ...props}) => <th className="px-4 py-3 bg-gray-800/50 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" {...props} />,
        td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-300 border-t border-gray-700/50" {...props} />,
        a: ({node, ...props}) => <a className="text-[#c1a065] hover:text-[#d4b986] underline decoration-1 underline-offset-2 transition-colors" {...props} />,
        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-100 my-4" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-100 my-3" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-lg font-bold text-gray-100 my-2" {...props} />,
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed whitespace-pre-wrap" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-[#c1a065] pl-4 italic text-gray-400 my-4 bg-gray-800/30 py-2 rounded-r" {...props} />
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
