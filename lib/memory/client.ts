import type { Lesson } from "@/lib/types";
import { hasMemory, isLesson } from "@/lib/memory/validation";

export { hasMemory } from "@/lib/memory/validation";

const STORAGE_KEY = "grow_team_memory";
const STORAGE_VERSION = 1;

type MemoryStore = {
  version: 1;
  lessons: Lesson[];
};

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
