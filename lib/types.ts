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
