import { NextResponse } from "next/server";
import { generateTitles } from "@/lib/openai/generate-titles";
import { isLesson } from "@/lib/memory/validation";
import type { ApiErrorResponse, GenerateResponse, ProductContext } from "@/lib/types";

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request): Promise<NextResponse<GenerateResponse | ApiErrorResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const hasNestedContext = input.productContext !== undefined;
  if (hasNestedContext && (!input.productContext || typeof input.productContext !== "object" || Array.isArray(input.productContext))) {
    return NextResponse.json({ error: "Valid product context is required." }, { status: 400 });
  }
  // M6 uses a nested GenerateRequest. Accept the pre-M6 flat ProductContext as
  // well so a cached production client cannot be rejected during deployment.
  const contextInput = hasNestedContext
    ? input.productContext as Record<string, unknown>
    : input;
  const productDescription = optionalString(contextInput.productDescription);
  if (!productDescription) {
    return NextResponse.json({ error: "Product description is required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured. Add OPENAI_API_KEY to your server environment." },
      { status: 500 },
    );
  }

  const relevantMemories = input.relevantMemories ?? [];
  if (!Array.isArray(relevantMemories) || !relevantMemories.every(isLesson)) {
    return NextResponse.json({ error: "Relevant memories must be a valid lesson array." }, { status: 400 });
  }
  const memoryIds = new Set(relevantMemories.map((memory) => memory.id));
  if (memoryIds.size !== relevantMemories.length) {
    return NextResponse.json({ error: "Relevant memory IDs must be unique." }, { status: 400 });
  }

  console.log({
    stage: "generate-memory-debug",
    receivedMemoryCount: relevantMemories.length,
    memoryIds: relevantMemories.map((memory) => memory.id),
  });

  const expectedMemoryCount = Number(request.headers.get("x-grow-memory-expected") || 0);
  if (process.env.NODE_ENV !== "production" && expectedMemoryCount > 0 && relevantMemories.length === 0) {
    console.warn({
      stage: "generate-memory-mismatch",
      expectedMemoryCount,
      receivedMemoryCount: 0,
      message: "The UI reported retrieved memories, but /api/generate received none.",
    });
  }

  const context: ProductContext = {
    productDescription,
    productLine: optionalString(contextInput.productLine),
    productTheme: optionalString(contextInput.productTheme),
    recipient: optionalString(contextInput.recipient),
    occasion: optionalString(contextInput.occasion),
    niche: optionalString(contextInput.niche),
  };

  try {
    const result = await generateTitles(context, relevantMemories);
    return NextResponse.json({
      ...result,
      generationMeta: {
        usedMemory: relevantMemories.length > 0,
        memoryIds: relevantMemories.map((memory) => memory.id),
      },
    });
  } catch (error) {
    console.error("Title generation failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "We couldn't generate titles right now. Please try again." },
      { status: 502 },
    );
  }
}
