import type { Note } from "./notes";

export type FlashcardArchetype = "mixed" | "conceptual" | "code_cloze" | "contrast" | "practical";
export type FlashcardRating = "again" | "hard" | "good" | "easy";

export interface Flashcard {
  id: string;
  noteId: string;
  noteTitle: string;
  front: string;
  back: string;
  type: "qa" | "term" | "code" | "concept" | "cloze" | "contrast";
  sourceExcerpt?: string;
  codeLanguage?: string;
  difficulty?: "easy" | "good" | "hard" | "review";
  rating?: FlashcardRating;
  reviewedAt?: number;
  intervalDays?: number;
}

export function extractFlashcardsFromNote(note: Note): Flashcard[] {
  const cards: Flashcard[] = [];
  const lines = note.body.split("\n");
  let cardIndex = 0;

  const makeId = () => `${note.id}-card-${cardIndex++}`;

  // 1. Check for Question/Answer pattern: "Q: ... A: ..." or "?\n..."
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Pattern: "Q: ... A: ..." on same or consecutive lines
    if (/^q(?:uestion)?:\s*/i.test(line)) {
      const q = line.replace(/^q(?:uestion)?:\s*/i, "").trim();
      let a = "";
      if (i + 1 < lines.length && /^a(?:nswer)?:\s*/i.test(lines[i + 1].trim())) {
        a = lines[i + 1].trim().replace(/^a(?:nswer)?:\s*/i, "");
        i++;
      }
      if (q && a) {
        cards.push({
          id: makeId(),
          noteId: note.id,
          noteTitle: note.title || "Untitled",
          front: q,
          back: a,
          type: "qa",
          sourceExcerpt: `${line} ${a}`.trim(),
        });
        continue;
      }
    }

    // Pattern: Markdown Heading ending with '?' (e.g. "## What is a Python decorator?")
    const headingMatch = line.match(/^#{1,4}\s+(.+\?)\s*$/);
    if (headingMatch) {
      const question = headingMatch[1].trim();
      let answer = "";
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith("#")) {
        if (lines[j].trim()) {
          answer += lines[j] + "\n";
        }
        j++;
      }
      if (question && answer.trim()) {
        cards.push({
          id: makeId(),
          noteId: note.id,
          noteTitle: note.title || "Untitled",
          front: question,
          back: answer.trim(),
          type: "qa",
          sourceExcerpt: answer.trim().slice(0, 150),
        });
        i = j - 1;
        continue;
      }
    }

    // Pattern: Definition bullet: "- **Term**: Definition" or "- Term: Definition"
    const defMatch = line.match(/^[-*•]\s+\*{0,2}([^:*]+)\*{0,2}\s*[:-–—]\s*(.+)$/);
    if (defMatch) {
      const term = defMatch[1].trim();
      const def = defMatch[2].trim();
      if (term.length >= 2 && def.length >= 5) {
        cards.push({
          id: makeId(),
          noteId: note.id,
          noteTitle: note.title || "Untitled",
          front: `Define: ${term}`,
          back: def,
          type: "term",
          sourceExcerpt: line.replace(/^[-*•]\s+/, ""),
        });
        continue;
      }
    }
  }

  // 2. Check for Code Blocks
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let codeMatch;
  while ((codeMatch = codeRegex.exec(note.body)) !== null) {
    const lang = codeMatch[1] || "code";
    const snippet = codeMatch[2].trim();
    if (snippet.length > 10) {
      // Find preceding line for context
      const beforeCode = note.body.slice(0, codeMatch.index).trim();
      const precedingLines = beforeCode.split("\n").filter(Boolean);
      const lastLine = precedingLines[precedingLines.length - 1] || note.title;

      cards.push({
        id: makeId(),
        noteId: note.id,
        noteTitle: note.title || "Untitled",
        front: `${lastLine.replace(/^#+\s*/, "")}\n\nWhat is the syntax / output for this ${lang.toUpperCase()} snippet?`,
        back: `\`\`\`${lang}\n${snippet}\n\`\`\``,
        type: "code",
        codeLanguage: lang,
        sourceExcerpt: snippet.slice(0, 150),
      });
    }
  }

  // 3. Fallback: If no structured cards were found, generate concept cards from note headings or content
  if (cards.length === 0) {
    const sections = note.body.split(/\n(?=#{1,3}\s)/);
    for (const sec of sections) {
      const secTrimmed = sec.trim();
      if (!secTrimmed) continue;

      const firstLineMatch = secTrimmed.match(/^#{1,3}\s*(.+)$/m);
      if (firstLineMatch) {
        const title = firstLineMatch[1].trim();
        const content = secTrimmed.replace(firstLineMatch[0], "").trim();
        if (content.length > 10) {
          cards.push({
            id: makeId(),
            noteId: note.id,
            noteTitle: note.title || "Untitled",
            front: `Key Concept: ${title}`,
            back: content,
            type: "concept",
            sourceExcerpt: content.slice(0, 150),
          });
        }
      }
    }
  }

  // 4. Ultimate fallback: Note Summary card
  if (cards.length === 0 && note.body.trim().length > 10) {
    cards.push({
      id: makeId(),
      noteId: note.id,
      noteTitle: note.title || "Untitled",
      front: `What are the core concepts covered in "${note.title || "this note"}"?`,
      back: note.body.trim(),
      type: "concept",
      sourceExcerpt: note.body.trim().slice(0, 150),
    });
  }

  return cards;
}

export function extractAllFlashcards(notes: Note[]): Flashcard[] {
  const all: Flashcard[] = [];
  for (const n of notes) {
    all.push(...extractFlashcardsFromNote(n));
  }
  return all;
}

export async function requestAIFlashcards({
  note,
  notes,
  count = 8,
  batchIndex = 0,
  sessionType = "general",
  existingPrompts = [],
  archetype = "mixed",
  weakTopics = [],
}: {
  note?: Note | null;
  notes?: Note[];
  count?: number;
  batchIndex?: number;
  sessionType?: "general" | "pomodoro";
  existingPrompts?: string[];
  archetype?: FlashcardArchetype;
  weakTopics?: string[];
}): Promise<Flashcard[]> {
  const targetNote = note || (notes && notes[0]) || null;
  const noteId = targetNote ? targetNote.id : "workspace-notes";
  const noteTitle = note?.title
    ? note.title
    : notes && notes.length > 1
    ? `All Course Notes (${notes.length})`
    : targetNote?.title || "Study Session";

  // Build aggregated body if multiple notes are provided
  let noteBody = "";
  if (note?.body) {
    noteBody = note.body;
  } else if (notes && notes.length > 0) {
    noteBody = notes
      .map((n) => `## ${n.title || "Untitled"}\n${n.body || ""}`)
      .join("\n\n")
      .slice(0, 14000);
  }

  try {
    const res = await fetch("/api/ai/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteTitle,
        noteBody,
        count,
        batchIndex,
        sessionType,
        existingPrompts,
        archetype,
        weakTopics,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        return data.cards.map((c: any, idx: number) => ({
          id: `ai-b${batchIndex}-${noteId}-${Date.now()}-${idx}`,
          noteId,
          noteTitle: noteTitle || "Active Study",
          front: c.front,
          back: c.back,
          type: (c.type as any) || "qa",
          sourceExcerpt: c.sourceExcerpt || undefined,
          difficulty: c.difficulty || "good",
        }));
      }
    }
  } catch (err) {
    console.warn("AI generation endpoint unreachable, falling back to local extractor", err);
  }

  // Graceful local generation fallback with batch offset
  const allExtracted = targetNote
    ? extractFlashcardsFromNote(targetNote)
    : notes
    ? extractAllFlashcards(notes)
    : [];

  if (allExtracted.length > 0) {
    const offset = (batchIndex * count) % allExtracted.length;
    const batchCards: Flashcard[] = [];
    for (let i = 0; i < count; i++) {
      const item = allExtracted[(offset + i) % allExtracted.length];
      if (item) {
        batchCards.push({
          ...item,
          id: `local-b${batchIndex}-${item.id}-${i}`,
        });
      }
    }
    return batchCards;
  }

  // Fallback synthetic card if note is completely blank
  return [
    {
      id: `fallback-b${batchIndex}-1`,
      noteId,
      noteTitle,
      front: `What is the primary objective of your study session on "${noteTitle}"?`,
      back: `Core topic: ${noteTitle}. Study technique: Record key equations, definitions, and code patterns to build your deck!`,
      type: "concept",
      difficulty: "easy",
    },
    {
      id: `fallback-b${batchIndex}-2`,
      noteId,
      noteTitle,
      front: `Explain the most critical concept from "${noteTitle}" in your own words.`,
      back: `Feynman Technique: Explain this topic simply as if teaching someone else to test deep understanding.`,
      type: "qa",
      difficulty: "good",
    },
  ];
}

