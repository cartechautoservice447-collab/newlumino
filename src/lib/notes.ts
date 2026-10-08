export const COURSE_ACCENTS = ["sky", "violet", "amber", "emerald", "rose", "cyan"] as const;
export type CourseAccent = (typeof COURSE_ACCENTS)[number];

export type Course = {
  id: string;
  name: string;
  description: string;
  color: CourseAccent;
  category?: string;
  createdAt: number;
  updatedAt: number;
};

export type Collection = {
  id: string;
  courseId?: string;
  name: string;
  category?: string | undefined;
  /** null/undefined = top-level or direct child of course. */
  parentId?: string | null | undefined;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  favorite: boolean;
  courseId?: string | null;
  collectionId: string | null;
  revision: number;
  sourceId: string | null;
  createdAt: number;
  updatedAt: number;
};

/** Sub-collections belonging to a course. */
export const childCollections = (collections: Collection[], courseId: string) =>
  collections.filter((c) => c.courseId === courseId || c.parentId === courseId);

/** The course id plus all of its sub-collection ids. */
export const courseScopeIds = (collections: Collection[], courseId: string) =>
  new Set<string>([courseId, ...childCollections(collections, courseId).map((c) => c.id)]);

export type NotesState = {
  courses: Course[];
  collections: Collection[];
  notes: Note[];
};

export const STORAGE_KEY = "glass-notes:v2";

/**
 * Deterministically maps or generates a standard RFC4122 v4 UUID.
 * Postgres UUID columns strictly require 36-char hyphenated UUID format.
 */
export const uid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const now = Date.now();
const day = 86_400_000;

export const seedState = (): NotesState => {
  const course1Id = "d0100000-0000-4000-a000-000000000001";
  const course2Id = "d0100000-0000-4000-a000-000000000002";
  const course3Id = "d0100000-0000-4000-a000-000000000003";

  const col1Id = "c0100000-0000-4000-a000-000000000001";
  const col2Id = "c0100000-0000-4000-a000-000000000002";

  return {
    courses: [
      {
        id: course1Id,
        name: "CS50P — Python",
        description: "Introduction to Programming with Python, functions, loops, and OOP.",
        color: "sky",
        category: "Programming",
        createdAt: now - day * 10,
        updatedAt: now - day * 1,
      },
      {
        id: course2Id,
        name: "Web Development",
        description: "Modern full-stack web applications, React, styling, and cloud APIs.",
        color: "violet",
        category: "Frontend",
        createdAt: now - day * 15,
        updatedAt: now - day * 2,
      },
      {
        id: course3Id,
        name: "CS50x — Computer Science",
        description: "Foundational algorithms, memory management, and data structures.",
        color: "emerald",
        category: "Fundamentals",
        createdAt: now - day * 20,
        updatedAt: now - day * 5,
      },
    ],
    collections: [
      { id: col1Id, courseId: course1Id, name: "Lecture 0 — Functions & Variables", parentId: course1Id },
      { id: col2Id, courseId: course1Id, name: "Lecture 1 — Conditionals", parentId: course1Id },
    ],
    notes: [
      {
        id: uid(),
        title: "Python — greeting script",
        favorite: true,
        courseId: course1Id,
        collectionId: col1Id,
        revision: 0,
        sourceId: null,
        createdAt: now - day * 1,
        updatedAt: now - day * 1,
        body: `A tiny script kept around for syntax reference.

\`\`\`python
import sys


class Greeter:
    def __init__(self, name):
        self.name = name

    def hello(self, to="world"):
        # Output using an f-string
        return f"Hello, {to}! I am {self.name}."


def main():
    name = input("What's your name? ")
    print(Greeter(name).hello())
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            print(arg)


main()
\`\`\`

Note the token colors: keywords are coral, functions lavender, strings ice blue.`,
      },
      {
        id: uid(),
        title: "Glass panel recipe",
        favorite: false,
        courseId: course2Id,
        collectionId: null,
        revision: 0,
        sourceId: null,
        createdAt: now - day * 3,
        updatedAt: now - day * 2,
        body: `Three ingredients make a panel feel like real glass:
1. **Blur** behind the surface, never on the content
2. A *hairline* border to catch light at the edge
3. Layered, diffuse shadow so it floats

\`\`\`ts
export const glass = (blur: number) => ({
  backdropFilter: \`blur(\${blur}px) saturate(140%)\`,
  border: "1px solid rgba(255,255,255,0.06)",
});
\`\`\``,
      },
    ],
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCourse(value: unknown): Course | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    description: typeof value.description === "string" ? value.description : "",
    color: COURSE_ACCENTS.includes(value.color as CourseAccent)
      ? (value.color as CourseAccent)
      : "sky",
    category: typeof value.category === "string" ? value.category : undefined,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
  };
}

function normalizeCollection(value: unknown): Collection | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }
  return {
    id: value.id,
    courseId: typeof value.courseId === "string" ? value.courseId : undefined,
    name: value.name,
    category: typeof value.category === "string" ? value.category : undefined,
    parentId:
      typeof value.parentId === "string" || value.parentId === null
        ? value.parentId
        : undefined,
  };
}

function normalizeNote(value: unknown): Note | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }
  return {
    id: value.id,
    title: typeof value.title === "string" ? value.title : "Untitled note",
    body: typeof value.body === "string" ? value.body : "",
    favorite: Boolean(value.favorite),
    courseId: typeof value.courseId === "string" || value.courseId === null ? value.courseId : undefined,
    collectionId:
      typeof value.collectionId === "string" || value.collectionId === null
        ? value.collectionId
        : null,
    revision: typeof value.revision === "number" ? value.revision : 0,
    sourceId: typeof value.sourceId === "string" || value.sourceId === null ? value.sourceId : null,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
  };
}

export const loadState = (userId?: string | null): NotesState => {
  if (typeof window === "undefined") return { courses: [], notes: [], collections: [] };
  const scopedKey = userId ? `${STORAGE_KEY}:user:${userId}` : `${STORAGE_KEY}:guest`;
  try {
    const raw = window.localStorage.getItem(scopedKey);
    if (!raw) return userId ? { courses: [], notes: [], collections: [] } : seedState();
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return userId ? { courses: [], notes: [], collections: [] } : seedState();

    const courses = Array.isArray(parsed.courses)
      ? parsed.courses.map(normalizeCourse).filter((course): course is Course => Boolean(course))
      : [];
    const collections = Array.isArray(parsed.collections)
      ? parsed.collections
          .map(normalizeCollection)
          .filter((collection): collection is Collection => Boolean(collection))
      : [];
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.map(normalizeNote).filter((note): note is Note => Boolean(note))
      : [];

    return { courses, collections, notes };
  } catch {
    return userId ? { courses: [], notes: [], collections: [] } : seedState();
  }
};

export const saveState = (state: NotesState, userId?: string | null) => {
  if (typeof window === "undefined") return;
  const scopedKey = userId ? `${STORAGE_KEY}:user:${userId}` : `${STORAGE_KEY}:guest`;
  try {
    window.localStorage.setItem(scopedKey, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
};

export const snippet = (body: string, max = 120) => {
  const clean = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
};

export const formatDate = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
