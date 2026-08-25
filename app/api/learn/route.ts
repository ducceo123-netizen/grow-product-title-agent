import { NextResponse } from "next/server";
import { extractLesson } from "@/lib/openai/extract-lesson";
import type { ApiErrorResponse, LearnResponse, ProductContext, Review, ReviewAction } from "@/lib/types";

const reviewActions: ReviewAction[] = ["approve", "edit", "reject"];
const optionalString = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;

export async function POST(request: Request): Promise<NextResponse<LearnResponse | ApiErrorResponse>> {
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

  if (!input.review || typeof input.review !== "object") {
    return NextResponse.json({ error: "A valid review is required." }, { status: 400 });
  }
  const reviewInput = input.review as Record<string, unknown>;
  const action = optionalString(reviewInput.action) as ReviewAction | undefined;
  if (!action || !reviewActions.includes(action)) {
    return NextResponse.json({ error: "Review action must be approve, edit, or reject." }, { status: 400 });
  }
  const originalTitle = optionalString(reviewInput.originalTitle);
  if (!originalTitle) return NextResponse.json({ error: "Original title is required." }, { status: 400 });
  const reason = optionalString(reviewInput.reason);
  if (!reason) return NextResponse.json({ error: "Tell the agent why before submitting feedback." }, { status: 400 });
  const editedTitle = optionalString(reviewInput.editedTitle);
  if (action === "edit" && !editedTitle) {
    return NextResponse.json({ error: "Edited title is required for edit feedback." }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 500 });
  }

  const productContext: ProductContext = {
    productDescription,
    productLine: optionalString(contextInput.productLine),
    productTheme: optionalString(contextInput.productTheme),
    recipient: optionalString(contextInput.recipient),
    occasion: optionalString(contextInput.occasion),
    niche: optionalString(contextInput.niche),
  };
  const review: Review = { action, originalTitle, reason, ...(editedTitle ? { editedTitle } : {}) };

  try {
    return NextResponse.json({ lesson: await extractLesson(productContext, review) });
  } catch (error) {
    console.error("Lesson extraction failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We couldn't extract a lesson right now. Please try again." }, { status: 502 });
  }
}
