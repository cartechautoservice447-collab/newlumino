import {
  type SetStateAction,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Collection,
  type Course,
  type CourseAccent,
  type Note,
  type NotesState,
  loadState,
  saveState,
  uid,
} from "@/lib/notes";
import {
  deleteRemoteCollection,
  deleteRemoteCourse,
  deleteRemoteNote,
  fetchFullRemoteState,
  fetchRemoteCourses,
  saveRemoteCollection,
  saveRemoteCourse,
  saveRemoteNote,
  subscribeToRealtimeSharedBackend,
  toCollection,
  toCourse,
  toNote,
} from "@/lib/notesApi";

export type Filter =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "collection"; id: string };

const EMPTY_COLLECTIONS: Collection[] = [];

// Notes are immutable objects (edits create new objects), so the lowercase
// search text can be cached per note and only recomputed for changed notes.
const searchCache = new WeakMap<Note, { title: string; body: string }>();
function searchableText(note: Note) {
  let entry = searchCache.get(note);
  if (!entry) {
    entry = { title: note.title.toLowerCase(), body: note.body.toLowerCase() };
    searchCache.set(note, entry);
  }
  return entry;
}

// True when applying `patch` on top of `current` would change nothing.
function covers<T extends object>(current: T, patch: Partial<T>) {
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (current[key] !== patch[key]) return false;
  }
  return true;
}

function sameFilter(a: Filter, b: Filter) {
  if (a.kind !== b.kind) return false;
  return a.kind !== "collection" || (b.kind === "collection" && a.id === b.id);
}

export function useNotes(userId?: string | null) {
  // Parse localStorage exactly once (previously parsed twice on mount).
  const initialRef = useRef<NotesState | null>(null);
  if (initialRef.current === null) initialRef.current = loadState();
  const initial = initialRef.current;

  const [state, setState] = useState<NotesState>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(() => initial.notes[0]?.id ?? null);
  const [filter, setFilterState] = useState<Filter>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "connecting" | "offline">("offline");

  // Latest-value refs: let callbacks stay referentially stable without stale closures.
  const stateRef = useRef(state);
  stateRef.current = state;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const activeCourseIdRef = useRef(activeCourseId);
  activeCourseIdRef.current = activeCourseId;

  const aliveRef = useRef(true);
  const savedStateRef = useRef<NotesState>(initial);
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteNoteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const syncCountRef = useRef(0);
  const inflightRefreshRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  // Filter setter that ignores no-op updates, so setFilter({ kind: "all" })
  // does not invalidate every derived value and re-render consumers.
  const setFilter = useCallback((next: SetStateAction<Filter>) => {
    setFilterState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      return sameFilter(current, value) ? current : value;
    });
  }, []);

  // ---- Local persistence (debounced) ----
  const flushLocal = useCallback(() => {
    if (localSaveTimerRef.current) {
      clearTimeout(localSaveTimerRef.current);
      localSaveTimerRef.current = null;
    }
    if (stateRef.current !== savedStateRef.current) {
      saveState(stateRef.current);
      savedStateRef.current = stateRef.current;
    }
  }, []);

  useEffect(() => {
    if (state === savedStateRef.current) return;
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(flushLocal, 250);
  }, [state, flushLocal]);

  // Flush when the page is backgrounded/unloaded.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushLocal();
    };
    window.addEventListener("pagehide", flushLocal);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", flushLocal);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [flushLocal]);

  // Unmount: persist anything pending locally, cancel every timer.
  useEffect(() => {
    aliveRef.current = true;
    const remoteTimers = remoteNoteTimersRef.current;
    return () => {
      aliveRef.current = false;
      flushLocal();
      for (const timer of remoteTimers.values()) clearTimeout(timer);
      remoteTimers.clear();
    };
  }, [flushLocal]);

  // ---- Sync counter (overlapping operations no longer clear the flag early) ----
  const beginSync = useCallback(() => {
    syncCountRef.current += 1;
    setIsSyncing(true);
  }, []);

  const endSync = useCallback(() => {
    syncCountRef.current = Math.max(0, syncCountRef.current - 1);
    if (aliveRef.current && syncCountRef.current === 0) setIsSyncing(false);
  }, []);

  // ---- Debounced remote note saves ----
  const scheduleRemoteNoteSave = useCallback((noteId: string) => {
    const currentUser = userIdRef.current;
    if (!currentUser) return;
    const timers = remoteNoteTimersRef.current;
    const existing = timers.get(noteId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      timers.delete(noteId);
      const latest = stateRef.current.notes.find((note) => note.id === noteId);
      if (latest) void saveRemoteNote(latest, currentUser);
    }, 650);

    timers.set(noteId, timer);
  }, []);

  const cancelRemoteNoteSave = useCallback((noteId: string) => {
    const timer = remoteNoteTimersRef.current.get(noteId);
    if (timer) {
      clearTimeout(timer);
      remoteNoteTimersRef.current.delete(noteId);
    }
  }, []);

  // ---- Cloud refresh (de-duplicated, race-safe) ----
  const refreshFromCloud = useCallback(async () => {
    if (!userId) {
      setRealtimeStatus("offline");
      return;
    }

    // Share one in-flight request instead of firing duplicates.
    const inflight = inflightRefreshRef.current;
    if (inflight && inflight.userId === userId) return inflight.promise;

    const entry = { userId, promise: Promise.resolve() as Promise<void> };
    inflightRefreshRef.current = entry;

    entry.promise = (async () => {
      beginSync();
      setRealtimeStatus("connecting");
      try {
        const remote = await fetchFullRemoteState(userId);
        // Ignore the result if the component unmounted or the user changed meanwhile.
        if (!aliveRef.current || userIdRef.current !== userId) return;
        setState(remote);
        setRealtimeStatus("connected");
      } catch (err) {
        console.warn("[useNotes] Cloud refresh error:", err);
        if (aliveRef.current) setRealtimeStatus("offline");
      } finally {
        if (inflightRefreshRef.current === entry) inflightRefreshRef.current = null;
        endSync();
      }
    })();

    return entry.promise;
  }, [userId, beginSync, endSync]);

  useEffect(() => {
    if (userId) void refreshFromCloud();
  }, [userId, refreshFromCloud]);

  // ---- Realtime subscription (one per user; late events ignored after cleanup) ----
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const unsubscribe = subscribeToRealtimeSharedBackend(userId, {
      onCoursesChange: (payload) => {
        if (cancelled) return;
        if (payload.eventType === "INSERT" && payload.new) {
          const freshCourse = toCourse(payload.new as any);
          setState((prev) => {
            if (prev.courses.some((c) => c.id === freshCourse.id)) return prev;
            return { ...prev, courses: [freshCourse, ...prev.courses] };
          });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const updated = toCourse(payload.new as any);
          setState((prev) => {
            const index = prev.courses.findIndex((c) => c.id === updated.id);
            if (index < 0 || covers(prev.courses[index], updated)) return prev;
            const courses = prev.courses.slice();
            courses[index] = { ...courses[index], ...updated };
            return { ...prev, courses };
          });
        } else if (payload.eventType === "DELETE" && payload.old) {
          const deletedId = (payload.old as any).id;
          setState((prev) => ({
            ...prev,
            courses: prev.courses.filter((c) => c.id !== deletedId),
            notes: prev.notes.filter((n) => n.courseId !== deletedId),
            collections: prev.collections.filter((col) => col.courseId !== deletedId),
          }));
        } else {
          void fetchRemoteCourses(userId).then((courses) => {
            if (cancelled) return;
            if (courses.length > 0) setState((prev) => ({ ...prev, courses }));
          });
        }
      },
      onNotesChange: (payload) => {
        if (cancelled) return;
        if (payload.eventType === "INSERT" && payload.new) {
          const freshNote = toNote(payload.new as any);
          setState((prev) => {
            if (prev.notes.some((n) => n.id === freshNote.id)) return prev;
            return { ...prev, notes: [freshNote, ...prev.notes] };
          });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const updated = toNote(payload.new as any);
          // A local edit is still waiting to be saved: the incoming row is an
          // older echo of our own write and would overwrite what was just typed.
          if (remoteNoteTimersRef.current.has(updated.id)) return;
          setState((prev) => {
            const index = prev.notes.findIndex((n) => n.id === updated.id);
            if (index < 0 || covers(prev.notes[index], updated)) return prev;
            const notes = prev.notes.slice();
            notes[index] = { ...notes[index], ...updated };
            return { ...prev, notes };
          });
        } else if (payload.eventType === "DELETE" && payload.old) {
          const deletedId = (payload.old as any).id;
          setState((prev) => ({
            ...prev,
            notes: prev.notes.filter((n) => n.id !== deletedId),
          }));
        }
      },
      onCollectionsChange: (payload) => {
        if (cancelled) return;
        if (payload.eventType === "INSERT" && payload.new) {
          const freshCollection = toCollection(payload.new as any);
          setState((prev) => {
            if (prev.collections.some((c) => c.id === freshCollection.id)) return prev;
            return { ...prev, collections: [...prev.collections, freshCollection] };
          });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const updated = toCollection(payload.new as any);
          setState((prev) => {
            const index = prev.collections.findIndex((c) => c.id === updated.id);
            if (index < 0 || covers(prev.collections[index], updated)) return prev;
            const collections = prev.collections.slice();
            collections[index] = { ...collections[index], ...updated };
            return { ...prev, collections };
          });
        } else if (payload.eventType === "DELETE" && payload.old) {
          const deletedId = (payload.old as any).id;
          setState((prev) => ({
            ...prev,
            collections: prev.collections.filter((c) => c.id !== deletedId),
            notes: prev.notes.map((note) =>
              note.collectionId === deletedId ? { ...note, collectionId: null } : note,
            ),
          }));
          setFilter((current) =>
            current.kind === "collection" && current.id === deletedId ? { kind: "all" } : current,
          );
        }
      },
      onStatusChange: (status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("offline");
        }
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, setFilter]);

  // ---- Derived data ----
  const courses = state.courses;

  const activeCourse = useMemo(
    () => state.courses.find((c) => c.id === activeCourseId) ?? null,
    [state.courses, activeCourseId],
  );

  // Sub-collections (folders/modules) belonging to the active course
  const courseChildren = useMemo(
    () =>
      activeCourseId
        ? state.collections.filter((c) => c.courseId === activeCourseId || c.parentId === activeCourseId)
        : EMPTY_COLLECTIONS,
    [state.collections, activeCourseId],
  );

  // Notes scoped to the active course (reuses courseChildren instead of re-filtering collections)
  const scopedNotes = useMemo(() => {
    if (!activeCourseId) return state.notes;
    const childColIds = new Set(courseChildren.map((c) => c.id));
    return state.notes.filter(
      (n) => n.courseId === activeCourseId || (n.collectionId && childColIds.has(n.collectionId)),
    );
  }, [state.notes, courseChildren, activeCourseId]);

  // Keep search input responsive when the library is large.
  const deferredQuery = useDeferredValue(query);

  const visibleNotes = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const out: Note[] = [];
    for (const n of scopedNotes) {
      if (filter.kind === "favorites" && !n.favorite) continue;
      if (filter.kind === "collection" && n.collectionId !== filter.id) continue;
      if (q) {
        const text = searchableText(n);
        if (!text.title.includes(q) && !text.body.includes(q)) continue;
      }
      out.push(n);
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [scopedNotes, filter, deferredQuery]);

  const selected = useMemo(
    () => state.notes.find((n) => n.id === selectedId) ?? null,
    [state.notes, selectedId],
  );

  // Counts keep the same object identity when the numbers are unchanged, so
  // typing in a note does not re-render the sidebar/chips that consume them.
  const countsRef = useRef<{ all: number; favorites: number; byCollection: Record<string, number> } | null>(null);
  const counts = useMemo(() => {
    const byCollection: Record<string, number> = {};
    let favorites = 0;
    for (const n of scopedNotes) {
      if (n.favorite) favorites += 1;
      if (n.collectionId) byCollection[n.collectionId] = (byCollection[n.collectionId] ?? 0) + 1;
    }
    const next = { all: scopedNotes.length, favorites, byCollection };
    const prev = countsRef.current;
    if (prev && prev.all === next.all && prev.favorites === next.favorites) {
      const prevKeys = Object.keys(prev.byCollection);
      const nextKeys = Object.keys(byCollection);
      if (prevKeys.length === nextKeys.length && nextKeys.every((k) => prev.byCollection[k] === byCollection[k])) {
        return prev;
      }
    }
    countsRef.current = next;
    return next;
  }, [scopedNotes]);

  // ---- Mutations (all referentially stable) ----
  const addCourse = useCallback(
    async (name: string, description = "", color: CourseAccent = "sky", category = "") => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      const now = Date.now();
      const course: Course = {
        id: uid(),
        name: trimmedName,
        description: description.trim(),
        color,
        category: category.trim() || description.slice(0, 30) || "General",
        createdAt: now,
        updatedAt: now,
      };

      setState((prev) => ({ ...prev, courses: [course, ...prev.courses] }));

      const currentUser = userIdRef.current;
      if (currentUser) {
        beginSync();
        try {
          const res = await saveRemoteCourse(course, currentUser);
          if (!res.success) console.error("[useNotes] saveRemoteCourse failed:", res.error);
        } finally {
          endSync();
        }
      }

      return course.id;
    },
    [beginSync, endSync],
  );

  const updateCourse = useCallback(
    async (id: string, patch: Partial<Omit<Course, "id" | "createdAt">>) => {
      const updatedAt = Date.now();
      const target = stateRef.current.courses.find((c) => c.id === id);

      setState((prev) => ({
        ...prev,
        courses: prev.courses.map((c) => (c.id === id ? { ...c, ...patch, updatedAt } : c)),
      }));

      const currentUser = userIdRef.current;
      if (currentUser && target) {
        await saveRemoteCourse({ ...target, ...patch, updatedAt }, currentUser);
      }
    },
    [],
  );

  const deleteCourse = useCallback(
    async (courseId: string) => {
      setState((prev) => ({
        ...prev,
        courses: prev.courses.filter((c) => c.id !== courseId),
        notes: prev.notes.filter((n) => n.courseId !== courseId),
        collections: prev.collections.filter(
          (c) => c.courseId !== courseId && c.parentId !== courseId,
        ),
      }));

      if (activeCourseIdRef.current === courseId) {
        setActiveCourseId(null);
        setSelectedId(null);
        setFilter({ kind: "all" });
      }

      const currentUser = userIdRef.current;
      if (currentUser) {
        beginSync();
        try {
          await deleteRemoteCourse(courseId, currentUser);
        } finally {
          endSync();
        }
      }
    },
    [beginSync, endSync, setFilter],
  );

  const createNote = useCallback(
    (initialTitle?: string, initialBody?: string, targetCollectionId?: string | null) => {
      const currentFilter = filterRef.current;
      const courseId = activeCourseIdRef.current;
      const colId =
        targetCollectionId !== undefined
          ? targetCollectionId
          : currentFilter.kind === "collection"
            ? currentFilter.id
            : null;

      const now = Date.now();
      const note: Note = {
        id: uid(),
        title: initialTitle || "Untitled note",
        body: initialBody || "",
        favorite: false,
        courseId,
        collectionId: colId,
        revision: 0,
        sourceId: null,
        createdAt: now,
        updatedAt: now,
      };

      setState((s) => ({ ...s, notes: [note, ...s.notes] }));
      setSelectedId(note.id);
      setQuery("");

      if (userIdRef.current && courseId) scheduleRemoteNoteSave(note.id);

      return note.id;
    },
    [scheduleRemoteNoteSave],
  );

  const duplicateNote = useCallback(
    (id: string) => {
      const target = stateRef.current.notes.find((n) => n.id === id);
      if (!target) return null;
      const now = Date.now();
      const duplicated: Note = {
        ...target,
        id: uid(),
        title: `${target.title || "Untitled note"} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => ({ ...s, notes: [duplicated, ...s.notes] }));
      setSelectedId(duplicated.id);

      if (userIdRef.current && duplicated.courseId) scheduleRemoteNoteSave(duplicated.id);

      return duplicated.id;
    },
    [scheduleRemoteNoteSave],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      const updatedAt = Date.now();
      setState((s) => {
        if (!s.notes.some((note) => note.id === id)) return s;
        return {
          ...s,
          notes: s.notes.map((note) => (note.id === id ? { ...note, ...patch, updatedAt } : note)),
        };
      });
      scheduleRemoteNoteSave(id);
    },
    [scheduleRemoteNoteSave],
  );

  const deleteNote = useCallback(
    (id: string) => {
      cancelRemoteNoteSave(id);
      setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
      setSelectedId((cur) => (cur === id ? null : cur));

      const currentUser = userIdRef.current;
      if (currentUser) void deleteRemoteNote(id, currentUser);
    },
    [cancelRemoteNoteSave],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setState((s) => {
        if (!s.notes.some((n) => n.id === id)) return s;
        return {
          ...s,
          notes: s.notes.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)),
        };
      });
      scheduleRemoteNoteSave(id);
    },
    [scheduleRemoteNoteSave],
  );

  const addCollection = useCallback((name: string, category?: string, parentId?: string | null) => {
    const courseId = activeCourseIdRef.current;
    const col: Collection = {
      id: uid(),
      courseId: courseId || undefined,
      name: name.trim() || "Untitled Folder",
      category: category?.trim() || undefined,
      parentId: parentId ?? courseId ?? null,
    };

    setState((s) => ({ ...s, collections: [...s.collections, col] }));

    const currentUser = userIdRef.current;
    if (currentUser && col.courseId) void saveRemoteCollection(col, currentUser);

    return col.id;
  }, []);

  const renameCollection = useCallback((id: string, name: string) => {
    const current = stateRef.current.collections.find((collection) => collection.id === id);
    const updated = current ? { ...current, name } : null;

    setState((s) => ({
      ...s,
      collections: s.collections.map((collection) =>
        collection.id === id ? { ...collection, name } : collection,
      ),
    }));

    const currentUser = userIdRef.current;
    if (currentUser && updated) void saveRemoteCollection(updated, currentUser);
  }, []);

  const deleteCollection = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        collections: s.collections.filter((c) => c.id !== id),
        notes: s.notes.map((n) => (n.collectionId === id ? { ...n, collectionId: null } : n)),
      }));
      setFilter((f) => (f.kind === "collection" && f.id === id ? { kind: "all" } : f));

      const currentUser = userIdRef.current;
      if (currentUser) void deleteRemoteCollection(id, currentUser);
    },
    [setFilter],
  );

  // The returned object keeps its identity until something it exposes changes.
  return useMemo(
    () => ({
      hydrated: true,
      notes: state.notes,
      collections: state.collections,
      courses,
      activeCourseId,
      setActiveCourseId,
      activeCourse,
      courseChildren,
      scopedNotes,
      visibleNotes,
      selected,
      selectedId,
      setSelectedId,
      filter,
      setFilter,
      query,
      setQuery,
      counts,
      isSyncing,
      realtimeStatus,
      refreshFromCloud,
      addCourse,
      updateCourse,
      deleteCourse,
      createNote,
      duplicateNote,
      updateNote,
      deleteNote,
      toggleFavorite,
      addCollection,
      renameCollection,
      deleteCollection,
    }),
    [
      state.notes,
      state.collections,
      courses,
      activeCourseId,
      activeCourse,
      courseChildren,
      scopedNotes,
      visibleNotes,
      selected,
      selectedId,
      filter,
      setFilter,
      query,
      counts,
      isSyncing,
      realtimeStatus,
      refreshFromCloud,
      addCourse,
      updateCourse,
      deleteCourse,
      createNote,
      duplicateNote,
      updateNote,
      deleteNote,
      toggleFavorite,
      addCollection,
      renameCollection,
      deleteCollection,
    ],
  );
}
