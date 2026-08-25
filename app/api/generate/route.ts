import { NextResponse } from "next/server";
import { generateTitles } from "@/lib/openai/generate-titles";
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
  const productDescription = optionalString(input.productDescription);
  if (!productDescription) {
    return NextResponse.json({ error: "Product description is required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured. Add OPENAI_API_KEY to your server environment." },
      { status: 500 },
    );
  }

  const context: ProductContext = {
    productDescription,
    productLine: optionalString(input.productLine),
    productTheme: optionalString(input.productTheme),
    recipient: optionalString(input.recipient),
    occasion: optionalString(input.occasion),
    niche: optionalString(input.niche),
  };

  try {
    return NextResponse.json(await generateTitles(context));
  } catch (error) {
    console.error("Title generation failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "We couldn't generate titles right now. Please try again." },
      { status: 502 },
    );
  }
}
