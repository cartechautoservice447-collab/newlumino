import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

const ghStyle: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: "#c9d1d9",
    background: "#0d1117",
    fontFamily: "'Fira Code','JetBrains Mono','Consolas',monospace",
    fontSize: "0.875rem",
    lineHeight: 1.7,
  },
  'pre[class*="language-"]': {
    color: "#c9d1d9",
    background: "#0d1117",
    margin: 0,
    padding: "1rem 1.15rem",
    overflow: "auto",
  },
  comment: { color: "#8b949e", fontStyle: "italic" },
  prolog: { color: "#8b949e" },
  doctype: { color: "#8b949e" },
  cdata: { color: "#8b949e" },
  punctuation: { color: "#c9d1d9" },
  operator: { color: "#c9d1d9" },
  keyword: { color: "#ff7b72" },
  "control-flow": { color: "#ff7b72" },
  boolean: { color: "#ff7b72" },
  constant: { color: "#ff7b72" },
  tag: { color: "#ff7b72" },
  selector: { color: "#ff7b72" },
  atrule: { color: "#ff7b72" },
  important: { color: "#ff7b72" },
  function: { color: "#d2a8ff" },
  "class-name": { color: "#d2a8ff" },
  builtin: { color: "#d2a8ff" },
  variable: { color: "#79c0ff" },
  parameter: { color: "#79c0ff" },
  property: { color: "#79c0ff" },
  "attr-name": { color: "#79c0ff" },
  symbol: { color: "#79c0ff" },
  number: { color: "#79c0ff" },
  string: { color: "#a5d6ff" },
  char: { color: "#a5d6ff" },
  "attr-value": { color: "#a5d6ff" },
  regex: { color: "#a5d6ff" },
};

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose-glass max-w-none text-[0.95rem] leading-7 text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-2xl font-semibold tracking-tight first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-6 text-xl font-semibold tracking-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-base font-semibold tracking-tight">{children}</h3>
          ),
          p: ({ children }) => <p className="my-3">{children}</p>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-code-variable underline underline-offset-4 hover:opacity-80"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-accent/60 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-white/5" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/5 px-3 py-2 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => <td className="border-b border-white/5 px-3 py-2">{children}</td>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className ?? "");
            const text = String(children).replace(/\n$/, "");
            if (!match) {
              return (
                <code
                  className="rounded-md border border-white/5 bg-code-bg px-1.5 py-0.5 font-mono text-[0.85em] text-code-string"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="gh-code my-4 overflow-hidden rounded-xl border border-white/5 bg-code-bg shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-code-comment">
                    {match[1]}
                  </span>
                </div>
                <SyntaxHighlighter
                  language={match[1]}
                  style={ghStyle}
                  PreTag="pre"
                  customStyle={{ background: "#0d1117", margin: 0 }}
                >
                  {text}
                </SyntaxHighlighter>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
