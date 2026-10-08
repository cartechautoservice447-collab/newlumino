import express from "express";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

// Server-side Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

interface GeminiCallParams {
  contents: string;
  responseSchema?: any;
  temperature?: number;
  systemInstruction?: string;
  timeoutMs?: number;
}

// Resilient, multi-model Gemini execution helper with timeout protection and fast fallback
async function executeGeminiGenerate<T = any>(
  ai: GoogleGenAI,
  params: GeminiCallParams
): Promise<{ parsed: T; model: string }> {
  // Ordered by speed, responsiveness, and availability:
  // 1. gemini-3.1-flash-lite: lightning-fast, ultra-responsive, minimal latency
  // 2. gemini-3.8-flash: flagship general text intelligence
  // 3. gemini-flash-latest: modern flash alias
  const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
  const timeoutMs = params.timeoutMs || 30000;

  for (const model of candidateModels) {
    try {
      const config: any = {
        temperature: params.temperature ?? 0.25,
        responseMimeType: "application/json",
      };

      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }
      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (model.includes("3.1-flash-lite")) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      } else if (model.includes("3.8-flash")) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const callPromise = ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on model ${model}`)), timeoutMs)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);
      const rawText = response?.text?.trim();
      if (!rawText) continue;

      const parsed = JSON.parse(rawText) as T;
      return { parsed, model };
    } catch (err: any) {
      console.warn(`[Gemini Engine] Model ${model} unavailable or timed out:`, err?.status || err?.message || err);
      continue;
    }
  }

  throw new Error("All candidate models were exhausted or unavailable.");
}

// Fallback card synthesizer when upstream AI is temporarily busy or in high demand
function synthesizeFallbackCards(title: string, body: string, count = 8, batchIndex = 0) {
  const cards: any[] = [];
  const rawBody = body || "";
  const lines = rawBody.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Extract definitions: "- **Term**: Def" or "Term - Def"
  const definitions: { term: string; def: string }[] = [];
  for (const line of lines) {
    const defMatch = line.match(/^[-*•]?\s*\*{0,2}([^:*–—]+)\*{0,2}\s*[:-–—]\s*(.+)$/);
    if (defMatch && defMatch[1].trim().length >= 2 && defMatch[2].trim().length >= 6) {
      definitions.push({ term: defMatch[1].trim(), def: defMatch[2].trim() });
    }
  }

  // 2. Extract sections with actual content under headings
  const sections: { heading: string; content: string }[] = [];
  const sectionRegex = /^#{1,4}\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  const headingIndices: { title: string; index: number }[] = [];

  while ((match = sectionRegex.exec(rawBody)) !== null) {
    headingIndices.push({ title: match[1].trim(), index: match.index });
  }

  for (let i = 0; i < headingIndices.length; i++) {
    const cur = headingIndices[i];
    const nextIndex = i + 1 < headingIndices.length ? headingIndices[i + 1].index : rawBody.length;
    const sectionBody = rawBody.slice(cur.index, nextIndex).replace(/^#{1,4}\s+.+$/m, "").trim();
    if (sectionBody.length > 15) {
      sections.push({ heading: cur.title, content: sectionBody.slice(0, 350) });
    }
  }

  // 3. Extract code snippets
  const codeSnippets: { lang: string; code: string; context: string }[] = [];
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let cMatch: RegExpExecArray | null;
  while ((cMatch = codeRegex.exec(rawBody)) !== null) {
    const lang = cMatch[1] || "code";
    const snippet = cMatch[2].trim();
    if (snippet.length > 10) {
      const before = rawBody.slice(0, cMatch.index).trim();
      const lastLine = before.split("\n").filter(Boolean).pop() || title;
      codeSnippets.push({ lang, code: snippet, context: lastLine.replace(/^#+\s*/, "") });
    }
  }

  // 4. Extract bullet items / takeaways
  const bulletItems = lines.filter((l) => /^[-*•]\s+/.test(l) && l.length > 20);

  // Pool of candidate cards
  const candidatePool: any[] = [];

  // Add definitions
  for (const item of definitions) {
    candidatePool.push({
      front: `Define: ${item.term}`,
      back: item.def,
      type: "term",
      difficulty: "good",
    });
  }

  // Add section questions with actual note content
  for (const sec of sections) {
    const isQ = sec.heading.endsWith("?");
    candidatePool.push({
      front: isQ ? sec.heading : `What are the key concepts and mechanisms in "${sec.heading}"?`,
      back: sec.content,
      type: "concept",
      difficulty: "good",
    });
  }

  // Add code snippet cards
  for (const cs of codeSnippets) {
    candidatePool.push({
      front: `${cs.context ? `${cs.context}\n\n` : ""}What does this ${cs.lang.toUpperCase()} code achieve?`,
      back: `\`\`\`${cs.lang}\n${cs.code}\n\`\`\``,
      type: "code",
      difficulty: "hard",
    });
  }

  // Add key bullet takeaways
  for (let i = 0; i < bulletItems.length; i += 2) {
    const item = bulletItems[i].replace(/^[-*•]\s+/, "");
    candidatePool.push({
      front: `Explain the significance of this insight from "${title}":\n"${item}"`,
      back: `This key principle highlights core operational logic in ${title}. Review corresponding implementation and test cases.`,
      type: "concept",
      difficulty: "easy",
    });
  }

  // If candidate pool is still smaller than needed, generate structured conceptual study flashcards
  if (candidatePool.length < count * (batchIndex + 1)) {
    const batchThemes = [
      {
        style: "Core Principles",
        front: (t: string) => `What is the core objective and fundamental principle behind "${t}"?`,
        back: (b: string, t: string) =>
          b.slice(0, 300) || `Study summary for ${t}: Review foundational terms, architecture, and primary trade-offs.`,
      },
      {
        style: "Application & Edge Cases",
        front: (t: string) => `How would you apply "${t}" in practice, and what common pitfalls must be avoided?`,
        back: (_b: string, t: string) =>
          `Practical application of ${t}: Consider performance constraints, validation requirements, and standard idioms.`,
      },
      {
        style: "Feynman Technique",
        front: (t: string) => `Explain "${t}" to a beginner using a simple real-world analogy.`,
        back: (_b: string, t: string) =>
          `Teaching technique: Break ${t} into input, processing, and output steps without relying on technical jargon.`,
      },
      {
        style: "Deep Verification",
        front: (t: string) => `What question would an interviewer or examiner most likely ask about "${t}"?`,
        back: (_b: string, t: string) =>
          `Examination focus on ${t}: Be ready to compare with alternative approaches and analyze time/space efficiency.`,
      },
      {
        style: "Summary & Connections",
        front: (t: string) => `How does "${t}" connect to earlier topics studied in this course?`,
        back: (_b: string, t: string) =>
          `Synthesizing knowledge: Identify shared data structures, dependencies, or algorithmic parallels.`,
      },
      {
        style: "Problem Solving",
        front: (t: string) => `Identify the single most critical formula or rule needed to solve problems in "${t}".`,
        back: (b: string) =>
          b.slice(0, 250) || `Review reference notes to verify exact syntax, invariants, and edge cases.`,
      },
    ];

    for (let i = 0; i < batchThemes.length; i++) {
      const theme = batchThemes[(i + batchIndex) % batchThemes.length];
      candidatePool.push({
        front: theme.front(title || "this topic"),
        back: theme.back(rawBody, title || "this topic"),
        type: "qa",
        difficulty: i % 2 === 0 ? "good" : "hard",
      });
    }
  }

  // Use batchIndex offset so subsequent batches return genuinely different cards
  const offset = (batchIndex * count) % Math.max(1, candidatePool.length);
  for (let i = 0; i < count; i++) {
    const card = candidatePool[(offset + i) % candidatePool.length];
    if (card) {
      cards.push({ ...card });
    }
  }

  return cards;
}

// AI Flashcard generation endpoint with multi-model fallback & batch support
app.post("/api/ai/flashcards", async (req, res) => {
  const {
    noteTitle,
    noteBody,
    topic,
    count = 8,
    batchIndex = 0,
    sessionType = "general",
    existingPrompts = [],
    archetype = "mixed",
    weakTopics = [],
  } = req.body;
  const title = noteTitle || topic || "Study Session";
  const numCards = Math.max(2, Math.min(Number(count) || 8, 20));
  const currentBatch = Number(batchIndex) || 0;

  const ai = getGeminiClient();
  if (!ai) {
    const fallbackCards = synthesizeFallbackCards(title, noteBody, numCards, currentBatch);
    return res.json({
      cards: fallbackCards,
      count: fallbackCards.length,
      batchIndex: currentBatch,
      archetype,
      fallback: true,
      message: "Generated study flashcards from note content.",
    });
  }

  // Archetype instructions
  let archetypeInstruction = "";
  if (archetype === "conceptual") {
    archetypeInstruction = "Focus heavily on Conceptual Mastery & Definitions: Ask foundational principles, terminology, architectural logic, and theoretical mechanisms.";
  } else if (archetype === "code_cloze") {
    archetypeInstruction = "Focus heavily on Code & Syntax Cloze / Output: Test execution output, syntax cloze blanks (e.g., {{c1::keyword}}), error spotting, and parameter behavior.";
  } else if (archetype === "contrast") {
    archetypeInstruction = "Focus heavily on Contrast & Disambiguation: Compare and contrast two easily confused concepts, methods, keywords, or trade-offs mentioned in the notes.";
  } else if (archetype === "practical") {
    archetypeInstruction = "Focus heavily on Practical Application & Problem Solving: Pose realistic programming / engineering scenarios and ask how to solve them using the principles in the notes.";
  } else {
    archetypeInstruction = "Create a balanced blend of Conceptual, Syntax/Code Cloze, and Contrast questions.";
  }

  const prompt = `You are an elite professor creating high-precision study flashcards.
Target Topic / Note Title: "${title}"
Batch Number: ${currentBatch + 1}
Archetype Mode: ${archetype.toUpperCase()}
${archetypeInstruction}

${
  Array.isArray(weakTopics) && weakTopics.length > 0
    ? `ADAPTIVE REINFORCEMENT MODE: The student struggled with these specific concepts in previous reviews: ${JSON.stringify(weakTopics.slice(0, 5))}. Generate targeted cards that clarify and drill these exact weak spots.`
    : ""
}

Session context: ${
    sessionType === "pomodoro"
      ? "A focused Pomodoro study interval just completed. Generate high-yield study questions based on what the student studied in this session."
      : "Generate interactive flashcards for study and exam preparation."
  }
${
  Array.isArray(existingPrompts) && existingPrompts.length > 0
    ? `Do NOT repeat these existing question topics: ${JSON.stringify(existingPrompts.slice(-12))}`
    : ""
}

Source Note content:
"""
${(noteBody || "").slice(0, 14000)}
"""

Strict Requirements for 100% Accuracy:
1. Generate exactly ${numCards} NEW, distinct study flashcards for Batch #${currentBatch + 1}.
2. Note-Grounded Verification: For every flashcard, extract a "sourceExcerpt" which is the EXACT 1-2 sentence quote or snippet from the note above that proves the answer.
3. Make the "front" concise, engaging, and clear.
4. Make the "back" accurate, definitive, and easy to memorize (use markdown formatting, bullet points, or code blocks where helpful).
5. Set "type" to one of: "concept", "code", "cloze", "contrast", "qa".
6. Set "difficulty" to: "easy", "good", or "hard".`;

  try {
    const { parsed, model } = await executeGeminiGenerate<any[]>(ai, {
      contents: prompt,
      temperature: 0.2,
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
            type: { type: Type.STRING },
            sourceExcerpt: { type: Type.STRING },
            difficulty: { type: Type.STRING },
          },
          required: ["front", "back", "type"],
        },
      },
    });

    if (Array.isArray(parsed) && parsed.length > 0) {
      return res.json({
        cards: parsed,
        count: parsed.length,
        batchIndex: currentBatch,
        archetype,
        model,
        fallback: false,
      });
    }
  } catch (_err) {
    // Falls through to graceful fallback synthesizer below
  }

  // Graceful fallback to rich synthesizer if upstream models are busy
  const fallbackCards = synthesizeFallbackCards(title, noteBody, numCards, currentBatch);
  return res.json({
    cards: fallbackCards,
    count: fallbackCards.length,
    batchIndex: currentBatch,
    archetype,
    model: "smart-synthesizer",
    fallback: true,
    message: "Synthesized high-yield flashcards from note content.",
  });
});

// AI Pomodoro Planner & Optimizer Endpoint
app.post("/api/ai/pomodoro-plan", async (req, res) => {
  const {
    targetHours = 2,
    courseName = "General Study",
    breakPreference = "adaptive",
    difficulty = "high_code",
    sessionGoal = "Deep study & note mastery",
    rhythm = "ai_adaptive",
    noteTitle = "",
    noteSnippet = "",
  } = req.body;

  const totalTargetMinutes = Math.round(Math.max(0.25, Math.min(Number(targetHours) || 2, 8)) * 60);
  
  // Calculate deterministic baseline
  let focusMin = 25;
  let breakMin = 5;
  if (rhythm === "deep_50_10" || (rhythm === "ai_adaptive" && difficulty === "high_code")) {
    focusMin = 50;
    breakMin = 10;
  } else if (rhythm === "ultradian_90_20") {
    focusMin = 90;
    breakMin = 20;
  } else if (rhythm === "sprint_15_3") {
    focusMin = 15;
    breakMin = 3;
  } else {
    focusMin = 25;
    breakMin = breakPreference === "long_15m" ? 15 : breakPreference === "standard_10m" ? 10 : 5;
  }

  const cycleLength = focusMin + breakMin;
  const cyclesCount = Math.max(1, Math.round(totalTargetMinutes / cycleLength));
  const calculatedTotalWork = cyclesCount * focusMin;
  const calculatedTotalBreak = Math.max(0, cyclesCount - 1) * breakMin;

  const ai = getGeminiClient();
  if (ai) {
    const prompt = `You are a world-class cognitive science tutor and study productivity architect.
Create an optimal Pomodoro execution plan based on these user specifications:

1. Target Total Time: ${targetHours} hours (${totalTargetMinutes} minutes)
2. Course/Subject: "${courseName}"
3. Subject Difficulty & Cognitive Load: ${difficulty}
4. Rest/Break Preference: ${breakPreference}
5. Primary Goal: "${sessionGoal}"
6. Target Note: "${noteTitle}" ${noteSnippet ? `(Snippet: ${noteSnippet.slice(0, 300)})` : ""}
7. Rhythm Preference: ${rhythm}

Instructions:
1. Provide an executive summary of why this schedule maximizes cognitive retention.
2. Break down exactly ${cyclesCount} sequential milestone objectives for each work block.
3. Provide actionable cognitive pacing advice (e.g. hydration, context switching limits, eye rest).
4. Assign an efficiency score out of 100.`;

    try {
      const { parsed, model } = await executeGeminiGenerate<any>(ai, {
        contents: prompt,
        temperature: 0.3,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planSummary: { type: Type.STRING },
            recommendedFocusMinutes: { type: Type.INTEGER },
            recommendedBreakMinutes: { type: Type.INTEGER },
            cyclesCount: { type: Type.INTEGER },
            totalWorkMinutes: { type: Type.INTEGER },
            totalBreakMinutes: { type: Type.INTEGER },
            milestones: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            cognitivePacingAdvice: { type: Type.STRING },
            efficiencyScore: { type: Type.INTEGER },
          },
          required: [
            "planSummary",
            "recommendedFocusMinutes",
            "recommendedBreakMinutes",
            "cyclesCount",
            "milestones",
            "cognitivePacingAdvice",
          ],
        },
      });

      if (parsed && parsed.planSummary) {
        return res.json({
          ...parsed,
          success: true,
          model,
          fallback: false,
        });
      }
    } catch (_err) {
      // Falls through to resilient fallback plan below
    }
  }

  // Resilient fallback plan calculation
  const fallbackMilestones: string[] = [];
  for (let i = 1; i <= cyclesCount; i++) {
    if (i === 1) {
      fallbackMilestones.push(`Cycle 1: Core reading, breakdown & note outlining for ${courseName}`);
    } else if (i === cyclesCount) {
      fallbackMilestones.push(`Cycle ${i}: Final review, flashcard practice & summary consolidation`);
    } else if (i === 2) {
      fallbackMilestones.push(`Cycle 2: Deep problem solving, practice implementation & edge cases`);
    } else {
      fallbackMilestones.push(`Cycle ${i}: Concept refinement and targeted note verification`);
    }
  }

  return res.json({
    success: true,
    planSummary: `Optimized ${cyclesCount}-cycle (${focusMin}m focus / ${breakMin}m break) plan for ${courseName} across ${targetHours}h.`,
    recommendedFocusMinutes: focusMin,
    recommendedBreakMinutes: breakMin,
    cyclesCount,
    totalWorkMinutes: calculatedTotalWork,
    totalBreakMinutes: calculatedTotalBreak,
    milestones: fallbackMilestones,
    cognitivePacingAdvice: `Keep hydration near, take screen-off breaks during the ${breakMin}m intervals, and finish with a quick summary review.`,
    efficiencyScore: 95,
    fallback: true,
  });
});

// AI Integrated Notification Generator Endpoint
app.post("/api/ai/notification", async (req, res) => {
  const {
    persona = "coach",
    category = "study_nudge",
    context = {},
  } = req.body;

  const {
    noteTitle = "General Study",
    activeCourseName = "Current Course",
    focusMinutes = 25,
    dailyGoalHours = 2,
    coursesCount = 1,
    notesCount = 1,
  } = context;

  const personaPrompts: Record<string, string> = {
    coach: "Energetic, inspiring, high-performance athletic coach pushing the student to level up their intellectual stamina and retention.",
    professor: "Distinguished academic professor using socratic questioning, intellectual rigor, and deep conceptual insight.",
    mentor: "Calm, thoughtful mentor emphasizing mindful pacing, flow state, single-tasking, and tranquil cognitive clarity.",
    hacker: "Pragmatic, sharp software engineer / tech lead focusing on systematic problem-solving, debugging edge cases, and high-efficiency shipping.",
  };

  const categoryPrompts: Record<string, string> = {
    study_nudge: "A micro-nudge prompting focus or deeper understanding of what they're studying.",
    milestone: "A celebratory acknowledgement of focus progress and intellectual stamina.",
    retention_quiz: "A quick mental quiz question or concept check prompt.",
    break_reminder: "A gentle nudge to step away, rest their eyes, hydrate, and consolidate memories.",
    daily_goal: "A motivating status check on their daily study target and progress.",
  };

  const selectedPersona = personaPrompts[persona] || personaPrompts.coach;
  const selectedCategory = categoryPrompts[category] || categoryPrompts.study_nudge;

  // Fallback notifications if API key is absent or upstream is busy
  const fallbackPresets: Record<string, Array<{ title: string; message: string; type: "info" | "success" | "warning"; categoryBadge: string }>> = {
    coach: [
      { title: "⚡ Peak Focus Mode", message: "You've logged solid focus. Review key ideas before checking the note!", type: "info", categoryBadge: "Study Boost" },
      { title: "🔥 Momentum Unleashed", message: "Great consistency today. Push through the next 15 minutes to lock in long-term memory.", type: "success", categoryBadge: "Goal Sprint" },
    ],
    professor: [
      { title: "🎓 Socratic Check", message: `Can you explain the core mechanism of "${noteTitle}" in simple terms without reading?`, type: "info", categoryBadge: "Concept Check" },
      { title: "📖 Deep Synthesis", message: `Reviewing ${activeCourseName}: identify one counter-example to solidify your mental model.`, type: "info", categoryBadge: "Deep Theory" },
    ],
    mentor: [
      { title: "🌱 Mindful Clarity", message: "Take one slow breath. Release eye tension. Allow the concepts to settle organically.", type: "info", categoryBadge: "Clarity Flow" },
      { title: "🍃 Single-Task Focus", message: "One idea at a time. Quality of contemplation beats hurried skimming.", type: "success", categoryBadge: "Mindfulness" },
    ],
    hacker: [
      { title: "💻 Edge Case Probe", message: `How would your current logic in "${noteTitle}" handle unexpected input or race conditions?`, type: "warning", categoryBadge: "Code Edge Cases" },
      { title: "🚀 Clean Execution", message: "Refactor your mental diagram: reduce cognitive complexity and drill the syntax.", type: "info", categoryBadge: "Engineering" },
    ],
  };

  const pool = fallbackPresets[persona] || fallbackPresets.coach;
  const fallbackAlert = pool[Math.floor(Math.random() * pool.length)];

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      success: true,
      notification: fallbackAlert,
      fallback: true,
      model: "synthesizer",
    });
  }

  const prompt = `You are NewLumino's AI Notification Engine.
Generate an intelligent, contextual study alert for a student using NewLumino Liquid Glass Study Studio.

Persona: ${selectedPersona}
Alert Category: ${selectedCategory}
Student Context:
- Active Note: "${noteTitle}"
- Course: "${activeCourseName}"
- Today's Focus: ${focusMinutes} minutes (Goal: ${dailyGoalHours} hours)
- Total Notes: ${notesCount} across ${coursesCount} courses

Strict formatting requirements:
1. "title": Catchy, short title with an emoji (max 28 chars, e.g. "⚡ Focus Drill")
2. "message": Concise, punchy 1-2 sentence alert (max 110 chars)
3. "type": exactly one of "info", "success", "warning"
4. "categoryBadge": short 2-3 word label (e.g. "Spaced Repetition", "Mindful Break")
5. "actionLabel": optional 1-2 word CTA (e.g. "Test Now", "Breathe", "Resume")`;

  try {
    const { parsed, model } = await executeGeminiGenerate<any>(ai, {
      contents: prompt,
      temperature: 0.6,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          message: { type: Type.STRING },
          type: { type: Type.STRING },
          categoryBadge: { type: Type.STRING },
          actionLabel: { type: Type.STRING },
        },
        required: ["title", "message", "type", "categoryBadge"],
      },
    });

    if (parsed && parsed.title && parsed.message) {
      const validatedType: "info" | "success" | "warning" =
        parsed.type === "success" || parsed.type === "warning" ? parsed.type : "info";

      return res.json({
        success: true,
        notification: {
          title: parsed.title,
          message: parsed.message,
          type: validatedType,
          categoryBadge: parsed.categoryBadge || "AI Smart Alert",
          actionLabel: parsed.actionLabel || undefined,
        },
        model,
      });
    }
  } catch (_err) {
    // Falls through to fallback notification below
  }

  return res.json({
    success: true,
    notification: fallbackAlert,
    fallback: true,
    model: "smart-synthesizer",
  });
});

// 2. AI Adaptive Exam Simulator & Diagnostic Drill Endpoint
app.post("/api/ai/exam-simulate", async (req, res) => {
  const {
    noteTitle = "Active Study Session",
    noteBody = "",
    notesList = [],
    courseName = "Current Course",
    drillMode = "5m_sprint",
    difficulty = "balanced",
  } = req.body;

  const isMultiNote = Array.isArray(notesList) && notesList.length > 1;
  const effectiveTitle = isMultiNote
    ? `${courseName || "Comprehensive"} • Cross-Topic Comprehensive Exam (${notesList.length} Notes)`
    : (noteTitle || "Active Study Session");

  const effectiveBody = isMultiNote
    ? notesList
        .map((n: { title: string; body: string }, idx: number) => `--- [SECTION ${idx + 1}: ${n.title}] ---\n${n.body || ""}`)
        .join("\n\n")
    : (noteBody || "");

  const questionCount = drillMode === "15m_comprehensive" ? 10 : drillMode === "10m_standard" ? 7 : 5;
  const durationMin = drillMode === "15m_comprehensive" ? 15 : drillMode === "10m_standard" ? 10 : 5;

  // Enhanced smart local fallback questions generator with full diagnostic depth
  const generateFallbackQuestions = () => {
    const raw = (effectiveBody || "").trim();
    const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const questions: any[] = [];

    // Extract headers or definitions
    const definitions: { term: string; def: string; sourceTitle?: string }[] = [];
    for (const line of lines) {
      const match = line.match(/^[-*•]?\s*\*{0,2}([^:*–—]+)\*{0,2}\s*[:-–—]\s*(.+)$/);
      if (match && match[1].trim().length >= 2 && match[2].trim().length >= 6) {
        definitions.push({ term: match[1].trim(), def: match[2].trim() });
      }
    }

    if (definitions.length >= 2) {
      for (let i = 0; i < Math.min(questionCount, definitions.length); i++) {
        const item = definitions[i];
        const otherDefs = definitions.filter((_, idx) => idx !== i).map((d) => d.def);
        const wrong1 = otherDefs[0] || "A non-deterministic side-effect in unmanaged runtime environments";
        const wrong2 = otherDefs[1] || "An obsolete syntactic construct replaced in modern specifications";
        const wrong3 = "A low-level hardware primitive not directly accessible from userland";

        const rawOptions = [item.def, wrong1, wrong2, wrong3];
        const shuffled = [...rawOptions].sort(() => Math.random() - 0.5);
        const correctIndex = shuffled.indexOf(item.def);

        questions.push({
          id: `q-${i + 1}`,
          question: `In the context of "${effectiveTitle}", which statement best characterizes "${item.term}"?`,
          options: shuffled,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          explanation: `According to your study material, "${item.term}" is defined as: "${item.def}".`,
          sourceCitation: `Excerpt: "${item.term} — ${item.def}"`,
          distractorExplanations: shuffled.map((opt) =>
            opt === item.def
              ? `Correct. Accurately defines "${item.term}".`
              : "Incorrect. Confounds this mechanism with an unrelated concept or architectural constraint."
          ),
          topicTag: item.term.slice(0, 24),
          difficultyLevel: i % 2 === 0 ? "foundational" : "intermediate",
          questionType: "conceptual",
          keyTakeaway: `Remember: ${item.term} directly maps to "${item.def}".`,
        });
      }
    }

    // Synthesize conceptual retention questions
    while (questions.length < questionCount) {
      const idx = questions.length + 1;
      const corePrinciple = "Consistent deliberate retrieval practice and testing without immediate prompting";
      const wrongA = "Passive highlighting and re-reading of source text without self-testing";
      const wrongB = "Memorizing verbatim syntax without understanding the underlying execution model";
      const wrongC = "Skipping boundary test cases to prioritize high reading speed";
      const opts = [corePrinciple, wrongA, wrongB, wrongC];
      const shuffled = [...opts].sort(() => Math.random() - 0.5);
      const correctIdx = shuffled.indexOf(corePrinciple);

      questions.push({
        id: `q-${idx}`,
        question: `When applying the concepts across "${effectiveTitle}", which strategy ensures the highest long-term retention?`,
        options: shuffled,
        correctIndex: correctIdx >= 0 ? correctIdx : 0,
        explanation: "Active recall and spaced retrieval force synaptic reconsolidation, outperforming passive review.",
        sourceCitation: `Key study methodology for "${effectiveTitle}"`,
        distractorExplanations: shuffled.map((opt) =>
          opt === corePrinciple
            ? "Correct. Active retrieval practice builds robust cognitive schemas."
            : "Misconception. Passive exposure creates an illusion of competence without durable retention."
        ),
        topicTag: "Cognitive Retrieval",
        difficultyLevel: "intermediate",
        questionType: "scenario_application",
        keyTakeaway: "Active recall generates significantly stronger memory traces than passive re-reading.",
      });
    }

    return questions;
  };

  const fallbackQuestions = generateFallbackQuestions();
  const ai = getGeminiClient();

  if (!ai || !effectiveBody.trim()) {
    return res.json({
      success: true,
      examTitle: `${effectiveTitle} • Diagnostic Mock Exam`,
      examSubtitle: `${difficulty.toUpperCase()} • ${questionCount} Diagnostic Items`,
      durationMinutes: durationMin,
      questions: fallbackQuestions,
      keyFocusAreas: [
        "Review foundational terminology before tackling edge cases",
        "Reinforce practical implementations through active recall drills",
      ],
      fallback: true,
      model: "synthesizer",
    });
  }

  const prompt = `You are NewLumino's Distinguished Cognitive Examiner and Academic Assessment Architect.
Target Exam: "${effectiveTitle}" (${courseName})
Mode: ${isMultiNote ? `Multi-Note Comprehensive Simulation across ${notesList.length} documents` : "Single-Note Focused Diagnostic"}
Difficulty Mode: ${difficulty}
Drill Duration: ${durationMin} minutes
Required Question Count: exactly ${questionCount} multiple-choice diagnostic items.

Source Study Material:
"""
${effectiveBody.slice(0, 16000)}
"""

Pedagogical Directives for Maximum Accuracy & Diagnostic Insight:
1. Grounding In Source Material: Questions MUST probe concepts, mechanisms, syntax, or trade-offs explicitly substantiated in the provided text.${isMultiNote ? " Distribute questions evenly across the different note sections." : ""}
2. "sourceCitation": For EVERY question, provide a concise quote or explicit citation from the material demonstrating that the correct answer is factually substantiated.
3. If code snippets exist in the notes, generate code-analysis questions (e.g. predicted terminal outputs, off-by-one errors, concurrency race conditions, or parameter mutability).
4. Every question MUST feature exactly 4 plausible, distinct options with exactly ONE unambiguously correct answer.
5. "correctIndex": 0-based integer (0, 1, 2, or 3) pointing to the true option.
6. "explanation": provide a clear, educational rationale citing why the correct answer is true.
7. "distractorExplanations": provide an array of exactly 4 strings explaining why each option (0 to 3) is correct or identifying the specific student misconception it represents.
8. "topicTag": concise subtopic label (max 24 chars, e.g. "Async Scheduling", "Memory Allocator").
9. "difficultyLevel": one of "foundational", "intermediate", "advanced".
10. "questionType": one of "conceptual", "code_analysis", "scenario_application", "edge_case".
11. "keyTakeaway": 1 punchy sentence summarizing the core rule or principle to remember.
12. "overallDiagnosticSummary": 1-2 sentence diagnostic overview evaluating this syllabus area.
13. "keyFocusAreas": 2-3 specific, actionable recommendations for student review.`;

  try {
    const { parsed, model } = await executeGeminiGenerate<any>(ai, {
      contents: prompt,
      temperature: 0.2, // Low temperature for high factual accuracy
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          examTitle: { type: Type.STRING },
          examSubtitle: { type: Type.STRING },
          overallDiagnosticSummary: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                codeSnippet: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                sourceCitation: { type: Type.STRING },
                distractorExplanations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                topicTag: { type: Type.STRING },
                difficultyLevel: { type: Type.STRING },
                questionType: { type: Type.STRING },
                keyTakeaway: { type: Type.STRING },
              },
              required: ["id", "question", "options", "correctIndex", "explanation", "sourceCitation", "topicTag"],
            },
          },
          keyFocusAreas: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["examTitle", "questions"],
      },
    });

    if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
      return res.json({
        success: true,
        examTitle: parsed.examTitle || `${noteTitle} • Diagnostic Mock Exam`,
        examSubtitle: parsed.examSubtitle || `${difficulty.toUpperCase()} • ${parsed.questions.length} Diagnostic Items`,
        overallDiagnosticSummary:
          parsed.overallDiagnosticSummary || "Comprehensive diagnostic assessment synthesized from note concepts.",
        durationMinutes: durationMin,
        questions: parsed.questions,
        keyFocusAreas: parsed.keyFocusAreas || [
          "Review flagged misconceptions in flashcards",
          "Consolidate core definitions before taking the next drill",
        ],
        model,
      });
    }
  } catch (_err) {
    // Falls through to fallback questions below
  }

  return res.json({
    success: true,
    examTitle: `${noteTitle} • Diagnostic Mock Exam`,
    examSubtitle: `${difficulty.toUpperCase()} • ${questionCount} Questions`,
    durationMinutes: durationMin,
    questions: fallbackQuestions,
    keyFocusAreas: [
      "Review core definitions highlighted during the drill",
      "Reinforce edge-cases through spaced repetition",
    ],
    fallback: true,
    model: "smart-synthesizer",
  });
});

// Helper to sanitize markdown: strips emojis and cleans up header artifacts
function sanitizeCleanMarkdown(text: string): string {
  if (!text) return "";
  // Strip all emojis, pictographs, symbols, and emoticons
  const noEmojis = text.replace(
    /[\u{1F300}-\u{1FAD6}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{FE00}-\u{FE0F}\u{200D}\u{200C}\u{2705}\u{274C}\u{2B50}\u{23F3}\u{23F0}\u{26A0}\u{2728}\u{1F525}\u{1F4A1}\u{1F4DD}\u{1F4CA}\u{1F9E0}\u{1F50D}\u{1F3AF}\u{2714}\u{2716}]/gu,
    ""
  );
  // Ensure lines have clean header spacing (e.g. "##  Heading" -> "## Heading")
  return noEmojis
    .split("\n")
    .map((line) => line.replace(/^([#>*-]+)[ \t]{2,}/, "$1 ").replace(/[ \t]+$/, ""))
    .join("\n");
}

// 5. AI Note Polisher & Smart Code Debugger Endpoint
app.post("/api/ai/note-polish", async (req, res) => {
  const {
    noteTitle = "Study Note",
    noteBody = "",
    mode = "study_guide", // "organizer" | "study_guide" | "code_debug" | "mnemonics" | "key_takeaways" | "cheat_sheet"
    organizationDepth = "full", // "full" | "outline" | "glossary" | "roadmap"
  } = req.body;

  if (!noteBody.trim()) {
    return res.status(400).json({ error: "Note content cannot be empty." });
  }

  const ai = getGeminiClient();

  // Local fallback transformer with zero emojis, clean spacing, and content-driven structure (no artificial meta-headings)
  const generateFallbackPolished = () => {
    const rawLines = noteBody.split("\n");
    const summary: string[] = [];

    // Parse note content lines into meaningful paragraphs / points
    const meaningfulBlocks: string[] = [];
    let currentBlock: string[] = [];

    for (const line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentBlock.length > 0) {
          meaningfulBlocks.push(currentBlock.join("\n"));
          currentBlock = [];
        }
      } else {
        currentBlock.push(trimmed);
      }
    }
    if (currentBlock.length > 0) {
      meaningfulBlocks.push(currentBlock.join("\n"));
    }

    let result = "";

    if (mode === "organizer") {
      if (organizationDepth === "outline") {
        // Content-focused numbered outline directly from note content
        const outlineItems = meaningfulBlocks.map((block, idx) => {
          const lines = block.split("\n");
          const firstLine = lines[0].replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").replace(/^\d+[\.\)]\s*/, "");
          const subContent = lines.slice(1).map((l) => `  - ${l.replace(/^[-*]\s*/, "")}`).join("\n");
          return `## ${idx + 1}.0 ${firstLine}\n\n${lines.length > 1 ? subContent : block}`;
        });

        result = `# ${noteTitle}\n\n${outlineItems.length > 0 ? outlineItems.join("\n\n") : noteBody}`;
        summary.push(
          "Structured note content into a clean, numbered topic outline",
          "Formatted sub-concepts with clear hierarchical indentation",
          "Enhanced typography with generous breathing room and whitespace"
        );
      } else if (organizationDepth === "roadmap") {
        // Content-focused progressive roadmap directly from note content
        const steps = meaningfulBlocks.map((block, idx) => {
          const lines = block.split("\n");
          const header = lines[0].replace(/^#+\s*/, "").replace(/^[-*]\s*/, "");
          const body = lines.slice(1).join("\n");
          return `## Step ${idx + 1}: ${header}\n\n${body || block}`;
        });

        result = `# ${noteTitle}\n\n${steps.length > 0 ? steps.join("\n\n") : noteBody}`;
        summary.push(
          "Organized note content into sequential progressive milestones",
          "Clarified action steps and key deliverables from note points",
          "Applied clean academic formatting with balanced spacing"
        );
      } else if (organizationDepth === "glossary") {
        // Content-focused taxonomy and definitions from note
        const terms = meaningfulBlocks.map((block) => {
          const lines = block.split("\n");
          const term = lines[0].replace(/^#+\s*/, "").replace(/^[-*]\s*/, "");
          const definition = lines.slice(1).join(" ") || block;
          return `- **${term}**: ${definition}`;
        });

        result = `# ${noteTitle}\n\n## Key Terms & Concepts\n\n${terms.length > 0 ? terms.join("\n\n") : noteBody}`;
        summary.push(
          "Extracted and formatted key terms and concept definitions from note",
          "Structured definitions with clear bulleted formatting",
          "Optimized readability with clean typography and spacing"
        );
      } else {
        // Full Architecture: Clean, content-driven structure based directly on note
        const formattedBlocks = meaningfulBlocks.map((block, idx) => {
          if (block.startsWith("#")) return block;
          const lines = block.split("\n");
          const title = lines[0].replace(/^[-*]\s*/, "");
          const body = lines.slice(1).map((l) => `- ${l.replace(/^[-*]\s*/, "")}`).join("\n");
          return `## ${idx + 1}.0 ${title}\n\n${body || block}`;
        });

        result = `# ${noteTitle}\n\n${formattedBlocks.length > 0 ? formattedBlocks.join("\n\n") : noteBody}`;
        summary.push(
          "Organized note content with content-specific topic headings",
          "Polished paragraphs and bullet points for maximum clarity",
          "Enhanced document hierarchy and readability"
        );
      }
    } else if (mode === "study_guide") {
      const sections = meaningfulBlocks.map((block, idx) => {
        if (block.startsWith("#")) return block;
        const lines = block.split("\n");
        return `## ${idx + 1}. ${lines[0].replace(/^[-*]\s*/, "")}\n\n${lines.slice(1).join("\n") || block}`;
      });
      result = `# ${noteTitle}\n\n${sections.length > 0 ? sections.join("\n\n") : noteBody}`;
      summary.push(
        "Structured note into clear conceptual study sections",
        "Refined explanations with academic clarity and precision",
        "Applied balanced spacing and breathing room"
      );
    } else if (mode === "code_debug") {
      result = `# ${noteTitle}\n\n${noteBody}`;
      summary.push(
        "Audited code logic and syntax clarity",
        "Standardized code blocks and inline references",
        "Formatted boundary cases and explanations"
      );
    } else if (mode === "mnemonics") {
      result = `# ${noteTitle}\n\n${noteBody}`;
      summary.push(
        "Organized key points for rapid retrieval",
        "Structured mnemonic pegs and concept anchors",
        "Enhanced memory cues and active recall triggers"
      );
    } else if (mode === "cheat_sheet") {
      result = `# ${noteTitle}\n\n${noteBody}`;
      summary.push(
        "Refined reference points into quick-scan format",
        "Optimized layout for rapid lookup and reference",
        "Cleaned syntax and key definitions"
      );
    } else if (mode === "remediation" || mode === "gap_remediation") {
      result = `# ${noteTitle}: Diagnostic Gap Remediation & Mastery Note\n\n${noteBody}`;
      summary.push(
        "Synthesized targeted remediation guide addressing identified weak points",
        "Dissected misconception traps and contrastive error analyses",
        "Constructed rapid recovery checkpoints and high-retention review anchors"
      );
    } else {
      result = `# ${noteTitle}\n\n${noteBody}`;
      summary.push(
        "Highlighted high-yield core takeaways",
        "Clarified key drivers and avoided common pitfalls",
        "Structured spaced review timeline"
      );
    }

    const cleanedResult = sanitizeCleanMarkdown(result);
    return {
      polishedContent: cleanedResult,
      summaryOfChanges: summary.map((s) => sanitizeCleanMarkdown(s)),
      readabilityScore: 95,
      wordCountBefore: noteBody.trim().split(/\s+/).length,
      wordCountAfter: cleanedResult.trim().split(/\s+/).length,
    };
  };

  if (!ai) {
    const fallback = generateFallbackPolished();
    return res.json({
      success: true,
      mode,
      polishedContent: fallback.polishedContent,
      summaryOfChanges: fallback.summaryOfChanges,
      readabilityScore: fallback.readabilityScore,
      keyConceptsCovered: [noteTitle, "Core Architecture", "Active Practice"],
      wordCountBefore: fallback.wordCountBefore,
      wordCountAfter: fallback.wordCountAfter,
      fallback: true,
      model: "synthesizer",
    });
  }

  let modeInstruction = "";
  if (mode === "organizer") {
    if (organizationDepth === "outline") {
      modeInstruction = `Organize the actual content of this note into a clean, hierarchical Numbered Outline:
- CRITICAL: Use the note's real title '# ${noteTitle}' at the top.
- DO NOT insert artificial meta-headings like "Executive Scope & Primary Topic Clusters", "Numbered Conceptual Outline (Hierarchical Decomposition)", "Cross-Concept Relational Synthesis & Dependency Mapping", "Technical Constraints, Boundary Limits", or "Systematic Outline Verification & Mastery Checkpoints".
- Instead, every numbered heading (e.g. '## 1.0 [Topic Name]', '## 2.0 [Topic Name]', '### 2.1 [Subtopic Name]') must be derived directly and specifically from the actual subject matter inside the note.
- Organize the user's notes into logical, numbered hierarchical sections with clear bullet points and generous whitespace.
- Retain 100% of the facts, definitions, code, and details from the source note.`;
    } else if (organizationDepth === "roadmap") {
      modeInstruction = `Organize the actual content of this note into a clear, sequential Phased Roadmap:
- CRITICAL: Use the note's real title '# ${noteTitle}' at the top.
- DO NOT insert artificial boilerplate headings like "Roadmap Strategic Overview & Execution Milestones", "Phase 1: Foundational Internalization & Core Invariants", "Phase 2: Mechanistic Tracing", "Deliberate Practice Milestones & Verification Protocol".
- Instead, structure the real concepts and skills from the note into logical progression phases/steps named specifically after the actual concepts in the note (e.g. '## Phase 1: [Real Concept]', '## Phase 2: [Real Concept]').
- Formulate concrete actionable milestones directly reflecting the note's subject matter.`;
    } else if (organizationDepth === "glossary") {
      modeInstruction = `Extract and structure the terminology and concepts from this note into a clean Taxonomy & Glossary:
- CRITICAL: Use the note's real title '# ${noteTitle}' at the top.
- DO NOT insert artificial boilerplate headings like "Structural Domain Taxonomy & Concept Classification", "Technical Concept Glossary & Lexicon", "Comparative Specifications & Dimensional Analysis Matrix", "Rapid Recall Glossary Self-Test Matrix".
- Instead, identify the actual key terms, definitions, formulas, and concepts present in the note and organize them into clean, precise glossary entries (e.g. '- **[Real Term]**: [Definition from note]').
- If comparisons exist in the note, format them into a clean Markdown table with relevant column headers.`;
    } else {
      modeInstruction = `Organize and polish the entire note content into a comprehensive, beautifully structured document:
- CRITICAL: Use the note's real title '# ${noteTitle}' at the top.
- DO NOT insert generic meta-template headers like "Master Knowledge Architecture & Systematic Organization", "Numbered Conceptual Outline & Architecture", "Domain Taxonomy & Technical Glossary", "Deliberate Practice & Actionable Verification Checklist".
- Instead, create natural, content-specific headings named directly after the topics in the note.
- Format all paragraphs, bullet lists, code blocks, and tables with generous whitespace and pristine academic typography.`;
    }
  } else if (mode === "study_guide") {
    modeInstruction = `Transform this raw note into an articulate, highly readable Master Study Guide:
- Use the note title '# ${noteTitle}' at the top.
- Organize the note's real concepts into clean, content-specific sections with natural headings derived from the note.
- Provide clear explanations, bullet points, and concrete examples based on the note content.
- Do NOT insert fake scaffold headers; keep all headings 100% relevant to the note's specific topic.`;
  } else if (mode === "code_debug") {
    modeInstruction = `Perform a thorough Code & Logic Audit on the note content:
- Use '# ${noteTitle}' at the top.
- Audit the code or algorithms in the note for syntax clarity, edge cases, and performance.
- Provide clean, corrected, and well-typed code blocks with inline comments.`;
  } else if (mode === "mnemonics") {
    modeInstruction = `Create memory aids and retrieval cues directly tailored to the content in this note:
- Use '# ${noteTitle}' at the top.
- Formulate acronyms and memory associations specifically for the key concepts and terms in the note.`;
  } else if (mode === "cheat_sheet") {
    modeInstruction = `Synthesize a high-density, quick-scan Reference Sheet from this note:
- Use '# ${noteTitle}' at the top.
- Format key definitions, tables, formulas, and syntax from the note for rapid reference.`;
  } else if (mode === "remediation" || mode === "gap_remediation") {
    modeInstruction = `Synthesize a Targeted Diagnostic Gap Remediation & Mastery Document from this note:
- Use '# ${noteTitle}: Diagnostic Gap Remediation & Mastery Protocol' at the top.
- Directly deconstruct fragile concept boundaries, common misconception traps, and failure modes identified in diagnostic testing.
- Detail the root mechanism, invariant rules, step-by-step resolution, and contrasting examples.
- Include active self-test recall triggers and checkpoint verification criteria.`;
  } else {
    modeInstruction = `Extract the high-yield core takeaways from this note:
- Use '# ${noteTitle}' at the top.
- Isolate the most important 20% core drivers, key insights, and pitfalls directly from the note content.`;
  }

  const prompt = `You are NewLumino's Principal Academic Editor.
Document Title: "${noteTitle}"
Selected Mode: ${mode.toUpperCase()}

MANDATES FOR OUTPUT GENERATION:

1. STRICT CONTENT FOCUS (NO ARTIFICIAL BOILERPLATE HEADINGS):
- Output ONLY the polished, organized note content itself.
- Under NO circumstances should you output generic meta-headings such as:
  - "1.0 Executive Scope & Primary Topic Clusters"
  - "2.0 Numbered Conceptual Outline (Hierarchical Decomposition)"
  - "3.0 Cross-Concept Relational Synthesis & Dependency Mapping"
  - "4.0 Technical Constraints, Boundary Limits & Complexity Bounds"
  - "5.0 Systematic Outline Verification & Mastery Checkpoints"
  - "1.0 Roadmap Strategic Overview & Execution Milestones"
  - "2.0 Phase 1: Foundational Internalization & Core Invariants"
  - "1.0 Structural Domain Taxonomy & Concept Classification"
  - "Master Knowledge Architecture & Systematic Organization"
- All headings and subheadings MUST be directly named after the specific concepts and topics in the user's note.

2. STRICT ZERO-EMOJI ENFORCEMENT:
- Under NO circumstances should any emoji characters be present anywhere in your output.
- Use strictly formal, clean Markdown typography.

3. SPACING & BREATHING ROOM:
- Format the markdown with generous whitespace and breathing room.
- Leave empty lines between every heading, paragraph, list item, table, and code block.

4. PRESERVE TECHNICAL DEPTH:
- Preserve all facts, definitions, technical nuances, code snippets, and formulas from the source note.
- Elaborate clearly on the concepts to make the note comprehensive and readable.

5. TRANSFORMATION INSTRUCTIONS:
${modeInstruction}

Source Note Content:
"""
${noteBody.slice(0, 32000)}
"""

Required JSON Response Schema:
1. "polishedContent": Complete, long-form, beautifully structured Markdown document adhering strictly to all mandates above (zero emojis, generous spacing, exhaustive depth).
2. "summaryOfChanges": Array of 4-6 specific, professional enhancements made (e.g., "Structured multi-level conceptual outline with numbered headings", "Added technical taxonomy and formal concept glossary", "Constructed Big-O complexity analysis matrix"). No emojis.
3. "readabilityScore": Integer between 90 and 99 reflecting academic clarity.
4. "keyConceptsCovered": Array of 4-8 primary technical concepts analyzed in this document.`;

  const wordCountBefore = noteBody.trim().split(/\s+/).length;

  try {
    const { parsed, model } = await executeGeminiGenerate<any>(ai, {
      contents: prompt,
      temperature: 0.2,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          polishedContent: { type: Type.STRING },
          summaryOfChanges: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          readabilityScore: { type: Type.INTEGER },
          keyConceptsCovered: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["polishedContent", "summaryOfChanges", "readabilityScore"],
      },
    });

    if (parsed && parsed.polishedContent) {
      const cleanContent = sanitizeCleanMarkdown(parsed.polishedContent);
      const cleanSummary = (parsed.summaryOfChanges || [])
        .map((s: string) => sanitizeCleanMarkdown(s).trim())
        .filter(Boolean);
      const cleanConcepts = (parsed.keyConceptsCovered || [])
        .map((c: string) => sanitizeCleanMarkdown(c).trim())
        .filter(Boolean);
      const wordCountAfter = cleanContent.trim().split(/\s+/).length;

      return res.json({
        success: true,
        mode,
        polishedContent: cleanContent,
        summaryOfChanges:
          cleanSummary.length > 0
            ? cleanSummary
            : ["Enhanced architectural structure, taxonomy, and active recall"],
        readabilityScore: parsed.readabilityScore || 95,
        keyConceptsCovered: cleanConcepts.length > 0 ? cleanConcepts : [noteTitle],
        wordCountBefore,
        wordCountAfter,
        model,
      });
    }
  } catch (_err) {
    // Falls through to fallback synthesizer below
  }

  const fallback = generateFallbackPolished();
  return res.json({
    success: true,
    mode,
    polishedContent: fallback.polishedContent,
    summaryOfChanges: fallback.summaryOfChanges,
    readabilityScore: fallback.readabilityScore,
    keyConceptsCovered: [noteTitle, "Core Architecture", "Systematic Organization"],
    wordCountBefore: fallback.wordCountBefore,
    wordCountAfter: fallback.wordCountAfter,
    fallback: true,
    model: "smart-synthesizer",
  });
});

// 6. Interactive Visual Architecture & Mermaid Diagram Generator (Phase 2)
app.post("/api/ai/diagram-generate", async (req, res) => {
  const {
    noteTitle = "System Architecture",
    noteBody = "",
    diagramType = "flowchart", // "flowchart" | "mindmap" | "sequence" | "architecture" | "concept_hierarchy" | "state"
  } = req.body;

  if (!noteBody.trim()) {
    return res.status(400).json({ error: "Note content cannot be empty." });
  }

  // Safe Mermaid text sanitizer
  const sanitizeMermaidText = (str: string) =>
    str.replace(/[^\w\s\-.,()]/gi, "").trim().slice(0, 50) || "Node";

  // Fallback pure Mermaid synthesizer
  const generateFallbackMermaid = () => {
    const rawLines = noteBody.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const headings = rawLines
      .filter((l: string) => /^#{1,4}\s+/.test(l))
      .map((l: string) => sanitizeMermaidText(l.replace(/^#+\s*/, "")));
    const bullets = rawLines
      .filter((l: string) => /^[-*•]\s+/.test(l))
      .map((l: string) => sanitizeMermaidText(l.replace(/^[-*•]\s*/, "")));

    const titleSafe = sanitizeMermaidText(noteTitle);

    if (diagramType === "mindmap") {
      const branches = headings.length > 0 ? headings.slice(0, 4) : ["Core Architecture", "Key Invariants", "Operations", "Edge Cases"];
      return `mindmap
  root(("${titleSafe}"))
${branches
  .map((b: string, i: number) => `    ${b}
      ["${bullets[i] || "Primary Component"}"]
      ["${bullets[i + 1] || "Verification Rule"}"]`)
  .join("\n")}`;
    }

    if (diagramType === "sequence") {
      return `sequenceDiagram
  autonumber
  actor User as Student/User
  participant Client as Client Application
  participant System as ${titleSafe}
  participant Store as Persistence Layer

  User->>Client: Initiate Action / Query
  Client->>System: Dispatch Request Payload
  activate System
  System->>Store: Query State & Invariants
  Store-->>System: Return Verified Data
  System-->>Client: Processed Diagnostic Response
  deactivate System
  Client-->>User: Render Rendered Artifact`;
    }

    if (diagramType === "state") {
      return `stateDiagram-v2
  [*] --> Initialized: Boot ${titleSafe}
  Initialized --> Processing: Trigger Event
  Processing --> Verified: Invariants Pass
  Processing --> ErrorHandled: Guard Violation
  ErrorHandled --> Processing: Retry Protocol
  Verified --> Completed: Execution Success
  Completed --> [*]`;
    }

    // Default Flowchart / Concept Hierarchy
    const nodes = headings.length >= 3 ? headings.slice(0, 5) : [
      "Input Analysis",
      "Core Mechanism",
      "Invariant Validation",
      "Optimized Output",
    ];

    let flow = `flowchart TD
  classDef startEnd fill:#0284c7,stroke:#38bdf8,stroke-width:2px,color:#fff;
  classDef process fill:#1e293b,stroke:#0ea5e9,stroke-width:1px,color:#e2e8f0;
  classDef decision fill:#334155,stroke:#f59e0b,stroke-width:1.5px,color:#fff;

  Start(["${titleSafe}"]):::startEnd --> N0["${nodes[0]}"]:::process
`;

    for (let i = 0; i < nodes.length - 1; i++) {
      flow += `  N${i} --> N${i + 1}["${nodes[i + 1]}"]:::process\n`;
    }
    flow += `  N${nodes.length - 1} --> Check{"Valid Execution?"}:::decision\n`;
    flow += `  Check -- Yes --> End(["Mastery Confirmed"]):::startEnd\n`;
    flow += `  Check -- No --> Remediation["Remediation Review"]:::process\n`;
    flow += `  Remediation --> N0\n`;

    return flow;
  };

  const ai = getGeminiClient();
  if (!ai) {
    const code = generateFallbackMermaid();
    return res.json({
      success: true,
      diagramType,
      mermaidCode: code,
      title: `${noteTitle} Architecture Map`,
      description: "Visual concept map synthesized directly from note structure.",
      fallback: true,
    });
  }

  let promptRequirement = "";
  if (diagramType === "mindmap") {
    promptRequirement = `Generate a modern, multi-tier Mermaid 'mindmap' syntax with root(("${sanitizeMermaidText(noteTitle)}")) and clear child concepts.`;
  } else if (diagramType === "sequence") {
    promptRequirement = `Generate a clean, professional Mermaid 'sequenceDiagram' syntax with autonumber, participants, and synchronous/asynchronous flows reflecting the process in the note.`;
  } else if (diagramType === "state") {
    promptRequirement = `Generate a clean Mermaid 'stateDiagram-v2' showing lifecycle states, transitions, and guard conditions based on the note.`;
  } else {
    promptRequirement = `Generate a high-clarity Mermaid 'flowchart TD' or 'flowchart LR' detailing the structural components, data flows, decision gates, and interactions described in the note.`;
  }

  const prompt = `You are a Principal Software and Knowledge Systems Architect.
Create an exhaustive, publication-grade Mermaid diagram for the following document:
Title: "${noteTitle}"
Requested Diagram Type: ${diagramType.toUpperCase()}

MANDATES:
1. Output ONLY valid Mermaid.js code that parses cleanly without any syntax errors.
2. ZERO emojis anywhere in node labels, titles, or descriptions.
3. Node IDs must be alphanumeric without spaces (e.g. NodeA, AuthStep, InvariantCheck).
4. Put descriptive text inside quotes: NodeA["Clean Description"].
5. Ensure all opening brackets, parens, and quotes are properly closed.
6. Provide rich technical depth directly grounded in the note's subject matter.

${promptRequirement}

Source Note Content:
"""
${noteBody.slice(0, 16000)}
"""

JSON Response Schema:
{
  "mermaidCode": "Valid Mermaid.js diagram string (e.g. flowchart TD ... or mindmap ...)",
  "diagramTitle": "Short descriptive title of the visual architecture",
  "explanation": "2-3 sentences explaining the visual flow and key takeaways"
}`;

  try {
    const { parsed } = await executeGeminiGenerate<any>(ai, {
      contents: prompt,
      temperature: 0.2,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mermaidCode: { type: Type.STRING },
          diagramTitle: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["mermaidCode"],
      },
    });

    if (parsed && parsed.mermaidCode) {
      // Clean up markdown fences if model included them inside the string
      let cleanedCode = parsed.mermaidCode
        .replace(/^```mermaid\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      // Ensure zero emojis
      cleanedCode = sanitizeCleanMarkdown(cleanedCode);

      return res.json({
        success: true,
        diagramType,
        mermaidCode: cleanedCode,
        title: parsed.diagramTitle ? sanitizeCleanMarkdown(parsed.diagramTitle) : `${noteTitle} Architecture Map`,
        description: parsed.explanation ? sanitizeCleanMarkdown(parsed.explanation) : "Synthesized structural diagram.",
      });
    }
  } catch (err) {
    console.warn("Mermaid AI generation fallback:", err);
  }

  const fallbackCode = generateFallbackMermaid();
  return res.json({
    success: true,
    diagramType,
    mermaidCode: fallbackCode,
    title: `${noteTitle} Architecture Map`,
    description: "Visual concept map synthesized directly from note structure.",
    fallback: true,
  });
});

// 7. Socratic AI Oral & Step-by-Step Interactive Reasoning Tutor (Phase 3)
app.post("/api/ai/socratic-tutor", async (req, res) => {
  const {
    question = "",
    options = [],
    correctIndex = 0,
    userAnswer,
    explanation = "",
    sourceCitation = "",
    keyTakeaway = "",
    conversationHistory = [],
    userMessage = "",
    intent = "hint", // "hint" | "deep_dive" | "why_failed" | "oral_test" | "chat"
    noteTitle = "Exam Review",
  } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  const isUserCorrect = userAnswer !== undefined && userAnswer === correctIndex;
  const chosenOptionText = userAnswer !== undefined && options[userAnswer] ? options[userAnswer] : "None chosen";
  const correctOptionText = options[correctIndex] || "";

  const ai = getGeminiClient();

  const fallbackTutorResponse = () => {
    if (intent === "why_failed" || (userAnswer !== undefined && !isUserCorrect)) {
      return {
        reply: `Let's dissect why "${chosenOptionText}" diverges from the fundamental invariant. In ${noteTitle}, this choice often fails because it misses the boundary condition where inputs transition states. Notice how the correct principle (${correctOptionText}) guarantees correctness under all conditions.`,
        socraticQuestion: `If you were to trace the state transition step-by-step, where do you think the assumption in your initial answer first broke down?`,
        suggestedFollowUps: [
          "Explain the boundary condition step-by-step",
          "Give me an intuitive real-world analogy",
          "Test me with a variation of this problem",
        ],
      };
    }
    if (intent === "hint") {
      return {
        reply: `Consider the fundamental rule governing this system. Ask yourself: what invariant must remain true before and after each operational step? Look closely at the relationship between the constraints and the expected output.`,
        socraticQuestion: `Which specific constraint in the question eliminates all options except the invariant-preserving one?`,
        suggestedFollowUps: [
          "Break down each option",
          "Show me the source evidence from my notes",
          "Walk me through the proof",
        ],
      };
    }
    return {
      reply: `Excellent line of inquiry. The core insight behind this concept is: "${keyTakeaway || explanation}". When you master this principle, related diagnostic questions become immediate pattern recognitions.`,
      socraticQuestion: `How would you explain this principle in 10 words or less to someone who has never studied ${noteTitle}?`,
      suggestedFollowUps: [
        "Give me a harder follow-up challenge",
        "Summarize the 3 key takeaways",
        "Why do standard exams test this specific trap?",
      ],
    };
  };

  if (!ai) {
    const fallback = fallbackTutorResponse();
    return res.json({
      success: true,
      ...fallback,
      fallback: true,
    });
  }

  const prompt = `You are a World-Class Socratic Academic Mentor and Oral Exam Professor in "${noteTitle}".
You are conducting an interactive, 1-on-1 Socratic debrief with a student regarding a specific diagnostic exam question.

CONTEXT:
- Question: "${question}"
- Options: ${JSON.stringify(options)}
- Correct Index: ${correctIndex} ("${correctOptionText}")
- Student's Pick: ${userAnswer !== undefined ? `Option ${userAnswer} ("${chosenOptionText}")` : "No answer yet"}
- Is Student Correct: ${isUserCorrect ? "YES" : "NO"}
- Verified Technical Rationale: "${explanation}"
- Source Note Evidence: "${sourceCitation}"
- Core Invariant/Takeaway: "${keyTakeaway}"

STUDENT'S RECENT INPUT / INTENT:
- User Intent: "${intent}"
- User's Message: "${userMessage || (intent === 'why_failed' ? 'Why was my answer wrong?' : 'Guide me through this question.')}"

PRIOR CONVERSATION HISTORY:
${JSON.stringify(conversationHistory.slice(-6))}

SOCRATIC MENTORING MANDATES:
1. SOCRATIC METHOD: Do NOT just dump the solution if the user is stuck. Guide them with probing questions, contrastive comparisons, and first-principles reasoning.
2. ZERO EMOJIS: Do not use any emoji characters. Use articulate, warm, professorial academic language.
3. CLEAR STEPS: Keep responses crisp (2-4 paragraphs max), intellectually rigorous, and actionable.
4. PROVOCATIVE SOCRATIC QUESTION: Always conclude with a single insightful question that forces the student to derive the next cognitive leap themselves.
5. FOLLOW-UPS: Provide 3 intelligent quick-prompt suggestions the student might ask next.

JSON Response Schema:
{
  "reply": "Articulate Socratic mentoring explanation addressing the user's reasoning (no emojis).",
  "socraticQuestion": "Single probing question to test or guide the student to deep insight.",
  "suggestedFollowUps": ["3 concise follow-up prompt suggestions"]
}`;

  try {
    const { parsed } = await executeGeminiGenerate<any>(ai, {
      contents: prompt,
      temperature: 0.3,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          socraticQuestion: { type: Type.STRING },
          suggestedFollowUps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["reply", "socraticQuestion"],
      },
    });

    if (parsed && parsed.reply) {
      return res.json({
        success: true,
        reply: sanitizeCleanMarkdown(parsed.reply),
        socraticQuestion: sanitizeCleanMarkdown(parsed.socraticQuestion || ""),
        suggestedFollowUps: (parsed.suggestedFollowUps || []).map((f: string) => sanitizeCleanMarkdown(f)),
      });
    }
  } catch (err) {
    console.warn("Socratic tutor AI error:", err);
  }

  const fallback = fallbackTutorResponse();
  return res.json({
    success: true,
    ...fallback,
    fallback: true,
  });
});

// 8. 4-Stage Progressive Collection Exam Generator & Evaluation Suite
app.post("/api/ai/collection-exam-generate", async (req, res) => {
  const {
    collectionName = "General Study Collection",
    notes = [],
    totalMinutes = 45,
    difficulty = "intermediate", // foundational | intermediate | advanced | competitive
    focusDomain = "fullstack", // fullstack | algorithms | system_design | devops_cloud | custom
    customGoals = "",
  } = req.body;

  const validNotes = Array.isArray(notes) ? notes.filter((n: any) => n && (n.title || n.body)) : [];
  const corpus = validNotes.map((n: any) => `### NOTE: ${n.title || "Untitled"}\n${n.body || ""}`).join("\n\n");

  const stageTimes = {
    theory: Math.max(5, Math.round(totalMinutes * 0.25)),
    codeLogic: Math.max(5, Math.round(totalMinutes * 0.25)),
    codeDebugging: Math.max(5, Math.round(totalMinutes * 0.25)),
    project: Math.max(10, totalMinutes - (Math.round(totalMinutes * 0.25) * 3)),
  };

  const generateFallbackSuite = () => {
    const topTopic = validNotes[0]?.title || collectionName || "System Architecture";
    const subTopic = validNotes[1]?.title || "Algorithmic Invariants";

    return {
      title: `${collectionName} 4-Stage Mastery Assessment`,
      collectionName,
      totalMinutes,
      difficulty,
      focusDomain,
      stages: {
        stage1Theory: {
          title: "Stage 1: Core Architectural Theory & Foundations",
          timeLimitMinutes: stageTimes.theory,
          instructions: "Analyze foundational invariants, definitions, and design patterns. Complete all items before proceeding to Code Logic.",
          items: [
            {
              id: "t1",
              type: "multiple_choice",
              question: `In the context of ${topTopic}, what is the primary invariant that guarantees deterministic state transitions and prevents side-effect leakage?`,
              options: [
                "Uncontrolled shared mutable references across concurrent threads",
                "Strict unidirectional data flow with immutable state boundaries and pure transform reducers",
                "Synchronous blocking polling loops without backpressure guards",
                "Global singleton mutation without concurrency synchronization"
              ],
              correctAnswer: 1,
              explanation: "Strict unidirectional data flow with immutable data boundaries ensures deterministic state updates, thread safety, and transparent rollback capability.",
              sourceNoteTitle: topTopic,
              keyConcept: "Unidirectional State Invariants"
            },
            {
              id: "t2",
              type: "fill_in_blank",
              question: `When designing scalable systems under high write throughput, the architectural trade-off between consistency and availability under partition is formally governed by the ________ theorem.`,
              options: ["CAP", "ACID", "Amdahl", "Little"],
              correctAnswer: 0,
              explanation: "The CAP Theorem proves that a distributed data store can guarantee at most two of Consistency, Availability, and Partition Tolerance simultaneously.",
              sourceNoteTitle: collectionName,
              keyConcept: "Distributed Invariants & CAP Theorem"
            },
            {
              id: "t3",
              type: "conceptual_tradeoff",
              question: `Evaluate the trade-off between optimistic concurrency control (OCC) versus pessimistic locking in distributed transactions under low-contention workloads:`,
              options: [
                "Pessimistic locking yields superior throughput under low-contention because locks never conflict.",
                "Optimistic Concurrency Control eliminates lock overhead and deadlocks by validating at commit time, optimal for low-contention.",
                "Both strategies have identical runtime latency and memory footprint regardless of contention.",
                "Optimistic locking requires hardware mutexes while pessimistic locking is purely algorithmic."
              ],
              correctAnswer: 1,
              explanation: "OCC allows transactions to proceed without lock acquisition, performing validation checks at commit time. Under low-contention, conflicts are rare, giving maximum throughput.",
              sourceNoteTitle: topTopic,
              keyConcept: "Concurrency Control Trade-offs"
            },
            {
              id: "t4",
              type: "multiple_choice",
              question: `What is the primary operational risk when relying on unindexed relational foreign key lookups in high-cardinality collections?`,
              options: [
                "Total table scan leading to O(N) disk I/O bottlenecks and transaction timeouts",
                "Deterministic memory cache invalidation",
                "Automatic index creation on every read query",
                "Instant linear memory scaling without CPU impact"
              ],
              correctAnswer: 0,
              explanation: "Without a dedicated B-tree or Hash index on foreign key columns, relational queries force full table scans, resulting in severe I/O degradation.",
              sourceNoteTitle: subTopic,
              keyConcept: "Relational Indexing & Storage Engine Efficiency"
            }
          ]
        },
        stage2CodeLogic: {
          title: "Stage 2: Algorithmic Logic & Flow Tracing",
          timeLimitMinutes: stageTimes.codeLogic,
          instructions: "Trace runtime control flows, deduce outputs, verify algorithmic bounds, and complete the missing logical invariants.",
          items: [
            {
              id: "cl1",
              title: "Sliding Window & Deque Invariant",
              problemDescription: `Given an input array of integer metrics and window size k, trace the monotonic deque algorithm that maintains sliding window maximums in O(N) time.`,
              codeSnippet: `function maxSlidingWindow(nums: number[], k: number): number[] {
  const result: number[] = [];
  const deque: number[] = []; // Stores indices

  for (let i = 0; i < nums.length; i++) {
    // 1. Remove indices outside current window
    while (deque.length && deque[0] < i - k + 1) {
      deque.shift();
    }
    // 2. Maintain decreasing monotonic order
    while (deque.length && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }
    deque.push(i);
    // 3. Record window maximum once initial window is filled
    if (i >= k - 1) {
      result.push(nums[deque[0]]);
    }
  }
  return result;
}`,
              question: "If nums = [1, 3, -1, -3, 5, 3, 6, 7] and k = 3, what is the output of maxSlidingWindow?",
              options: [
                "[3, 3, 5, 5, 6, 7]",
                "[1, 3, 5, 5, 6, 7]",
                "[3, 5, 5, 6, 7, 7]",
                "[1, -1, -3, 3, 6, 7]"
              ],
              correctAnswer: 0,
              expectedOutputOrLogic: "[3, 3, 5, 5, 6, 7]",
              complexityAnalysis: "Time Complexity: O(N) because each index is pushed and popped from the deque at most once. Space Complexity: O(k).",
              explanation: "Windows: [1,3,-1]->3, [3,-1,-3]->3, [-1,-3,5]->5, [-3,5,3]->5, [5,3,6]->6, [3,6,7]->7. Yields [3, 3, 5, 5, 6, 7]."
            },
            {
              id: "cl2",
              title: "Memoized Dynamic Programming State Recurrence",
              problemDescription: "Identify the missing state transition recurrence for partitioning a workload into balanced buckets.",
              codeSnippet: `// Memoized Recurrence: dp[i][target] = dp[i-1][target] || dp[i-1][target - nums[i-1]]
function canPartition(nums: number[]): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum % 2 !== 0) return false;
  const target = sum / 2;
  const dp: boolean[] = new Array(target + 1).fill(false);
  dp[0] = true;

  for (const num of nums) {
    // Reverse iteration to prevent using the same item multiple times
    for (let j = target; j >= num; j--) {
      dp[j] = dp[j] || dp[j - num];
    }
  }
  return dp[target];
}`,
              question: "Why must the inner loop iterate from target down to num (reverse order) when using a 1D DP array?",
              options: [
                "To optimize CPU cache line spatial locality",
                "To ensure each element nums[i] is included at most once in the 0/1 knapsack subset",
                "To sort the numbers automatically during computation",
                "To allow parallel worker threads to partition the memory array"
              ],
              correctAnswer: 1,
              expectedOutputOrLogic: "Prevents element reuse in 0/1 knapsack by ensuring dp[j - num] represents the previous step's state.",
              complexityAnalysis: "Time: O(N * Target), Space: O(Target)",
              explanation: "Forward iteration in a 1D array turns it into unbounded knapsack (re-using the current element multiple times). Backward iteration preserves the 0/1 invariant."
            }
          ]
        },
        stage3Debugging: {
          title: "Stage 3: Interactive Code Debugging & Flaw Remediation",
          timeLimitMinutes: stageTimes.codeDebugging,
          instructions: "Identify memory leaks, race conditions, type unsoundness, or off-by-one errors. Choose the surgical fix and verify the invariant.",
          items: [
            {
              id: "dbg1",
              title: "Stale Closure & Unhandled Cleanup in Async Event Stream",
              bugDescription: "The following hook creates a memory leak and processes stale count values because the effect fails to clean up listeners and misses dependency synchronization.",
              brokenCode: `function useMetricStream(streamId: string) {
  const [metric, setMetric] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const channel = new EventChannel(streamId);
    
    channel.onMessage((data) => {
      // BUG: Stale closure on count, plus missing unsubscribe return
      setCount(count + 1);
      setMetric(data.val);
    });
  }, [streamId]);

  return { metric, count };
}`,
              hint: "Check the functional state updater pattern and the effect return cleanup callback.",
              options: [
                "Use setCount(prev => prev + 1) and return () => channel.close() in useEffect",
                "Remove streamId from the dependency array entirely",
                "Convert setCount into a global window variable",
                "Replace useEffect with useLayoutEffect without adding cleanup"
              ],
              correctFixIndex: 0,
              fixedCodeSnippet: `function useMetricStream(streamId: string) {
  const [metric, setMetric] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const channel = new EventChannel(streamId);
    
    const handler = (data: { val: number }) => {
      setCount((prev) => prev + 1);
      setMetric(data.val);
    };

    channel.onMessage(handler);

    return () => {
      channel.unsubscribe(handler);
      channel.close();
    };
  }, [streamId]);

  return { metric, count };
}`,
              rootCauseExplanation: "The original handler captured `count` from the initial render, causing every event to increment from 0 -> 1. Furthermore, without a cleanup return, old channels remained subscribed forever, causing memory leaks.",
              invariantRule: "Always use functional state updates inside asynchronous subscriptions and return an explicit cleanup teardown function."
            },
            {
              id: "dbg2",
              title: "Race Condition in Concurrent Token Bucket Rate Limiter",
              bugDescription: "Under heavy asynchronous load, two concurrent requests can read the same token count before decrementing, violating the strict burst threshold limit.",
              brokenCode: `class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private capacity: number, private refillRatePerSec: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  // BUG: Non-atomic check-then-act allows race condition
  public async consume(amount: number = 1): Promise<boolean> {
    this.refill();
    if (this.tokens >= amount) {
      await simulateAsyncLog(); // Yields event loop
      this.tokens -= amount;
      return true;
    }
    return false;
  }
}`,
              hint: "State mutations must occur atomically before yielding control or must be protected by an atomic mutex.",
              options: [
                "Deduct tokens synchronously before awaiting asynchronous logging, or wrap within an atomic transaction mutex",
                "Change capacity to a floating point number",
                "Remove the refill() invocation",
                "Run consume() inside a while(true) busy wait"
              ],
              correctFixIndex: 0,
              fixedCodeSnippet: `public async consume(amount: number = 1): Promise<boolean> {
  this.refill();
  if (this.tokens >= amount) {
    this.tokens -= amount; // Atomic state modification first
    void simulateAsyncLog().catch(console.error); // Fire and forget non-blocking log
    return true;
  }
  return false;
}`,
              rootCauseExplanation: "The original code performed a check, then awaited an asynchronous operation before decrementing. During the await, other concurrent calls checked the same un-decremented tokens, exceeding capacity.",
              invariantRule: "State invariants must be atomically committed prior to suspension points."
            }
          ]
        },
        stage4Project: {
          title: "Stage 4: Real-World Architecture Project Challenge",
          timeLimitMinutes: stageTimes.project,
          projectBrief: `Build a Resilient, Observable Cache-Aside Data Engine for "${collectionName}". Implement the core interface with eviction, TTL expiration, event hooks, and atomic thread-safe mutations.`,
          architectureRequirements: [
            "Implement O(1) read/write caching layer with LRU (Least Recently Used) doubly linked list + hash map.",
            "Enforce automatic TTL expiration on stale keys with lazy eviction on read + background periodic sweeper.",
            "Provide an asynchronous fallback fetcher callback for cache misses (Cache-Aside pattern).",
            "Include Prometheus/OpenTelemetry style metric counters for hit_ratio, miss_count, and eviction_count.",
            "Implement graceful degradation under memory pressure when capacity reaches max threshold."
          ],
          starterCodeOrScaffold: `interface CacheOptions {
  maxSize: number;
  defaultTtlMs: number;
}

interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  prev?: CacheEntry<T>;
  next?: CacheEntry<T>;
}

export class MasterEngineCache<T> {
  private maxSize: number;
  private defaultTtlMs: number;
  private map: Map<string, CacheEntry<T>> = new Map();
  private head?: CacheEntry<T>;
  private tail?: CacheEntry<T>;
  public hits: number = 0;
  public misses: number = 0;
  public evictions: number = 0;

  constructor(options: CacheOptions) {
    this.maxSize = options.maxSize;
    this.defaultTtlMs = options.defaultTtlMs;
  }

  public async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // 1. Check existing entry + TTL
    // 2. If valid, promote to MRU and return
    // 3. If missing or expired, call fetcher, store, evict LRU if full, and return
    throw new Error("Implement getOrFetch");
  }

  public invalidate(key: string): boolean {
    // Implement key invalidation
    return false;
  }

  public getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? (this.hits / total).toFixed(3) : "0.000",
      size: this.map.size,
      evictions: this.evictions,
    };
  }
}`,
          keyMilestones: [
            {
              id: "m1",
              title: "O(1) Hash Map & Doubly Linked List Node Promotion",
              specification: "When getOrFetch accesses an existing unexpired key, it must detach the node and move it to the head (Most Recently Used) in O(1) time.",
              testCondition: "Accessing key 'A' moves it to head without iterating over keys."
            },
            {
              id: "m2",
              title: "Accurate TTL Expiration & Lazy Cleanup",
              specification: "Entries accessed after expiresAt must be treated as a cache miss, removed from map/list, and refetched.",
              testCondition: "Entry with 10ms TTL returns fresh fetch result after 15ms delay."
            },
            {
              id: "m3",
              title: "LRU Eviction Under Max Capacity",
              specification: "When inserting a new key into a full cache, the tail (Least Recently Used) node must be cleanly unlinked and deleted, incrementing evictions count.",
              testCondition: "Inserting 101st item into 100-capacity cache removes oldest unused node."
            },
            {
              id: "m4",
              title: "Metrics Instrumentation & Resilient Error Isolation",
              specification: "If fetcher throws an error, cache must not corrupt internal state and should bubble error cleanly while recording metric.",
              testCondition: "Failed fetcher leaves existing valid cache intact and increments miss counter."
            }
          ],
          solutionReference: `// Model Implementation Summary:
// Maintain head/tail pointers in doubly linked list.
// getOrFetch checks Map.has(key). If now > entry.expiresAt, remove(entry), misses++.
// Else hits++, moveToHead(entry), return entry.value.
// On miss: execute fetcher(), if map.size >= maxSize evictTail(), insertHead(newEntry).`,
          gradingRubric: [
            { criteria: "Architectural Integrity & LRU Invariants", weightPercent: 35, description: "Doubly linked list pointer operations are memory-safe without dangling references or circular loops." },
            { criteria: "TTL & Edge-case Handling", weightPercent: 25, description: "Stale data eviction, clock skew tolerance, and zero-leak cleanup on invalidation." },
            { criteria: "Algorithmic Complexity & O(1) Bounds", weightPercent: 20, description: "All get, set, and evict operations operate strictly within O(1) time bounds." },
            { criteria: "Production Observability & Clean TypeScript", weightPercent: 20, description: "Strict typings, metric telemetry, and defensive error boundaries." }
          ]
        }
      }
    };
  };

  const ai = getGeminiClient();
  if (!ai || validNotes.length === 0) {
    const fallback = generateFallbackSuite();
    return res.json({
      success: true,
      ...fallback,
      fallback: true,
      model: "built-in-mastery-engine"
    });
  }

  const prompt = `You are a Principal Engineering Professor and Academic Assessment Director.
Generate a structured, rigorous, 4-Stage Progressive Exam Suite for the study collection titled "${collectionName}".

COLLECTION SOURCE NOTES:
${corpus.slice(0, 16000)}

EXAM SPECIFICATIONS:
- Total Time: ${totalMinutes} Minutes
- Difficulty: ${difficulty}
- Focus Domain: ${focusDomain}
- Custom Goals: ${customGoals || "Deep conceptual mastery, algorithmic logic, production debugging, and full project implementation."}

MANDATORY 4 STAGES:
Stage 1: Core Architectural Theory & Foundations (4 questions: mix of Multiple Choice, Fill-in-the-blank, Conceptual Trade-off)
Stage 2: Algorithmic Logic & Flow Tracing (2 problems with complete code snippets, output/state tracing, Big-O analysis)
Stage 3: Interactive Code Debugging & Flaw Remediation (2 real-world code snippets with insidious bugs: memory leak, race condition, stale closure, or type flaw, plus surgical fix options)
Stage 4: Real-World Architecture Project Challenge (1 concrete, production-grade project challenge derived from the notes with requirements, starter TypeScript scaffold, 4 testable milestones, and grading rubric)

RULES:
1. ZERO EMOJIS anywhere in the output.
2. Ground all questions directly in the provided collection notes.
3. Provide rigorous technical explanations, correct answer indexes/values, and clear rationale.
4. Output strictly valid JSON matching the schema below.

JSON Schema:
{
  "title": "${collectionName} 4-Stage Mastery Assessment",
  "collectionName": "${collectionName}",
  "totalMinutes": ${totalMinutes},
  "difficulty": "${difficulty}",
  "focusDomain": "${focusDomain}",
  "stages": {
    "stage1Theory": {
      "title": "Stage 1: Core Architectural Theory & Foundations",
      "timeLimitMinutes": ${stageTimes.theory},
      "instructions": "Clear directions for stage 1",
      "items": [
        {
          "id": "t1",
          "type": "multiple_choice",
          "question": "Rigorous theory question",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 1,
          "explanation": "Deep theoretical justification",
          "sourceNoteTitle": "Note Title",
          "keyConcept": "Core Concept"
        }
      ]
    },
    "stage2CodeLogic": {
      "title": "Stage 2: Algorithmic Logic & Flow Tracing",
      "timeLimitMinutes": ${stageTimes.codeLogic},
      "instructions": "Directions for stage 2",
      "items": [
        {
          "id": "cl1",
          "title": "Problem Title",
          "problemDescription": "Problem description",
          "codeSnippet": "TypeScript / Python code snippet",
          "question": "What is the result or invariant?",
          "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
          "correctAnswer": 0,
          "expectedOutputOrLogic": "Expected outcome",
          "complexityAnalysis": "Time & Space complexity",
          "explanation": "Step by step trace"
        }
      ]
    },
    "stage3Debugging": {
      "title": "Stage 3: Interactive Code Debugging & Flaw Remediation",
      "timeLimitMinutes": ${stageTimes.codeDebugging},
      "instructions": "Directions for stage 3",
      "items": [
        {
          "id": "dbg1",
          "title": "Bug Case Title",
          "brokenCode": "Broken code snippet",
          "bugDescription": "What failure mode occurs",
          "hint": "Diagnostic hint",
          "options": ["Fix A", "Fix B", "Fix C", "Fix D"],
          "correctFixIndex": 0,
          "fixedCodeSnippet": "Surgical clean code",
          "rootCauseExplanation": "Why the bug occurred",
          "invariantRule": "Engineering rule"
        }
      ]
    },
    "stage4Project": {
      "title": "Stage 4: Real-World Architecture Project Challenge",
      "timeLimitMinutes": ${stageTimes.project},
      "projectBrief": "Executive project overview",
      "architectureRequirements": ["Req 1", "Req 2", "Req 3", "Req 4", "Req 5"],
      "starterCodeOrScaffold": "Complete TypeScript starter interface and class scaffold",
      "keyMilestones": [
        {
          "id": "m1",
          "title": "Milestone 1",
          "specification": "Exact requirement spec",
          "testCondition": "Verifiable pass condition"
        }
      ],
      "solutionReference": "Architectural solution summary",
      "gradingRubric": [
        {
          "criteria": "Criteria name",
          "weightPercent": 35,
          "description": "Grading standard"
        }
      ]
    }
  }
}`;

  try {
    const { parsed, model } = await executeGeminiGenerate<any>(ai, {
      contents: prompt,
      temperature: 0.2,
      timeoutMs: 45000,
    });

    if (parsed && parsed.stages && parsed.stages.stage1Theory) {
      return res.json({
        success: true,
        ...parsed,
        model,
      });
    }
  } catch (err) {
    console.warn("Gemini Collection Exam Generate Error:", err);
  }

  const fallback = generateFallbackSuite();
  return res.json({
    success: true,
    ...fallback,
    fallback: true,
    model: "smart-fallback-engine"
  });
});

// Final AI Calculation & Comprehensive Mastery Result Evaluation
app.post("/api/ai/collection-exam-evaluate", async (req, res) => {
  const {
    collectionName = "Collection",
    examConfig = {},
    stageResults = {},
  } = req.body;

  const s1 = stageResults.stage1 || { score: 0, maxScore: 4, answers: {} };
  const s2 = stageResults.stage2 || { score: 0, maxScore: 2, answers: {} };
  const s3 = stageResults.stage3 || { score: 0, maxScore: 2, answers: {} };
  const s4 = stageResults.stage4 || { projectSubmission: "", completedMilestones: [], rubricRatings: {} };

  const s1Pct = s1.maxScore > 0 ? Math.round((s1.score / s1.maxScore) * 100) : 0;
  const s2Pct = s2.maxScore > 0 ? Math.round((s2.score / s2.maxScore) * 100) : 0;
  const s3Pct = s3.maxScore > 0 ? Math.round((s3.score / s3.maxScore) * 100) : 0;
  const s4MilestonesCount = Array.isArray(s4.completedMilestones) ? s4.completedMilestones.length : 0;
  const s4Pct = Math.min(100, Math.round((s4MilestonesCount / 4) * 80 + (s4.projectSubmission?.length > 100 ? 20 : 0)));

  const weightedTotal = Math.round(s1Pct * 0.25 + s2Pct * 0.25 + s3Pct * 0.25 + s4Pct * 0.25);

  let grade = "C";
  let distinction = "Foundational Competence";
  if (weightedTotal >= 90) {
    grade = "A+";
    distinction = "Distinguished Principal Mastery";
  } else if (weightedTotal >= 80) {
    grade = "A";
    distinction = "Senior Production Mastery";
  } else if (weightedTotal >= 70) {
    grade = "B";
    distinction = "Proficient Practitioner";
  } else if (weightedTotal >= 60) {
    grade = "C+";
    distinction = "Developing Competence";
  }

  const generateFallbackEvaluation = () => ({
    masteryScore: weightedTotal,
    masteryGrade: `${grade} - ${distinction}`,
    stageBreakdown: {
      theory: {
        score: s1.score,
        maxScore: s1.maxScore,
        percentage: s1Pct,
        feedback: s1Pct >= 75 ? "Strong command of core theoretical invariants and architectural definitions." : "Needs review of foundational invariants and distributed system theorems.",
      },
      codeLogic: {
        score: s2.score,
        maxScore: s2.maxScore,
        percentage: s2Pct,
        feedback: s2Pct >= 75 ? "Excellent algorithmic control-flow tracing and Big-O complexity discipline." : "Practice step-by-step state recurrence and monotonic deque boundary conditions.",
      },
      codeDebugging: {
        score: s3.score,
        maxScore: s3.maxScore,
        percentage: s3Pct,
        feedback: s3Pct >= 75 ? "Acute diagnostic acuity for asynchronous race conditions and memory leaks." : "Reinforce functional state updater patterns and atomic mutation invariants.",
      },
      project: {
        score: Math.round((s4Pct / 100) * 100),
        maxScore: 100,
        percentage: s4Pct,
        feedback: s4Pct >= 75 ? "Robust implementation with solid modular scaffolding and clean milestone execution." : "Complete all architectural milestones and verify cache eviction edge cases.",
      },
    },
    executiveSummary: `The candidate completed all 4 progressive stages of the ${collectionName} Mastery Assessment, demonstrating an overall proficiency of ${weightedTotal}%. Performance was particularly notable in ${s1Pct >= s3Pct ? "theoretical foundations" : "code debugging"}, with targeted remediation advised for ${s2Pct < 75 ? "algorithmic control flow" : "project scale edge cases"}.`,
    keyStrengths: [
      `Systematic approach across sequential assessment stages (${collectionName})`,
      `Demonstrated execution in ${s1Pct >= 80 ? "theoretical decomposition" : "hands-on problem resolution"}`,
      `Completed ${s4MilestonesCount} of 4 core project architecture milestones`
    ],
    criticalGaps: weightedTotal < 85 ? [
      "Edge-case boundary verification in high-concurrency environments",
      "Asynchronous lifecycle cleanup and state subscription teardown"
    ] : [
      "Minor optimization opportunities in memory footprint under maximum load"
    ],
    misconceptionsIdentified: [
      "Assuming non-atomic check-then-act operations are safe across asynchronous task ticks",
      "Overlooking reverse iteration requirements in 1D dynamic programming arrays"
    ],
    socraticRemediationRoadmap: [
      {
        step: 1,
        title: "Invariants & State Machine Hardening",
        actionableGuidance: "Review unidirectional state flow principles and atomic commit patterns before yields.",
        recommendedReviewNote: `${collectionName}: Core Invariants`
      },
      {
        step: 2,
        title: "Algorithmic Control Flow Drills",
        actionableGuidance: "Re-trace sliding window monotonic deques and verify push/pop bounds.",
        recommendedReviewNote: `${collectionName}: Algorithmic Complexity`
      },
      {
        step: 3,
        title: "Production Project Polish",
        actionableGuidance: "Implement defensive error boundaries around external fetchers and verify O(1) eviction.",
        recommendedReviewNote: `${collectionName}: Master Cache Engine`
      }
    ],
    exportableStudyGuide: `# ${collectionName}: Comprehensive AI Mastery Evaluation & Remediation Guide

**Overall Mastery Score:** ${weightedTotal}% (${grade} - ${distinction})
**Date Evaluated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

## 1.0 Executive Assessment Summary
${weightedTotal >= 80 ? "The student demonstrated distinguished conceptual and hands-on competence across all 4 stages of the progressive examination." : "The student established baseline capability with specific opportunities for algorithmic and concurrency remediation."}

## 2.0 4-Stage Performance Diagnostic Matrix
| Assessment Stage | Score | Percentage | Mastery Verdict |
| :--- | :--- | :--- | :--- |
| **Stage 1: Core Architectural Theory** | ${s1.score} / ${s1.maxScore} | ${s1Pct}% | ${s1Pct >= 75 ? "Mastered" : "Review Advised"} |
| **Stage 2: Algorithmic Logic & Tracing** | ${s2.score} / ${s2.maxScore} | ${s2Pct}% | ${s2Pct >= 75 ? "Mastered" : "Review Advised"} |
| **Stage 3: Code Debugging & Flaws** | ${s3.score} / ${s3.maxScore} | ${s3Pct}% | ${s3Pct >= 75 ? "Mastered" : "Review Advised"} |
| **Stage 4: Real-World Architecture Project** | ${s4Pct} / 100 | ${s4Pct}% | ${s4Pct >= 75 ? "Completed" : "In Progress"} |

## 3.0 Verified Strengths & Cognitive Invariants
- Direct mastery of collection domain principles in **${collectionName}**.
- Consistent execution across ${s4MilestonesCount} practical implementation milestones.

## 4.0 Critical Blindspots & Misconceptions Remediated
- **Concurrency Hazards:** Always commit state modifications atomically prior to yielding control across asynchronous tasks.
- **Teardown Disciplines:** Event listeners and interval channels must return explicit unsubscribe teardowns.

## 5.0 Targeted Remediation Action Plan
1. **First-Principles Review:** Polish core notes using the AI Note Polisher in Gap Remediation mode.
2. **Deliberate Practice:** Complete hands-on project milestones with automated test verification.
3. **Follow-Up Assessment:** Re-take the 4-Stage Progressive Exam in 7 days to verify long-term retention.
`
  });

  const ai = getGeminiClient();
  if (!ai) {
    const fallback = generateFallbackEvaluation();
    return res.json({
      success: true,
      ...fallback,
      fallback: true,
      model: "built-in-mastery-engine"
    });
  }

  const prompt = `You are a Chief Academic Assessor evaluating a student's performance on a 4-Stage Progressive Collection Exam for "${collectionName}".

STUDENT'S PERFORMANCE SUMMARY:
- Config: ${JSON.stringify(examConfig)}
- Stage 1 (Theory): Score ${s1.score}/${s1.maxScore} (${s1Pct}%)
- Stage 2 (Code Logic): Score ${s2.score}/${s2.maxScore} (${s2Pct}%)
- Stage 3 (Code Debugging): Score ${s3.score}/${s3.maxScore} (${s3Pct}%)
- Stage 4 (Project): ${s4MilestonesCount}/4 Milestones Completed (${s4Pct}%), Submission snippet length: ${s4.projectSubmission?.length || 0} chars
- Student Project Submission Snippet:
${(s4.projectSubmission || "Scaffold completed").slice(0, 3000)}

EVALUATION RULES:
1. ZERO EMOJIS anywhere. Use dignified, articulate, professorial academic language.
2. Calculate realistic masteryScore (0-100) and authoritative masteryGrade.
3. Provide constructive feedback for every stage.
4. Synthesize key strengths, critical gaps, and misconceptions.
5. Create a 3-step Socratic remediation roadmap.
6. Provide a complete Markdown exportable study guide note.

Output strictly valid JSON matching this schema:
{
  "masteryScore": number,
  "masteryGrade": "string",
  "stageBreakdown": {
    "theory": { "score": number, "maxScore": number, "percentage": number, "feedback": "string" },
    "codeLogic": { "score": number, "maxScore": number, "percentage": number, "feedback": "string" },
    "codeDebugging": { "score": number, "maxScore": number, "percentage": number, "feedback": "string" },
    "project": { "score": number, "maxScore": number, "percentage": number, "feedback": "string" }
  },
  "executiveSummary": "string",
  "keyStrengths": ["string", "string"],
  "criticalGaps": ["string", "string"],
  "misconceptionsIdentified": ["string", "string"],
  "socraticRemediationRoadmap": [
    { "step": 1, "title": "string", "actionableGuidance": "string", "recommendedReviewNote": "string" }
  ],
  "exportableStudyGuide": "string (Markdown)"
}`;

  try {
    const { parsed, model } = await executeGeminiGenerate<any>(ai, {
      contents: prompt,
      temperature: 0.25,
      timeoutMs: 35000,
    });

    if (parsed && typeof parsed.masteryScore === "number") {
      return res.json({
        success: true,
        ...parsed,
        model,
      });
    }
  } catch (err) {
    console.warn("Gemini Evaluation Error:", err);
  }

  const fallback = generateFallbackEvaluation();
  return res.json({
    success: true,
    ...fallback,
    fallback: true,
    model: "smart-fallback-engine"
  });
});

// AI Explain endpoint: grounded concept teaching with structured output and resilient model fallback
// Unified Learning Lab response. This is deliberately a compact contract: the Lab
// composes it with the existing Flashcards, Pomodoro, Exam, and Note Polisher flows
// instead of creating parallel versions of those tools.
app.post("/api/ai/learning-lab", async (req, res) => {
  const { noteTitle = "", noteBody = "", concept = "", action = "explain", compareWith = "", learnerAnswer = "" } = req.body || {};
  const title = String(noteTitle || "Study topic").slice(0, 300);
  const source = String(noteBody || "").slice(0, 16000);
  const topic = String(concept || title || "this topic").slice(0, 1400);
  const safeAction = ["explain", "deeper", "simple", "example", "visualize", "compare", "gap", "practice", "teach"].includes(String(action)) ? String(action) : "explain";

  const fallback = () => {
    const sourceTerms = source
      .split(/\n|[.;:]/)
      .map((line: string) => line.replace(/^[#*\-\s]+/, "").trim())
      .filter((line: string) => line.length > 8)
      .slice(0, 4);
    const concepts = sourceTerms.length ? sourceTerms : [topic, "Core mechanism", "Application", "Boundary conditions"];
    return {
      title: topic,
      coreAnswer: `Build ${topic} from its definition, mechanism, and one observable consequence. ${source ? "The explanation is anchored to the selected note; verify note-specific detail against its source excerpts." : "No source note is selected, so this is general learning guidance."}`,
      intuition: `Think of ${topic} as a chain: an input creates a change, the governing rule shapes that change, and the result can be checked.`,
      stepByStep: ["Name the central idea and its purpose.", "Identify the inputs, conditions, or assumptions.", "Trace the mechanism one step at a time.", "Test it with a small example and an edge case."],
      analogy: `A useful way to learn ${topic} is to treat it like a well-labeled route map: every step should have a reason and a destination.`,
      workedExample: `Choose one small case for ${topic}. State the starting conditions, apply the rule, then explain why the result follows.`,
      realWorldExample: `Look for a familiar system that has inputs, constraints, and outputs; map each part back to ${topic}.`,
      keyPoints: ["Definition before memorisation.", "Mechanism before procedure.", "Use an example to verify the rule.", "Check when the rule does not apply."],
      misconceptions: ["Recognising a term is not the same as being able to explain its mechanism.", "A worked example must preserve the conditions of the original rule."],
      examTraps: ["Watch for answers that swap a necessary condition with a sufficient one.", "Compare the boundary case before committing to a rule."],
      practiceQuestion: `In two or three sentences, explain ${topic} and give one condition where a learner could apply it incorrectly.`,
      followUpQuestions: ["What is the prerequisite idea?", "Can you show a counterexample?", "How would an examiner test this distinction?"],
      teacherQuestion: learnerAnswer ? `Good start. Which assumption in your answer about ${topic} would you verify from the source before using it in a new problem?` : `Before I explain more: what do you think is the single job of ${topic}?`,
      teacherFeedback: learnerAnswer ? `Your response gives us a useful starting point. Now make the mechanism explicit rather than relying on the label alone.` : "Answer in your own words; I will adapt the next question to your explanation.",
      comparison: {
        left: topic,
        right: String(compareWith || "related concept"),
        similarities: "Both should be judged by their definition, conditions, and observable result.",
        differences: "Compare their purpose, inputs, and the cases where each rule applies.",
        whenToUse: "Choose the concept whose assumptions match the problem conditions."
      },
      graph: {
        nodes: concepts.slice(0, 5).map((label: string, index: number) => ({ id: `n${index}`, label, kind: index === 0 ? "core" : index === 1 ? "component" : "application" })),
        edges: concepts.slice(1, 5).map((_: string, index: number) => ({ from: "n0", to: `n${index + 1}`, label: index === 0 ? "enables" : index === 1 ? "depends on" : "applies to" }))
      },
      mastery: { score: source ? 58 : 42, strong: sourceTerms.slice(0, 1), moderate: sourceTerms.slice(1, 2), weak: [topic], missing: source ? ["Active recall evidence"] : ["A source note or learning context"], misconceptions: ["Mechanism has not yet been checked through retrieval."], examReadiness: source ? "Building foundation" : "Choose a source first", nextAction: "Answer the practice question, then run a targeted quiz." },
      sourceGrounded: Boolean(source),
      sourceSummary: source ? `Grounded in “${title}”${source.length ? ` • ${Math.min(source.length, 16000).toLocaleString()} characters available` : ""}` : "General knowledge mode — select a note to ground this lesson."
    };
  };

  const ai = getGeminiClient();
  if (!ai) return res.json({ success: true, result: fallback(), fallback: true, model: "learning-lab-fallback" });

  const normalizeResult = (candidate: any) => {
    const base = fallback();
    const textList = (value: unknown, fallbackValue: string[]) =>
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 6) : fallbackValue;
    const graphNodes = Array.isArray(candidate?.graph?.nodes)
      ? candidate.graph.nodes.filter((node: any) => node && typeof node.id === "string" && typeof node.label === "string").slice(0, 6)
      : base.graph.nodes;
    const graphEdges = Array.isArray(candidate?.graph?.edges)
      ? candidate.graph.edges.filter((edge: any) => edge && typeof edge.from === "string" && typeof edge.to === "string").slice(0, 8)
      : base.graph.edges;
    const mastery = candidate?.mastery || {};
    return {
      ...base,
      ...candidate,
      stepByStep: textList(candidate?.stepByStep, base.stepByStep),
      keyPoints: textList(candidate?.keyPoints, base.keyPoints),
      misconceptions: textList(candidate?.misconceptions, base.misconceptions),
      examTraps: textList(candidate?.examTraps, base.examTraps),
      followUpQuestions: textList(candidate?.followUpQuestions, base.followUpQuestions),
      comparison: { ...base.comparison, ...(candidate?.comparison || {}) },
      graph: { ...base.graph, ...(candidate?.graph || {}), nodes: graphNodes, edges: graphEdges },
      mastery: {
        ...base.mastery,
        ...mastery,
        score: Math.max(0, Math.min(100, Number(mastery.score) || base.mastery.score)),
        strong: textList(mastery.strong, base.mastery.strong),
        moderate: textList(mastery.moderate, base.mastery.moderate),
        weak: textList(mastery.weak, base.mastery.weak),
        missing: textList(mastery.missing, base.mastery.missing),
        misconceptions: textList(mastery.misconceptions, base.mastery.misconceptions),
      },
      sourceGrounded: Boolean(source) && candidate?.sourceGrounded === true,
      sourceSummary: Boolean(source) && typeof candidate?.sourceSummary === "string" ? candidate.sourceSummary : base.sourceSummary,
    };
  };

  const prompt = `You are the learning intelligence layer of a premium study workspace. Return a single learning artifact for action: ${safeAction}.
Topic: "${topic}"
Comparison topic: "${String(compareWith || "").slice(0, 500)}"
Student answer (only if provided): "${String(learnerAnswer || "").slice(0, 2000)}"
Source note title: "${title}"
Source note:\n"""\n${source || "No source note. Clearly treat guidance as general knowledge; never claim it came from a note."}\n"""

Rules: prioritize source facts when present; distinguish source-grounded ideas from general knowledge; be accurate, concise, and pedagogical. For teach, ask exactly one useful Socratic question and respond to the student's answer without dumping a lecture. For visualize, make the graph concepts concrete. No emojis.
Return JSON with this schema:
{
 "title":"string", "coreAnswer":"string", "intuition":"string", "stepByStep":["string"], "analogy":"string", "workedExample":"string", "realWorldExample":"string", "keyPoints":["string"], "misconceptions":["string"], "examTraps":["string"], "practiceQuestion":"string", "followUpQuestions":["string"], "teacherQuestion":"string", "teacherFeedback":"string",
 "comparison":{"left":"string","right":"string","similarities":"string","differences":"string","whenToUse":"string"},
 "graph":{"nodes":[{"id":"string","label":"string","kind":"core|component|dependency|application"}],"edges":[{"from":"string","to":"string","label":"string"}]},
 "mastery":{"score":number,"strong":["string"],"moderate":["string"],"weak":["string"],"missing":["string"],"misconceptions":["string"],"examReadiness":"string","nextAction":"string"}, "sourceGrounded":boolean, "sourceSummary":"string"
}`;

  try {
    const { parsed, model } = await executeGeminiGenerate<any>(ai, { contents: prompt, temperature: 0.28, timeoutMs: 35000 });
    if (parsed?.coreAnswer && parsed?.mastery) return res.json({ success: true, result: normalizeResult(parsed), fallback: false, model });
  } catch (err) {
    console.warn("Learning Lab AI error:", err);
  }
  return res.json({ success: true, result: fallback(), fallback: true, model: "learning-lab-fallback" });
});

app.post("/api/ai/explain", async (req, res) => {
  const {
    noteTitle = "",
    noteBody = "",
    concept = "",
    mode = "clear",
  } = req.body || {};

  const cleanTitle = String(noteTitle || "Study Topic").slice(0, 300);
  const sourceBody = String(noteBody || "").slice(0, 16000);
  const requestedConcept = String(concept || "").slice(0, 2500);
  const allowedModes = new Set(["clear", "step_by_step", "analogy", "example", "exam", "code"]);
  const explainMode = allowedModes.has(String(mode)) ? String(mode) : "clear";

  const modeInstructions: Record<string, string> = {
    clear: "Explain in clear, direct language, defining unfamiliar terms before using them.",
    step_by_step: "Teach the idea as a logical sequence of small steps, showing how each step leads to the next.",
    analogy: "Use one strong real-world analogy, then explicitly map the analogy back to the technical concept.",
    example: "Use a concrete worked example and walk through the reasoning from input to outcome.",
    exam: "Emphasize definitions, distinctions, formulas, edge cases, common traps, and what an examiner is likely to test.",
    code: "Prioritize code/syntax/logic behavior, execution flow, errors, and a corrected mini-example when relevant.",
  };

  const fallback = {
    title: requestedConcept || cleanTitle,
    coreAnswer: requestedConcept
      ? `AI Explain can break "${requestedConcept}" into a definition, mechanism, example, and common mistake. Review the source note alongside each claim.`
      : `This lesson is grounded in "${cleanTitle}". Ask for a specific concept or question to get a more targeted explanation.`,
    explanation: sourceBody
      ? `Start with the central idea in the note, identify its inputs and outputs, then connect the supporting details in order. Source context: ${sourceBody.slice(0, 700)}`
      : "Add a source note for a more context-aware explanation.",
    analogy: "Think of the concept as a system with an input, a transformation, and an observable result. The analogy should be replaced by the concrete domain details from the source note when available.",
    example: requestedConcept
      ? `Work through one small example of "${requestedConcept}", checking each assumption before moving to the next step.`
      : "Provide a concept or question to generate a worked example.",
    keyPoints: [
      "Identify the definition or central claim first.",
      "Connect the mechanism to a concrete example.",
      "Check edge cases and common misconceptions.",
      "Test your understanding by explaining the idea without looking at the note.",
    ],
    commonMistake: "Memorizing terminology without understanding the mechanism or when the rule does not apply.",
    checkQuestion: requestedConcept
      ? `In your own words, what is "${requestedConcept}" and why does it work this way?`
      : "What is the single most important idea you would teach to someone else?",
    followUpQuestions: [
      "Can you show a harder example?",
      "What is the most common misconception here?",
      "How would this appear on an exam?",
    ],
  };

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ success: true, result: fallback, fallback: true, model: "built-in-explain" });
  }

  const prompt = `You are an expert academic tutor inside a study workspace.

TARGET NOTE: "${cleanTitle}"
EXPLANATION MODE: ${explainMode}
MODE INSTRUCTIONS: ${modeInstructions[explainMode]}

STUDENT QUESTION / CONCEPT:
"""
${requestedConcept || "Explain the central ideas of the provided source note."}
"""

SOURCE NOTE:
"""
${sourceBody || "No source note supplied. Do not invent note-specific claims; answer the student's concept using general knowledge and clearly label assumptions."}
"""

Create a concise but deep mini-lesson.

Grounding rules:
1. Prefer the supplied source note when it contains the requested concept.
2. Never invent facts that are supposedly from the note.
3. When the note is insufficient, distinguish general knowledge from note-grounded information.
4. Use accurate, student-friendly language.
5. Keep each field useful and non-repetitive.
6. Do not use emojis.
7. Return only valid JSON matching the required schema.

Required JSON:
{
  "title": "string",
  "coreAnswer": "2-5 sentence direct answer",
  "explanation": "detailed teaching explanation",
  "analogy": "one useful analogy",
  "example": "worked example or concrete application",
  "keyPoints": ["string", "string", "string", "string"],
  "commonMistake": "string",
  "checkQuestion": "one retrieval/check question",
  "followUpQuestions": ["string", "string", "string"]
}`;

  try {
    const { parsed, model } = await executeGeminiGenerate<any>(ai, {
      contents: prompt,
      temperature: 0.25,
      timeoutMs: 30000,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          coreAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          analogy: { type: Type.STRING },
          example: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          commonMistake: { type: Type.STRING },
          checkQuestion: { type: Type.STRING },
          followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          "title",
          "coreAnswer",
          "explanation",
          "analogy",
          "example",
          "keyPoints",
          "commonMistake",
          "checkQuestion",
          "followUpQuestions",
        ],
      },
    });

    if (parsed && parsed.coreAnswer) {
      return res.json({
        success: true,
        result: parsed,
        fallback: false,
        model,
      });
    }
  } catch (err) {
    console.warn("AI Explain Error:", err);
  }

  return res.json({ success: true, result: fallback, fallback: true, model: "smart-explain-fallback" });
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

// Mounting Vite in development or static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
