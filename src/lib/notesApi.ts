import { supabase } from "@/integrations/supabase/client";
import {
  COURSE_ACCENTS,
  type Course,
  type CourseAccent,
  type Collection,
  type Note,
  type NotesState,
  loadState as loadLocalState,
  saveState as saveLocalState,
} from "@/lib/notes";

export interface SupabaseCourseRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface SupabaseCollectionRow {
  id: string;
  course_id: string;
  name: string;
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SupabaseNoteRow {
  id: string;
  course_id: string;
  collection_id: string | null;
  title: string | null;
  body: string | null;
  favorite: boolean | null;
  revision?: number | null;
  source_id?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

function parseTimestamp(val: string | number | null | undefined, fallback: number): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

export function toCourse(row: SupabaseCourseRow): Course {
  const color = (COURSE_ACCENTS as readonly string[]).includes(row.color ?? "")
    ? (row.color as CourseAccent)
    : COURSE_ACCENTS[0];
  const createdAt = parseTimestamp(row.created_at, Date.now());
  const updatedAt = parseTimestamp(row.updated_at, createdAt);
  return {
    id: row.id,
    name: row.name || "Untitled Course",
    description: row.description ?? "",
    color,
    category: row.description?.slice(0, 30) || "General",
    createdAt,
    updatedAt,
  };
}

export function toCollection(row: SupabaseCollectionRow): Collection {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name || "Untitled Folder",
    parentId: row.course_id,
  };
}

export function toNote(row: SupabaseNoteRow): Note {
  const createdAt = parseTimestamp(row.created_at, Date.now());
  const updatedAt = parseTimestamp(row.updated_at, createdAt);
  return {
    id: row.id,
    title: row.title ?? "Untitled note",
    body: row.body ?? "",
    favorite: Boolean(row.favorite),
    courseId: row.course_id,
    collectionId: row.collection_id ?? null,
    revision: typeof row.revision === "number" ? row.revision : 0,
    sourceId: row.source_id ?? null,
    createdAt,
    updatedAt,
  };
}

/**
 * Fetches all courses from the shared Supabase backend table `courses`.
 */
export async function fetchRemoteCourses(userId?: string | null): Promise<Course[]> {
  try {
    let q = supabase
      .from("courses")
      .select("id, name, description, color, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (userId) {
      q = q.eq("user_id", userId);
    }

    const { data, error } = await q;
    if (error) {
      console.warn("[Supabase] fetch courses error:", error.message);
      return [];
    }
    return ((data ?? []) as SupabaseCourseRow[]).map(toCourse);
  } catch (err) {
    console.warn("[Supabase] fetch courses exception:", err);
    return [];
  }
}

/**
 * Persists a course to the shared `courses` table.
 * Exactly matches the payload expected by fluid-glass-studio and Supabase schema.
 */
export async function saveRemoteCourse(
  course: Course,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: course.id,
      user_id: userId,
      name: course.name.trim(),
      description: course.description?.trim() ?? "",
      color: course.color ?? "sky",
      created_at: new Date(course.createdAt).toISOString(),
      updated_at: new Date(course.updatedAt || Date.now()).toISOString(),
    };

    const { error } = await supabase.from("courses").upsert(payload);
    if (error) {
      console.error("[Supabase] save course error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[Supabase] save course exception:", err);
    return { success: false, error: err?.message || "Failed to save course" };
  }
}

/**
 * Deletes a course from the shared `courses` table, along with its notes and folders.
 */
export async function deleteRemoteCourse(
  courseId: string,
  userId?: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete notes in this course
    await supabase.from("notes").delete().eq("course_id", courseId);

    // 2. Delete folders in this course
    await supabase.from("collections").delete().eq("course_id", courseId);

    // 3. Delete lecture links if any
    try {
      await supabase.from("lecture_links").delete().eq("course_id", courseId);
    } catch {
      // ignore
    }

    // 4. Delete course row
    let q = supabase.from("courses").delete().eq("id", courseId);
    if (userId) {
      q = q.eq("user_id", userId);
    }
    const { error } = await q;
    if (error) {
      console.error("[Supabase] delete course error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[Supabase] delete course exception:", err);
    return { success: false, error: err?.message || "Failed to delete course" };
  }
}

/**
 * Persists a note to the shared `notes` table.
 */
export async function saveRemoteNote(
  note: Note,
  userId?: string | null,
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !note.courseId) {
    return { success: false, error: "Must be signed in with an active course" };
  }
  try {
    const payload = {
      id: note.id,
      user_id: userId,
      course_id: note.courseId,
      collection_id: note.collectionId ?? null,
      title: note.title || "Untitled note",
      body: note.body ?? "",
      favorite: Boolean(note.favorite),
      revision: note.revision || 0,
      source_id: note.sourceId || null,
      created_at: new Date(note.createdAt).toISOString(),
      updated_at: new Date(note.updatedAt || Date.now()).toISOString(),
    };

    const { error } = await supabase.from("notes").upsert(payload);
    if (error) {
      console.error("[Supabase] save note error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[Supabase] save note exception:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Deletes a note from the shared `notes` table.
 */
export async function deleteRemoteNote(
  noteId: string,
  userId?: string | null,
): Promise<void> {
  try {
    let q = supabase.from("notes").delete().eq("id", noteId);
    if (userId) {
      q = q.eq("user_id", userId);
    }
    await q;
  } catch (err) {
    console.warn("[Supabase] delete note exception:", err);
  }
}

/**
 * Persists a collection folder to the shared `collections` table.
 */
export async function saveRemoteCollection(
  col: Collection,
  userId?: string | null,
): Promise<void> {
  if (!userId || !col.courseId) return;
  try {
    const payload = {
      id: col.id,
      user_id: userId,
      course_id: col.courseId,
      name: col.name || "Untitled Folder",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await supabase.from("collections").upsert(payload);
  } catch (err) {
    console.warn("[Supabase] save collection exception:", err);
  }
}

/**
 * Deletes a collection folder from the shared `collections` table.
 */
export async function deleteRemoteCollection(
  collectionId: string,
  userId?: string | null,
): Promise<void> {
  try {
    let q = supabase.from("collections").delete().eq("id", collectionId);
    if (userId) {
      q = q.eq("user_id", userId);
    }
    await q;
  } catch (err) {
    console.warn("[Supabase] delete collection exception:", err);
  }
}

/**
 * Fetches full remote state from shared Supabase tables: `courses`, `collections`, and `notes`.
 * Falls back to locally cached state if offline or guest.
 */
export async function fetchFullRemoteState(userId?: string | null): Promise<NotesState> {
  const local = loadLocalState();
  if (!userId) {
    return local;
  }

  try {
    const [coursesRes, collectionsRes, notesRes] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, description, color, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("collections")
        .select("id, course_id, name, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("notes")
        .select("id, course_id, collection_id, title, body, favorite, revision, source_id, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
    ]);

    if (coursesRes.error) {
      console.warn("[Supabase] error fetching courses:", coursesRes.error.message);
    }

    const remoteCourses = ((coursesRes.data ?? []) as SupabaseCourseRow[]).map(toCourse);
    const remoteCollections = ((collectionsRes.data ?? []) as SupabaseCollectionRow[]).map(toCollection);
    const remoteNotes = ((notesRes.data ?? []) as SupabaseNoteRow[]).map(toNote);

    // If remote has data, update local cache and return remote
    if (remoteCourses.length > 0 || remoteNotes.length > 0) {
      const merged: NotesState = {
        courses: remoteCourses,
        collections: remoteCollections,
        notes: remoteNotes,
      };
      saveLocalState(merged);
      return merged;
    }

    // If remote is completely empty but user has local courses/notes, seed them to Supabase
    if (local.courses.length > 0) {
      void syncLocalToCloud(local, userId);
    }

    return local;
  } catch (err) {
    console.warn("[Supabase] fetch full state failed, falling back to local:", err);
    return local;
  }
}

/**
 * Seeds local state into Supabase if remote is pristine.
 */
export async function syncLocalToCloud(state: NotesState, userId: string): Promise<void> {
  try {
    for (const c of state.courses) {
      await saveRemoteCourse(c, userId);
    }
    for (const col of state.collections) {
      await saveRemoteCollection(col, userId);
    }
    for (const n of state.notes) {
      await saveRemoteNote(n, userId);
    }
  } catch (err) {
    console.warn("[Supabase] initial sync to cloud failed:", err);
  }
}

/**
 * Subscribes to real-time changes on public.courses, public.notes, public.collections
 * across ALL connected clients (fluid-glass-studio, newlumino, browser tabs).
 */
export function subscribeToRealtimeSharedBackend(
  userId: string | null,
  callbacks: {
    onCoursesChange: (payload: any) => void;
    onNotesChange: (payload: any) => void;
    onCollectionsChange: (payload: any) => void;
    onStatusChange?: (status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR") => void;
  },
): () => void {
  try {
    const channelName = `shared-courses-sync-${userId || "global"}-${Date.now().toString(36)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courses" },
        (payload) => {
          console.log("[Shared Realtime] courses table change detected:", payload);
          callbacks.onCoursesChange(payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        (payload) => {
          console.log("[Shared Realtime] notes table change detected:", payload);
          callbacks.onNotesChange(payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections" },
        (payload) => {
          console.log("[Shared Realtime] collections table change detected:", payload);
          callbacks.onCollectionsChange(payload);
        },
      )
      .subscribe((status) => {
        console.log(`[Shared Realtime Channel: ${channelName}] Status:`, status);
        if (callbacks.onStatusChange) {
          callbacks.onStatusChange(status as any);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  } catch (err) {
    console.error("[Shared Realtime] subscription failed:", err);
    return () => {};
  }
}
