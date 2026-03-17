import { z } from "zod";

export const createExperienceReportSchema = z
  .object({
    ideaId: z.string().cuid("Invalid ideaId"),
    title: z.string().trim().min(1, "Title is required"),
    summary: z.string().trim().min(1, "Summary is required"),
    outcome: z.string().trim().min(1, "Outcome is required"),
    challenges: z.string().trim().optional(),
    measurableResult: z.string().trim().optional(),
    adoptedScale: z.string().trim().optional(),
    location: z.string().trim().optional(),
    effectivenessRating: z
      .number()
      .int("effectivenessRating must be an integer")
      .min(1, "effectivenessRating must be at least 1")
      .max(10, "effectivenessRating cannot be more than 10"),
    beforeImageUrl: z.string().trim().optional(),
    afterImageUrl: z.string().trim().optional(),
  })
  .strict();

export const updateExperienceReportSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    summary: z.string().trim().min(1, "Summary cannot be empty").optional(),
    outcome: z.string().trim().min(1, "Outcome cannot be empty").optional(),
    challenges: z.string().trim().optional(),
    measurableResult: z.string().trim().optional(),
    adoptedScale: z.string().trim().optional(),
    location: z.string().trim().optional(),
    effectivenessRating: z
      .number()
      .int("effectivenessRating must be an integer")
      .min(1, "effectivenessRating must be at least 1")
      .max(10, "effectivenessRating cannot be more than 10")
      .optional(),
    beforeImageUrl: z.string().trim().optional(),
    afterImageUrl: z.string().trim().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });

export const subscribeNewsletterSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    source: z.string().trim().optional(),
  })
  .strict();

export const unsubscribeNewsletterSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
  })
  .strict();
