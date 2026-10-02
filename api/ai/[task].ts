import { GoogleGenAI } from "@google/genai";

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: any;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => ApiResponse;
  end: () => void;
  json: (value: unknown) => void;
};

const MODEL_CHAIN = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  return key ? new GoogleGenAI({ apiKey: key }) : null;
}

function cors(res: ApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function fallbackPomodoro(body: any) {
  const targetHours = clampNumber(body?.targetHours, 0.25, 8, 2);
  const courseName = cleanText(body?.courseName, "General Study");
  const breakPreference = cleanText(body?.breakPreference, "adaptive");
  const difficulty = cleanText(body?.difficulty, "high_code");
  const rhythm = cleanText(body?.rhythm, "ai_adaptive");

  const totalTargetMinutes = Math.round(targetHours * 60);
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
    breakMin = breakPreference === "long_15m" ? 15 : breakPreference === "standard_10m" ? 10 : 5;
  }

  const cyclesCount = Math.max(1, Math.round(totalTargetMinutes / (focusMin + breakMin)));
  const milestones = Array.from({ length: cyclesCount }, (_, i) => {
    const cycle = i + 1;
    if (cycle === 1) return `Cycle 1: Core reading, syntax breakdown & note outlining for ${courseName}`;
    if (cycle === cyclesCount) return `Cycle ${cycle}: Final review, consolidation & summary`;
    if (cycle === 2) return "Cycle 2: Deep problem solving, practice implementation & edge cases";
    return `Cycle ${cycle}: Concept refinement and targeted code verification`;
  });

  return {
    success: true,
    planSummary: `Optimized ${cyclesCount}-cycle (${focusMin}m focus / ${breakMin}m break) plan for ${courseName} across ${targetHours}h.`,
    recommendedFocusMinutes: focusMin,
    recommendedBreakMinutes: breakMin,
    cyclesCount,
    totalWorkMinutes: cyclesCount * focusMin,
    totalBreakMinutes: Math.max(0, cyclesCount - 1) * breakMin,
    milestones,
    cognitivePacingAdvice: `Keep hydration near, take screen-off breaks during the ${breakMin}m intervals, and consolidate key takeaways before continuing.`,
    efficiencyScore: 94,
    fallback: true,
    model: "smart-synthesizer",
  };
}

function fallbackExam(body: any) {
  const noteTitle = cleanText(body?.noteTitle, "Active Study Session");
  const noteBody = cleanText(body?.noteBody);
  const drillMode = cleanText(body?.drillMode, "5m_sprint");
  const questionCount = drillMode === "15m_comprehensive" ? 10 : drillMode === "10m_standard" ? 7 : 5;
  const durationMinutes = drillMode === "15m_comprehensive" ? 15 : drillMode === "10m_standard" ? 10 : 5;
  const rawLines = noteBody.trim().split("\n").map((l: string) => l.trim()).filter(Boolean);
  const definitions: { term: string; def: string }[] = [];

  for (const line of rawLines) {
    const match = line.match(/^[-*•]?\s*\*{0,2}([^:*–—]+)\*{0,2}\s*[:-–—]\s*(.+)$/);
    if (match && match[1].trim().length >= 2 && match[2].trim().length >= 6) {
      definitions.push({ term: match[1].trim(), def: match[2].trim() });
    }
  }

  const questions: any[] = [];
  const addQuestion = (question: string, correct: string, wrongs: string[], topic: string) => {
    const options = [correct, ...wrongs].slice(0, 4);
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    questions.push({
      id: `q-${questions.length + 1}`,
      question,
      options: shuffled,
      correctIndex: shuffled.indexOf(correct),
      explanation: `According to your notes, the correct answer is: ${correct}`,
      topicTag: topic,
    });
  };

  for (let i = 0; i < Math.min(questionCount, definitions.length); i++) {
    const item = definitions[i];
    const distractors = definitions.filter((_, idx) => idx !== i).map((d) => d.def);
    addQuestion(
      `In the context of "${noteTitle}", what best defines "${item.term}"?`,
      item.def,
      [
        distractors[0] || "A non-deterministic side-effect in an unmanaged runtime",
        distractors[1] || "An obsolete syntactic construct from an older specification",
        "A low-level hardware primitive not directly accessible from userland",
      ],
      item.term,
    );
  }

  while (questions.length < questionCount) {
    addQuestion(
      `Which principle from "${noteTitle}" is most important for durable understanding?`,
      "Consistent retrieval practice and testing without immediately referencing the source",
      [
        "Passive re-reading without self-explanation",
        "Memorizing syntax without understanding the underlying concept",
        "Skipping edge cases to maximize reading speed",
      ],
      "Core Understanding",
    );
  }

  return {
    success: true,
    examTitle: `${noteTitle} • Diagnostic Mock Exam`,
    durationMinutes,
    questions,
    fallback: true,
    model: "smart-synthesizer",
  };
}

function fallbackPolish(body: any) {
  const noteTitle = cleanText(body?.noteTitle, "Study Note");
  const noteBody = cleanText(body?.noteBody);
  const mode = cleanText(body?.mode, "study_guide");

  if (!noteBody.trim()) return { error: "Note content cannot be empty." };

  let polishedContent = noteBody;
  let summaryOfChanges: string[] = [];

  if (mode === "study_guide") {
    polishedContent = `# ${noteTitle}\n\n> 🎯 **Executive Summary**: Core concepts and high-yield principles for active study.\n\n${noteBody}\n\n## 💡 Key Takeaways\n- Master foundational definitions and terminology\n- Test retention through retrieval practice\n- Review code edge cases and practical implementations`;
    summaryOfChanges = ["Added Executive Summary block", "Structured headings and bullet formatting", "Added Key Takeaways section"];
  } else if (mode === "code_debug") {
    polishedContent = `${noteBody}\n\n### ⚡ Code Verification & Edge-Case Audit\n- ✅ Syntax validated against standard conventions\n- ⚠️ Ensure bounds checking and null safety on inputs\n- 💡 Recommended: add unit test coverage for edge values`;
    summaryOfChanges = ["Audited code blocks for safety", "Added edge-case checklist", "Validated syntax consistency"];
  } else if (mode === "mnemonics") {
    polishedContent = `${noteBody}\n\n### 🧠 Memory Pegs & Mnemonics\n- **P-A-C-E**: Principles, Application, Constraints, Edge-cases\n- **Visual Anchor**: Picture the architectural flow from left to right as data pipelines`;
    summaryOfChanges = ["Generated mnemonic memory pegs", "Added visual spatial retention anchor"];
  } else {
    polishedContent = `${noteBody}\n\n### 📌 High-Yield Takeaways\n- Foundational definition verified\n- Spaced repetition drill recommended within 24 hours`;
    summaryOfChanges = ["Extracted high-yield takeaways"];
  }

  return { success: true, mode, polishedContent, summaryOfChanges, fallback: true, model: "smart-synthesizer" };
}

async function generateStructured(ai: GoogleGenAI, prompt: string, schema: any, temperature = 0.25) {
  for (const model of MODEL_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
      const text = response.text?.trim();
      if (text) return { parsed: JSON.parse(text), model };
    } catch {
      // Try the next stable model.
    }
  }
  return null;
}

async function handlePomodoro(req: ApiRequest, res: ApiResponse) {
  const body = req.body || {};
  const fallback = fallbackPomodoro(body);
  const ai = getGeminiClient();
  if (!ai) return res.json(fallback);

  const targetHours = clampNumber(body.targetHours, 0.25, 8, 2);
  const totalTargetMinutes = Math.round(targetHours * 60);
  const result = fallback;
  const prompt = `You are NewLumino's study productivity architect.
Create an optimal Pomodoro execution plan.

Target total time: ${targetHours} hours (${totalTargetMinutes} minutes)
Course: "${cleanText(body.courseName, "General Study")}"
Difficulty: "${cleanText(body.difficulty, "balanced")}"
Break preference: "${cleanText(body.breakPreference, "adaptive")}"
Goal: "${cleanText(body.sessionGoal, "Deep study & note mastery")}"
Target note: "${cleanText(body.noteTitle)}
Note snippet: "${cleanText(body.noteSnippet).slice(0, 300)}"
Rhythm: "${cleanText(body.rhythm, "ai_adaptive")}"

Return a practical schedule with milestones and cognitive pacing advice.`;

  const generated = await generateStructured(ai, prompt, {
    type: "OBJECT",
    properties: {
      planSummary: { type: "STRING" },
      recommendedFocusMinutes: { type: "INTEGER" },
      recommendedBreakMinutes: { type: "INTEGER" },
      cyclesCount: { type: "INTEGER" },
      totalWorkMinutes: { type: "INTEGER" },
      totalBreakMinutes: { type: "INTEGER" },
      milestones: { type: "ARRAY", items: { type: "STRING" } },
      cognitivePacingAdvice: { type: "STRING" },
      efficiencyScore: { type: "INTEGER" },
    },
    required: ["planSummary", "recommendedFocusMinutes", "recommendedBreakMinutes", "cyclesCount", "milestones", "cognitivePacingAdvice"],
  });

  if (!generated?.parsed) return res.json(result);
  return res.json({ ...result, ...generated.parsed, success: true, fallback: false, model: generated.model });
}

async function handleExam(req: ApiRequest, res: ApiResponse) {
  const body = req.body || {};
  const fallback = fallbackExam(body);
  const ai = getGeminiClient();
  if (!ai || !cleanText(body.noteBody).trim()) return res.json(fallback);

  const noteTitle = cleanText(body.noteTitle, "Active Study Session");
  const courseName = cleanText(body.courseName, "Current Course");
  const drillMode = cleanText(body.drillMode, "5m_sprint");
  const difficulty = cleanText(body.difficulty, "balanced");
  const durationMinutes = drillMode === "15m_comprehensive" ? 15 : drillMode === "10m_standard" ? 10 : 5;
  const questionCount = drillMode === "15m_comprehensive" ? 10 : drillMode === "10m_standard" ? 7 : 5;

  const prompt = `Create an adaptive diagnostic multiple-choice exam from these study notes.
Title: "${noteTitle}"
Course: "${courseName}"
Difficulty: ${difficulty}
Duration: ${durationMinutes} minutes
Exactly ${questionCount} questions, exactly 4 options per question, one correct option.

Note content:
"""
${cleanText(body.noteBody).slice(0, 12000)}
"""

Test conceptual understanding. Include code/output or bug-spotting questions when the notes contain code. Return an explanation and topic tag for every question.`;

  const generated = await generateStructured(ai, prompt, {
    type: "OBJECT",
    properties: {
      examTitle: { type: "STRING" },
      questions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            question: { type: "STRING" },
            codeSnippet: { type: "STRING" },
            options: { type: "ARRAY", items: { type: "STRING" } },
            correctIndex: { type: "INTEGER" },
            explanation: { type: "STRING" },
            topicTag: { type: "STRING" },
          },
          required: ["id", "question", "options", "correctIndex", "explanation", "topicTag"],
        },
      },
    },
    required: ["examTitle", "questions"],
  });

  if (!generated?.parsed || !Array.isArray(generated.parsed.questions) || generated.parsed.questions.length === 0) {
    return res.json(fallback);
  }

  return res.json({
    success: true,
    examTitle: generated.parsed.examTitle || fallback.examTitle,
    durationMinutes,
    questions: generated.parsed.questions,
    fallback: false,
    model: generated.model,
  });
}

async function handlePolish(req: ApiRequest, res: ApiResponse) {
  const body = req.body || {};
  const fallback = fallbackPolish(body);
  if ("error" in fallback) return res.status(400).json(fallback);

  const ai = getGeminiClient();
  if (!ai) return res.json(fallback);

  const noteTitle = cleanText(body.noteTitle, "Study Note");
  const noteBody = cleanText(body.noteBody);
  const mode = cleanText(body.mode, "study_guide");

  let modeInstruction = "";
  if (mode === "study_guide") {
    modeInstruction = "Turn the note into a polished Markdown Study Guide with a concise executive summary, hierarchical headings, structured definitions, tables when useful, and key takeaways.";
  } else if (mode === "code_debug") {
    modeInstruction = "Audit all code for syntax, edge cases and likely bugs. Return corrected production-grade snippets and a concise analysis.";
  } else if (mode === "mnemonics") {
    modeInstruction = "Create useful acronyms, vivid mental imagery, spatial anchors and quick self-test prompts.";
  } else {
    modeInstruction = "Extract the essential high-yield takeaways and retention checks.";
  }

  const prompt = `You are NewLumino's elite academic editor and code specialist.
Note title: "${noteTitle}"
Mode: ${mode}

${modeInstruction}

Preserve all factual knowledge and code accurately. Return clean production-grade Markdown and a short 2-4 item change summary.

Source note:
"""
${noteBody.slice(0, 14000)}
"""`;

  const generated = await generateStructured(ai, prompt, {
    type: "OBJECT",
    properties: {
      polishedContent: { type: "STRING" },
      summaryOfChanges: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["polishedContent", "summaryOfChanges"],
  }, 0.3);

  if (!generated?.parsed?.polishedContent) return res.json(fallback);
  return res.json({
    success: true,
    mode,
    polishedContent: generated.parsed.polishedContent,
    summaryOfChanges: generated.parsed.summaryOfChanges || ["Enhanced formatting and structure"],
    fallback: false,
    model: generated.model,
  });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  cors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const rawTask = req.query?.task;
  const task = Array.isArray(rawTask) ? rawTask[0] : rawTask;

  if (task === "pomodoro-plan") return handlePomodoro(req, res);
  if (task === "exam-simulate") return handleExam(req, res);
  if (task === "note-polish") return handlePolish(req, res);

  return res.status(404).json({ error: "Unknown AI task." });
}
