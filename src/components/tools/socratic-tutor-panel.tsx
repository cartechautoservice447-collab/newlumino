import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  Sparkles,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import type { DiagnosticQuestion } from "./ai-exam-simulator-dialog";

interface Props {
  question: DiagnosticQuestion;
  userAnswer?: number;
  noteTitle?: string;
  className?: string;
  onClose?: () => void;
}

interface Message {
  role: "assistant" | "user";
  text: string;
  socraticQuestion?: string;
  followUps?: string[];
}

export function SocraticTutorPanel({
  question,
  userAnswer,
  noteTitle = "Exam Review",
  className,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [activeVoiceName, setActiveVoiceName] = useState<string>("");

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isUserCorrect = userAnswer !== undefined && userAnswer === question.correctIndex;

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSpeechSupported(true);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initial greeting & socratic opening
  useEffect(() => {
    let isMounted = true;

    async function initDebrief() {
      setIsLoading(true);
      try {
        const intent = userAnswer === undefined ? "hint" : !isUserCorrect ? "why_failed" : "deep_dive";
        const res = await fetch("/api/ai/socratic-tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            userAnswer,
            explanation: question.explanation,
            sourceCitation: question.sourceCitation,
            keyTakeaway: question.keyTakeaway,
            intent,
            noteTitle,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (isMounted) {
          setMessages([
            {
              role: "assistant",
              text: data.reply || question.explanation,
              socraticQuestion: data.socraticQuestion,
              followUps: data.suggestedFollowUps || [
                "Why did my chosen option fail?",
                "Explain the core principle",
                "Give me an intuitive analogy",
              ],
            },
          ]);
        }
      } catch (err) {
        console.warn("Socratic tutor initial error:", err);
        if (isMounted) {
          setMessages([
            {
              role: "assistant",
              text: question.explanation,
              socraticQuestion: "What core invariant connects the question prompt directly to the correct option?",
              followUps: [
                "Break down each distractor",
                "Explain the primary rule",
                "Show evidence from notes",
              ],
            },
          ]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initDebrief();

    return () => {
      isMounted = false;
    };
  }, [question, userAnswer, noteTitle]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string, intent = "chat") => {
    if (!textToSend.trim() || isLoading) return;
    haptic("light");

    const newHistory: Message[] = [...messages, { role: "user", text: textToSend }];
    setMessages(newHistory);
    setInputVal("");
    setIsLoading(true);

    try {
      const historyForApi = newHistory.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        content: m.text,
      }));

      const res = await fetch("/api/ai/socratic-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          options: question.options,
          correctIndex: question.correctIndex,
          userAnswer,
          explanation: question.explanation,
          sourceCitation: question.sourceCitation,
          keyTakeaway: question.keyTakeaway,
          conversationHistory: historyForApi,
          userMessage: textToSend,
          intent,
          noteTitle,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply,
          socraticQuestion: data.socraticQuestion,
          followUps: data.suggestedFollowUps,
        },
      ]);
      haptic("medium");
    } catch (err) {
      console.warn("Socratic reply failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Let's focus on the invariant: examine the definitions in your notes to pinpoint the discrepancy.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Speech synthesis toggle
  const toggleSpeech = (textToSpeak: string) => {
    if (!speechSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    haptic("light");
    window.speechSynthesis.cancel();
    const cleanText = textToSpeak.replace(/[#*`_]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith("en") && !v.name.includes("whisper")) || voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
      setActiveVoiceName(englishVoice.name);
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-sky-500/30 bg-slate-950/90 backdrop-blur-2xl overflow-hidden shadow-2xl transition-all",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-500/20 bg-sky-500/[0.08] px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Socratic AI Reasoning Debrief</span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-sky-300 font-mono">
                Oral Exam Mode
              </span>
            </div>
            <p className="text-[0.68rem] text-muted-foreground">
              Deep conceptual derivation • Misconception diagnosis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {speechSupported && messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
                if (lastAssistantMsg) {
                  const fullSpeech = `${lastAssistantMsg.text}. ${lastAssistantMsg.socraticQuestion || ""}`;
                  toggleSpeech(fullSpeech);
                }
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                isSpeaking
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 animate-pulse"
                  : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
              )}
            >
              {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isSpeaking ? "Pause Audio" : "Listen Oral Tutor"}</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Question Anchor Pill */}
      <div className="border-b border-white/5 bg-white/[0.02] px-4 py-2 text-[0.7rem] text-muted-foreground flex items-center justify-between">
        <span className="font-semibold text-foreground truncate max-w-[80%]">
          Item: {question.question}
        </span>
        <span className={cn("font-bold text-[0.65rem] shrink-0 font-mono px-2 py-0.5 rounded", isUserCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
          {isUserCorrect ? "Solved Correctly" : "Missed Attempt"}
        </span>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto scroll-sleek p-4 space-y-3.5 max-h-[380px] min-h-[220px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col space-y-1.5",
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "rounded-2xl p-3.5 text-xs leading-relaxed max-w-[90%]",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground font-medium rounded-tr-sm"
                  : "border border-sky-500/20 bg-sky-950/40 text-foreground rounded-tl-sm shadow-md"
              )}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Socratic Probing Question Anchor */}
              {msg.socraticQuestion && (
                <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-[0.72rem] text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[0.62rem] text-amber-400">
                    <Sparkles className="h-3 w-3" />
                    <span>Professor's Socratic Inquiry:</span>
                  </div>
                  <p className="font-semibold italic">"{msg.socraticQuestion}"</p>
                </div>
              )}
            </div>

            {/* Suggested Follow-Up Prompts */}
            {msg.role === "assistant" && msg.followUps && msg.followUps.length > 0 && i === messages.length - 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {msg.followUps.map((fu, fIdx) => (
                  <button
                    key={fIdx}
                    type="button"
                    onClick={() => handleSendMessage(fu, "chat")}
                    className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[0.68rem] font-medium text-sky-300 hover:bg-sky-500/20 hover:text-white transition cursor-pointer"
                  >
                    {fu}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-sky-400 font-mono py-2 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Socratic professor formulating conceptual breakdown...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-white/10 bg-white/[0.02] p-3 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(inputVal);
            }
          }}
          placeholder="Respond to professor or ask why a specific step failed..."
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        <button
          type="button"
          disabled={!inputVal.trim() || isLoading}
          onClick={() => handleSendMessage(inputVal)}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-30 transition cursor-pointer shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
