import { z } from "zod";

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    slug: z.string().trim().min(1, "Slug is required"),
    description: z.string().trim().optional(),
    icon: z.string().trim().optional(),
    color: z.string().trim().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").optional(),
    slug: z.string().trim().min(1, "Slug cannot be empty").optional(),
    description: z.string().trim().optional(),
    icon: z.string().trim().optional(),
    color: z.string().trim().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });
