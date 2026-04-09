import { z } from "zod";

export const voteSchema = z
  .object({
    type: z.enum(["UP", "DOWN"]),
  })
  .strict();

export const commentSchema = z
  .object({
    content: z.string().trim().min(1, "Content is required"),
  })
  .strict();

export const updateCommentSchema = z
  .object({
    content: z.string().trim().min(1, "Content is required"),
  })
  .strict();
