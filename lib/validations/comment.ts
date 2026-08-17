import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment can't be empty.").max(5000, "Comment is too long."),
});

export const updateCommentSchema = createCommentSchema;

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
