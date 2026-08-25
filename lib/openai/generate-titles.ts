import OpenAI from "openai";
import { AI_MODELS } from "@/lib/ai/config";
import type { GenerateResponse, ProductContext } from "@/lib/types";

const SYSTEM_INSTRUCTION = `You are a Product Title Agent for an e-commerce team.

Generate useful product title candidates based strictly on the supplied product context.

Titles must:
- Clearly represent the actual product.
- Reflect the supplied theme.
- Consider the recipient when natural, the occasion when useful, and the niche or interest.
- Preserve personalization when it is an important product feature.
- Sound natural to customers.
- Avoid unsupported claims, invented features, awkward keyword stuffing, and near-duplicates.

There is currently no learned team memory. Do not claim or imply that preferences have already been learned.
Generate exactly 5 meaningfully different title candidates. Return title text only in the requested structure, with no markdown or explanations.`;

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

function isGenerateResponse(value: unknown): value is GenerateResponse {
  if (!value || typeof value !== "object" || !("titles" in value)) return false;
  const titles = (value as { titles: unknown }).titles;
  return Array.isArray(titles) && titles.length === 5 && titles.every(
    (title) => title && typeof title === "object" && typeof title.id === "string" && typeof title.text === "string" && title.text.trim().length > 0,
  );
}

export async function generateTitles(
  productContext: ProductContext,
  // A future milestone can add relevantMemories as a second argument here.
): Promise<GenerateResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: AI_MODELS.generate,
    instructions: SYSTEM_INSTRUCTION,
    input: formatProductContext(productContext),
    text: {
      format: {
        type: "json_schema",
        name: "product_title_candidates",
        strict: true,
        schema: titleSchema,
      },
    },
  });

  if (!response.output_text) throw new Error("The AI returned an empty response.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("The AI returned invalid JSON.");
  }

  if (!isGenerateResponse(parsed)) throw new Error("The AI returned an invalid title structure.");

  const uniqueTitles = new Set(parsed.titles.map((title) => title.text.trim().toLocaleLowerCase()));
  if (uniqueTitles.size !== 5) throw new Error("The AI returned duplicate titles.");

  return {
    titles: parsed.titles.map((title, index) => ({
      id: `title-${index + 1}`,
      text: title.text.trim(),
    })),
  };
}
