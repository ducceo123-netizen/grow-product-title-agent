import { NextResponse } from "next/server";
import { isLesson } from "@/lib/memory/validation";
import { retrieveRelevantMemories } from "@/lib/openai/retrieve-relevant-memories";
import type { ApiErrorResponse, ProductContext, RetrieveResponse } from "@/lib/types";

const optionalString = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;

export async function POST(request: Request): Promise<NextResponse<RetrieveResponse | ApiErrorResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (!input.productContext || typeof input.productContext !== "object") {
    return NextResponse.json({ error: "Valid product context is required." }, { status: 400 });
  }
  const contextInput = input.productContext as Record<string, unknown>;
  const productDescription = optionalString(contextInput.productDescription);
  if (!productDescription) return NextResponse.json({ error: "Valid product context is required." }, { status: 400 });
  if (!Array.isArray(input.memories) || !input.memories.every(isLesson)) {
    return NextResponse.json({ error: "A valid memory array is required." }, { status: 400 });
  }
  const memoryIds = new Set(input.memories.map((memory) => memory.id));
  if (memoryIds.size !== input.memories.length) {
    return NextResponse.json({ error: "Memory IDs must be present and unique." }, { status: 400 });
  }
  if (input.memories.length === 0) return NextResponse.json({ matches: [] });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 500 });

  const productContext: ProductContext = {
    productDescription,
    productLine: optionalString(contextInput.productLine),
    productTheme: optionalString(contextInput.productTheme),
    recipient: optionalString(contextInput.recipient),
    occasion: optionalString(contextInput.occasion),
    niche: optionalString(contextInput.niche),
  };
  try {
    return NextResponse.json(await retrieveRelevantMemories(productContext, input.memories));
  } catch (error) {
    console.error("Memory retrieval failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We couldn't retrieve memories right now. Please try again." }, { status: 502 });
  }
}
