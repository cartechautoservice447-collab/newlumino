import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { AuthModal } from "@/components/auth/auth-modal";
import { CustomizationProvider, useCustomization } from "@/context/customization-context";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { NotificationProvider, useNotifications } from "@/context/notification-context";
import { useNotes } from "@/hooks/use-notes";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ThemeStage } from "@/components/theme/theme-stage";
import { SidebarPanel } from "@/components/notes/sidebar-panel";
import { NoteList } from "@/components/notes/note-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { CourseDashboard } from "@/components/courses/course-dashboard";
import { MobileSidebarDrawer } from "@/components/mobile/mobile-sidebar-drawer";
import { MobileBottomDock } from "@/components/mobile/mobile-bottom-dock";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { MobileCategoryChips } from "@/components/mobile/mobile-category-chips";
import { MobileAccessoryBar } from "@/components/mobile/mobile-accessory-bar";
import { MobileNoteSheet } from "@/components/mobile/mobile-note-sheet";
import { MobileMoreOptionsSheet } from "@/components/mobile/mobile-more-options-sheet";
import { MobileQuickDraftSheet } from "@/components/mobile/mobile-quick-draft-sheet";
import { usePomodoroTimer } from "@/hooks/use-pomodoro";
import { NotificationBanner } from "@/components/ui/notification-banner";
import type { CourseAccent, Note } from "@/lib/notes";

// Lazy dialog loaders. They are only rendered after their first open (see
// StudyDialogs) and prefetched during idle time, so they no longer compete
// with first paint.
const loadSettingsDialog = () => import("@/components/settings/settings-dialog");
const loadDailyGoalView = () => import("@/components/tools/daily-goal-view");
const loadMarkdownCheatsheet = () => import("@/components/tools/markdown-cheatsheet");
const loadAiExamSimulator = () => import("@/components/tools/ai-exam-simulator-dialog");
const loadAiNotePolisher = () => import("@/components/tools/ai-note-polisher-dialog");
const loadPomodoroDialog = () => import("@/components/tools/pomodoro-dialog");
const loadPomodoroSessionComplete = () => import("@/components/tools/pomodoro-session-complete-dialog");

const SettingsDialog = lazy(() => loadSettingsDialog().then((m) => ({ default: m.SettingsDialog })));
const DailyGoalView = lazy(() => loadDailyGoalView().then((m) => ({ default: m.DailyGoalView })));
const MarkdownCheatsheet = lazy(() => loadMarkdownCheatsheet().then((m) => ({ default: m.MarkdownCheatsheet })));
const AiExamSimulatorDialog = lazy(() => loadAiExamSimulator().then((m) => ({ default: m.AiExamSimulatorDialog })));
const AiNotePolisherDialog = lazy(() => loadAiNotePolisher().then((m) => ({ default: m.AiNotePolisherDialog })));
const PomodoroDialog = lazy(() => loadPomodoroDialog().then((module) => ({ default: module.PomodoroDialog })));
const PomodoroSessionCompleteDialog = lazy(() =>
  loadPomodoroSessionComplete().then((module) => ({ default: module.PomodoroSessionCompleteDialog })),
);

type NotesApi = ReturnType<typeof useNotes>;
type PomodoroApi = ReturnType<typeof usePomodoroTimer>;

export default function App() {
  return (
    <CustomizationProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AuthProvider>
    </CustomizationProvider>
  );
}

function MainApp() {
  const { user, loading } = useAuth();
  const [guestMode, setGuestMode] = useState(false);

  const handleGuestAccess = useCallback(() => setGuestMode(true), []);
  const handleOpenAuth = useCallback(() => setGuestMode(false), []);

  // Keep the auth screen isolated from the full workspace stack. This prevents
  // notes/Pomodoro/storage initialization from crashing the login screen.
  if (loading && !guestMode) {
    return (
      <div className="app-backdrop min-h-screen w-full flex items-center justify-center text-muted-foreground font-mono text-xs">
        Loading NewLumino...
      </div>
    );
  }

  if (!user && !guestMode) {
    return <AuthModal onGuestAccess={handleGuestAccess} />;
  }

  return <AuthenticatedApp userId={user?.id ?? null} onOpenAuth={handleOpenAuth} />;
}

// True once `open` has been true at least once. Lets lazy dialogs stay out of
// the tree (and off the network) until the person actually opens them, then
// stay mounted so close animations behave exactly as before.
function useEverOpened(open: boolean) {
  const ref = useRef(false);
  if (open) ref.current = true;
  return ref.current;
}

interface StudyDialogsProps {
  variant: "dashboard" | "workspace";
  pomodoro: PomodoroApi;
  pomodoroOpen: boolean;
  onPomodoroOpenChange: (open: boolean) => void;
  sessionCompleteOpen: boolean;
  onSessionCompleteOpenChange: (open: boolean) => void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  examSimulatorOpen: boolean;
  onExamSimulatorOpenChange: (open: boolean) => void;
  notePolisherOpen: boolean;
  onNotePolisherOpenChange: (open: boolean) => void;
  cheatsheetOpen: boolean;
  onCheatsheetOpenChange: (open: boolean) => void;
  courses: NotesApi["courses"];
  activeCourse: NotesApi["activeCourse"];
  notes: NotesApi["notes"];
  selected: NotesApi["selected"];
  completeNote: Note | null;
  toolNote: Note | null;
  activeCourseName: string | undefined;
  realtimeStatus: NotesApi["realtimeStatus"];
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenAuth: () => void;
  onUpdateNote: NotesApi["updateNote"];
  onStartBreak: () => void;
}

const StudyDialogs = memo(function StudyDialogs(props: StudyDialogsProps) {
  const {
    variant,
    pomodoro,
    pomodoroOpen,
    onPomodoroOpenChange,
    sessionCompleteOpen,
    onSessionCompleteOpenChange,
    settingsOpen,
    onSettingsOpenChange,
    examSimulatorOpen,
    onExamSimulatorOpenChange,
    notePolisherOpen,
    onNotePolisherOpenChange,
    cheatsheetOpen,
    onCheatsheetOpenChange,
  } = props;
  const isWorkspace = variant === "workspace";

  const pomodoroMounted = useEverOpened(pomodoroOpen);
  const completeMounted = useEverOpened(sessionCompleteOpen);
  const settingsMounted = useEverOpened(settingsOpen);
  const examMounted = useEverOpened(examSimulatorOpen);
  const polisherMounted = useEverOpened(notePolisherOpen);
  const cheatsheetMounted = useEverOpened(cheatsheetOpen);

  return (
    <>
      {pomodoroMounted && (
        <Suspense fallback={null}>
          <PomodoroDialog
            open={pomodoroOpen}
            onOpenChange={onPomodoroOpenChange}
            pomodoro={pomodoro}
            courses={isWorkspace ? props.courses : undefined}
            activeCourse={isWorkspace ? props.activeCourse : undefined}
            notes={isWorkspace ? props.notes : undefined}
            selectedNote={isWorkspace ? props.selected : undefined}
          />
        </Suspense>
      )}

      {completeMounted && (
        <Suspense fallback={null}>
          <PomodoroSessionCompleteDialog
            open={sessionCompleteOpen}
            onOpenChange={onSessionCompleteOpenChange}
            activeNote={props.completeNote}
            completedSessions={pomodoro.completedSessions}
            onStartBreak={props.onStartBreak}
          />
        </Suspense>
      )}

      {(settingsMounted || examMounted || polisherMounted || (isWorkspace && cheatsheetMounted)) && (
        <Suspense fallback={null}>
          {settingsMounted && (
            <SettingsDialog
              open={settingsOpen}
              onOpenChange={onSettingsOpenChange}
              realtimeStatus={props.realtimeStatus}
              isSyncing={props.isSyncing}
              onRefresh={props.onRefresh}
              onOpenAuth={props.onOpenAuth}
            />
          )}

          {isWorkspace && cheatsheetMounted && (
            <MarkdownCheatsheet open={cheatsheetOpen} onOpenChange={onCheatsheetOpenChange} />
          )}

          {examMounted && (
            <AiExamSimulatorDialog
              open={examSimulatorOpen}
              onOpenChange={onExamSimulatorOpenChange}
              notes={props.notes}
              selectedNote={props.toolNote}
              activeCourseName={props.activeCourseName}
            />
          )}

          {polisherMounted && (
            <AiNotePolisherDialog
              open={notePolisherOpen}
              onOpenChange={onNotePolisherOpenChange}
              notes={props.notes}
              selectedNote={props.toolNote}
              onUpdateNote={props.onUpdateNote}
            />
          )}
        </Suspense>
      )}
    </>
  );
});

function AuthenticatedApp({
  userId,
  onOpenAuth,
}: {
  userId: string | null;
  onOpenAuth: () => void;
}) {
  const { settings } = useCustomization();
  const { showNotification } = useNotifications();
  const n = useNotes(userId);
  const isMobile = useIsMobile();
  const isFluidGlass = settings.websiteTheme === "fluid-glass";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<"dashboard" | "workspace" | "daily-goal">("dashboard");
  const [pomodoroDialogOpen, setPomodoroDialogOpen] = useState(false);
  const [sessionCompleteModalOpen, setSessionCompleteModalOpen] = useState(false);
  const [examSimulatorOpen, setExamSimulatorOpen] = useState(false);
  const [notePolisherOpen, setNotePolisherOpen] = useState(false);

  // Mobile-specific dialogs and sheets
  const [mobileNoteSheetOpen, setMobileNoteSheetOpen] = useState(false);
  const [selectedMobileNote, setSelectedMobileNote] = useState<Note | null>(null);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileDraftOpen, setMobileDraftOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [newCourseModalOpen, setNewCourseModalOpen] = useState(false);
  const [mobileEditorMode, setMobileEditorMode] = useState<"write" | "preview">("write");
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  const pomodoro = usePomodoroTimer({
    activeNoteId: n.selectedId,
    activeNoteTitle: n.selected?.title,
    activeCourseName: n.activeCourse?.name,
  });

  // Latest-value refs: event handlers read these at call time, so they can be
  // referentially stable and still never see stale data.
  const nRef = useRef(n);
  nRef.current = n;
  const pomodoroRef = useRef(pomodoro);
  pomodoroRef.current = pomodoro;
  const notifyRef = useRef(showNotification);
  notifyRef.current = showNotification;

  // Native PWA Shortcut and Performance boost initialization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get("action");
    if (action === "new-note") {
      setMobileDraftOpen(true);
    } else if (action === "pomodoro") {
      setPomodoroDialogOpen(true);
    }

    let perfBoost = false;
    try {
      perfBoost = localStorage.getItem("newlumino_perf_boost") === "true";
    } catch {
      perfBoost = false;
    }
    document.documentElement.setAttribute("data-perf-boost", perfBoost ? "true" : "false");
  }, []);

  // Warm the most common lazy dialogs when the browser is idle.
  useEffect(() => {
    const prefetch = () => {
      void loadSettingsDialog();
      void loadPomodoroDialog();
      void loadPomodoroSessionComplete();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(prefetch, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Listen for Pomodoro focus session completion
  const sessionCompletedSignal = pomodoro.sessionCompletedSignal;
  useEffect(() => {
    if (sessionCompletedSignal) {
      setSessionCompleteModalOpen(true);
      notifyRef.current({
        message: "Focus Session Complete",
        description: "Great work! Time for a well-deserved break.",
        type: "success",
      });
      pomodoroRef.current.clearSessionCompletedSignal();
    }
  }, [sessionCompletedSignal]);

  const pomodoroMins = Math.floor(pomodoro.timeLeft / 60);
  const pomodoroSecs = pomodoro.timeLeft % 60;
  const pomodoroTimeFormatted = `${String(pomodoroMins).padStart(2, "0")}:${String(pomodoroSecs).padStart(2, "0")}`;

  // Keep the exact NewLumino mobile navigation state in both themes.
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Desktop Fluid Glass Studio keeps its existing three-panel workspace
  // behavior. This branch is intentionally desktop-only.
  useEffect(() => {
    if (isFluidGlass && !isMobile) {
      setSidebarOpen(true);
      setListOpen(true);
    }
  }, [isFluidGlass, isMobile]);

  // ---------------------------------------------------------------------
  // Stable handlers
  // ---------------------------------------------------------------------
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openMenu = useCallback(() => setSidebarOpen(true), []);
  const openDraft = useCallback(() => setMobileDraftOpen(true), []);
  const openMoreSheet = useCallback(() => setMobileToolsOpen(true), []);
  const openPomodoro = useCallback(() => setPomodoroDialogOpen(true), []);
  const openCheatsheet = useCallback(() => setShowCheatsheet(true), []);
  const openExamSimulator = useCallback(() => setExamSimulatorOpen(true), []);
  const openNotePolisher = useCallback(() => setNotePolisherOpen(true), []);
  const openNewCourseModal = useCallback(() => setNewCourseModalOpen(true), []);
  const collapseSidebar = useCallback(() => setSidebarOpen(false), []);
  const collapseList = useCallback(() => setListOpen(false), []);
  const toggleMobileSearch = useCallback(() => setMobileSearchOpen((v) => !v), []);
  const handleRefresh = useCallback(() => void nRef.current.refreshFromCloud(), []);
  const handleStartBreak = useCallback(() => pomodoroRef.current.switchMode("shortBreak"), []);

  const openCourse = useCallback(
    (id: string) => {
      const hook = nRef.current;
      hook.setActiveCourseId(id);
      hook.setFilter({ kind: "all" });
      hook.setSelectedId(null);
      hook.setQuery("");
      setView("workspace");
      setSidebarOpen(!isMobile && isFluidGlass);
      setListOpen(true);
    },
    [isMobile, isFluidGlass],
  );

  const backToCourses = useCallback(() => {
    const hook = nRef.current;
    hook.setActiveCourseId(null);
    hook.setFilter({ kind: "all" });
    hook.setSelectedId(null);
    setSidebarOpen(false);
    setView("dashboard");
  }, []);

  const navigateToDailyGoal = useCallback(() => {
    setView("daily-goal");
    setSidebarOpen(false);
  }, []);

  const handleMobileOpenNoteSheet = useCallback((note: Note) => {
    setSelectedMobileNote(note);
    setMobileNoteSheetOpen(true);
  }, []);

  // Quick insertion handlers for the mobile markdown accessory bar
  const handleMobileInsertMarkdown = useCallback((before: string, after: string, placeholder = "text") => {
    const hook = nRef.current;
    if (!hook.selected) return;
    const current = hook.selected.body || "";
    hook.updateNote(hook.selected.id, { body: current + `\n${before}${placeholder}${after}\n` });
  }, []);

  const handleMobileInsertCodeBlock = useCallback(() => {
    const hook = nRef.current;
    if (!hook.selected) return;
    const current = hook.selected.body || "";
    hook.updateNote(hook.selected.id, { body: current + `\n\`\`\`python\nprint("hello world")\n\`\`\`\n` });
  }, []);

  // ---- Dashboard handlers ----
  const handleAddCourse = useCallback(
    async (name: string, description?: string, color?: CourseAccent, category?: string) => {
      const id = await nRef.current.addCourse(name, description, color, category);
      if (id) {
        notifyRef.current({
          message: "Course Created",
          description: `"${name}" is ready for notes.`,
          type: "success",
        });
      }
    },
    [],
  );

  const handleDeleteCourse = useCallback((id: string) => {
    const hook = nRef.current;
    const course = hook.courses.find((c) => c.id === id);
    void hook.deleteCourse(id);
    notifyRef.current({
      message: "Course Removed",
      description: course ? `"${course.name}" and its notes were deleted.` : "Course has been removed.",
      type: "info",
    });
  }, []);

  const handleDashboardOpenNote = useCallback((noteId: string, courseId?: string | null) => {
    const hook = nRef.current;
    if (courseId) hook.setActiveCourseId(courseId);
    hook.setSelectedId(noteId);
    setView("workspace");
  }, []);

  const handleOpenAllNotes = useCallback(() => {
    const hook = nRef.current;
    if (!hook.activeCourseId && hook.courses[0]) hook.setActiveCourseId(hook.courses[0].id);
    hook.setFilter({ kind: "all" });
    hook.setSelectedId(null);
    setView("workspace");
  }, []);

  const handleOpenFavorites = useCallback(() => {
    const hook = nRef.current;
    if (!hook.activeCourseId && hook.courses[0]) hook.setActiveCourseId(hook.courses[0].id);
    hook.setFilter({ kind: "favorites" });
    hook.setSelectedId(null);
    setView("workspace");
  }, []);

  const handleStartFocus = useCallback(() => {
    const hook = nRef.current;
    if (!hook.activeCourseId && hook.courses[0]) hook.setActiveCourseId(hook.courses[0].id);
    setView("workspace");
    if (!pomodoroRef.current.isRunning) pomodoroRef.current.togglePlay();
  }, []);

  const handleDashboardSaveNote = useCallback((title: string, body: string, colId?: string | null) => {
    const hook = nRef.current;
    const id = hook.createNote(title, body, colId);
    if (colId) hook.setActiveCourseId(colId);
    hook.setSelectedId(id);
    setView("workspace");
    notifyRef.current({
      message: "Note Created",
      description: `"${title || "Untitled"}" has been saved to your library.`,
      type: "success",
    });
  }, []);

  const handleDashboardNewCoursePrompt = useCallback(() => {
    const name = prompt("Course Name:");
    if (name?.trim()) void nRef.current.addCourse(name.trim());
  }, []);

  // Dashboard dock
  const dockDashNavigateCourses = useCallback(() => {
    setSidebarOpen(false);
    setView("dashboard");
  }, []);

  const dockDashNavigateNotes = useCallback(() => {
    const hook = nRef.current;
    setSidebarOpen(false);
    if (!hook.activeCourseId && hook.courses[0]) {
      openCourse(hook.courses[0].id);
    } else {
      setView("workspace");
      hook.setSelectedId(null);
    }
  }, [openCourse]);

  const dockDashNavigateEditor = useCallback(() => {
    const hook = nRef.current;
    setSidebarOpen(false);
    const first = hook.notes[0];
    if (first) {
      if (first.collectionId) {
        const parentCourse =
          hook.collections.find((c) => c.id === first.collectionId)?.parentId || first.collectionId;
        hook.setActiveCourseId(parentCourse);
      }
      hook.setSelectedId(first.id);
      setView("workspace");
    }
  }, []);

  const dockDashCreateNote = useCallback(() => {
    setSidebarOpen(false);
    setMobileDraftOpen(true);
  }, []);

  // ---- Workspace handlers ----
  const handleWorkspaceSaveNote = useCallback((title: string, body: string, colId?: string | null) => {
    const hook = nRef.current;
    const id = hook.createNote(title, body, colId);
    hook.setSelectedId(id);
    setView("workspace");
  }, []);

  const handleAddCollection = useCallback((name: string, category?: string) => {
    const hook = nRef.current;
    return hook.addCollection(name, category, hook.activeCourseId);
  }, []);

  const handleSidebarCreateNote = useCallback(() => {
    nRef.current.createNote();
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleCreateNote = useCallback(() => {
    nRef.current.createNote();
  }, []);

  const handleSelectNote = useCallback(
    (id: string) => {
      nRef.current.setSelectedId(id);
      if (isMobile) setMobileSearchOpen(false);
    },
    [isMobile],
  );

  const handleEditorChange = useCallback((patch: Partial<Note>) => {
    const hook = nRef.current;
    if (hook.selected) hook.updateNote(hook.selected.id, patch);
  }, []);

  const handleEditorDelete = useCallback(() => {
    const hook = nRef.current;
    if (hook.selected) {
      const title = hook.selected.title;
      hook.deleteNote(hook.selected.id);
      hook.setSelectedId(null);
      notifyRef.current({
        message: "Note Deleted",
        description: `"${title || "Untitled"}" has been removed.`,
        type: "info",
      });
    }
  }, []);

  const handleEditorToggleFavorite = useCallback(() => {
    const hook = nRef.current;
    if (hook.selected) hook.toggleFavorite(hook.selected.id);
  }, []);

  const handleEditorBack = useCallback(() => nRef.current.setSelectedId(null), []);

  const handleDuplicate = useCallback((id: string) => {
    const newId = nRef.current.duplicateNote(id);
    if (newId) {
      notifyRef.current({
        message: "Note Duplicated",
        description: "A copy has been added to your library.",
        type: "success",
      });
    }
  }, []);

  const handleMoveCollection = useCallback((id: string, colId: Note["collectionId"]) => {
    nRef.current.updateNote(id, { collectionId: colId });
  }, []);

  const handleDailyGoalBack = useCallback(() => {
    if (nRef.current.activeCourseId) setView("workspace");
    else setView("dashboard");
  }, []);

  // Workspace dock
  const dockNavigateCourses = useCallback(() => {
    setSidebarOpen(false);
    backToCourses();
  }, [backToCourses]);

  const dockNavigateNotes = useCallback(() => {
    setSidebarOpen(false);
    setView("workspace");
    nRef.current.setSelectedId(null);
  }, []);

  const dockNavigateEditor = useCallback(() => {
    const hook = nRef.current;
    setSidebarOpen(false);
    if (!hook.selectedId && hook.visibleNotes[0]) hook.setSelectedId(hook.visibleNotes[0].id);
  }, []);

  const dockCreateNote = useCallback(() => {
    setSidebarOpen(false);
    nRef.current.createNote();
  }, []);

  // ---------------------------------------------------------------------
  // Derived values and memoized subtrees. Elements are rebuilt only when their
  // real inputs change, so the per-second Pomodoro tick does not re-render the
  // course cards, note list or editor.
  // ---------------------------------------------------------------------
  const filter = n.filter;
  const listTitle = useMemo(() => {
    if (filter.kind === "all") return n.activeCourse?.name ?? "All Notes";
    if (filter.kind === "favorites") return "Favorites";
    return n.collections.find((c) => c.id === filter.id)?.name ?? "Collection";
  }, [filter, n.activeCourse, n.collections]);

  const completeNote = n.selected || n.visibleNotes[0] || null;
  const toolNote = n.selected || n.notes[0] || null;
  const toolCourseName = n.activeCourse?.name || n.courses[0]?.name;

  const dashboardEl = useMemo(
    () => (
      <CourseDashboard
        courses={n.courses}
        notes={n.notes}
        onOpenCourse={openCourse}
        onAddCourse={handleAddCourse}
        onDeleteCourse={handleDeleteCourse}
        onOpenSettings={openSettings}
        onOpenMenu={openMenu}
        onQuickNewNote={openDraft}
        onOpenNote={handleDashboardOpenNote}
        onOpenAllNotes={handleOpenAllNotes}
        onOpenFavorites={handleOpenFavorites}
        onStartFocus={handleStartFocus}
        todayFocusSeconds={pomodoro.todayFocusSeconds}
        dailyGoalHours={pomodoro.dailyGoalHours}
        realtimeStatus={n.realtimeStatus}
        isSyncing={n.isSyncing}
        onRefresh={handleRefresh}
        onOpenAuth={onOpenAuth}
      />
    ),
    [
      n.courses,
      n.notes,
      n.realtimeStatus,
      n.isSyncing,
      pomodoro.todayFocusSeconds,
      pomodoro.dailyGoalHours,
      openCourse,
      handleAddCourse,
      handleDeleteCourse,
      openSettings,
      openMenu,
      openDraft,
      handleDashboardOpenNote,
      handleOpenAllNotes,
      handleOpenFavorites,
      handleStartFocus,
      handleRefresh,
      onOpenAuth,
    ],
  );

  const sidebarEl = useMemo(
    () => (
      <SidebarPanel
        onCollapse={collapseSidebar}
        onBackToCourses={backToCourses}
        onOpenSettings={openSettings}
        onOpenPomodoro={openPomodoro}
        onNavigateDailyGoal={navigateToDailyGoal}
        onOpenCheatsheet={openCheatsheet}
        pomodoroRunning={pomodoro.isRunning}
        pomodoroTimeFormatted={pomodoroTimeFormatted}
        todayFocusSeconds={pomodoro.todayFocusSeconds}
        dailyGoalHours={pomodoro.dailyGoalHours}
        collections={n.courseChildren}
        counts={n.counts}
        filter={n.filter}
        onFilterChange={n.setFilter}
        query={n.query}
        onQueryChange={n.setQuery}
        onCreateNote={handleSidebarCreateNote}
        onAddCollection={handleAddCollection}
        onDeleteCollection={n.deleteCollection}
      />
    ),
    [
      collapseSidebar,
      backToCourses,
      openSettings,
      openPomodoro,
      navigateToDailyGoal,
      openCheatsheet,
      pomodoro.isRunning,
      pomodoroTimeFormatted,
      pomodoro.todayFocusSeconds,
      pomodoro.dailyGoalHours,
      n.courseChildren,
      n.counts,
      n.filter,
      n.setFilter,
      n.query,
      n.setQuery,
      handleSidebarCreateNote,
      handleAddCollection,
      n.deleteCollection,
    ],
  );

  const noteListEl = useMemo(
    () => (
      <NoteList
        title={listTitle}
        notes={n.visibleNotes}
        collections={n.collections}
        selectedId={n.selectedId}
        onSelect={handleSelectNote}
        onToggleFavorite={n.toggleFavorite}
        onCollapse={collapseList}
        onCreateNote={handleCreateNote}
        onOpenMobileNoteMenu={handleMobileOpenNoteSheet}
      />
    ),
    [
      listTitle,
      n.visibleNotes,
      n.collections,
      n.selectedId,
      handleSelectNote,
      n.toggleFavorite,
      collapseList,
      handleCreateNote,
      handleMobileOpenNoteSheet,
    ],
  );

  const noteEditorEl = useMemo(
    () => (
      <NoteEditor
        note={n.selected}
        collections={n.collections}
        onChange={handleEditorChange}
        onDelete={handleEditorDelete}
        onToggleFavorite={handleEditorToggleFavorite}
        onCreateNote={handleCreateNote}
        onBack={handleEditorBack}
        onOpenMobileSheet={handleMobileOpenNoteSheet}
        externalMode={mobileEditorMode}
        onModeChange={setMobileEditorMode}
      />
    ),
    [
      n.selected,
      n.collections,
      handleEditorChange,
      handleEditorDelete,
      handleEditorToggleFavorite,
      handleCreateNote,
      handleEditorBack,
      handleMobileOpenNoteSheet,
      mobileEditorMode,
    ],
  );

  const studyDialogs = (variant: "dashboard" | "workspace") => (
    <StudyDialogs
      variant={variant}
      pomodoro={pomodoro}
      pomodoroOpen={pomodoroDialogOpen}
      onPomodoroOpenChange={setPomodoroDialogOpen}
      sessionCompleteOpen={sessionCompleteModalOpen}
      onSessionCompleteOpenChange={setSessionCompleteModalOpen}
      settingsOpen={settingsOpen}
      onSettingsOpenChange={setSettingsOpen}
      examSimulatorOpen={examSimulatorOpen}
      onExamSimulatorOpenChange={setExamSimulatorOpen}
      notePolisherOpen={notePolisherOpen}
      onNotePolisherOpenChange={setNotePolisherOpen}
      cheatsheetOpen={showCheatsheet}
      onCheatsheetOpenChange={setShowCheatsheet}
      courses={n.courses}
      activeCourse={n.activeCourse}
      notes={n.notes}
      selected={n.selected}
      completeNote={completeNote}
      toolNote={toolNote}
      activeCourseName={toolCourseName}
      realtimeStatus={n.realtimeStatus}
      isSyncing={n.isSyncing}
      onRefresh={handleRefresh}
      onOpenAuth={onOpenAuth}
      onUpdateNote={n.updateNote}
      onStartBreak={handleStartBreak}
    />
  );

  // Dashboard view
  if (view === "dashboard") {
    return (
      <ThemeStage className={cn("h-[100dvh] min-h-[100dvh] w-full overflow-hidden", isFluidGlass && !isMobile && "p-[10px]")}>
        {dashboardEl}

        {/* Mobile Slide-in Drawer: Study Tools when swiped or hamburger clicked on Dashboard */}
        {isMobile && (
          <MobileSidebarDrawer
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            onOpenSettings={openSettings}
            onOpenNewCourse={openNewCourseModal}
            onOpenPomodoro={openPomodoro}
            onOpenCheatsheet={openCheatsheet}
            onNavigateDailyGoal={navigateToDailyGoal}
            onOpenExamSimulator={openExamSimulator}
            onOpenNotePolisher={openNotePolisher}
            pomodoroRunning={pomodoro.isRunning}
            pomodoroTimeFormatted={pomodoroTimeFormatted}
            todayFocusSeconds={pomodoro.todayFocusSeconds}
            dailyGoalHours={pomodoro.dailyGoalHours}
          />
        )}

        {/* Mobile Navigation Dock (Only visible on mobile screens) */}
        {isMobile && (
          <MobileBottomDock
            currentView="dashboard"
            selectedNoteId={n.selectedId}
            activeFilterKind={n.filter.kind}
            notesCount={n.notes.length}
            todayFocusSeconds={pomodoro.todayFocusSeconds}
            dailyGoalHours={pomodoro.dailyGoalHours}
            onNavigateCourses={dockDashNavigateCourses}
            onNavigateNotes={dockDashNavigateNotes}
            onNavigateEditor={dockDashNavigateEditor}
            onNavigateDailyGoal={navigateToDailyGoal}
            onCreateNote={dockDashCreateNote}
            onOpenMoreSheet={openMoreSheet}
          />
        )}

        {/* Mobile Draft / Capture Sheet */}
        <MobileQuickDraftSheet
          open={mobileDraftOpen}
          onOpenChange={setMobileDraftOpen}
          collections={n.collections}
          activeCourseId={n.activeCourseId}
          onSaveNote={handleDashboardSaveNote}
        />

        {/* Mobile More Options Sheet */}
        <MobileMoreOptionsSheet
          open={mobileToolsOpen}
          onOpenChange={setMobileToolsOpen}
          onOpenSettings={openSettings}
          onOpenNewCourse={handleDashboardNewCoursePrompt}
          onOpenPomodoro={openPomodoro}
          onOpenCheatsheet={openCheatsheet}
          pomodoroRunning={pomodoro.isRunning}
          pomodoroTimeFormatted={pomodoroTimeFormatted}
        />

        {/* Study Tools Dialogs */}
        {studyDialogs("dashboard")}
      </ThemeStage>
    );
  }

  // Workspace view
  return (
    <ThemeStage className={cn("h-[100dvh] min-h-[100dvh] flex flex-col", isFluidGlass && !isMobile && "p-[10px]")}>
      <NotificationBanner />

      {/* Daily Goal View */}
      {view === "daily-goal" && (
        <div className="flex-1 flex flex-col min-h-0 bg-background/50 backdrop-blur-xl animate-panel-in relative z-20">
          <div className="absolute top-4 left-4 z-30">
            <button
              onClick={handleDailyGoalBack}
              className="glass-panel flex items-center justify-center p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
          <Suspense fallback={null}>
            <DailyGoalView pomodoro={pomodoro} onOpenPomodoro={openPomodoro} />
          </Suspense>
        </div>
      )}

      {/* Mobile Top Header (Luminous Glass Header when browsing notes list) */}
      {isMobile && !n.selectedId && view === "workspace" && (
        <div className="shrink-0 z-30 px-3 pt-3 pb-1">
          <div className="glass-panel animate-panel-in rounded-3xl p-1 shadow-2xl backdrop-blur-3xl border border-white/15">
            <MobileHeader
              title={listTitle}
              subtitle={`${n.visibleNotes.length} notes in course`}
              showBack={false}
              onOpenSidebar={openMenu}
              onOpenSettings={openSettings}
              showSearch={mobileSearchOpen}
              onToggleSearch={toggleMobileSearch}
              searchQuery={n.query}
              onSearchChange={n.setQuery}
            />
            {/* Category Chips Bar on Mobile (when in Note List view) */}
            <MobileCategoryChips
              collections={n.courseChildren}
              filter={n.filter}
              onFilterChange={n.setFilter}
              counts={n.counts}
            />
          </div>
        </div>
      )}

      {/* Main Responsive Grid */}
      {view === "workspace" && (
        <div
          className={cn(
            "relative mx-auto flex-1 min-h-0 w-full max-w-[1700px] flex gap-4 transition-all",
            isMobile && n.selectedId
              ? "h-full p-1.5 sm:p-4 pb-0 md:pb-4"
              : isMobile
                ? "h-full p-2 sm:p-4 md:pb-4"
                : "h-screen p-2 sm:p-4 pb-4 md:pb-4",
          )}
        >
          {/* Mobile Slide-in Drawer: NewLumino mobile workspace only. Fluid Glass keeps the original three-panel layout. */}
          {isMobile ? (
            <MobileSidebarDrawer
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
              onOpenSettings={openSettings}
              onOpenNewCourse={openNewCourseModal}
              onOpenPomodoro={openPomodoro}
              onOpenCheatsheet={openCheatsheet}
              onNavigateDailyGoal={navigateToDailyGoal}
              pomodoroRunning={pomodoro.isRunning}
              pomodoroTimeFormatted={pomodoroTimeFormatted}
              todayFocusSeconds={pomodoro.todayFocusSeconds}
              dailyGoalHours={pomodoro.dailyGoalHours}
            />
          ) : (
            /* Desktop Sidebar Panel - Exactly as original */
            <div
              className={`shrink-0 overflow-hidden transition-all duration-500 ease-out ${
                sidebarOpen
                  ? isFluidGlass
                    ? "w-[286px] min-w-[286px] opacity-100"
                    : "w-[260px] opacity-100"
                  : "w-0 opacity-0"
              }`}
            >
              {sidebarEl}
            </div>
          )}

          {/* Note List Column */}
          <div
            className={`shrink-0 overflow-hidden transition-all duration-500 ease-out ${
              listOpen
                ? isMobile
                  ? `w-full lg:block lg:w-[340px] ${n.selectedId ? "hidden" : "block"}`
                  : isFluidGlass
                    ? "block h-full w-[318px] min-w-[318px] shrink-0"
                    : `w-full lg:block lg:w-[340px] ${n.selectedId ? "hidden" : "block"}`
                : "hidden w-0 opacity-0"
            }`}
          >
            {noteListEl}
          </div>

          {/* Note Editor Column */}
          <div
            className={
              isMobile
                ? `min-w-0 flex-1 lg:block ${n.selectedId || !listOpen ? "block" : "hidden"}`
                : isFluidGlass
                  ? "block h-full min-w-[280px] flex-1"
                  : `min-w-0 flex-1 lg:block ${n.selectedId || !listOpen ? "block" : "hidden"}`
            }
          >
            {noteEditorEl}
          </div>
        </div>
      )}

      {/* Mobile Formatting Accessory Bar (visible when actively writing on mobile) */}
      {isMobile && n.selectedId && view === "workspace" && (
        <MobileAccessoryBar
          onInsertMarkdown={handleMobileInsertMarkdown}
          onInsertCodeBlock={handleMobileInsertCodeBlock}
          editorMode={mobileEditorMode}
        />
      )}

      {/* Mobile Floating Bottom Dock (Only shown when browsing courses or note list, hidden in editor for maximum room) */}
      {isMobile && !n.selectedId && (
        <MobileBottomDock
          currentView={view}
          selectedNoteId={n.selectedId}
          activeFilterKind={n.filter.kind}
          notesCount={n.visibleNotes.length}
          todayFocusSeconds={pomodoro.todayFocusSeconds}
          dailyGoalHours={pomodoro.dailyGoalHours}
          onNavigateCourses={dockNavigateCourses}
          onNavigateNotes={dockNavigateNotes}
          onNavigateEditor={dockNavigateEditor}
          onNavigateDailyGoal={navigateToDailyGoal}
          onCreateNote={dockCreateNote}
          onOpenMoreSheet={openMoreSheet}
        />
      )}

      {/* Desktop Toggle Sidebar / List buttons (Untouched) */}
      {!sidebarOpen && !isMobile ? (
        <button
          type="button"
          aria-label="Show sidebar"
          onClick={openMenu}
          className="glass-panel animate-panel-in fixed left-5 top-5 z-30 rounded-2xl border border-white/10 p-2.5 text-muted-foreground transition-all hover:text-foreground hover:scale-105 active:scale-95"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}

      {!listOpen && !isMobile ? (
        <button
          type="button"
          aria-label="Show note list"
          onClick={() => setListOpen(true)}
          className="glass-panel animate-panel-in fixed bottom-5 left-5 z-30 rounded-2xl border border-white/10 p-2.5 text-muted-foreground transition-all hover:text-foreground hover:scale-105 active:scale-95"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      ) : null}

      {/* Mobile Note Context Menu Sheet */}
      <MobileNoteSheet
        note={selectedMobileNote || n.selected}
        open={mobileNoteSheetOpen}
        onOpenChange={setMobileNoteSheetOpen}
        collections={n.collections}
        onToggleFavorite={n.toggleFavorite}
        onDuplicate={handleDuplicate}
        onMoveCollection={handleMoveCollection}
        onDelete={n.deleteNote}
      />

      {/* Mobile Tools & Navigation Sheet: Tool Option contains the Navigation Interface */}
      <MobileMoreOptionsSheet
        open={mobileToolsOpen}
        onOpenChange={setMobileToolsOpen}
        collections={n.courseChildren}
        activeCourse={n.activeCourse}
        filter={n.filter}
        onFilterChange={n.setFilter}
        counts={n.counts}
        onAddCollection={handleAddCollection}
        onDeleteCollection={n.deleteCollection}
        onBackToCourses={backToCourses}
        onOpenSettings={openSettings}
        onOpenNewCourse={openNewCourseModal}
        onOpenPomodoro={openPomodoro}
        onOpenCheatsheet={openCheatsheet}
        onNavigateDailyGoal={navigateToDailyGoal}
        onOpenExamSimulator={openExamSimulator}
        onOpenNotePolisher={openNotePolisher}
        pomodoroRunning={pomodoro.isRunning}
        pomodoroTimeFormatted={pomodoroTimeFormatted}
        todayFocusSeconds={pomodoro.todayFocusSeconds}
        dailyGoalHours={pomodoro.dailyGoalHours}
      />

      {/* Mobile Quick Draft Capture Sheet */}
      <MobileQuickDraftSheet
        open={mobileDraftOpen}
        onOpenChange={setMobileDraftOpen}
        collections={n.collections}
        activeCourseId={n.activeCourseId}
        onSaveNote={handleWorkspaceSaveNote}
      />

      {/* Study Tools Dialogs */}
      {studyDialogs("workspace")}
    </ThemeStage>
  );
}
