import type { Lesson } from "@/lib/types";

const STORAGE_KEY = "grow_team_memory";
const STORAGE_VERSION = 1;

type MemoryStore = {
  version: 1;
  lessons: Lesson[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

export function isLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") return false;
  const lesson = value as Record<string, unknown>;
  return typeof lesson.id === "string" && lesson.id.trim().length > 0
    && typeof lesson.context === "string" && lesson.context.trim().length > 0
    && isStringArray(lesson.do) && lesson.do.length > 0
    && isStringArray(lesson.dont)
    && typeof lesson.reason === "string" && lesson.reason.trim().length > 0
    && (lesson.goodExample === undefined || typeof lesson.goodExample === "string")
    && (lesson.badExample === undefined || typeof lesson.badExample === "string")
    && typeof lesson.confidence === "number" && lesson.confidence >= 0 && lesson.confidence <= 1;
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function lessonSignature(lesson: Lesson) {
  const normalizeRules = (rules: string[]) => rules.map(normalizeText).sort().join("|");
  return [normalizeText(lesson.context), normalizeRules(lesson.do), normalizeRules(lesson.dont)].join("::");
}

export function hasMemory(memories: Lesson[], lesson: Lesson) {
  const signature = lessonSignature(lesson);
  return memories.some((memory) => memory.id === lesson.id || lessonSignature(memory) === signature);
}

function writeMemories(lessons: Lesson[]) {
  if (typeof window === "undefined") return;
  const store: MemoryStore = { version: STORAGE_VERSION, lessons };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getMemories(): Lesson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<MemoryStore>;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.lessons)) return [];
    return parsed.lessons.filter(isLesson);
  } catch {
    return [];
  }
}

export function saveMemory(lesson: Lesson): Lesson[] {
  if (!isLesson(lesson)) return getMemories();
  const memories = getMemories();
  if (hasMemory(memories, lesson)) return memories;
  const next = [...memories, lesson];
  writeMemories(next);
  return next;
}

export function deleteMemory(id: string): Lesson[] {
  const next = getMemories().filter((lesson) => lesson.id !== id);
  writeMemories(next);
  return next;
}

export function clearMemories() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
