import { z } from "zod";

export const chatSchema = z
  .object({
    message: z.string().trim().min(1, "Message is required").max(1500),
  })
  .strict();

export const ideaFormSuggestionSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    problemStatement: z.string().trim().min(1).max(3000).optional(),
    proposedSolution: z.string().trim().min(1).max(3000).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    targetAudience: z.string().trim().min(1).max(500).optional(),
    categoryId: z.string().trim().min(1).optional(),
    tagIds: z.array(z.string().trim().min(1)).max(10).optional(),
  })
  .strict()
  .refine(
    (data) =>
      Boolean(
        data.title ||
          data.problemStatement ||
          data.proposedSolution ||
          data.description,
      ),
    {
      message:
        "At least one of title, problemStatement, proposedSolution, or description is required",
    },
  );
