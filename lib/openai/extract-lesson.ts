import OpenAI from "openai";
import { AI_MODELS } from "@/lib/ai/config";
import type { Lesson, ProductContext, Review } from "@/lib/types";

const OBSERVE_INSTRUCTION = `You are the Observe stage of the GROW learning loop for an e-commerce Product Title Agent.

Analyze the human review and extract the smallest useful reusable lesson that could improve future similar tasks.

Memory is not history. Do not simply summarize the feedback or memorize the exact product or title. Ask what the agent should do differently when it encounters a similar task in the future.

Generalize the feedback into a defensible, actionable rule that is general enough to reuse but specific enough to guide future title generation. Avoid speculative rules when the feedback supports only a small lesson.

Identify:
1. Context — when the lesson applies.
2. DO — behavior the agent should repeat.
3. DON'T — behavior the agent should avoid.
4. Reason — why this improves the result.
5. Good Example — an optional short illustration, not a title to memorize.
6. Bad Example — an optional short illustration, not a title to memorize.

For edits, compare the original title, edited title, and reason to identify the reusable transformation. For rejections, focus on what to avoid, why, and what should replace it. For approvals, identify only the positive behavior supported by the reason.

Return only the requested structured data. Confidence must always be 0.5.`;

const lessonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    context: { type: "string", minLength: 1 },
    do: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1, maxItems: 4 },
    dont: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 4 },
    reason: { type: "string", minLength: 1 },
    goodExample: { type: ["string", "null"] },
    badExample: { type: ["string", "null"] },
    confidence: { type: "number", enum: [0.5] },
  },
  required: ["context", "do", "dont", "reason", "goodExample", "badExample", "confidence"],
} as const;

type ExtractedLesson = Omit<Lesson, "id" | "goodExample" | "badExample"> & {
  goodExample: string | null;
  badExample: string | null;
};

function formatObserveInput(productContext: ProductContext, review: Review) {
  const value = (input?: string) => input?.trim() || "Not provided";
  return `PRODUCT CONTEXT

Product Description:
${value(productContext.productDescription)}

Product Line:
${value(productContext.productLine)}

Product Theme:
${value(productContext.productTheme)}

Recipient:
${value(productContext.recipient)}

Occasion:
${value(productContext.occasion)}

Niche / Interest:
${value(productContext.niche)}

AI OUTPUT

Original Title:
${value(review.originalTitle)}

HUMAN REVIEW

Action:
${review.action}

Edited Title:
${value(review.editedTitle)}

Human Reason:
${value(review.reason)}`;
}

function isExtractedLesson(value: unknown): value is ExtractedLesson {
  if (!value || typeof value !== "object") return false;
  const lesson = value as Record<string, unknown>;
  const validRules = (rules: unknown, allowEmpty: boolean) =>
    Array.isArray(rules) && (allowEmpty || rules.length > 0) && rules.every((rule) => typeof rule === "string" && rule.trim().length > 0);
  return typeof lesson.context === "string" && lesson.context.trim().length > 0
    && validRules(lesson.do, false)
    && validRules(lesson.dont, true)
    && typeof lesson.reason === "string" && lesson.reason.trim().length > 0
    && (typeof lesson.goodExample === "string" || lesson.goodExample === null)
    && (typeof lesson.badExample === "string" || lesson.badExample === null)
    && lesson.confidence === 0.5;
}

export async function extractLesson(productContext: ProductContext, review: Review): Promise<Lesson> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: AI_MODELS.learn,
    instructions: OBSERVE_INSTRUCTION,
    input: formatObserveInput(productContext, review),
    text: {
      format: {
        type: "json_schema",
        name: "reusable_product_title_lesson",
        strict: true,
        schema: lessonSchema,
      },
    },
  });

  console.log({
    stage: "learn",
    model: AI_MODELS.learn,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  });

  if (!response.output_text) throw new Error("The AI returned an empty lesson.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("The AI returned invalid lesson JSON.");
  }
  if (!isExtractedLesson(parsed)) throw new Error("The AI returned an invalid lesson structure.");

  const lesson: Lesson = {
    id: crypto.randomUUID(),
    context: parsed.context.trim(),
    do: parsed.do.map((rule) => rule.trim()),
    dont: parsed.dont.map((rule) => rule.trim()),
    reason: parsed.reason.trim(),
    confidence: 0.5,
  };
  if (parsed.goodExample?.trim()) lesson.goodExample = parsed.goodExample.trim();
  if (parsed.badExample?.trim()) lesson.badExample = parsed.badExample.trim();
  return lesson;
}
