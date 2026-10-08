import { useCallback, useEffect, useMemo, useState } from "react";
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
  toCourse,
  toNote,
} from "@/lib/notesApi";

export type Filter =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "collection"; id: string };

export function useNotes(userId?: string | null) {
  const [state, setState] = useState<NotesState>(() => loadState(userId));
  const [hydrated, setHydrated] = useState(false);
  const [hydratedUserId, setHydratedUserId] = useState<string | null | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "connecting" | "offline">("offline");

  // Initial load: local storage first
  useEffect(() => {
    const loaded = loadState(userId);
    setState(loaded);
    setSelectedId(loaded.notes[0]?.id ?? null);
    setHydratedUserId(userId ?? null);
    setHydrated(true);
  }, [userId]);

  // Save to the current user's local cache only after that scope has loaded.
  useEffect(() => {
    if (hydrated && hydratedUserId === (userId ?? null)) {
      saveState(state, userId);
    }
  }, [state, hydrated, hydratedUserId, userId]);

  // Synchronize with remote Supabase backend whenever userId is present
  const refreshFromCloud = useCallback(async () => {
    if (!userId) {
      setRealtimeStatus("offline");
      return;
    }
    setIsSyncing(true);
    setRealtimeStatus("connecting");
    try {
      const remote = await fetchFullRemoteState(userId);
      setState(remote);
      setRealtimeStatus("connected");
    } catch (err) {
      console.warn("[useNotes] Cloud refresh error:", err);
      setRealtimeStatus("offline");
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void refreshFromCloud();
    }
  }, [userId, refreshFromCloud]);

  // Set up Real-Time PostgreSQL changes subscription
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToRealtimeSharedBackend(userId, {
      onCoursesChange: (payload) => {
        console.log("[useNotes Realtime] courses update:", payload.eventType);
        if (payload.eventType === "INSERT" && payload.new) {
          if (payload.new?.user_id && payload.new.user_id !== userId) return;
          const freshCourse = toCourse(payload.new as any);
          setState((prev) => {
            if (prev.courses.some((c) => c.id === freshCourse.id)) {
              return prev;
            }
            return {
              ...prev,
              courses: [freshCourse, ...prev.courses],
            };
          });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          if (payload.new?.user_id && payload.new.user_id !== userId) return;
          const updated = toCourse(payload.new as any);
          setState((prev) => ({
            ...prev,
            courses: prev.courses.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
          }));
        } else if (payload.eventType === "DELETE" && payload.old) {
          if (payload.old?.user_id && payload.old.user_id !== userId) return;
          const deletedId = (payload.old as any).id;
          setState((prev) => ({
            ...prev,
            courses: prev.courses.filter((c) => c.id !== deletedId),
            notes: prev.notes.filter((n) => n.courseId !== deletedId),
            collections: prev.collections.filter((col) => col.courseId !== deletedId),
          }));
        } else {
          // General refetch
          void fetchRemoteCourses(userId).then((courses) => {
            if (courses.length > 0) {
              setState((prev) => ({ ...prev, courses }));
            }
          });
        }
      },
      onNotesChange: (payload) => {
        console.log("[useNotes Realtime] notes update:", payload.eventType);
        if (payload.eventType === "INSERT" && payload.new) {
          if (payload.new?.user_id && payload.new.user_id !== userId) return;
          const freshNote = toNote(payload.new as any);
          setState((prev) => {
            if (prev.notes.some((n) => n.id === freshNote.id)) return prev;
            return { ...prev, notes: [freshNote, ...prev.notes] };
          });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          if (payload.new?.user_id && payload.new.user_id !== userId) return;
          const updated = toNote(payload.new as any);
          setState((prev) => ({
            ...prev,
            notes: prev.notes.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
          }));
        } else if (payload.eventType === "DELETE" && payload.old) {
          if (payload.old?.user_id && payload.old.user_id !== userId) return;
          const deletedId = (payload.old as any).id;
          setState((prev) => ({
            ...prev,
            notes: prev.notes.filter((n) => n.id !== deletedId),
          }));
        }
      },
      onCollectionsChange: () => {
        if (userId) {
          void refreshFromCloud();
        }
      },
      onStatusChange: (status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("offline");
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [userId, refreshFromCloud]);

  const courses = state.courses;

  const activeCourse = useMemo(
    () => state.courses.find((c) => c.id === activeCourseId) ?? null,
    [state.courses, activeCourseId],
  );

  // Sub-collections (folders/modules) belonging to the active course
  const courseChildren = useMemo(
    () => (activeCourseId ? state.collections.filter((c) => c.courseId === activeCourseId || c.parentId === activeCourseId) : []),
    [state.collections, activeCourseId],
  );

  // Notes scoped to the active course (matching direct courseId or child collection IDs)
  const scopedNotes = useMemo(() => {
    if (!activeCourseId) return state.notes;
    const childColIds = new Set(
      state.collections
        .filter((c) => c.courseId === activeCourseId || c.parentId === activeCourseId)
        .map((c) => c.id)
    );
    return state.notes.filter(
      (n) => n.courseId === activeCourseId || (n.collectionId && childColIds.has(n.collectionId))
    );
  }, [state.notes, state.collections, activeCourseId]);

  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedNotes
      .filter((n) => {
        if (filter.kind === "favorites" && !n.favorite) return false;
        if (filter.kind === "collection" && n.collectionId !== filter.id) return false;
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [scopedNotes, filter, query]);

  const selected = useMemo(
    () => state.notes.find((n) => n.id === selectedId) ?? null,
    [state.notes, selectedId],
  );

  /**
   * Adds a new course folder in both local state and the shared Supabase backend.
   * Realtime broadcast will notify other clients (fluid-glass-studio) instantly!
   */
  const addCourse = useCallback(
    async (name: string, description = "", color: CourseAccent = "sky", category = "") => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      const course: Course = {
        id: uid(),
        name: trimmedName,
        description: description.trim(),
        color,
        category: category.trim() || description.slice(0, 30) || "General",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Optimistic update
      setState((prev) => ({
        ...prev,
        courses: [course, ...prev.courses],
      }));

      // Remote Supabase persist
      if (userId) {
        setIsSyncing(true);
        try {
          const res = await saveRemoteCourse(course, userId);
          if (!res.success) {
            console.error("[useNotes] saveRemoteCourse failed:", res.error);
          }
        } finally {
          setIsSyncing(false);
        }
      }

      return course.id;
    },
    [userId],
  );

  /**
   * Updates an existing course.
   */
  const updateCourse = useCallback(
    async (id: string, patch: Partial<Omit<Course, "id" | "createdAt">>) => {
      setState((prev) => ({
        ...prev,
        courses: prev.courses.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
        ),
      }));

      if (userId) {
        const target = state.courses.find((c) => c.id === id);
        if (target) {
          await saveRemoteCourse({ ...target, ...patch, updatedAt: Date.now() }, userId);
        }
      }
    },
    [state.courses, userId],
  );

  /**
   * Deletes a course from local state and the shared Supabase backend.
   */
  const deleteCourse = useCallback(
    async (courseId: string) => {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        courses: prev.courses.filter((c) => c.id !== courseId),
        notes: prev.notes.filter((n) => n.courseId !== courseId),
        collections: prev.collections.filter(
          (c) => c.courseId !== courseId && c.parentId !== courseId,
        ),
      }));

      if (activeCourseId === courseId) {
        setActiveCourseId(null);
        setSelectedId(null);
        setFilter({ kind: "all" });
      }

      if (userId) {
        setIsSyncing(true);
        try {
          await deleteRemoteCourse(courseId, userId);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [activeCourseId, userId],
  );

  /**
   * Creates a note in the active course.
   */
  const createNote = useCallback(
    (initialTitle?: string, initialBody?: string, targetCollectionId?: string | null) => {
      const colId =
        targetCollectionId !== undefined
          ? targetCollectionId
          : filter.kind === "collection"
            ? filter.id
            : null;

      const note: Note = {
        id: uid(),
        title: initialTitle || "Untitled note",
        body: initialBody || "",
        favorite: false,
        courseId: activeCourseId,
        collectionId: colId,
        revision: 0,
        sourceId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setState((s) => ({ ...s, notes: [note, ...s.notes] }));
      setSelectedId(note.id);
      setQuery("");

      if (userId && activeCourseId) {
        void saveRemoteNote(note, userId);
      }

      return note.id;
    },
    [filter, activeCourseId, userId],
  );

  const duplicateNote = useCallback(
    (id: string) => {
      const target = state.notes.find((n) => n.id === id);
      if (!target) return null;
      const duplicated: Note = {
        ...target,
        id: uid(),
        title: `${target.title || "Untitled note"} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setState((s) => ({ ...s, notes: [duplicated, ...s.notes] }));
      setSelectedId(duplicated.id);

      if (userId && duplicated.courseId) {
        void saveRemoteNote(duplicated, userId);
      }

      return duplicated.id;
    },
    [state.notes, userId],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      setState((s) => {
        let updatedNote: Note | null = null;
        const newNotes = s.notes.map((n) => {
          if (n.id === id) {
            updatedNote = { ...n, ...patch, updatedAt: Date.now() };
            return updatedNote;
          }
          return n;
        });

        if (userId && updatedNote) {
          void saveRemoteNote(updatedNote, userId);
        }

        return { ...s, notes: newNotes };
      });
    },
    [userId],
  );

  const deleteNote = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
      setSelectedId((cur) => (cur === id ? null : cur));

      if (userId) {
        void deleteRemoteNote(id, userId);
      }
    },
    [userId],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setState((s) => {
        let updatedNote: Note | null = null;
        const newNotes = s.notes.map((n) => {
          if (n.id === id) {
            updatedNote = { ...n, favorite: !n.favorite };
            return updatedNote;
          }
          return n;
        });

        if (userId && updatedNote) {
          void saveRemoteNote(updatedNote, userId);
        }

        return { ...s, notes: newNotes };
      });
    },
    [userId],
  );

  /**
   * Creates a sub-collection (folder) inside the active course.
   */
  const addCollection = useCallback(
    (name: string, category?: string, parentId?: string | null) => {
      const col: Collection = {
        id: uid(),
        courseId: activeCourseId || undefined,
        name: name.trim() || "Untitled Folder",
        category: category?.trim() || undefined,
        parentId: parentId ?? activeCourseId ?? null,
      };

      setState((s) => ({ ...s, collections: [...s.collections, col] }));

      if (userId && col.courseId) {
        void saveRemoteCollection(col, userId);
      }

      return col.id;
    },
    [activeCourseId, userId],
  );

  const renameCollection = useCallback(
    (id: string, name: string) => {
      setState((s) => {
        const newCols = s.collections.map((c) => (c.id === id ? { ...c, name } : c));
        const updated = newCols.find((c) => c.id === id);
        if (userId && updated) {
          void saveRemoteCollection(updated, userId);
        }
        return { ...s, collections: newCols };
      });
    },
    [userId],
  );

  const deleteCollection = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        collections: s.collections.filter((c) => c.id !== id),
        notes: s.notes.map((n) =>
          n.collectionId === id ? { ...n, collectionId: null } : n,
        ),
      }));
      setFilter((f) => (f.kind === "collection" && f.id === id ? { kind: "all" } : f));

      if (userId) {
        void deleteRemoteCollection(id, userId);
      }
    },
    [userId],
  );

  const counts = useMemo(() => {
    const byCollection: Record<string, number> = {};
    for (const n of scopedNotes) {
      if (n.collectionId) {
        byCollection[n.collectionId] = (byCollection[n.collectionId] ?? 0) + 1;
      }
    }
    return {
      all: scopedNotes.length,
      favorites: scopedNotes.filter((n) => n.favorite).length,
      byCollection,
    };
  }, [scopedNotes]);

  return {
    hydrated,
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
  };
}
