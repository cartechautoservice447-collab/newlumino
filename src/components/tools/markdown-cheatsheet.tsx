import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MarkdownCheatsheet({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-h-[80vh] overflow-y-auto rounded-3xl border border-white/15 bg-black/90 p-5 shadow-2xl backdrop-blur-3xl scroll-sleek">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Markdown Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="mt-3 space-y-2 text-xs font-mono">
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-primary font-bold"># Heading 1</span>
            <span className="text-muted-foreground">Title</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-primary font-bold">## Heading 2</span>
            <span className="text-muted-foreground">Subheader</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-foreground">**bold text**</span>
            <span className="text-muted-foreground">Bold</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-foreground">_italic text_</span>
            <span className="text-muted-foreground">Italic</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-code-variable">`inline code`</span>
            <span className="text-muted-foreground">Code</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-code-variable">```python ... ```</span>
            <span className="text-muted-foreground">Fenced Code</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-foreground">- [ ] Task Item</span>
            <span className="text-muted-foreground">Checkbox</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-foreground">&gt; Quote text</span>
            <span className="text-muted-foreground">Blockquote</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-1.5">
            <span className="text-foreground">---</span>
            <span className="text-muted-foreground">Divider</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
