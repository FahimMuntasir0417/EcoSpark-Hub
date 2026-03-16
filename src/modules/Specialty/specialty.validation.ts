import { z } from "zod";

export const registerMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const createSpecialtySchema = z
  .object({
    title: z
      .string({ error: "Title is required" })
      .trim()
      .min(1, "Title is required")
      .max(100, "Title cannot be more than 100 characters"),

    description: z
      .string()
      .trim()
      .max(5000, "Description is too long")
      .optional(),

    icon: z
      .string()
      .trim()
      .max(255, "Icon cannot be more than 255 characters")
      .optional(),
  })
  .strict();

export const updateSpecialtySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(100, "Title cannot be more than 100 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(5000, "Description is too long")
      .optional(),

    icon: z
      .string()
      .trim()
      .max(255, "Icon cannot be more than 255 characters")
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.icon !== undefined,
    {
      message: "At least one field is required to update",
    },
  );
