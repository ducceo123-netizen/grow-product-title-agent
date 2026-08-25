export type ProductContext = {
  productDescription: string;
  productLine?: string;
  productTheme?: string;
  recipient?: string;
  occasion?: string;
  niche?: string;
};

export type GeneratedTitle = {
  id: string;
  text: string;
};

export type GenerateResponse = {
  titles: GeneratedTitle[];
};

export type ApiErrorResponse = {
  error: string;
};

export type Lesson = {
  id: string;
  context: string;
  do: string[];
  dont: string[];
  reason: string;
  goodExample?: string;
  badExample?: string;
  confidence: number;
};

export type ReviewAction = "approve" | "edit" | "reject";

export type Review = {
  action: ReviewAction;
  originalTitle: string;
  editedTitle?: string;
  reason: string;
};

export type LearnRequest = {
  productContext: ProductContext;
  review: Review;
};

export type LearnResponse = {
  lesson: Lesson;
};
