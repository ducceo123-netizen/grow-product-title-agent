import OpenAI from "openai";
import { AI_MODELS } from "@/lib/ai/config";
import type { Lesson, ProductContext, RetrieveResponse } from "@/lib/types";

const RETRIEVE_INSTRUCTION = `You are the Retrieve stage of the GROW learning loop for an e-commerce Product Title Agent.

Select only saved lessons that can genuinely improve title generation for the current product context. Judge semantic transfer of the underlying principle, not exact keyword overlap. A lesson about personalized memorial products may transfer across product types, pet types, or occasions when the underlying memorial and personalization context still applies.

Avoid over-retrieval. A lesson's stated context is an applicability boundary, not merely a topic hint. Select it only when the current product shares the underlying category, theme, customer intent, or communication goal that makes the rule useful. Generic overlap such as personalization, gifts, emotion, a recipient, or a product title is not enough by itself. A conflicting theme or purchase intent is evidence against retrieval.

A returned match must be clearly and directly relevant. If your own assessment would describe a lesson as only weakly relevant, partially relevant, limited, tangential, or conflicting, exclude it from matches. Do not return low-quality matches with caveats in the relevance explanation; return zero matches instead.

For example, a lesson for personalized memorial products transfers from a dog ornament to a cat memorial frame because both are personalized memorial products. It does not transfer to a funny retirement mug merely because both products are personalized or could use emotional language. Prefer zero matches over stretching a lesson beyond its stated context. Return only IDs from the supplied Team Memory, with a concise explanation of why each lesson transfers to this product.

Do not rewrite, summarize, mutate, reinforce, or create memories. Return only the requested structured data.`;

function formatInput(productContext: ProductContext, memories: Lesson[]) {
  const value = (input?: string) => input?.trim() || "Not provided";
  return `CURRENT PRODUCT CONTEXT

Product Description: ${value(productContext.productDescription)}
Product Line: ${value(productContext.productLine)}
Product Theme: ${value(productContext.productTheme)}
Recipient: ${value(productContext.recipient)}
Occasion: ${value(productContext.occasion)}
Niche / Interest: ${value(productContext.niche)}

TEAM MEMORY
${JSON.stringify(memories, null, 2)}`;
}

export async function retrieveRelevantMemories(productContext: ProductContext, memories: Lesson[]): Promise<RetrieveResponse> {
  if (memories.length === 0) return { matches: [] };
  const memoryIds = memories.map((memory) => memory.id);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: AI_MODELS.retrieve,
    instructions: RETRIEVE_INSTRUCTION,
    input: formatInput(productContext, memories),
    text: {
      format: {
        type: "json_schema",
        name: "relevant_team_memories",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  memoryId: { type: "string", enum: memoryIds },
                  relevance: { type: "string", minLength: 1 },
                },
                required: ["memoryId", "relevance"],
              },
            },
          },
          required: ["matches"],
        },
      },
    },
  });

  console.log({
    stage: "retrieve",
    model: AI_MODELS.retrieve,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  });

  if (!response.output_text) throw new Error("The AI returned an empty retrieval response.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("The AI returned invalid retrieval JSON.");
  }
  if (!parsed || typeof parsed !== "object" || !("matches" in parsed) || !Array.isArray(parsed.matches)) {
    throw new Error("The AI returned an invalid retrieval structure.");
  }
  const seen = new Set<string>();
  for (const match of parsed.matches) {
    if (!match || typeof match !== "object") throw new Error("The AI returned an invalid memory match.");
    const candidate = match as Record<string, unknown>;
    if (typeof candidate.memoryId !== "string" || !memoryIds.includes(candidate.memoryId) || seen.has(candidate.memoryId)
      || typeof candidate.relevance !== "string" || !candidate.relevance.trim()) {
      throw new Error("The AI returned an invalid memory match.");
    }
    seen.add(candidate.memoryId);
  }
  return {
    matches: parsed.matches.map((match: { memoryId: string; relevance: string }) => ({
      memoryId: match.memoryId,
      relevance: match.relevance.trim(),
    })),
  };
}
