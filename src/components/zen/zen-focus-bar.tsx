import React, { useState, useMemo } from "react";
import {
  FolderOpen,
  Layers,
  Star,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  BookOpen,
  Brain,
  Clock,
  PenLine,
  Eye,
  X,
  Sparkles,
  FolderPlus,
  Check,
  Folder,
  LayoutGrid,
  List,
  Flame,
  FileText,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDate, snippet, type Course, type Collection, type Note, type CourseAccent } from "@/lib/notes";
import type { Filter } from "@/hooks/use-notes";
import { haptic } from "@/lib/haptics";

const ACCENT_STYLES: Record<
  CourseAccent,
  { bg: string; border: string; text: string; dot: string; glow: string }
> = {
  sky: { bg: "bg-sky-500/15", border: "border-sky-500/30", text: "text-sky-400", dot: "bg-sky-400", glow: "shadow-[0_0_12px_rgba(56,189,248,0.5)]" },
  violet: { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400", dot: "bg-violet-400", glow: "shadow-[0_0_12px_rgba(167,139,250,0.5)]" },
  amber: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400", glow: "shadow-[0_0_12px_rgba(251,191,36,0.5)]" },
  emerald: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(52,211,153,0.5)]" },
  rose: { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-400", dot: "bg-rose-400", glow: "shadow-[0_0_12px_rgba(251,113,133,0.5)]" },
  cyan: { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-400", glow: "shadow-[0_0_12px_rgba(34,211,238,0.5)]" },
};

type Props = {
  courses: Course[];
  activeCourse: Course | null | undefined;
  activeCourseId: string | null;
  onSelectCourse: (courseId: string) => void;
  collections: Collection[];
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: (initialTitle?: string, initialBody?: string, targetCollectionId?: string | null) => void;
  onAddCollection: (name: string, category?: string) => void;
  onToggleFavorite: (noteId: string) => void;
  onExitFocus: () => void;
  editorMode: "write" | "preview";
  onModeChange: (mode: "write" | "preview") => void;
  onOpenFlashcards?: (note: Note) => void;
  onOpenPomodoro?: () => void;
  pomodoroRunning?: boolean;
  pomodoroTimeFormatted?: string;
};

export function ZenFocusBar({
  courses,
  activeCourse,
  activeCourseId,
  onSelectCourse,
  collections,
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onAddCollection,
  onToggleFavorite,
  onExitFocus,
  editorMode,
  onModeChange,
  onOpenFlashcards,
  onOpenPomodoro,
  pomodoroRunning = false,
  pomodoroTimeFormatted = "25:00",
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewLayout, setViewLayout] = useState<"grouped" | "flat">("grouped");
  const [activeFilter, setActiveFilter] = useState<Filter>({ kind: "all" });
  const [newCollectionDraft, setNewCollectionDraft] = useState("");
  const [addingCollection, setAddingCollection] = useState(false);
  const [showNotesStrip, setShowNotesStrip] = useState(true);
  
  // Track collapsed/expanded state of collection folders
  const [collapsedCollections, setCollapsedCollections] = useState<Record<string, boolean>>({});

  // Determine current active course
  const currentCourse = activeCourse || courses.find((c) => c.id === activeCourseId) || courses[0];
  const accentStyle = (currentCourse && ACCENT_STYLES[currentCourse.color]) || ACCENT_STYLES.sky;

  // Filter collections belonging to this opened course
  const courseCollections = useMemo(() => {
    if (!currentCourse) return collections;
    return collections.filter(
      (c) => c.courseId === currentCourse.id || c.parentId === currentCourse.id
    );
  }, [collections, currentCourse]);

  // Filter notes belonging to this opened course
  const courseNotes = useMemo(() => {
    if (!currentCourse) return notes;
    const allowedIds = new Set<string>([
      currentCourse.id,
      ...courseCollections.map((c) => c.id),
    ]);
    return notes.filter((n) => {
      if (n.courseId === currentCourse.id) return true;
      if (n.collectionId && allowedIds.has(n.collectionId)) return true;
      return false;
    });
  }, [notes, currentCourse, courseCollections]);

  // Organize notes by collection groups
  const groupedCollections = useMemo(() => {
    type Group = {
      id: string;
      name: string;
      isRoot: boolean;
      collection: Collection | null;
      notes: Note[];
    };

    const groups: Group[] = [];

    // 1. Root / General course notes (no specific collection or direct child)
    const rootNotes = courseNotes.filter(
      (n) => !n.collectionId || !courseCollections.some((c) => c.id === n.collectionId)
    );

    const filteredRoot = searchQuery.trim()
      ? rootNotes.filter((n) => {
          const q = searchQuery.toLowerCase();
          return n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q);
        })
      : rootNotes;

    if (filteredRoot.length > 0 || courseCollections.length === 0) {
      groups.push({
        id: "root-general",
        name: "General Course Notes",
        isRoot: true,
        collection: null,
        notes: filteredRoot,
      });
    }

    // 2. Each collection organized with its respective notes
    courseCollections.forEach((col) => {
      const colNotes = courseNotes.filter((n) => n.collectionId === col.id);
      const filtered = searchQuery.trim()
        ? colNotes.filter((n) => {
            const q = searchQuery.toLowerCase();
            return n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q);
          })
        : colNotes;

      groups.push({
        id: col.id,
        name: col.name,
        isRoot: false,
        collection: col,
        notes: filtered,
      });
    });

    return groups;
  }, [courseNotes, courseCollections, searchQuery]);

  // Flat list filtered by search and active chip
  const filteredNotes = useMemo(() => {
    return courseNotes.filter((n) => {
      if (activeFilter.kind === "favorites" && !n.favorite) return false;
      if (activeFilter.kind === "collection" && n.collectionId !== activeFilter.id) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesBody = n.body?.toLowerCase().includes(q);
        return matchesTitle || matchesBody;
      }
      return true;
    });
  }, [courseNotes, activeFilter, searchQuery]);

  // Currently selected note
  const currentNote = courseNotes.find((n) => n.id === selectedNoteId) || courseNotes[0] || null;

  // Navigation between prev/next notes
  const currentIndex = courseNotes.findIndex((n) => n.id === selectedNoteId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < courseNotes.length - 1;

  const handlePrevNote = () => {
    if (hasPrev) {
      haptic("light");
      onSelectNote(courseNotes[currentIndex - 1].id);
    }
  };

  const handleNextNote = () => {
    if (hasNext) {
      haptic("light");
      onSelectNote(courseNotes[currentIndex + 1].id);
    }
  };

  const handleCommitCollection = () => {
    if (!newCollectionDraft.trim()) return;
    haptic("success");
    onAddCollection(newCollectionDraft.trim());
    setNewCollectionDraft("");
    setAddingCollection(false);
  };

  const toggleCollectionCollapse = (colId: string) => {
    haptic("light");
    setCollapsedCollections((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  return (
    <>
      {/* Floating Zen Header Bar */}
      <header className="sticky top-2 z-40 mx-auto w-full max-w-5xl px-2 sm:px-3 select-none space-y-1.5">
        <div className="glass-panel animate-panel-in flex items-center justify-between gap-2 rounded-2xl sm:rounded-full border border-white/15 bg-black/80 px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
          
          {/* Left: Active Course Switcher & Organized Notes Drawer Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                setDrawerOpen(true);
              }}
              title="Click to view all notes organized by collection"
              className={cn(
                "group flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-full border px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold transition-all active:scale-95 touch-manipulation cursor-pointer shrink-0",
                accentStyle.border,
                accentStyle.bg,
                accentStyle.text
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", accentStyle.dot, accentStyle.glow)} />
              <span className="truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px]">
                {currentCourse?.name || "Zen Course"}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.2 text-[0.62rem] sm:text-[0.65rem] font-mono text-foreground font-semibold">
                <Layers className="h-3 w-3" />
                {courseNotes.length}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Quick Prev / Next Note Navigators */}
            {courseNotes.length > 1 && (
              <div className="hidden sm:flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={handlePrevNote}
                  title="Previous note in course"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08] active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all touch-manipulation cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={handleNextNote}
                  title="Next note in course"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08] active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all touch-manipulation cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Quick toggle to show/hide the horizontal course note strip */}
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setShowNotesStrip(!showNotesStrip);
              }}
              title={showNotesStrip ? "Hide notes strip" : "Show course notes strip"}
              className={cn(
                "hidden md:flex items-center gap-1 rounded-xl border px-2 py-1 text-[0.68rem] font-semibold transition-all cursor-pointer",
                showNotesStrip
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-3 w-3" />
              <span>Notes</span>
            </button>
          </div>

          {/* Center / Right: Zen Switcher, Study Utilities & Exit Button */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Quick + Note in Course */}
            <button
              type="button"
              onClick={() => {
                haptic("heavy");
                const colId = activeFilter.kind === "collection" ? activeFilter.id : null;
                onCreateNote("Untitled note", "", colId);
              }}
              title="Create new note in this course"
              className="flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/20 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-bold text-primary hover:bg-primary/30 active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Note</span>
            </button>

            {/* Mode Switcher */}
            <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.05] p-0.5">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  onModeChange("write");
                }}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-1 text-[0.68rem] font-bold transition-all",
                  editorMode === "write"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <PenLine className="h-3 w-3" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  onModeChange("preview");
                }}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-1 text-[0.68rem] font-bold transition-all",
                  editorMode === "preview"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="h-3 w-3" />
                <span>Zen</span>
              </button>
            </div>

            {/* Pomodoro Timer Quick Button */}
            {onOpenPomodoro && (
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  onOpenPomodoro();
                }}
                title="Study Pomodoro Timer"
                className="hidden md:flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              >
                <Clock className={cn("h-3.5 w-3.5", pomodoroRunning && "text-primary animate-pulse")} />
                {pomodoroRunning ? (
                  <span className="font-mono text-[0.7rem] font-bold text-primary">{pomodoroTimeFormatted}</span>
                ) : null}
              </button>
            )}

            {/* Active Recall Flashcards */}
            {onOpenFlashcards && currentNote && (
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  onOpenFlashcards(currentNote);
                }}
                title="Study with Flashcards"
                className="hidden sm:flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-500/15 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/25 active:scale-95 transition-all touch-manipulation cursor-pointer"
              >
                <Brain className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Flashcards</span>
              </button>
            )}

            {/* Exit Focus Button */}
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onExitFocus();
              }}
              title="Exit Focus Mode (Return to 3-column workspace)"
              className="flex items-center gap-1 rounded-xl sm:rounded-full border border-white/15 bg-white/[0.08] px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold text-foreground hover:bg-white/[0.15] active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              <Minimize2 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Exit Zen</span>
            </button>
          </div>
        </div>

        {/* Horizontal Quick-Access Course Notes Filmstrip */}
        {showNotesStrip && courseNotes.length > 0 && (
          <div className="glass-panel animate-panel-in flex items-center gap-1.5 overflow-x-auto scroll-sleek rounded-2xl border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-2xl">
            <span className="text-[0.62rem] uppercase tracking-wider text-muted-foreground/70 font-bold px-1.5 shrink-0">
              {currentCourse?.name}:
            </span>

            {courseNotes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              const col = courseCollections.find((c) => c.id === note.collectionId);

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    haptic("light");
                    onSelectNote(note.id);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer",
                    isSelected
                      ? "border-primary/60 bg-primary/20 text-foreground font-bold shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] ring-1 ring-primary/40"
                      : "border-white/5 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.07] hover:border-white/15"
                  )}
                >
                  {note.favorite ? (
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                  ) : (
                    <FileText className="h-3 w-3 opacity-60 shrink-0" />
                  )}

                  <span className="max-w-[120px] sm:max-w-[160px] truncate">
                    {note.title || "Untitled note"}
                  </span>

                  {col && (
                    <span className="rounded bg-white/10 px-1 py-0.2 text-[0.58rem] text-muted-foreground font-mono">
                      {col.name}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Quick + note trigger in filmstrip */}
            <button
              type="button"
              onClick={() => {
                haptic("heavy");
                onCreateNote("Untitled note", "");
              }}
              title="Create note in this course"
              className="flex items-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10 active:scale-90 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span className="text-[0.68rem] font-semibold">New</span>
            </button>
          </div>
        )}
      </header>

      {/* Zen Organized Course Collections & Notes Modal */}
      <Dialog
        open={drawerOpen}
        onOpenChange={(val) => {
          haptic(val ? "medium" : "light");
          setDrawerOpen(val);
        }}
      >
        <DialogContent className="glass-panel fixed bottom-0 top-auto sm:top-[50%] left-0 right-0 sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] max-h-[90dvh] sm:max-h-[85vh] w-full sm:max-w-[640px] rounded-t-3xl sm:rounded-3xl border border-white/15 bg-black/95 p-4 sm:p-6 shadow-2xl backdrop-blur-3xl overflow-y-auto scroll-sleek z-50 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
          {/* Mobile pull pill */}
          <div className="sm:hidden mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-white/20" />

          {/* Header */}
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl border shrink-0 shadow-lg",
                    accentStyle.border,
                    accentStyle.bg,
                    accentStyle.text
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold tracking-tight text-foreground truncate">
                    {currentCourse?.name || "Course Workspace"}
                  </DialogTitle>
                  <p className="text-[0.68rem] text-muted-foreground truncate">
                    {courseNotes.length} notes organized in {courseCollections.length} collections
                  </p>
                </div>
              </div>

              {/* View layout switch & Course dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Switch between Grouped & Flat view */}
                <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      haptic("light");
                      setViewLayout("grouped");
                    }}
                    title="Organized by Collection"
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2 py-1 text-[0.68rem] font-semibold transition-all cursor-pointer",
                      viewLayout === "grouped"
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Folder className="h-3 w-3" />
                    <span className="hidden xs:inline">Folders</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptic("light");
                      setViewLayout("flat");
                    }}
                    title="All Notes List"
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2 py-1 text-[0.68rem] font-semibold transition-all cursor-pointer",
                      viewLayout === "flat"
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <List className="h-3 w-3" />
                    <span className="hidden xs:inline">List</span>
                  </button>
                </div>

                {courses.length > 1 && (
                  <select
                    value={currentCourse?.id || ""}
                    onChange={(e) => {
                      haptic("light");
                      onSelectCourse(e.target.value);
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-neutral-900 text-foreground">
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Search Bar & Fast New Note Trigger */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes across collections..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                haptic("heavy");
                const colId = activeFilter.kind === "collection" ? activeFilter.id : null;
                onCreateNote("Untitled note", "", colId);
                setDrawerOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-md active:scale-95 transition-transform shrink-0 touch-manipulation cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Note</span>
            </button>
          </div>

          {/* Inline Add Collection Folder Input */}
          <div className="mt-3 flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
            <span className="text-[0.68rem] uppercase tracking-wider text-muted-foreground/80 font-bold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Course Collections &amp; Notes</span>
            </span>

            {!addingCollection ? (
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setAddingCollection(true);
                }}
                className="flex items-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 active:scale-95 transition-all cursor-pointer font-medium"
              >
                <FolderPlus className="h-3.5 w-3.5 text-primary" />
                <span>+ New Folder</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={newCollectionDraft}
                  onChange={(e) => setNewCollectionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitCollection();
                    if (e.key === "Escape") setAddingCollection(false);
                  }}
                  placeholder="Collection name..."
                  className="rounded-lg border border-primary/40 bg-white/[0.08] px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none w-36"
                />
                <button
                  type="button"
                  onClick={handleCommitCollection}
                  className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setAddingCollection(false)}
                  className="rounded-lg bg-white/10 p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Mode 1: Grouped by Collection Folders */}
          {viewLayout === "grouped" ? (
            <div className="mt-3 space-y-4 max-h-[55vh] overflow-y-auto scroll-sleek pr-1">
              {groupedCollections.map((group) => {
                const isCollapsed = Boolean(collapsedCollections[group.id]);
                const count = group.notes.length;

                return (
                  <div
                    key={group.id}
                    className="glass-panel rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all shadow-sm"
                  >
                    {/* Collection Header Bar */}
                    <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white/[0.03] border-b border-white/5">
                      <button
                        type="button"
                        onClick={() => toggleCollectionCollapse(group.id)}
                        className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer select-none group"
                      >
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
                            !isCollapsed && "rotate-90 text-foreground"
                          )}
                        />
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary shrink-0">
                          {group.isRoot ? <Folder className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {group.name}
                          </h4>
                          <span className="font-mono text-[0.65rem] text-muted-foreground/80 bg-white/5 px-1.5 py-0.2 rounded-md font-semibold">
                            {count}
                          </span>
                        </div>
                      </button>

                      {/* Quick + Note into this specific collection */}
                      <button
                        type="button"
                        onClick={() => {
                          haptic("heavy");
                          onCreateNote("Untitled note", "", group.isRoot ? null : group.collection?.id);
                          setDrawerOpen(false);
                        }}
                        title={`Add note to ${group.name}`}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.68rem] font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10 active:scale-90 transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="hidden xs:inline">Note</span>
                      </button>
                    </div>

                    {/* Notes Inside this Collection */}
                    {!isCollapsed && (
                      <div className="p-2 space-y-1.5">
                        {group.notes.length === 0 ? (
                          <div className="p-3 text-center text-xs text-muted-foreground/70 italic">
                            No notes in this folder yet.
                          </div>
                        ) : (
                          group.notes.map((note) => {
                            const isSelected = note.id === selectedNoteId;
                            const words = note.body ? note.body.trim().split(/\s+/).filter(Boolean).length : 0;

                            return (
                              <div
                                key={note.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  haptic("light");
                                  onSelectNote(note.id);
                                  setDrawerOpen(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    haptic("light");
                                    onSelectNote(note.id);
                                    setDrawerOpen(false);
                                  }
                                }}
                                className={cn(
                                  "group relative flex items-start justify-between gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 cursor-pointer select-none",
                                  "active:scale-[0.985] active:shadow-inner",
                                  isSelected
                                    ? "border-primary/50 bg-primary/15 shadow-md ring-1 ring-primary/40"
                                    : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-xs font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                                      {note.title || "Untitled note"}
                                    </h5>
                                    {isSelected && (
                                      <span className="rounded-full bg-primary/25 text-primary text-[0.58rem] font-bold px-1.5 py-0.2 shrink-0 border border-primary/30">
                                        Editing
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-0.5 line-clamp-1 text-[0.72rem] text-muted-foreground">
                                    {snippet(note.body) || "Empty note content..."}
                                  </p>

                                  <div className="mt-1.5 flex items-center gap-2 text-[0.62rem] text-muted-foreground/70 font-mono">
                                    <span>{formatDate(note.updatedAt)}</span>
                                    <span>•</span>
                                    <span>{words} words</span>
                                  </div>
                                </div>

                                {/* Star toggle button */}
                                <button
                                  type="button"
                                  aria-label="Toggle favorite"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    haptic("light");
                                    onToggleFavorite(note.id);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
                                >
                                  <Star
                                    className={cn(
                                      "h-3.5 w-3.5 transition-transform",
                                      note.favorite && "fill-yellow-400 text-yellow-400 scale-110"
                                    )}
                                  />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mode 2: Flat List View */
            <div className="mt-3 space-y-2 max-h-[55vh] overflow-y-auto scroll-sleek pr-1">
              {filteredNotes.length === 0 ? (
                <div className="my-6 text-center p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">No notes match your filter</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? "Try a different search query" : "Create your first note in this course"}
                  </p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = note.id === selectedNoteId;
                  const colName = courseCollections.find((c) => c.id === note.collectionId)?.name;
                  const words = note.body ? note.body.trim().split(/\s+/).filter(Boolean).length : 0;

                  return (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic("light");
                        onSelectNote(note.id);
                        setDrawerOpen(false);
                      }}
                      className={cn(
                        "group flex items-start justify-between gap-3 rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer select-none",
                        "active:scale-[0.985]",
                        isSelected
                          ? "border-primary/50 bg-primary/15 shadow-lg ring-1 ring-primary/40"
                          : "border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                            {note.title || "Untitled note"}
                          </h4>
                          {isSelected && (
                            <span className="rounded-full bg-primary/20 text-primary text-[0.6rem] font-bold px-1.5 py-0.2 shrink-0">
                              Editing
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {snippet(note.body) || "Empty note content..."}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2 text-[0.65rem] uppercase tracking-wider text-muted-foreground/70 font-mono">
                          <span>{formatDate(note.updatedAt)}</span>
                          {colName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px] text-foreground/80 font-medium">
                                {colName}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>{words}w</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label="Toggle favorite"
                        onClick={(e) => {
                          e.stopPropagation();
                          haptic("light");
                          onToggleFavorite(note.id);
                        }}
                        className="flex h-7 w-7 items-center justify-center shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            note.favorite && "fill-yellow-400 text-yellow-400 scale-110"
                          )}
                        />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
