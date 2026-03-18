export interface ICreateCategoryPayload {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface IUpdateCategoryPayload extends Partial<ICreateCategoryPayload> {}
