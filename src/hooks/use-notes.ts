import { useCallback, useEffect, useMemo, useState } from "react";
import {
  childCollections,
  courseCollections,
  courseScopeIds,
  loadState,
  saveState,
  uid,
  type Collection,
  type Note,
  type NotesState,
} from "@/lib/notes";

export type Filter =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "collection"; id: string };

export function useNotes() {
  const [state, setState] = useState<NotesState>({ notes: [], collections: [] });
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setSelectedId(loaded.notes[0]?.id ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  // Top-level Course items only — used for the Welcome Dashboard grid.
  const courses = useMemo(() => courseCollections(state.collections), [state.collections]);

  const activeCourse = useMemo(
    () => state.collections.find((c) => c.id === activeCourseId) ?? null,
    [state.collections, activeCourseId],
  );

  // Sub-collections (lectures/modules) belonging to the active course only —
  // used for the workspace sidebar's "Collections" list.
  const courseChildren = useMemo(
    () => (activeCourseId ? childCollections(state.collections, activeCourseId) : []),
    [state.collections, activeCourseId],
  );

  const scopeIds = useMemo(
    () => (activeCourseId ? courseScopeIds(state.collections, activeCourseId) : null),
    [state.collections, activeCourseId],
  );

  // Notes are hard-scoped to the active course (+ its children) whenever one
  // is set. This is what stops a freshly opened course from showing notes
  // that belong to other courses.
  const scopedNotes = useMemo(
    () => (scopeIds ? state.notes.filter((n) => n.collectionId && scopeIds.has(n.collectionId)) : state.notes),
    [state.notes, scopeIds],
  );

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

  const createNote = useCallback(() => {
    const note: Note = {
      id: uid(),
      title: "Untitled note",
      body: "",
      favorite: false,
      collectionId: filter.kind === "collection" ? filter.id : activeCourseId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setState((s) => ({ ...s, notes: [note, ...s.notes] }));
    setSelectedId(note.id);
    setQuery("");
    return note.id;
  }, [filter, activeCourseId]);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setState((s) => ({
      ...s,
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
      ),
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notes: s.notes.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)),
    }));
  }, []);

  /**
   * Creates a collection. Pass `parentId` to nest it inside a course
   * (a lecture/module); omit it or pass null/undefined to create a new
   * top-level Course.
   */
  const addCollection = useCallback(
    (name: string, category?: string, parentId?: string | null) => {
      const col: Collection = {
        id: uid(),
        name: name.trim() || "Untitled",
        category: category?.trim() || undefined,
        parentId: parentId ?? null,
      };
      setState((s) => ({ ...s, collections: [...s.collections, col] }));
      return col.id;
    },
    [],
  );

  const renameCollection = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  }, []);

  /** Deletes a single collection, orphaning its notes (collectionId -> null). */
  const deleteCollection = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      collections: s.collections.filter((c) => c.id !== id),
      notes: s.notes.map((n) =>
        n.collectionId === id ? { ...n, collectionId: null } : n,
      ),
    }));
    setFilter((f) => (f.kind === "collection" && f.id === id ? { kind: "all" } : f));
  }, []);

  /**
   * Deletes a top-level Course AND cascades: removes every child collection
   * (lecture/module) that belongs to it, plus every note filed under the
   * course or any of its children. This is what the Dashboard's trash-icon
   * confirmation calls.
   */
  const deleteCourse = useCallback((courseId: string) => {
    setState((s) => {
      const idsToRemove = courseScopeIds(s.collections, courseId);
      return {
        collections: s.collections.filter((c) => !idsToRemove.has(c.id)),
        notes: s.notes.filter((n) => !(n.collectionId && idsToRemove.has(n.collectionId))),
      };
    });
    setSelectedId(null);
    setFilter((f) => (f.kind === "collection" && f.id === courseId ? { kind: "all" } : f));
    setActiveCourseId((cur) => (cur === courseId ? null : cur));
  }, []);

  const counts = useMemo(() => {
    const byCollection: Record<string, number> = {};
    for (const n of state.notes) {
      if (n.collectionId) byCollection[n.collectionId] = (byCollection[n.collectionId] ?? 0) + 1;
    }
    return {
      all: state.notes.length,
      favorites: state.notes.filter((n) => n.favorite).length,
      byCollection,
    };
  }, [state.notes]);

  return {
    hydrated,
    notes: state.notes,
    collections: state.collections,
    courses,
    activeCourseId,
    setActiveCourseId,
    activeCourse,
    courseChildren,
    visibleNotes,
    selected,
    selectedId,
    setSelectedId,
    filter,
    setFilter,
    query,
    setQuery,
    counts,
    createNote,
    updateNote,
    deleteNote,
    toggleFavorite,
    addCollection,
    renameCollection,
    deleteCollection,
    deleteCourse,
  };
}
