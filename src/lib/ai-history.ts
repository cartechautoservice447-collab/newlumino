import { supabase } from "@/integrations/supabase/client";

export type AiHistoryTool =
  | "learning_lab"
  | "note_polisher"
  | "exam_simulator"
  | "progressive_exam"
  | "flashcards";

export type AiHistoryContext = Record<string, unknown>;
export type AiHistoryPayload = Record<string, unknown>;

export interface AiHistoryRecord {
  id: string;
  tool: AiHistoryTool;
  title: string;
  subtitle: string;
  action: string;
  context: AiHistoryContext;
  payload: AiHistoryPayload;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiHistoryInput {
  userId?: string | null;
  tool: AiHistoryTool;
  title: string;
  subtitle?: string;
  action?: string;
  context?: AiHistoryContext;
  payload?: AiHistoryPayload;
}

const LOCAL_KEY_PREFIX = "newlumino-ai-history-v1";
const MAX_LOCAL_RECORDS = 50;

function localKey(userId?: string | null) {
  return LOCAL_KEY_PREFIX + ":" + (userId || "guest");
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "ai-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function normalizeRecord(row: any): AiHistoryRecord {
  return {
    id: row.id,
    tool: row.tool,
    title: row.title || "Untitled AI session",
    subtitle: row.subtitle || "",
    action: row.action || "generated",
    context: (row.context && typeof row.context === "object" ? row.context : {}) as AiHistoryContext,
    payload: (row.payload && typeof row.payload === "object" ? row.payload : {}) as AiHistoryPayload,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function readLocal(userId?: string | null): AiHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(localKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AiHistoryRecord[];
  } catch {
    return [];
  }
}

function writeLocal(userId: string | null | undefined, records: AiHistoryRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(localKey(userId), JSON.stringify(records.slice(0, MAX_LOCAL_RECORDS)));
  } catch {
    // Ignore storage quota/private-mode failures.
  }
}

export async function createAiHistory(input: CreateAiHistoryInput): Promise<AiHistoryRecord | null> {
  const now = new Date().toISOString();
  const localRecord: AiHistoryRecord = {
    id: makeId(),
    tool: input.tool,
    title: input.title || "Untitled AI session",
    subtitle: input.subtitle || "",
    action: input.action || "generated",
    context: input.context || {},
    payload: input.payload || {},
    createdAt: now,
    updatedAt: now,
  };

  if (input.userId) {
    try {
      const { data, error } = await supabase
        .from("ai_history")
        .insert({
          id: localRecord.id,
          user_id: input.userId,
          tool: input.tool,
          title: localRecord.title,
          subtitle: localRecord.subtitle,
          action: localRecord.action,
          context: localRecord.context as any,
          payload: localRecord.payload as any,
          created_at: now,
          updated_at: now,
        })
        .select("id, tool, title, subtitle, action, context, payload, created_at, updated_at")
        .single();
      if (!error && data) return normalizeRecord(data);
      console.warn("[AI History] remote write failed:", error?.message || "unknown error");
    } catch (error) {
      console.warn("[AI History] remote write exception:", error);
    }
  }

  const next = [localRecord, ...readLocal(input.userId)];
  writeLocal(input.userId, next);
  return localRecord;
}

export async function listAiHistory(userId: string | null | undefined, tool: AiHistoryTool): Promise<AiHistoryRecord[]> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("ai_history")
        .select("id, tool, title, subtitle, action, context, payload, created_at, updated_at")
        .eq("user_id", userId)
        .eq("tool", tool)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error) return ((data || []) as any[]).map(normalizeRecord);
      console.warn("[AI History] remote read failed:", error.message);
    } catch (error) {
      console.warn("[AI History] remote read exception:", error);
    }
  }
  return readLocal(userId).filter((record) => record.tool === tool);
}

export async function deleteAiHistory(userId: string | null | undefined, recordId: string): Promise<void> {
  if (userId) {
    try {
      const { error } = await supabase.from("ai_history").delete().eq("id", recordId).eq("user_id", userId);
      if (error) console.warn("[AI History] remote delete failed:", error.message);
    } catch (error) {
      console.warn("[AI History] remote delete exception:", error);
    }
  }
  writeLocal(userId, readLocal(userId).filter((record) => record.id !== recordId));
}

export async function clearAiHistory(userId: string | null | undefined, tool: AiHistoryTool): Promise<void> {
  if (userId) {
    try {
      const { error } = await supabase.from("ai_history").delete().eq("user_id", userId).eq("tool", tool);
      if (error) console.warn("[AI History] remote clear failed:", error.message);
    } catch (error) {
      console.warn("[AI History] remote clear exception:", error);
    }
  }
  writeLocal(userId, readLocal(userId).filter((record) => record.tool !== tool));
}