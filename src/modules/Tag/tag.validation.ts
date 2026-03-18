import { z } from "zod";

export const createTagSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    slug: z.string().trim().min(1, "Slug is required"),
  })
  .strict();

export const updateTagSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").optional(),
    slug: z.string().trim().min(1, "Slug cannot be empty").optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });
