import React from "react";
import { lazy, Suspense, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

const LazySyntaxHighlighter = lazy(() => import("react-syntax-highlighter").then((module) => ({ default: module.Prism })));

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

function CodeBlockHeader({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 bg-white/[0.03]">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-code-comment font-semibold">
        {lang}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all active:scale-95"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-primary" />
            <span className="text-primary font-medium text-[0.7rem]">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            <span className="text-[0.7rem]">Copy</span>
          </>
        )}
      </button>
    </div>
  );
}

export function MarkdownPreview({
  content,
  fontSize = "md",
  onToggleTask,
}: {
  content: string;
  fontSize?: "sm" | "md" | "lg";
  onToggleTask?: (taskIndex: number) => void;
}) {
  let checkboxCount = 0;

  const fontClass =
    fontSize === "sm"
      ? "text-xs leading-6"
      : fontSize === "lg"
        ? "text-base sm:text-lg leading-8"
        : "text-sm sm:text-[0.95rem] leading-7";

  return (
    <div className={`prose-glass max-w-none text-foreground/90 transition-all ${fontClass}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-2xl sm:text-3xl font-bold tracking-tight first:mt-0 text-foreground border-b border-white/10 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-6 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-base sm:text-lg font-semibold tracking-tight text-foreground/95">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-3 text-foreground/90">{children}</p>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity font-medium"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
          li: ({ children }) => <li className="text-foreground/90 leading-relaxed">{children}</li>,
          input: ({ type, checked }) => {
            if (type === "checkbox") {
              const thisIdx = checkboxCount++;
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (onToggleTask) onToggleTask(thisIdx);
                  }}
                  className="mr-2 h-4 w-4 rounded border-white/20 bg-white/10 text-primary accent-primary cursor-pointer align-middle transition-transform active:scale-90"
                />
              );
            }
            return <input type={type} />;
          },
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-3 border-primary/60 bg-white/[0.02] pl-4 py-1 italic text-muted-foreground rounded-r-xl">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-white/10" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/5 px-3.5 py-2 text-foreground/80">{children}</td>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className ?? "");
            const text = String(children).replace(/\n$/, "");
            if (!match) {
              return (
                <code
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-primary font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="gh-code my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl">
                <CodeBlockHeader lang={match[1]} code={text} />
                <Suspense
                  fallback={
                    <pre className="overflow-x-auto whitespace-pre-wrap bg-[#0d1117] p-4 text-xs text-code-fg">
                      {text}
                    </pre>
                  }
                >
                  <LazySyntaxHighlighter
                    language={match[1]}
                    style={ghStyle}
                    PreTag="div"
                    customStyle={{ background: "#0d1117", margin: 0, padding: "1rem" }}
                  >
                    {text}
                  </LazySyntaxHighlighter>
                </Suspense>
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
