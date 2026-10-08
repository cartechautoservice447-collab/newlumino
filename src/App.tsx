import { lazy, Suspense, useCallback, useEffect, useState, useRef } from "react";
import { PanelLeftOpen, PanelRightOpen, Minimize2 } from "lucide-react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
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
import { SpatialAuroraDashboard } from "@/components/courses/spatial-aurora-dashboard";
import { MobileStudyDashboard } from "@/components/courses/mobile-study-dashboard";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MobileSidebarDrawer } from "@/components/mobile/mobile-sidebar-drawer";
import { MobileBottomDock } from "@/components/mobile/mobile-bottom-dock";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { MobileCategoryChips } from "@/components/mobile/mobile-category-chips";
import { MobileAccessoryBar } from "@/components/mobile/mobile-accessory-bar";
import { MobileNoteSheet } from "@/components/mobile/mobile-note-sheet";
import { MobileMoreOptionsSheet } from "@/components/mobile/mobile-more-options-sheet";
import { MobileQuickDraftSheet } from "@/components/mobile/mobile-quick-draft-sheet";
import { usePomodoroTimer } from "@/hooks/use-pomodoro";
import { FlashcardsDialog } from "@/components/tools/flashcards-dialog";
const PomodoroFloatingPill = lazy(() => import("@/components/tools/pomodoro-floating-pill").then((module) => ({ default: module.PomodoroFloatingPill })));
const PomodoroDialog = lazy(() => import("@/components/tools/pomodoro-dialog").then((module) => ({ default: module.PomodoroDialog })));
const PomodoroSessionCompleteDialog = lazy(() => import("@/components/tools/pomodoro-session-complete-dialog").then((module) => ({ default: module.PomodoroSessionCompleteDialog })));
import { DailyGoalView } from "@/components/tools/daily-goal-view";
import { MarkdownCheatsheet } from "@/components/tools/markdown-cheatsheet";
import { AiExamSimulatorDialog } from "@/components/tools/ai-exam-simulator-dialog";
import { AiNotePolisherDialog } from "@/components/tools/ai-note-polisher-dialog";
import { AiExplainDialog } from "@/components/tools/ai-explain-dialog";
import { AiCollectionExamDialog } from "@/components/tools/ai-collection-exam-dialog";
import { NotificationBanner } from "@/components/ui/notification-banner";
import type { Note } from "@/lib/notes";

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
    return <AuthModal onGuestAccess={() => setGuestMode(true)} />;
  }

  return (
    <AuthenticatedApp
      userId={user?.id ?? null}
      onOpenAuth={() => setGuestMode(false)}
    />
  );
}

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
  const [focusMode, setFocusMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<"dashboard" | "workspace" | "daily-goal">("dashboard");

  // Pomodoro & Flashcard Tools State
  const pomodoro = usePomodoroTimer({
    activeNoteId: n.selectedId,
    activeNoteTitle: n.selected?.title,
    activeCourseName: n.activeCourse?.name,
  });
  const [pomodoroDialogOpen, setPomodoroDialogOpen] = useState(false);
  const [flashcardsDialogOpen, setFlashcardsDialogOpen] = useState(false);
  const [flashcardTargetNote, setFlashcardTargetNote] = useState<Note | null>(null);
  const [flashcardWeakTopics, setFlashcardWeakTopics] = useState<string[]>([]);
  const [sessionCompleteModalOpen, setSessionCompleteModalOpen] = useState(false);
  const [autoAIGenerateCards, setAutoAIGenerateCards] = useState(false);
  const [flashcardGenerationSource, setFlashcardGenerationSource] = useState<"general" | "pomodoro">("general");
  const [examSimulatorOpen, setExamSimulatorOpen] = useState(false);
  const [notePolisherOpen, setNotePolisherOpen] = useState(false);
  const [aiExplainOpen, setAiExplainOpen] = useState(false);
  const [collectionExamOpen, setCollectionExamOpen] = useState(false);

  // Listen for Pomodoro focus session completion
  useEffect(() => {
    if (pomodoro.sessionCompletedSignal) {
      setSessionCompleteModalOpen(true);
      showNotification({
        message: "Focus Session Complete",
        description: "Great work! Time for a well-deserved break.",
        type: "success",
      });
      pomodoro.clearSessionCompletedSignal();
    }
  }, [pomodoro.sessionCompletedSignal]);

  const handleStartSessionAIFlashcards = () => {
    setFlashcardTargetNote(n.selected || n.visibleNotes[0] || null);
    setFlashcardGenerationSource("pomodoro");
    setAutoAIGenerateCards(true);
    setFlashcardsDialogOpen(true);
  };

  const pomodoroMins = Math.floor(pomodoro.timeLeft / 60);
  const pomodoroSecs = pomodoro.timeLeft % 60;
  const pomodoroTimeFormatted = `${String(pomodoroMins).padStart(2, "0")}:${String(pomodoroSecs).padStart(2, "0")}`;

  // Mobile-specific dialogs and sheets
  const [mobileNoteSheetOpen, setMobileNoteSheetOpen] = useState(false);
  const [selectedMobileNote, setSelectedMobileNote] = useState<Note | null>(null);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileDraftOpen, setMobileDraftOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [newCourseModalOpen, setNewCourseModalOpen] = useState(false);
  const [mobileEditorMode, setMobileEditorMode] = useState<"write" | "preview">("write");
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  // Keep the exact NewLumino mobile navigation state in both themes.
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Desktop Fluid Glass Studio keeps its existing three-panel workspace
  // behavior. This branch is intentionally desktop-only.
  useEffect(() => {
    if (isFluidGlass && !isMobile) {
      setSidebarOpen(true);
      setListOpen(true);
    }
  }, [isFluidGlass, isMobile]);

  const enterFocus = useCallback(() => {
    if (!n.activeCourseId && n.courses[0]) {
      n.setActiveCourseId(n.courses[0].id);
    }
    const targetCourseId = n.activeCourseId || (n.courses[0] ? n.courses[0].id : null);
    if (targetCourseId) {
      const isCurrentNoteInCourse = n.selected && (
        n.selected.courseId === targetCourseId ||
        (n.selected.collectionId && n.collections.some(c => (c.courseId === targetCourseId || c.parentId === targetCourseId) && c.id === n.selected?.collectionId))
      );
      if (!isCurrentNoteInCourse) {
        const courseNote = n.notes.find(
          (note) => note.courseId === targetCourseId || (note.collectionId && n.collections.some(c => (c.courseId === targetCourseId || c.parentId === targetCourseId) && c.id === note.collectionId))
        );
        if (courseNote) {
          n.setSelectedId(courseNote.id);
        } else {
          const newId = n.createNote("Untitled note", "", null);
          n.setSelectedId(newId);
        }
      }
    }
    setFocusMode(true);
    setSidebarOpen(false);
    setListOpen(false);
  }, [
    n.activeCourseId,
    n.courses,
    n.selected,
    n.collections,
    n.notes,
    n.setActiveCourseId,
    n.setSelectedId,
    n.createNote,
  ]);

  const exitFocus = useCallback(() => {
    setFocusMode(false);
    if (!isMobile) setSidebarOpen(true);
    else setSidebarOpen(false);
    setListOpen(true);
  }, [isMobile]);

  const openCourse = useCallback((id: string) => {
    n.setActiveCourseId(id);
    n.setFilter({ kind: "all" });
    n.setSelectedId(null);
    n.setQuery("");
    setView("workspace");
    setSidebarOpen(!isMobile && isFluidGlass);
    setListOpen(true);
  }, [n.setActiveCourseId, n.setFilter, n.setSelectedId, n.setQuery, isMobile, isFluidGlass]);

  const backToCourses = () => {
    n.setActiveCourseId(null);
    n.setFilter({ kind: "all" });
    n.setSelectedId(null);
    setSidebarOpen(false);
    setView("dashboard");
  };

  const navigateToDailyGoal = () => {
    setView("daily-goal");
    setSidebarOpen(false);
  };

  const handleMobileOpenNoteSheet = (note: Note) => {
    setSelectedMobileNote(note);
    setMobileNoteSheetOpen(true);
  };

  // Quick insertion handler for mobile markdown accessory bar
  const handleMobileInsertMarkdown = (before: string, after: string, placeholder = "text") => {
    if (!n.selected) return;
    const current = n.selected.body || "";
    const updated = current + `\n${before}${placeholder}${after}\n`;
    n.updateNote(n.selected.id, { body: updated });
  };

  const handleMobileInsertCodeBlock = () => {
    if (!n.selected) return;
    const current = n.selected.body || "";
    const updated = current + `\n\`\`\`python\nprint("hello world")\n\`\`\`\n`;
    n.updateNote(n.selected.id, { body: updated });
  };

  const mobileAddCourse = useCallback((name: string, description?: string, color?: import("@/lib/notes").CourseAccent, category?: string) => {
    void n.addCourse(name, description, color, category).then((id) => {
      if (id) {
        showNotification({
          message: "Course Created",
          description: `"${name}" is ready for notes.`,
          type: "success",
        });
      }
    });
  }, [n.addCourse, showNotification]);

  const mobileDeleteCourse = useCallback((id: string) => {
    const course = n.courses.find((entry) => entry.id === id);
    void n.deleteCourse(id);
    showNotification({
      message: "Course Removed",
      description: course ? `"${course.name}" and its notes were deleted.` : "Course has been removed.",
      type: "info",
    });
  }, [n.courses, n.deleteCourse, showNotification]);

  const mobileOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const mobileOpenMenu = useCallback(() => setSidebarOpen(true), []);

  const mobileQuickNewNote = useCallback((courseId?: string) => {
    if (courseId) n.setActiveCourseId(courseId);
    setMobileDraftOpen(true);
  }, [n.setActiveCourseId]);

  const mobileOpenNote = useCallback((noteId: string, courseId?: string) => {
    if (courseId) n.setActiveCourseId(courseId);
    n.setSelectedId(noteId);
    setView("workspace");
  }, [n.setActiveCourseId, n.setSelectedId]);

  const mobileOpenAllNotes = useCallback(() => {
    n.setActiveCourseId(null);
    n.setFilter({ kind: "all" });
    n.setSelectedId(null);
    setView("workspace");
  }, [n.setActiveCourseId, n.setFilter, n.setSelectedId]);

  const mobileOpenFavorites = useCallback(() => {
    n.setActiveCourseId(null);
    n.setFilter({ kind: "favorites" });
    n.setSelectedId(null);
    setView("workspace");
  }, [n.setActiveCourseId, n.setFilter, n.setSelectedId]);

  const mobileStartFocus = useCallback(() => {
    if (!n.activeCourseId && n.courses[0]) n.setActiveCourseId(n.courses[0].id);
    setView("workspace");
    enterFocus();
    if (!pomodoro.isRunning) pomodoro.togglePlay();
  }, [n.activeCourseId, n.courses, n.setActiveCourseId, enterFocus, pomodoro.isRunning, pomodoro.togglePlay]);

  // Dashboard view
  if (view === "dashboard") {
    return (
      <ThemeStage className={cn("h-[100dvh] min-h-[100dvh] w-full overflow-hidden", isFluidGlass && !isMobile && "p-[10px]")}>
        {isMobile ? (
          <MobileStudyDashboard
            courses={n.courses}
            notes={n.notes}
            onOpenCourse={openCourse}
            onAddCourse={mobileAddCourse}
             onDeleteCourse={mobileDeleteCourse}
             onOpenSettings={mobileOpenSettings}
             onOpenMenu={mobileOpenMenu}
             onQuickNewNote={mobileQuickNewNote}
             onOpenNote={mobileOpenNote}
             onOpenAllNotes={mobileOpenAllNotes}
             onOpenFavorites={mobileOpenFavorites}
             onStartFocus={mobileStartFocus}
todayFocusSeconds={pomodoro.todayFocusSeconds}
            dailyGoalHours={pomodoro.dailyGoalHours}
            realtimeStatus={n.realtimeStatus}
            isSyncing={n.isSyncing}
          />
        ) : settings.dashboardDesign === "spatial-aurora-bento" ? (
          <SpatialAuroraDashboard
            courses={n.courses}
            notes={n.notes}
            onOpenCourse={openCourse}
            onOpenMenu={() => setSidebarOpen(true)}
            onQuickNewNote={() => setMobileDraftOpen(true)}
            onOpenNote={(noteId, courseId) => {
              if (courseId) n.setActiveCourseId(courseId);
              n.setSelectedId(noteId);
              setView("workspace");
            }}
            onOpenAllNotes={() => {
              if (!n.activeCourseId && n.courses[0]) n.setActiveCourseId(n.courses[0].id);
              n.setFilter({ kind: "all" });
              n.setSelectedId(null);
              setView("workspace");
            }}
            onOpenFavorites={() => {
              if (!n.activeCourseId && n.courses[0]) n.setActiveCourseId(n.courses[0].id);
              n.setFilter({ kind: "favorites" });
              n.setSelectedId(null);
              setView("workspace");
            }}
            onStartFocus={() => {
              if (!n.activeCourseId && n.courses[0]) n.setActiveCourseId(n.courses[0].id);
              setView("workspace");
              enterFocus();
              if (!pomodoro.isRunning) pomodoro.togglePlay();
            }}
            todayFocusSeconds={pomodoro.todayFocusSeconds}
            dailyGoalHours={pomodoro.dailyGoalHours}
            sessionHistory={pomodoro.sessionHistory}
            onNavigateDailyGoal={navigateToDailyGoal}
          />
        ) : (
          <CourseDashboard
            courses={n.courses}
            notes={n.notes}
            onOpenCourse={openCourse}
            onAddCourse={async (name, description, color, category) => {
              const id = await n.addCourse(name, description, color, category);
              if (id) {
                showNotification({
                  message: "Course Created",
                  description: `"${name}" is ready for notes.`,
                  type: "success",
                });
              }
            }}
            onDeleteCourse={(id) => {
              const course = n.courses.find(c => c.id === id);
              void n.deleteCourse(id);
              showNotification({
                message: "Course Removed",
                description: course ? `"${course.name}" and its notes were deleted.` : "Course has been removed.",
                type: "info",
              });
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenMenu={() => setSidebarOpen(true)}
            onQuickNewNote={() => setMobileDraftOpen(true)}
            onOpenNote={(noteId, courseId) => {
              if (courseId) {
                n.setActiveCourseId(courseId);
              }
              n.setSelectedId(noteId);
              setView("workspace");
            }}
            onOpenAllNotes={() => {
              if (!n.activeCourseId && n.courses[0]) {
                n.setActiveCourseId(n.courses[0].id);
              }
              n.setFilter({ kind: "all" });
              n.setSelectedId(null);
              setView("workspace");
            }}
            onOpenFavorites={() => {
              if (!n.activeCourseId && n.courses[0]) {
                n.setActiveCourseId(n.courses[0].id);
              }
              n.setFilter({ kind: "favorites" });
              n.setSelectedId(null);
              setView("workspace");
            }}
            onStartFocus={() => {
              if (!n.activeCourseId && n.courses[0]) {
                n.setActiveCourseId(n.courses[0].id);
              }
              setView("workspace");
              enterFocus();
              if (!pomodoro.isRunning) {
                pomodoro.togglePlay();
              }
            }}
            todayFocusSeconds={pomodoro.todayFocusSeconds}
            dailyGoalHours={pomodoro.dailyGoalHours}
            onOpenCollectionExam={() => setCollectionExamOpen(true)}
            realtimeStatus={n.realtimeStatus}
            isSyncing={n.isSyncing}
            onRefresh={() => void n.refreshFromCloud()}
            onOpenAuth={onOpenAuth}
          />
        )}

        {/* Mobile Slide-in Drawer: Study Tools when swiped or hamburger clicked on Dashboard */}
        {isMobile && (
          <MobileSidebarDrawer
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenNewCourse={() => setNewCourseModalOpen(true)}
            onOpenPomodoro={() => setPomodoroDialogOpen(true)}
            onOpenFlashcards={() => {
              setFlashcardTargetNote(n.selected || n.visibleNotes[0] || null);
              setFlashcardsDialogOpen(true);
            }}
            onOpenCheatsheet={() => setShowCheatsheet(true)}
            onNavigateDailyGoal={navigateToDailyGoal}
            onOpenExamSimulator={() => setExamSimulatorOpen(true)}
            onOpenNotePolisher={() => setNotePolisherOpen(true)}
            onOpenAiExplain={() => setAiExplainOpen(true)}
            onOpenCollectionExam={() => setCollectionExamOpen(true)}
            pomodoroRunning={pomodoro.isRunning}
            pomodoroTimeFormatted={pomodoroTimeFormatted}
            onToggleFocus={() => {
              if (!n.activeCourseId && n.courses[0]) {
                n.setActiveCourseId(n.courses[0].id);
              }
              setView("workspace");
              enterFocus();
            }}
            focusMode={focusMode}
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
            onNavigateCourses={() => {
              setSidebarOpen(false);
              setView("dashboard");
            }}
            onNavigateNotes={() => {
              setSidebarOpen(false);
              if (!n.activeCourseId && n.courses[0]) {
                openCourse(n.courses[0].id);
              } else {
                setView("workspace");
                n.setSelectedId(null);
              }
            }}
            onNavigateEditor={() => {
              setSidebarOpen(false);
              if (n.notes[0]) {
                if (n.notes[0].collectionId) {
                  const parentCourse = n.collections.find(c => c.id === n.notes[0].collectionId)?.parentId || n.notes[0].collectionId;
                  n.setActiveCourseId(parentCourse);
                }
                n.setSelectedId(n.notes[0].id);
                setView("workspace");
              }
            }}
            onNavigateDailyGoal={navigateToDailyGoal}
            onCreateNote={() => {
              setSidebarOpen(false);
              setMobileDraftOpen(true);
            }}
            onOpenMoreSheet={() => setMobileToolsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {/* Mobile Draft / Capture Sheet */}
        <MobileQuickDraftSheet
          open={mobileDraftOpen}
          onOpenChange={setMobileDraftOpen}
          collections={n.collections}
          activeCourseId={n.activeCourseId}
          onSaveNote={(title, body, colId) => {
            const id = n.createNote(title, body, colId);
            if (colId) n.setActiveCourseId(colId);
            n.setSelectedId(id);
            setView("workspace");
            showNotification({
              message: "Note Created",
              description: `"${title || "Untitled"}" has been saved to your library.`,
              type: "success",
            });
          }}
        />

        {/* Mobile More Options Sheet */}
        <MobileMoreOptionsSheet
          open={mobileToolsOpen}
          onOpenChange={setMobileToolsOpen}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenNewCourse={() => {
            const name = prompt("Course Name:");
            if (name?.trim()) {
              void n.addCourse(name.trim());
            }
          }}
          onOpenPomodoro={() => setPomodoroDialogOpen(true)}
          onOpenFlashcards={() => {
            setFlashcardTargetNote(null);
            setFlashcardsDialogOpen(true);
          }}
          onOpenCheatsheet={() => setShowCheatsheet(true)}
          onOpenAiExplain={() => setAiExplainOpen(true)}
          pomodoroRunning={pomodoro.isRunning}
          pomodoroTimeFormatted={pomodoroTimeFormatted}
          onToggleFocus={() => {
            if (!n.activeCourseId && n.courses[0]) {
              n.setActiveCourseId(n.courses[0].id);
            }
            setView("workspace");
            enterFocus();
          }}
          focusMode={focusMode}
        />

        {/* Unobtrusive Floating Pomodoro Pill */}
        <Suspense fallback={null}>
          <PomodoroFloatingPill
            pomodoro={pomodoro}
            onOpenFullDialog={() => setPomodoroDialogOpen(true)}
          />
        </Suspense>

        {/* Study Tools Dialogs */}
        <Suspense fallback={null}>
          <PomodoroDialog
            open={pomodoroDialogOpen}
            onOpenChange={setPomodoroDialogOpen}
            pomodoro={pomodoro}
          />
        </Suspense>

        <FlashcardsDialog
          open={flashcardsDialogOpen}
          onOpenChange={(val) => {
            setFlashcardsDialogOpen(val);
            if (!val) setAutoAIGenerateCards(false);
          }}
          notes={n.notes}
          selectedNote={flashcardTargetNote}
          activeCourseName={n.activeCourse?.name}
          autoAIGenerate={autoAIGenerateCards}
          autoAIGenerateSessionType={flashcardGenerationSource}
          initialWeakTopics={flashcardWeakTopics}
        />

        <Suspense fallback={null}>
          <PomodoroSessionCompleteDialog
            open={sessionCompleteModalOpen}
            onOpenChange={setSessionCompleteModalOpen}
            activeNote={n.selected || n.visibleNotes[0] || null}
            completedSessions={pomodoro.completedSessions}
            onStartAIFlashcards={handleStartSessionAIFlashcards}
            onStartBreak={() => pomodoro.switchMode("shortBreak")}
          />
        </Suspense>

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          realtimeStatus={n.realtimeStatus}
          isSyncing={n.isSyncing}
          onRefresh={() => void n.refreshFromCloud()}
          onOpenAuth={onOpenAuth}
          noteTitle={n.selected?.title || n.notes[0]?.title}
          activeCourseName={n.activeCourse?.name || n.courses[0]?.name}
          focusMinutes={Math.floor(pomodoro.todayFocusSeconds / 60)}
          dailyGoalHours={pomodoro.dailyGoalHours}
        />

        <AiExamSimulatorDialog
          open={examSimulatorOpen}
          onOpenChange={setExamSimulatorOpen}
          notes={n.notes}
          selectedNote={n.selected || n.notes[0] || null}
          activeCourseName={n.activeCourse?.name || n.courses[0]?.name}
          onStartFlashcards={(note) => {
            setFlashcardTargetNote(note);
            setFlashcardsDialogOpen(true);
          }}
          onCreateNote={(title, body) => n.createNote(title, body, null)}
          onOpenNotePolisher={(note) => {
            n.setSelectedId(note.id);
            setNotePolisherOpen(true);
          }}
          onOpenCollectionExam={() => setCollectionExamOpen(true)}
        />

        <AiExplainDialog
          open={aiExplainOpen}
          onOpenChange={setAiExplainOpen}
          notes={n.notes}
          selectedNote={n.selected || n.visibleNotes[0] || null}
          activeCourseName={n.activeCourse?.name || n.courses[0]?.name}
          collections={n.collections}
          onOpenFlashcards={(note, weakTopics) => { setAiExplainOpen(false); n.setSelectedId(note.id); setFlashcardTargetNote(note); setFlashcardWeakTopics(weakTopics || []); setFlashcardGenerationSource("general"); setAutoAIGenerateCards(true); setFlashcardsDialogOpen(true); }}
          onOpenExam={(note) => { setAiExplainOpen(false); n.setSelectedId(note.id); setExamSimulatorOpen(true); }}
          onOpenCollectionExam={(note) => { setAiExplainOpen(false); if (note) n.setSelectedId(note.id); setCollectionExamOpen(true); }}
          onOpenPomodoro={(note) => { setAiExplainOpen(false); n.setSelectedId(note.id); setPomodoroDialogOpen(true); }}
          onOpenNotePolisher={(note) => { setAiExplainOpen(false); n.setSelectedId(note.id); setNotePolisherOpen(true); }}
        />

      <AiNotePolisherDialog
          open={notePolisherOpen}
          onOpenChange={setNotePolisherOpen}
          notes={n.notes}
          selectedNote={n.selected || n.notes[0] || null}
          onUpdateNote={n.updateNote}
          onLaunchExam={(note) => {
            n.setSelectedId(note.id);
            setExamSimulatorOpen(true);
          }}
        />

        <AiCollectionExamDialog
          open={collectionExamOpen}
          onOpenChange={setCollectionExamOpen}
          collections={n.collections}
          notes={n.notes}
          initialCollectionId={n.selected?.collectionId || null}
          activeCourseName={n.activeCourse?.name || n.courses[0]?.name}
          onCreateNote={(title, body, colId) => n.createNote(title, body, colId)}
          onOpenNotePolisher={(note) => {
            n.setSelectedId(note.id);
            setNotePolisherOpen(true);
          }}
        />
      </ThemeStage>
    );
  }

  // Workspace view
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
      onOpenPomodoro={() => setPomodoroDialogOpen(true)}
      onOpenFlashcards={() => {
        setFlashcardTargetNote(n.selected);
        setFlashcardsDialogOpen(true);
      }}
      onOpenAiLearningLab={() => setAiExplainOpen(true)}
      onNavigateDailyGoal={navigateToDailyGoal}
      onOpenCollectionExam={() => setCollectionExamOpen(true)}
      onToggleFocus={focusMode ? exitFocus : enterFocus}
      onOpenCheatsheet={() => setShowCheatsheet(true)}
      focusMode={focusMode}
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
      onCreateNote={() => {
        n.createNote();
        if (isMobile) setSidebarOpen(false);
      }}
      onAddCollection={(name, category) => n.addCollection(name, category, n.activeCourseId)}
      onDeleteCollection={n.deleteCollection}
    />
  );

  return (
    <ThemeStage className={cn("h-[100dvh] min-h-[100dvh] w-full max-w-full overflow-hidden flex flex-col", isFluidGlass && !isMobile && "p-[10px]")}>
      <NotificationBanner />

      {/* Daily Goal View */}
      {view === "daily-goal" && (
        <div className="flex-1 flex flex-col min-h-0 bg-background/50 backdrop-blur-xl animate-panel-in relative z-20">
          <div className="absolute top-4 left-4 z-30">
            <button
              onClick={() => {
                if (n.activeCourseId) setView("workspace");
                else setView("dashboard");
              }}
              className="glass-panel flex items-center justify-center p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
          <DailyGoalView
            pomodoro={pomodoro}
            onOpenPomodoro={() => setPomodoroDialogOpen(true)}
          />
        </div>
      )}

      {/* Mobile Top Header (Luminous Glass Header when browsing notes list) */}
      {isMobile && !focusMode && !n.selectedId && view === "workspace" && (
        <div className="shrink-0 z-30 px-3 pt-3 pb-1">
          <div className="glass-panel animate-panel-in rounded-3xl p-1 shadow-2xl backdrop-blur-3xl border border-white/15">
            <MobileHeader
              title={listTitle}
              subtitle={n.activeCourseId ? `${n.visibleNotes.length} notes in course` : `${n.visibleNotes.length} notes in library`}
              showBack={false}
              onOpenSidebar={() => setSidebarOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              showSearch={mobileSearchOpen}
              onToggleSearch={() => setMobileSearchOpen(!mobileSearchOpen)}
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
        <div className={cn(
          "relative mx-auto flex-1 min-h-0 w-full max-w-[1700px] flex gap-4 transition-all overflow-hidden",
          isMobile && n.selectedId
            ? "h-full p-1.5 sm:p-4 pb-0 md:pb-4"
            : isMobile
              ? "h-full p-2 sm:p-4 md:pb-4"
              : "h-screen p-2 sm:p-4 pb-4 md:pb-4"
        )}>
        {/* Mobile Slide-in Drawer: NewLumino mobile workspace only. Fluid Glass keeps the original three-panel layout. */}
          {isMobile ? (
            <MobileSidebarDrawer
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenNewCourse={() => setNewCourseModalOpen(true)}
              onOpenPomodoro={() => setPomodoroDialogOpen(true)}
              onOpenFlashcards={() => {
                setFlashcardTargetNote(n.selected || n.visibleNotes[0] || null);
                setFlashcardsDialogOpen(true);
              }}
              onOpenCheatsheet={() => setShowCheatsheet(true)}
              onNavigateDailyGoal={navigateToDailyGoal}
              pomodoroRunning={pomodoro.isRunning}
              pomodoroTimeFormatted={pomodoroTimeFormatted}
              onToggleFocus={focusMode ? exitFocus : enterFocus}
              focusMode={focusMode}
              todayFocusSeconds={pomodoro.todayFocusSeconds}
              dailyGoalHours={pomodoro.dailyGoalHours}
            />
          ) : (
            /* Desktop Sidebar Panel - Exactly as original */
            <div
              className={`shrink-0 overflow-hidden transition-all duration-500 ease-out ${
                sidebarOpen
                ? (isFluidGlass
                  ? "w-[286px] min-w-[286px] opacity-100"
                  : "w-[260px] opacity-100")
                : "w-0 opacity-0"
              }`}
            >
              {sidebarContent}
            </div>
          )}

          {/* Note List Column */}
          <div
            className={`shrink-0 overflow-hidden transition-all duration-500 ease-out ${
              listOpen
                ? (isMobile
                  ? `w-full lg:block lg:w-[340px] ${n.selectedId ? "hidden" : "block"}`
                  : isFluidGlass
                    ? "block h-full w-[318px] min-w-[318px] shrink-0"
                    : `w-full lg:block lg:w-[340px] ${n.selectedId ? "hidden" : "block"}`)
                : "hidden w-0 opacity-0"
            }`}
          >
            <NoteList
              title={listTitle}
              notes={n.visibleNotes}
              collections={n.collections}
              selectedId={n.selectedId}
              onSelect={(id) => {
                n.setSelectedId(id);
                if (isMobile) setMobileSearchOpen(false);
              }}
              onToggleFavorite={n.toggleFavorite}
              onCollapse={() => setListOpen(false)}
              onCreateNote={() => n.createNote()}
              onOpenMobileNoteMenu={handleMobileOpenNoteSheet}
            />
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
            <NoteEditor
              note={n.selected}
              collections={n.collections}
              onChange={(patch) => n.selected && n.updateNote(n.selected.id, patch)}
              onDelete={() => {
                if (n.selected) {
                  const title = n.selected.title;
                  n.deleteNote(n.selected.id);
                  n.setSelectedId(null);
                  showNotification({
                    message: "Note Deleted",
                    description: `"${title || "Untitled"}" has been removed.`,
                    type: "info",
                  });
                }
              }}
              onToggleFavorite={() => n.selected && n.toggleFavorite(n.selected.id)}
              onCreateNote={() => n.createNote()}
              onBack={() => n.setSelectedId(null)}
              focusMode={focusMode}
              onToggleFocus={() => (focusMode ? exitFocus() : enterFocus())}
              onOpenMobileSheet={handleMobileOpenNoteSheet}
              onOpenFlashcards={(note) => {
                setFlashcardTargetNote(note);
                setFlashcardsDialogOpen(true);
              }}
              externalMode={mobileEditorMode}
              onModeChange={setMobileEditorMode}
            />
          </div>
        </div>
      )}

      {/* Mobile Formatting Accessory Bar (visible when actively writing on mobile) */}
      {isMobile && n.selectedId && !focusMode && view === "workspace" && (
        <MobileAccessoryBar
          onInsertMarkdown={handleMobileInsertMarkdown}
          onInsertCodeBlock={handleMobileInsertCodeBlock}
          editorMode={mobileEditorMode}
        />
      )}

      {/* Mobile Floating Bottom Dock (Only shown when browsing courses or note list, hidden in editor for maximum room) */}
      {isMobile && !n.selectedId && !focusMode && (
        <MobileBottomDock
          currentView={view}
          selectedNoteId={n.selectedId}
          activeFilterKind={n.filter.kind}
          notesCount={n.visibleNotes.length}
          todayFocusSeconds={pomodoro.todayFocusSeconds}
          dailyGoalHours={pomodoro.dailyGoalHours}
          onNavigateCourses={() => {
            setSidebarOpen(false);
            backToCourses();
          }}
          onNavigateNotes={() => {
            setSidebarOpen(false);
            setView("workspace");
            n.setSelectedId(null);
          }}
          onNavigateEditor={() => {
            setSidebarOpen(false);
            if (!n.selectedId && n.visibleNotes[0]) {
              n.setSelectedId(n.visibleNotes[0].id);
            }
          }}
          onNavigateDailyGoal={navigateToDailyGoal}
          onCreateNote={() => {
            setSidebarOpen(false);
            n.createNote();
          }}
          onOpenMoreSheet={() => setMobileToolsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* Desktop Toggle Sidebar / List buttons (Untouched) */}
      {!sidebarOpen && !focusMode && !isMobile ? (
        <button
          type="button"
          aria-label="Show sidebar"
          onClick={() => setSidebarOpen(true)}
          className="glass-panel animate-panel-in fixed left-5 top-5 z-30 rounded-2xl border border-white/10 p-2.5 text-muted-foreground transition-all hover:text-foreground hover:scale-105 active:scale-95"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}

      {!listOpen && !focusMode && !isMobile ? (
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
        onDuplicate={(id) => {
          const newId = n.duplicateNote(id);
          if (newId) {
            showNotification({
              message: "Note Duplicated",
              description: "A copy has been added to your library.",
              type: "success",
            });
          }
        }}
        onMoveCollection={(id, colId) => n.updateNote(id, { collectionId: colId })}
        onDelete={n.deleteNote}
        onOpenFlashcards={(note) => {
          setFlashcardTargetNote(note);
          setFlashcardsDialogOpen(true);
        }}
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
        onAddCollection={(name, cat) => n.addCollection(name, cat, n.activeCourseId)}
        onDeleteCollection={n.deleteCollection}
        onBackToCourses={backToCourses}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNewCourse={() => setNewCourseModalOpen(true)}
        onOpenPomodoro={() => setPomodoroDialogOpen(true)}
        onOpenFlashcards={() => {
          setFlashcardTargetNote(n.selected || n.visibleNotes[0] || null);
          setFlashcardsDialogOpen(true);
        }}
        onOpenCheatsheet={() => setShowCheatsheet(true)}
        onNavigateDailyGoal={navigateToDailyGoal}
        onOpenExamSimulator={() => setExamSimulatorOpen(true)}
        onOpenNotePolisher={() => setNotePolisherOpen(true)}
        onOpenAiExplain={() => setAiExplainOpen(true)}
        onOpenCollectionExam={() => setCollectionExamOpen(true)}
        pomodoroRunning={pomodoro.isRunning}
        pomodoroTimeFormatted={pomodoroTimeFormatted}
        todayFocusSeconds={pomodoro.todayFocusSeconds}
        dailyGoalHours={pomodoro.dailyGoalHours}
        onToggleFocus={enterFocus}
        focusMode={focusMode}
      />

      {/* Mobile Quick Draft Capture Sheet */}
      <MobileQuickDraftSheet
        open={mobileDraftOpen}
        onOpenChange={setMobileDraftOpen}
        collections={n.collections}
        activeCourseId={n.activeCourseId}
        onSaveNote={(title, body, colId) => {
          const id = n.createNote(title, body, colId);
          n.setSelectedId(id);
          setView("workspace");
        }}
      />

      {/* Unobtrusive Floating Pomodoro Pill */}
      <Suspense fallback={null}>
        <PomodoroFloatingPill
          pomodoro={pomodoro}
          onOpenFullDialog={() => setPomodoroDialogOpen(true)}
        />
      </Suspense>

      {/* Study Tools Dialogs */}
      <Suspense fallback={null}>
        <PomodoroDialog
          open={pomodoroDialogOpen}
          onOpenChange={setPomodoroDialogOpen}
          pomodoro={pomodoro}
          courses={n.courses}
          activeCourse={n.activeCourse}
          notes={n.notes}
          selectedNote={n.selected}
          onOpenFlashcards={(note) => {
            setFlashcardTargetNote(note);
            setFlashcardsDialogOpen(true);
          }}
        />
      </Suspense>

      <FlashcardsDialog
        open={flashcardsDialogOpen}
        onOpenChange={(val) => {
          setFlashcardsDialogOpen(val);
          if (!val) setAutoAIGenerateCards(false);
        }}
        notes={n.visibleNotes.length > 0 ? n.visibleNotes : n.notes}
        selectedNote={flashcardTargetNote || n.selected}
        activeCourseName={n.activeCourse?.name}
        autoAIGenerate={autoAIGenerateCards}
        autoAIGenerateSessionType={flashcardGenerationSource}
        initialWeakTopics={flashcardWeakTopics}
      />

      <Suspense fallback={null}>
        <PomodoroSessionCompleteDialog
          open={sessionCompleteModalOpen}
          onOpenChange={setSessionCompleteModalOpen}
          activeNote={n.selected || n.visibleNotes[0] || null}
          completedSessions={pomodoro.completedSessions}
          onStartAIFlashcards={handleStartSessionAIFlashcards}
          onStartBreak={() => pomodoro.switchMode("shortBreak")}
        />
      </Suspense>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        realtimeStatus={n.realtimeStatus}
        isSyncing={n.isSyncing}
        onRefresh={() => void n.refreshFromCloud()}
        onOpenAuth={onOpenAuth}
        noteTitle={n.selected?.title || n.visibleNotes[0]?.title}
        activeCourseName={n.activeCourse?.name || n.courses[0]?.name}
        focusMinutes={Math.floor(pomodoro.todayFocusSeconds / 60)}
        dailyGoalHours={pomodoro.dailyGoalHours}
      />

      <MarkdownCheatsheet open={showCheatsheet} onOpenChange={setShowCheatsheet} />

      <AiExamSimulatorDialog
        open={examSimulatorOpen}
        onOpenChange={setExamSimulatorOpen}
        notes={n.notes}
        selectedNote={n.selected || n.visibleNotes[0] || null}
        activeCourseName={n.activeCourse?.name || n.courses[0]?.name}
        onStartFlashcards={(note) => {
          setFlashcardTargetNote(note);
          setFlashcardsDialogOpen(true);
        }}
        onCreateNote={(title, body) => n.createNote(title, body, null)}
        onOpenNotePolisher={(note) => {
          n.setSelectedId(note.id);
          setNotePolisherOpen(true);
        }}
        onOpenCollectionExam={() => setCollectionExamOpen(true)}
      />

      <AiExplainDialog
        open={aiExplainOpen}
        onOpenChange={setAiExplainOpen}
        notes={n.notes}
        selectedNote={n.selected || n.visibleNotes[0] || null}
        activeCourseName={n.activeCourse?.name || n.courses[0]?.name}
        collections={n.collections}
        onOpenFlashcards={(note, weakTopics) => {
          setAiExplainOpen(false);
          n.setSelectedId(note.id);
          setFlashcardTargetNote(note);
          setFlashcardWeakTopics(weakTopics || []);
          setFlashcardGenerationSource("general");
          setAutoAIGenerateCards(true);
          setFlashcardsDialogOpen(true);
        }}
        onOpenExam={(note) => { setAiExplainOpen(false); n.setSelectedId(note.id); setExamSimulatorOpen(true); }}
        onOpenCollectionExam={(note) => { setAiExplainOpen(false); if (note) n.setSelectedId(note.id); setCollectionExamOpen(true); }}
        onOpenPomodoro={(note) => { setAiExplainOpen(false); n.setSelectedId(note.id); setPomodoroDialogOpen(true); }}
        onOpenNotePolisher={(note) => {
          setAiExplainOpen(false);
          n.setSelectedId(note.id);
          setNotePolisherOpen(true);
        }}
      />

      <AiNotePolisherDialog
        open={notePolisherOpen}
        onOpenChange={setNotePolisherOpen}
        notes={n.notes}
        selectedNote={n.selected || n.visibleNotes[0] || null}
        onUpdateNote={n.updateNote}
        onLaunchExam={(note) => {
          n.setSelectedId(note.id);
          setExamSimulatorOpen(true);
        }}
      />

      <AiCollectionExamDialog
        open={collectionExamOpen}
        onOpenChange={setCollectionExamOpen}
        collections={n.collections}
        notes={n.notes}
        initialCollectionId={n.selected?.collectionId || null}
        activeCourseName={n.activeCourse?.name || n.courses[0]?.name}
        onCreateNote={(title, body, colId) => n.createNote(title, body, colId)}
        onOpenNotePolisher={(note) => {
          n.setSelectedId(note.id);
          setNotePolisherOpen(true);
        }}
      />
    </ThemeStage>
  );
}
