import OpenAI from "openai";
import { AI_MODELS } from "@/lib/ai/config";
import type { GeneratedTitle, Lesson, ProductContext } from "@/lib/types";

const SYSTEM_INSTRUCTION = `You are a Product Title Agent for an e-commerce team.

Generate useful product title candidates based strictly on the supplied product context.

Titles must:
- Clearly represent the actual product.
- Reflect the supplied theme.
- Consider the recipient when natural, the occasion when useful, and the niche or interest.
- Preserve personalization when it is an important product feature.
- Sound natural to customers.
- Avoid unsupported claims, invented features, awkward keyword stuffing, and near-duplicates.

Generate exactly 5 meaningfully different title candidates. Return title text only in the requested structure, with no markdown or explanations.`;

const NO_MEMORY_INSTRUCTION = "There is currently no learned team memory. Do not claim or imply that preferences have already been learned.";
const MEMORY_CONSTRAINT_INSTRUCTION = `Relevant Team Lessons are learned behavioral constraints from prior human feedback.

For each lesson that applies:
- Satisfy every applicable DO instruction.
- Violate none of the applicable DON'T instructions.
- Make the learned preference observable in the generated output.
- Preserve all factual Product Context.

Before returning each candidate, internally verify it against every applicable lesson. If it violates an applicable DO or DON'T rule, rewrite it before returning it. This verification must use the supplied Lesson instructions themselves; do not infer or add domain-specific rules that are not present in a Lesson.`;

const titleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    titles: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", enum: ["title-1", "title-2", "title-3", "title-4", "title-5"] },
          text: { type: "string", minLength: 1 },
        },
        required: ["id", "text"],
      },
    },
  },
  required: ["titles"],
} as const;

function formatProductContext(context: ProductContext) {
  const values: Array<[string, string | undefined]> = [
    ["Product Description", context.productDescription],
    ["Product Line", context.productLine],
    ["Product Theme", context.productTheme],
    ["Recipient", context.recipient],
    ["Occasion", context.occasion],
    ["Niche / Interest", context.niche],
  ];

  return [
    "Use only the product context below. A value marked Not provided is unknown and must not be invented.",
    "",
    ...values.map(([label, value]) => `${label}: ${value?.trim() || "Not provided"}`),
  ].join("\n");
}

function formatRelevantMemories(memories: Lesson[]) {
  if (memories.length === 0) return "";
  const lessons = memories.map((lesson, index) => `Lesson ${index + 1}

Context: ${lesson.context}
DO:
${lesson.do.map((rule) => `- ${rule}`).join("\n")}
DON'T:
${lesson.dont.length > 0 ? lesson.dont.map((rule) => `- ${rule}`).join("\n") : "- None specified"}
Reason: ${lesson.reason}
Confidence: ${lesson.confidence}${lesson.goodExample ? `\nGood example (illustration only): ${lesson.goodExample}` : ""}${lesson.badExample ? `\nBad example (illustration only): ${lesson.badExample}` : ""}`);

  return `RELEVANT TEAM LESSONS

You are generating a new output using previously learned team preferences.
These are learned behavioral instructions from previous human feedback, not optional background information.

For each relevant lesson:
- Follow every applicable DO instruction.
- Avoid every applicable DON'T instruction.
- Materially change structure, emphasis, or tone when required by the lesson.
- Preserve factual accuracy from the current Product Context.
- Do not mention the lesson or memory system.
- Do not blindly copy examples.

The resulting title set must visibly demonstrate the learned preference.

Apply the behavioral change across the title set while preserving meaningful diversity. Vary how the learned preference is expressed rather than repeating one opening or template. Do not blindly copy examples, and do not copy a Good Example verbatim. Do not mention lessons or the memory system in the output.

Higher-confidence lessons should carry more weight, but never override factual Product Context. The product type, features, recipient, theme, occasion, niche, and personalization must remain factually correct.

${lessons.join("\n\n")}`;
}

type GeneratedTitlesResult = {
  titles: GeneratedTitle[];
  includedMemoryIds: string[];
};

type ModelTitleResponse = { titles: GeneratedTitle[] };

function isModelTitleResponse(value: unknown): value is ModelTitleResponse {
  if (!value || typeof value !== "object" || !("titles" in value)) return false;
  const titles = (value as { titles: unknown }).titles;
  return Array.isArray(titles) && titles.length === 5 && titles.every(
    (title) => title && typeof title === "object" && typeof title.id === "string" && typeof title.text === "string" && title.text.trim().length > 0,
  );
}

export async function generateTitles(
  productContext: ProductContext,
  relevantMemories: Lesson[] = [],
): Promise<GeneratedTitlesResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const memoryPrompt = formatRelevantMemories(relevantMemories);
  const includedMemoryIds = memoryPrompt ? relevantMemories.map((memory) => memory.id) : [];
  const hasIncludedMemories = includedMemoryIds.length > 0;
  const finalMessages = [
    {
      role: "developer" as const,
      content: `${SYSTEM_INSTRUCTION}\n\n${hasIncludedMemories ? MEMORY_CONSTRAINT_INSTRUCTION : NO_MEMORY_INSTRUCTION}`,
    },
    {
      role: "user" as const,
      content: [memoryPrompt, formatProductContext(productContext)].filter(Boolean).join("\n\n"),
    },
  ];

  if (process.env.NODE_ENV !== "production") {
    console.log("M6_DEBUG_FINAL_PROMPT", finalMessages);
  }

  const response = await client.responses.create({
    model: AI_MODELS.generate,
    input: finalMessages,
    text: {
      format: {
        type: "json_schema",
        name: "product_title_candidates",
        strict: true,
        schema: titleSchema,
      },
    },
  });

  console.log({
    stage: "generate",
    model: AI_MODELS.generate,
    memoryCount: includedMemoryIds.length,
    memoryIds: includedMemoryIds,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  });

  if (!response.output_text) throw new Error("The AI returned an empty response.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("The AI returned invalid JSON.");
  }

  if (!isModelTitleResponse(parsed)) throw new Error("The AI returned an invalid title structure.");

  const uniqueTitles = new Set(parsed.titles.map((title) => title.text.trim().toLocaleLowerCase()));
  if (uniqueTitles.size !== 5) throw new Error("The AI returned duplicate titles.");

  return {
    titles: parsed.titles.map((title, index) => ({
      id: `title-${index + 1}`,
      text: title.text.trim(),
    })),
    includedMemoryIds,
  };
}
