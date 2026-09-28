export type Note = {
  id: string;
  title: string;
  body: string;
  favorite: boolean;
  collectionId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Collection = {
  id: string;
  name: string;
  category?: string | undefined;
  /** null/undefined = top-level Course. Otherwise a sub-collection (lecture/module). */
  parentId?: string | null | undefined;
};

/** Top-level courses only (no parent). */
export const courseCollections = (collections: Collection[]) =>
  collections.filter((c) => !c.parentId);

/** Sub-collections belonging to a course. */
export const childCollections = (collections: Collection[], courseId: string) =>
  collections.filter((c) => c.parentId === courseId);

/** The course id plus all of its sub-collection ids. */
export const courseScopeIds = (collections: Collection[], courseId: string) =>
  new Set<string>([courseId, ...childCollections(collections, courseId).map((c) => c.id)]);

export type NotesState = {
  notes: Note[];
  collections: Collection[];
};

export const STORAGE_KEY = "glass-notes:v1";

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const now = Date.now();
const day = 86_400_000;

export const seedState = (): NotesState => {
  const engineering: Collection = {
    id: "col-engineering",
    name: "CS50P — Python",
    category: "Programming",
  };
  const ideas: Collection = {
    id: "col-ideas",
    name: "Web Development",
    category: "Frontend",
  };

  return {
    collections: [
      engineering,
      ideas,
      { id: "col-cs50x", name: "CS50x — Computer Science", category: "Fundamentals" },
      { id: "col-eng-notes", name: "Engineering Notes", category: "General" },
      { id: "col-cs50p-l0", name: "Lecture 0", parentId: engineering.id },
      { id: "col-cs50p-l1", name: "Lecture 1", parentId: engineering.id },
      { id: "col-web-ideas", name: "Ideas", parentId: ideas.id },
    ],
    notes: [
      {
        id: uid(),
        title: "Python — greeting script",
        favorite: true,
        collectionId: engineering.id,
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
        collectionId: ideas.id,
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
      {
        id: uid(),
        title: "Reading list",
        favorite: false,
        collectionId: null,
        createdAt: now - day * 6,
        updatedAt: now - day * 5,
        body: `- Designing interfaces with depth
- The typography of software
- \`prefers-reduced-motion\` and restraint

> Good motion is felt, not noticed.`,
      },
    ],
  };
};

export const loadState = (): NotesState => {
  if (typeof window === "undefined") return { notes: [], collections: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as NotesState;
    if (!parsed || !Array.isArray(parsed.notes)) return seedState();
    return { notes: parsed.notes, collections: parsed.collections ?? [] };
  } catch {
    return seedState();
  }
};

export const saveState = (state: NotesState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
