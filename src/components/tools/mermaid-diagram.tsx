import React, { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  Download,
  Code2,
  FileDown,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

interface Props {
  code: string;
  onCodeChange?: (newCode: string) => void;
  onInsertIntoNote?: (mermaidMarkdown: string) => void;
  className?: string;
  title?: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "#020617",
    primaryColor: "#0284c7",
    primaryTextColor: "#f8fafc",
    primaryBorderColor: "#38bdf8",
    lineColor: "#38bdf8",
    secondaryColor: "#1e293b",
    tertiaryColor: "#0f172a",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px",
  },
  securityLevel: "loose",
});

export function MermaidDiagram({
  code,
  onCodeChange,
  onInsertIntoNote,
  className,
  title,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [localCode, setLocalCode] = useState(code);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const uniqueId = useId().replace(/:/g, "_");

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      if (!localCode.trim()) {
        setSvgContent("");
        setRenderError(null);
        return;
      }

      try {
        setRenderError(null);
        const renderId = `mermaid_svg_${uniqueId}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, localCode);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.warn("Mermaid render error:", err);
        if (isMounted) {
          setRenderError(err?.message || "Invalid Mermaid syntax");
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [localCode, uniqueId]);

  const handleZoomIn = () => {
    haptic("light");
    setScale((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    haptic("light");
    setScale((prev) => Math.max(prev - 0.2, 0.4));
  };

  const handleResetZoom = () => {
    haptic("light");
    setScale(1);
  };

  const handleCopyCode = () => {
    haptic("light");
    navigator.clipboard.writeText(`\`\`\`mermaid\n${localCode}\n\`\`\``);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopySvg = () => {
    if (!svgContent) return;
    haptic("light");
    navigator.clipboard.writeText(svgContent);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    haptic("light");
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "architecture-diagram").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInsert = () => {
    if (!onInsertIntoNote) return;
    haptic("success");
    const markdownBlock = `\n\n### System & Concept Architecture Diagram\n\n\`\`\`mermaid\n${localCode.trim()}\n\`\`\`\n\n`;
    onInsertIntoNote(markdownBlock);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl overflow-hidden transition-all",
        isFullscreen && "fixed inset-4 z-50 shadow-2xl border-cyan-500/50",
        className
      )}
    >
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3.5 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-foreground">
            {title || "Interactive Visual Architecture"}
          </span>
          <span className="hidden sm:inline rounded bg-cyan-500/10 px-1.5 py-0.5 text-[0.62rem] font-semibold text-cyan-300 font-mono">
            Mermaid.js SVG
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 text-[0.68rem] font-mono font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              title="Reset Zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Toggle Code Editor */}
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setIsEditing(!isEditing);
            }}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[0.68rem] font-bold transition cursor-pointer",
              isEditing
                ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/10 hover:text-foreground"
            )}
            title="Edit Diagram Code"
          >
            <Code2 className="h-3 w-3" />
            <span>{isEditing ? "Hide Code" : "Edit Code"}</span>
          </button>

          {/* Copy Mermaid Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition cursor-pointer"
            title="Copy Mermaid Code"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {/* Download SVG */}
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition cursor-pointer"
            title="Download SVG Diagram"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Insert into note */}
          {onInsertIntoNote && (
            <button
              type="button"
              onClick={handleInsert}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 px-2.5 py-1 text-[0.68rem] font-bold text-white shadow-sm hover:opacity-90 transition cursor-pointer"
              title="Insert into Markdown Note"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Insert in Note</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setIsFullscreen(!isFullscreen);
            }}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor & Diagram Container */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[380px] overflow-hidden">
        {/* Code Editor Panel (if open) */}
        {isEditing && (
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 bg-black/60 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Mermaid Definition</span>
              <span className="text-cyan-400 font-mono">Live Sync</span>
            </div>
            <textarea
              value={localCode}
              onChange={(e) => {
                setLocalCode(e.target.value);
                if (onCodeChange) onCodeChange(e.target.value);
              }}
              rows={12}
              className="w-full flex-1 rounded-xl border border-white/10 bg-slate-900/80 p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none"
              placeholder="flowchart TD..."
            />
          </div>
        )}

        {/* Diagram SVG Viewer */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-auto p-6 flex items-center justify-center min-h-[320px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
        >
          {renderError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center max-w-md space-y-2">
              <span className="text-xs font-bold text-rose-400">Mermaid Render Error</span>
              <p className="text-[0.7rem] text-muted-foreground font-mono leading-relaxed break-words">
                {renderError}
              </p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-2 rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition cursor-pointer"
              >
                Edit Syntax
              </button>
            </div>
          ) : svgContent ? (
            <div
              className="transition-transform duration-150 flex items-center justify-center w-full h-full"
              style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="text-xs text-muted-foreground font-mono">Generating visual architecture diagram...</div>
          )}
        </div>
      </div>
    </div>
  );
}
