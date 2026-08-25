import type { Lesson } from "@/lib/types";

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
