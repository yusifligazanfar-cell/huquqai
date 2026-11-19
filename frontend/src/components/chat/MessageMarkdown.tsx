"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

interface MessageMarkdownProps {
  content: string;
  paper?: boolean;
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': ['className', 'align', 'style'],
  },
}

export default function MessageMarkdown({ content, paper = false }: MessageMarkdownProps) {
  const headingColor = paper ? 'text-black' : 'text-slate-950 dark:text-white'
  const subheadingColor = paper ? 'text-neutral-900' : 'text-slate-900 dark:text-slate-100'
  const bodyColor = paper ? 'text-neutral-900' : 'text-slate-800 dark:text-slate-200'
  const borderColor = paper ? 'border-neutral-300' : 'border-slate-300/80 dark:border-white/15'
  const linkColor = paper
    ? 'text-blue-700 hover:underline font-medium break-all'
    : 'text-emerald-700 dark:text-amber-400 hover:underline underline-offset-2 font-medium break-all'

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      components={{
        table: ({ node, ...props }) => (
          <div className="my-3 w-full max-w-full overflow-x-auto rounded-xl border border-slate-300/80 dark:border-white/15">
            <table className="w-full min-w-[360px] divide-y divide-slate-300/80 dark:divide-white/15 text-left" {...props} />
          </div>
        ),
        th: ({ node, ...props }) => (
          <th className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider ${paper ? 'bg-neutral-100 text-black' : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-950 dark:text-white'}`} {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className={`px-3 py-2.5 text-xs sm:text-sm border-t ${borderColor} ${bodyColor}`} {...props} />
        ),
        a: ({ node, children, ...props }) => {
          const textVal = typeof children === 'string' ? children.trim() : Array.isArray(children) && children.length === 1 && typeof children[0] === 'string' ? children[0].trim() : '';
          const isNumericCite = /^\[?\d{1,2}\]?$/.test(textVal);
          if (isNumericCite) {
            return (
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center align-baseline text-[11px] leading-none font-bold px-1.5 py-0.5 mx-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 no-underline transition-colors"
                {...props}
              >
                {textVal.startsWith('[') ? textVal : `[${textVal}]`}
              </a>
            );
          }
          return (
            <a target="_blank" rel="noopener noreferrer" className={linkColor} {...props}>
              {children}
            </a>
          );
        },
        h1: ({ node, ...props }) => (
          <h1 className={`text-lg sm:text-2xl font-extrabold ${headingColor} tracking-tight mt-4 mb-2 first:mt-0 [text-wrap:balance]`} {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className={`text-base sm:text-lg font-extrabold ${headingColor} tracking-tight mt-5 mb-2 first:mt-0 pb-1 border-b ${borderColor} [text-wrap:balance]`} {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className={`text-[15px] sm:text-base font-bold ${subheadingColor} mt-4 mb-1.5 [text-wrap:balance]`} {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className={`text-sm font-bold ${subheadingColor} mt-3 mb-1 [text-wrap:balance]`} {...props} />
        ),
        strong: ({ node, ...props }) => (
          <strong className={`font-bold ${headingColor}`} {...props} />
        ),
        p: ({ node, ...props }) => (
          <p className={`mb-3 last:mb-0 leading-relaxed whitespace-pre-wrap ${bodyColor} [overflow-wrap:anywhere] [text-wrap:pretty]`} {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className={`list-disc pl-5 mb-3 space-y-1.5 ${bodyColor}`} {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className={`list-decimal pl-5 mb-3 space-y-1.5 ${bodyColor}`} {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="leading-relaxed [overflow-wrap:anywhere] [text-wrap:pretty]" {...props} />
        ),
        blockquote: ({ node, ...props }) => (
          <blockquote className={`border-l-4 border-primary pl-3.5 sm:pl-4 italic my-3 py-2 pr-3 rounded-r-lg ${paper ? 'bg-neutral-100 text-neutral-800' : 'bg-slate-100/80 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'}`} {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
