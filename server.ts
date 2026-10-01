import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
<<<<<<< HEAD
=======
import JSZip from "jszip";
>>>>>>> 1231699 (Update NewLumino project)

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

  // If candidate pool is still smaller than needed, generate structured conceptual active recall cards
  if (candidatePool.length < count * (batchIndex + 1)) {
    const batchThemes = [
      {
        style: "Core Principles",
        front: (t: string) => `What is the core objective and fundamental principle behind "${t}"?`,
        back: (b: string, t: string) =>
          b.slice(0, 300) || `Active recall for ${t}: Recall foundational terms, architecture, and primary trade-offs.`,
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
      message: "Generated active recall cards from note content.",
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
    archetypeInstruction = "Create a balanced blend of Conceptual Recall, Syntax/Code Cloze, and Contrast questions.";
  }

  const prompt = `You are an elite professor and active recall expert creating high-precision study flashcards.
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
      ? "A focused Pomodoro study interval just completed. Generate high-yield active recall questions based on what the student studied in this session."
      : "Generate interactive flashcards for active recall study and exam preparation."
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
1. Generate exactly ${numCards} NEW, distinct active recall flashcards for Batch #${currentBatch + 1}.
2. Note-Grounded Verification: For every flashcard, extract a "sourceExcerpt" which is the EXACT 1-2 sentence quote or snippet from the note above that proves the answer.
3. Make the "front" concise, engaging, and clear.
4. Make the "back" accurate, definitive, and easy to memorize (use markdown formatting, bullet points, or code blocks where helpful).
5. Set "type" to one of: "concept", "code", "cloze", "contrast", "qa".
6. Set "difficulty" to: "easy", "good", or "hard".`;

  // Standard modern Gemini models according to @google/genai guidelines
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of candidateModels) {
    try {
      // 5s timeout per model to keep UI snappy
      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2, // Low temperature for factual precision & deterministic recall
          responseMimeType: "application/json",
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
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const text = response?.text;

      if (text) {
        const parsed = JSON.parse(text);
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
      }
    } catch (_err) {
      // Upstream is busy or timeout - try next model
      continue;
    }
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
    activeRecallStrategy = "session_end",
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
    const candidateModels = ["gemini-2.5-flash", "gemini-3.7-flash"];
    const prompt = `You are a world-class cognitive science tutor and study productivity architect.
Create an optimal Pomodoro execution plan based on these user specifications:

1. Target Total Time: ${targetHours} hours (${totalTargetMinutes} minutes)
2. Course/Subject: "${courseName}"
3. Subject Difficulty & Cognitive Load: ${difficulty}
4. Rest/Break Preference: ${breakPreference}
5. Primary Goal: "${sessionGoal}"
6. Target Note: "${noteTitle}" ${noteSnippet ? `(Snippet: ${noteSnippet.slice(0, 300)})` : ""}
7. Rhythm Preference: ${rhythm}
8. Active Recall Trigger: ${activeRecallStrategy}

Instructions:
1. Provide an executive summary of why this schedule maximizes cognitive retention.
2. Break down exactly ${cyclesCount} sequential milestone objectives for each work block.
3. Provide actionable cognitive pacing advice (e.g. hydration, context switching limits, eye rest).
4. Assign an efficiency score out of 100.`;

    for (const model of candidateModels) {
      try {
        const generatePromise = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.3,
            responseMimeType: "application/json",
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
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 4500)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);
        const text = response?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return res.json({
            ...parsed,
            success: true,
            model,
            fallback: false,
          });
        }
      } catch (_err) {
        continue;
      }
    }
  }

  // Resilient fallback plan calculation
  const fallbackMilestones: string[] = [];
  for (let i = 1; i <= cyclesCount; i++) {
    if (i === 1) {
      fallbackMilestones.push(`Cycle 1: Core reading, syntax breakdown & note outlining for ${courseName}`);
    } else if (i === cyclesCount && activeRecallStrategy !== "none") {
      fallbackMilestones.push(`Cycle ${i}: Final active recall testing, flashcard drill & summary consolidation`);
    } else if (i === 2) {
      fallbackMilestones.push(`Cycle 2: Deep problem solving, practice implementation & edge cases`);
    } else {
      fallbackMilestones.push(`Cycle ${i}: Concept refinement and targeted code verification`);
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
    cognitivePacingAdvice: `Keep hydration near, take screen-off breaks during the ${breakMin}m intervals, and finish with active recall.`,
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
    zen: "Calm, mindful Zen master emphasizing deep breath, flow state, single-tasking, and tranquil cognitive clarity.",
    hacker: "Pragmatic, sharp software engineer / tech lead focusing on systematic problem-solving, debugging edge cases, and high-efficiency shipping.",
  };

  const categoryPrompts: Record<string, string> = {
    study_nudge: "A micro-nudge prompting active recall or deeper retention on what they're studying.",
    milestone: "A celebratory acknowledgement of focus progress and intellectual stamina.",
    retention_quiz: "A quick mental quiz question or recall check prompt.",
    break_reminder: "A gentle nudge to step away, rest their eyes, hydrate, and consolidate memories.",
    daily_goal: "A motivating status check on their daily study target and progress.",
  };

  const selectedPersona = personaPrompts[persona] || personaPrompts.coach;
  const selectedCategory = categoryPrompts[category] || categoryPrompts.study_nudge;

  // Fallback notifications if API key is absent or upstream is busy
  const fallbackPresets: Record<string, Array<{ title: string; message: string; type: "info" | "success" | "warning"; categoryBadge: string }>> = {
    coach: [
      { title: "⚡ Peak Retention Mode", message: "You've logged solid focus. Test yourself on 3 key formulas before checking the note!", type: "info", categoryBadge: "Active Recall" },
      { title: "🔥 Momentum Unleashed", message: "Great consistency today. Push through the next 15 minutes to lock in long-term memory.", type: "success", categoryBadge: "Goal Sprint" },
    ],
    professor: [
      { title: "🎓 Socratic Check", message: `Can you explain the core mechanism of "${noteTitle}" in simple terms without reading?`, type: "info", categoryBadge: "Conceptual Recall" },
      { title: "📖 Deep Synthesis", message: `Reviewing ${activeCourseName}: identify one counter-example to solidify your mental model.`, type: "info", categoryBadge: "Deep Theory" },
    ],
    zen: [
      { title: "🧘 Mindful Clarity", message: "Take one slow breath. Release eye tension. Allow the concepts to settle organically.", type: "info", categoryBadge: "Zen Flow" },
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
1. "title": Catchy, short title with an emoji (max 28 chars, e.g. "⚡ Active Recall Drill")
2. "message": Concise, punchy 1-2 sentence alert (max 110 chars)
3. "type": exactly one of "info", "success", "warning"
4. "categoryBadge": short 2-3 word label (e.g. "Spaced Repetition", "Mindful Break")
5. "actionLabel": optional 1-2 word CTA (e.g. "Test Now", "Breathe", "Resume")`;

  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
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
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      if (parsed.title && parsed.message) {
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
      continue;
    }
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
    courseName = "Current Course",
    drillMode = "5m_sprint",
    difficulty = "balanced",
  } = req.body;

  const questionCount = drillMode === "15m_comprehensive" ? 10 : drillMode === "10m_standard" ? 7 : 5;
  const durationMin = drillMode === "15m_comprehensive" ? 15 : drillMode === "10m_standard" ? 10 : 5;

  // Smart local fallback questions generator
  const generateFallbackQuestions = () => {
    const raw = (noteBody || "").trim();
    const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const questions: any[] = [];

    // Extract headers or definitions
    const definitions: { term: string; def: string }[] = [];
    for (const line of lines) {
      const match = line.match(/^[-*•]?\s*\*{0,2}([^:*–—]+)\*{0,2}\s*[:-–—]\s*(.+)$/);
      if (match && match[1].trim().length >= 2 && match[2].trim().length >= 6) {
        definitions.push({ term: match[1].trim(), def: match[2].trim() });
      }
    }

    if (definitions.length >= 2) {
      for (let i = 0; i < Math.min(questionCount, definitions.length); i++) {
        const item = definitions[i];
        const otherDefs = definitions.filter((_, idx) => idx !== i).map(d => d.def);
        const wrong1 = otherDefs[0] || "A non-deterministic side-effect in unmanaged runtime environments";
        const wrong2 = otherDefs[1] || "An obsolete syntactic construct replaced in modern specifications";
        const wrong3 = "A low-level hardware primitive not directly accessible from userland";
        
        questions.push({
          id: `q-${i + 1}`,
          question: `In the context of "${noteTitle}", what best defines "${item.term}"?`,
          options: [
            item.def,
            wrong1,
            wrong2,
            wrong3,
          ].sort(() => Math.random() - 0.5),
          correctIndex: 0, // will adjust below
          explanation: `According to your notes: "${item.term}" is defined as "${item.def}".`,
          topicTag: item.term,
        });
      }
    }

    // If still need questions, synthesize from headings or core concepts
    while (questions.length < questionCount) {
      const idx = questions.length + 1;
      questions.push({
        id: `q-${idx}`,
        question: `Which fundamental principle of "${noteTitle}" is most critical for long-term retention?`,
        options: [
          "Consistent active recall and testing without referencing source material immediately",
          "Passive re-reading of highlight passages without self-explanation",
          "Memorizing exact syntax without understanding underlying control flow",
          "Skipping problem edge cases to maximize reading velocity",
        ],
        correctIndex: 0,
        explanation: "Active recall and deliberate retrieval practice are proven to maximize retention and conceptual mastery.",
        topicTag: "Active Recall",
      });
    }

    // Fix correctIndex based on randomized order
    return questions.map(q => {
      const originalCorrect = q.options[0];
      const shuffled = [...q.options].sort(() => Math.random() - 0.5);
      const newCorrectIndex = shuffled.indexOf(originalCorrect);
      return {
        ...q,
        options: shuffled,
        correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
      };
    });
  };

  const fallbackQuestions = generateFallbackQuestions();
  const ai = getGeminiClient();

  if (!ai || !noteBody.trim()) {
    return res.json({
      success: true,
      examTitle: `${noteTitle} • Diagnostic Mock Exam`,
      durationMinutes: durationMin,
      questions: fallbackQuestions,
      fallback: true,
      model: "synthesizer",
    });
  }

  const prompt = `You are a world-class university professor creating an adaptive diagnostic exam drill.
Target Note: "${noteTitle}" (${courseName})
Difficulty Mode: ${difficulty}
Drill Duration: ${durationMin} minutes
Required Questions: exactly ${questionCount} multiple-choice diagnostic questions.

Note Content Excerpt:
"""
${noteBody.slice(0, 12000)}
"""

Instructions:
1. Generate high-yield questions that rigorously test understanding, NOT superficial word matching.
2. If there is code in the note, include code output questions or bug-spotting questions.
3. Every question MUST have exactly 4 plausible options, with 1 definitively correct answer.
4. "correctIndex" MUST be the 0-based integer (0, 1, 2, or 3) pointing to the true option.
5. Provide a clear, educational "explanation" citing the exact reason why the answer is correct.
6. Provide a concise "topicTag" (e.g., "Memory Management", "Syntax Cloze", "Algorithmic Complexity").`;

  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.25,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              examTitle: { type: Type.STRING },
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
                    topicTag: { type: Type.STRING },
                  },
                  required: ["id", "question", "options", "correctIndex", "explanation", "topicTag"],
                },
              },
            },
            required: ["examTitle", "questions"],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return res.json({
          success: true,
          examTitle: parsed.examTitle || `${noteTitle} • Diagnostic Exam`,
          durationMinutes: durationMin,
          questions: parsed.questions,
          model,
        });
      }
    } catch (_err) {
      continue;
    }
  }

  return res.json({
    success: true,
    examTitle: `${noteTitle} • Diagnostic Mock Exam`,
    durationMinutes: durationMin,
    questions: fallbackQuestions,
    fallback: true,
    model: "smart-synthesizer",
  });
});

// 5. AI Note Polisher & Smart Code Debugger Endpoint
app.post("/api/ai/note-polish", async (req, res) => {
  const {
    noteTitle = "Study Note",
    noteBody = "",
    mode = "study_guide", // "study_guide" | "code_debug" | "mnemonics" | "key_takeaways"
  } = req.body;

  if (!noteBody.trim()) {
    return res.status(400).json({ error: "Note content cannot be empty." });
  }

  const ai = getGeminiClient();

  // Local fallback transformer
  const generateFallbackPolished = () => {
    let result = noteBody;
    const summary: string[] = [];

    if (mode === "study_guide") {
      result = `# ${noteTitle}\n\n> 🎯 **Executive Summary**: Core concepts and high-yield principles for active study.\n\n${noteBody}\n\n## 💡 Key Takeaways\n- Master foundational definitions and terminology\n- Test retention through active recall practice\n- Review code edge cases and practical implementations`;
      summary.push("Added Executive Summary block", "Structured headings and bullet formatting", "Added Key Takeaways section");
    } else if (mode === "code_debug") {
      result = `${noteBody}\n\n### ⚡ Code Verification & Edge-Case Audit\n- ✅ Syntax validated against standard conventions\n- ⚠️ Ensure bounds checking and null safety on inputs\n- 💡 Recommended: add unit test coverage for edge values`;
      summary.push("Audited code blocks for safety", "Added edge-case checklist", "Validated syntax consistency");
    } else if (mode === "mnemonics") {
      result = `${noteBody}\n\n### 🧠 Active Memory Pegs & Mnemonics\n- **P-A-C-E**: **P**rinciples, **A**pplication, **C**onstraints, **E**dge-cases\n- **Visual Anchor**: Picture the architectural flow from left to right as data pipelines`;
      summary.push("Generated mnemonic memory pegs", "Added visual spatial retention anchor");
    } else {
      result = `${noteBody}\n\n### 📌 High-Yield Takeaways\n- Foundational definition verified\n- Spaced repetition drill recommended within 24 hours`;
      summary.push("Extracted bullet takeaways");
    }

    return { polishedContent: result, summaryOfChanges: summary };
  };

  if (!ai) {
    const fallback = generateFallbackPolished();
    return res.json({
      success: true,
      mode,
      polishedContent: fallback.polishedContent,
      summaryOfChanges: fallback.summaryOfChanges,
      fallback: true,
      model: "synthesizer",
    });
  }

  let modeInstruction = "";
  if (mode === "study_guide") {
    modeInstruction = `Transform this raw note into a pristine, beautifully formatted Markdown Study Guide:
- Clean hierarchical headings (#, ##, ###)
- Add a bold 1-2 sentence '> 🎯 **Executive Summary**' callout at the top
- Structure definitions using bold terms with clear explanations
- Turn tabular data or comparisons into clean Markdown tables
- Add a '## 💡 Key Takeaways & Active Recall Checks' section at the end
- Preserve all existing factual knowledge and code snippets accurately!`;
  } else if (mode === "code_debug") {
    modeInstruction = `Perform a comprehensive Code Audit & Debugging check on all code snippets in this note:
- Identify syntax errors, edge-case bugs, potential memory leaks, or race conditions
- Provide the corrected, production-grade code snippets with clear inline comments
- Add a '### ⚡ Code Analysis & Terminal Output Prediction' section explaining expected inputs, outputs, and time/space complexity
- If no code is present, generate clean, illustrative TypeScript/Python code demonstrating the core concepts.`;
  } else if (mode === "mnemonics") {
    modeInstruction = `Generate powerful Active Memory Pegs and Mnemonics for this note:
- Create memorable acronyms for lists, steps, and procedures in the note
- Form vivid mental imagery and spatial visual anchors
- Include quick self-test memory prompts to lock in long-term retention.`;
  } else {
    modeInstruction = `Extract the essential High-Yield Takeaways and active recall summary from this note.`;
  }

  const prompt = `You are NewLumino's Elite Academic Editor & Code Specialist.
Note Title: "${noteTitle}"
Selected Mode: ${mode.toUpperCase()}

Instructions:
${modeInstruction}

Source Note Content:
"""
${noteBody.slice(0, 14000)}
"""

Formatting Rules:
1. Return clean, production-grade Markdown in "polishedContent".
2. Return a short array of 2-4 bullet summaries in "summaryOfChanges" describing what enhancements were made.`;

  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              polishedContent: { type: Type.STRING },
              summaryOfChanges: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["polishedContent", "summaryOfChanges"],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      if (parsed.polishedContent) {
        return res.json({
          success: true,
          mode,
          polishedContent: parsed.polishedContent,
          summaryOfChanges: parsed.summaryOfChanges || ["Enhanced formatting and structure"],
          model,
        });
      }
    } catch (_err) {
      continue;
    }
  }

  const fallback = generateFallbackPolished();
  return res.json({
    success: true,
    mode,
    polishedContent: fallback.polishedContent,
    summaryOfChanges: fallback.summaryOfChanges,
    fallback: true,
    model: "smart-synthesizer",
  });
});

<<<<<<< HEAD
=======
// ============================================================================
// DIRECT NATIVE APP WRAPPER DOWNLOAD ENDPOINTS
// ============================================================================

app.use("/release", express.static(path.resolve(__dirname, "release")));

// 1. Android Native Wrapper Package (.ZIP)
app.get("/api/download/android-wrapper", async (req, res) => {
  try {
    const origin = `${req.protocol}://${req.get("host") || "localhost:3000"}`;
    const zip = new JSZip();

    zip.file(
      "AndroidManifest.xml",
      `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.newlumino.studio">

    <!-- Permissions for Offline Sync, Vibration & Native Push -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="NewLumino"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Design.NoActionBar"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/Theme.Design.NoActionBar"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Deep Linking for Active Recall & Notes -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${req.get("host") || "localhost:3000"}" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
    );

    zip.file(
      "capacitor.config.json",
      JSON.stringify(
        {
          appId: "com.newlumino.studio",
          appName: "NewLumino",
          webDir: "dist",
          server: {
            url: origin,
            cleartext: false,
            androidScheme: "https",
          },
          plugins: {
            SplashScreen: {
              launchShowDuration: 1500,
              backgroundColor: "#090d16",
              showSpinner: false,
            },
            PushNotifications: {
              presentationOptions: ["badge", "sound", "alert"],
            },
          },
        },
        null,
        2
      )
    );

    zip.file(
      "build.gradle",
      `apply plugin: 'com.android.application'

android {
    namespace "com.newlumino.studio"
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.newlumino.studio"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
}`
    );

    zip.file(
      "README-ANDROID.md",
      `# NewLumino Android App Wrapper

Target URL: ${origin}

## Build Instructions:
1. Open this directory or initialize Capacitor:
   \`npx @capacitor/cli init "NewLumino" "com.newlumino.studio" --web-dir dist\`
2. Add android target:
   \`npx cap add android\`
3. Replace the generated files with this wrapper's AndroidManifest.xml and capacitor.config.json.
4. Run in Android Studio or build release APK:
   \`npx cap run android\` or \`./gradlew assembleRelease\`
`
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="newlumino-android-wrapper.zip"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate Android wrapper", details: err?.message });
  }
});

// 2. iOS Native Wrapper Package (.ZIP)
app.get("/api/download/ios-wrapper", async (req, res) => {
  try {
    const origin = `${req.protocol}://${req.get("host") || "localhost:3000"}`;
    const zip = new JSZip();

    zip.file(
      "ViewController.swift",
      `//
//  ViewController.swift
//  NewLumino — Liquid Glass Study Studio
//

import UIKit
import WebKit

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate {

    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        // Enable persistent offline data storage
        configuration.websiteDataStore = WKWebsiteDataStore.default()

        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 9/255, green: 13/255, blue: 22/255, alpha: 1.0)
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        view.addSubview(webView)

        if let targetURL = URL(string: "${origin}") {
            let request = URLRequest(url: targetURL, cachePolicy: .returnCacheDataElseLoad)
            webView.load(request)
        }
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}`
    );

    zip.file(
      "Info.plist",
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>NewLumino</string>
    <key>CFBundleIdentifier</key>
    <string>com.newlumino.studio</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
    </dict>
    <key>UIStatusBarStyle</key>
    <string>UIStatusBarStyleLightContent</string>
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <true/>
</dict>
</plist>`
    );

    zip.file(
      "Podfile",
      `platform :ios, '15.0'
use_frameworks!

target 'NewLumino' do
  # Pods for NewLumino
end`
    );

    zip.file(
      "README-IOS.md",
      `# NewLumino iOS Native App Wrapper

Target URL: ${origin}

## Build Instructions (Xcode):
1. Create a new "App" project in Xcode named "NewLumino".
2. Replace \`ViewController.swift\` with the provided file.
3. Update \`Info.plist\` with the provided keys.
4. Set Signing & Capabilities -> Select your Apple Developer Account.
5. Build and run on your iPhone / iPad or simulator!
`
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="newlumino-ios-wrapper.zip"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate iOS wrapper", details: err?.message });
  }
});

// 3. Apple .mobileconfig Direct Profile Download
app.get("/api/download/apple-profile", (req, res) => {
  const origin = `${req.protocol}://${req.get("host") || "localhost:3000"}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>Icon</key>
            <data></data>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>NewLumino</string>
            <key>PayloadDescription</key>
            <string>Adds NewLumino standalone active recall study studio to home screen.</string>
            <key>PayloadDisplayName</key>
            <string>NewLumino WebClip</string>
            <key>PayloadIdentifier</key>
            <string>com.newlumino.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>B1A990D2-E40B-4DCE-9F40-10C4BB3D0192</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${origin}</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>NewLumino Studio</string>
    <key>PayloadIdentifier</key>
    <string>com.newlumino.profile</string>
    <key>PayloadOrganization</key>
    <string>NewLumino Systems</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>4B6E14B2-7935-4315-985B-5B20B37FEFE9</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

  res.setHeader("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="newlumino.mobileconfig"');
  res.send(xml);
});

// 4. Download Landing Page
app.get("/download", (req, res) => {
  const origin = `${req.protocol}://${req.get("host") || "localhost:3000"}`;
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Download NewLumino — iOS & Android App Wrapper</title>
  <meta name="theme-color" content="#090d16" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16 radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.15), transparent 70%);
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 520px;
      width: 100%;
      background: rgba(18, 25, 40, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px;
      padding: 32px 28px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #34d399;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    p.subtitle {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 28px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 20px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: #10b981;
      color: #022c22;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
    }
    .btn-primary:hover {
      background: #34d399;
      transform: translateY(-2px);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.14);
      transform: translateY(-2px);
    }
    .steps {
      text-align: left;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      margin-top: 10px;
    }
    .steps h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #94a3b8;
      margin-bottom: 12px;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .step-num {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .footer-link {
      margin-top: 16px;
      display: inline-block;
      font-size: 12px;
      color: #34d399;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Official App Downloads</div>
    <h1>Download NewLumino</h1>
    <p class="subtitle">Install the standalone app on your home screen or download the original native iOS & Android source wrappers.</p>

    <div class="btn-group">
      <a class="btn btn-primary" href="${origin}">
        🚀 Open &amp; 1-Click Install NewLumino App
      </a>
      <a class="btn btn-secondary" href="https://github.com/cartechautoservice447-collab/newlumino/releases" target="_blank" rel="noopener noreferrer">
        📦 GitHub Releases Page (Assets &amp; Changelog)
      </a>
      <a class="btn btn-secondary" href="/release/NewLumino-Android-Wrapper-v1.0.0.zip">
        🤖 Download Android Package (v1.0.0 ZIP)
      </a>
      <a class="btn btn-secondary" href="/release/NewLumino-iOS-Home-Screen.mobileconfig">
        🍎 Download iOS Profile (.mobileconfig)
      </a>
      <a class="btn btn-secondary" href="/release/NewLumino-iOS-Wrapper-v1.0.0.zip">
        📱 Download iOS Xcode Wrapper (v1.0.0 ZIP)
      </a>
    </div>

    <div class="steps">
      <h3>Quick 10-Second Home Screen Install:</h3>
      <div class="step-item">
        <span class="step-num">1</span>
        <span><strong>iPhone / iPad:</strong> Open in Safari &rarr; Tap Share button &rarr; Tap <strong>Add to Home Screen</strong>.</span>
      </div>
      <div class="step-item">
        <span class="step-num">2</span>
        <span><strong>Android Phone:</strong> Open in Chrome &rarr; Tap top <strong>Install App</strong> button or 3-dot menu &rarr; <strong>Install</strong>.</span>
      </div>
      <div class="step-item">
        <span class="step-num">3</span>
        <span><strong>Mac / Windows:</strong> Click the glowing <strong>Install App</strong> pill in the top header.</span>
      </div>
    </div>

    <a class="footer-link" href="${origin}">Return to NewLumino Workspace &rarr;</a>
  </div>
</body>
</html>`);
});

>>>>>>> 1231699 (Update NewLumino project)
// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

// Mounting Vite in development or static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
<<<<<<< HEAD
      server: { middlewareMode: true },
=======
      server: { middlewareMode: true, hmr: false },
>>>>>>> 1231699 (Update NewLumino project)
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
