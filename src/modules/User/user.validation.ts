import { z } from "zod";

const idSchema = z.string().trim().min(1, "Id is required");

export const createMyVoteSchema = z
  .object({
    ideaId: idSchema,
    type: z.enum(["UP", "DOWN"]),
  })
  .strict();

export const updateMyVoteSchema = z
  .object({
    type: z.enum(["UP", "DOWN"]),
  })
  .strict();

export const createMyCommentSchema = z
  .object({
    ideaId: idSchema.optional(),
    parentId: idSchema.optional(),
    content: z.string().trim().min(1, "Content is required"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.ideaId && !data.parentId) {
      ctx.addIssue({
        code: "custom",
        path: ["ideaId"],
        message: "ideaId or parentId is required",
      });
    }
  });

export const updateMyCommentSchema = z
  .object({
    content: z.string().trim().min(1, "Content is required"),
  })
  .strict();
