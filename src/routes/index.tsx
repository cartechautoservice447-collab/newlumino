import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PanelLeftOpen, PanelRightOpen, Minimize2 } from "lucide-react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { AuthModal } from "@/components/auth/auth-modal";
import { useAuth } from "@/context/auth-context";
import { useNotes } from "@/hooks/use-notes";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarPanel } from "@/components/notes/sidebar-panel";
import { NoteList } from "@/components/notes/note-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { CourseDashboard } from "@/components/courses/course-dashboard";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const title = "Glass Notes — Markdown notes with GitHub Dark code";
const description =
  "An ultra-premium glassmorphism note-taking workspace: collections, favorites, instant search and Markdown notes with exact GitHub Dark syntax highlighting.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const n = useNotes();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<"dashboard" | "workspace">("dashboard");

  // On phones, the sidebar should start closed (Note List is the mobile home view).
  // On desktop this never fires, so laptop behavior is unchanged.
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const enterFocus = () => {
    setFocusMode(true);
    setSidebarOpen(false);
    setListOpen(false);
  };
  const exitFocus = () => {
    setFocusMode(false);
    setSidebarOpen(true);
    setListOpen(true);
  };

  const openCourse = (id: string) => {
    n.setActiveCourseId(id);
    n.setFilter({ kind: "all" });
    n.setSelectedId(null);
    n.setQuery("");
    setView("workspace");
  };

  const backToCourses = () => {
    n.setActiveCourseId(null);
    n.setFilter({ kind: "all" });
    n.setSelectedId(null);
    setView("dashboard");
  };

  if (loading) {
    return <div className="app-backdrop min-h-screen w-full" />;
  }
  if (!user) {
    return <AuthModal />;
  }

  if (view === "dashboard") {
    return (
      <>
        <CourseDashboard
          collections={n.courses}
          notes={n.notes}
          onOpenCourse={openCourse}
          onAddCourse={(name, category) => n.addCollection(name, category, null)}
          onDeleteCourse={n.deleteCourse}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    );
  }

  const filter = n.filter;
  const listTitle =
    filter.kind === "all"
      ? (n.activeCourse?.name ?? "All Notes")
      : filter.kind === "favorites"
        ? "Favorites"
        : (n.collections.find((c) => c.id === filter.id)?.name ?? "Collection");

  const sidebarContent = (
    <SidebarPanel
      onCollapse={() => setSidebarOpen(false)}
      onBackToCourses={backToCourses}
      onOpenSettings={() => setSettingsOpen(true)}
      collections={n.courseChildren}
      counts={n.counts}
      filter={n.filter}
      onFilterChange={n.setFilter}
      query={n.query}
      onQueryChange={n.setQuery}
      onCreateNote={n.createNote}
      onAddCollection={(name, category) => n.addCollection(name, category, n.activeCourseId)}
      onDeleteCollection={n.deleteCollection}
    />
  );

  return (
    <main className="app-backdrop relative min-h-screen w-full overflow-hidden">
      <div className="grain-overlay pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex h-screen max-w-[1700px] gap-4 p-4">
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent
              side="left"
              className="w-[85vw] max-w-[300px] border-none bg-transparent p-0"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        ) : (
          <div
            className={`shrink-0 overflow-hidden transition-all duration-500 ease-out ${
              sidebarOpen ? "w-[248px] opacity-100" : "w-0 opacity-0"
            }`}
          >
            {sidebarContent}
          </div>
        )}

        <div
          className={`shrink-0 overflow-hidden transition-all duration-500 ease-out ${
            listOpen
              ? `w-full lg:block lg:w-[330px] ${n.selectedId ? "hidden" : "block"}`
              : "hidden w-0 opacity-0"
          }`}
        >
          <NoteList
            title={listTitle}
            notes={n.visibleNotes}
            collections={n.collections}
            selectedId={n.selectedId}
            onSelect={n.setSelectedId}
            onToggleFavorite={n.toggleFavorite}
            onCollapse={() => setListOpen(false)}
          />
        </div>

        <div className={`min-w-0 flex-1 lg:block ${n.selectedId || !listOpen ? "block" : "hidden"}`}>
          <NoteEditor
            note={n.selected}
            collections={n.collections}
            onChange={(patch) => n.selected && n.updateNote(n.selected.id, patch)}
            onDelete={() => n.selected && n.deleteNote(n.selected.id)}
            onToggleFavorite={() => n.selected && n.toggleFavorite(n.selected.id)}
            onCreateNote={n.createNote}
            onBack={() => n.setSelectedId(null)}
            focusMode={focusMode}
            onToggleFocus={() => (focusMode ? exitFocus() : enterFocus())}
          />
        </div>
      </div>

      {!sidebarOpen && !focusMode ? (
        <button
          type="button"
          aria-label="Show sidebar"
          onClick={() => setSidebarOpen(true)}
          className="glass-panel animate-panel-in fixed left-5 top-5 z-30 rounded-xl border border-white/10 p-2.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}

      {!listOpen && !focusMode ? (
        <button
          type="button"
          aria-label="Show note list"
          onClick={() => setListOpen(true)}
          className="glass-panel animate-panel-in fixed bottom-5 left-5 z-30 rounded-xl border border-white/10 p-2.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      ) : null}

      {focusMode ? (
        <button
          type="button"
          onClick={exitFocus}
          className="glass-panel animate-panel-in fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Exit Focus Mode
        </button>
      ) : null}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  );
}
