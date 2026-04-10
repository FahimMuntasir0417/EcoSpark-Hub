import { z } from "zod";

const dateString = z
  .string()
  .datetime({ message: "Invalid datetime format. Use ISO string." });

const booleanField = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "true") {
      return true;
    }

    if (normalizedValue === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

export const createCampaignSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    slug: z.string().trim().min(1, "Slug is required"),
    description: z.string().trim().min(1, "Description is required"),
    bannerImage: z.string().trim().optional(),
    isActive: booleanField.optional(),
    isPublic: booleanField.optional(),
    startDate: dateString,
    endDate: dateString,
    goalText: z.string().trim().optional(),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
  })
  .strict()
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "endDate must be later than startDate",
    path: ["endDate"],
  });

export const updateCampaignSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    slug: z.string().trim().min(1, "Slug cannot be empty").optional(),
    description: z
      .string()
      .trim()
      .min(1, "Description cannot be empty")
      .optional(),
    bannerImage: z.string().trim().optional(),
    isActive: booleanField.optional(),
    isPublic: booleanField.optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    goalText: z.string().trim().optional(),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) > new Date(data.startDate);
    },
    {
      message: "endDate must be later than startDate",
      path: ["endDate"],
    },
  );

export const createCampaignUploadSchema = z
  .object({
    data: z.string().trim().optional(),
    title: z.string().trim().min(1, "Title is required").optional(),
    slug: z.string().trim().min(1, "Slug is required").optional(),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .optional(),
    bannerImage: z.string().trim().optional(),
    isActive: booleanField.optional(),
    isPublic: booleanField.optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    goalText: z.string().trim().optional(),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
  })
  .strict();

export const updateCampaignUploadSchema = z
  .object({
    data: z.string().trim().optional(),
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    slug: z.string().trim().min(1, "Slug cannot be empty").optional(),
    description: z
      .string()
      .trim()
      .min(1, "Description cannot be empty")
      .optional(),
    bannerImage: z.string().trim().optional(),
    isActive: booleanField.optional(),
    isPublic: booleanField.optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    goalText: z.string().trim().optional(),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
  })
  .strict();

export const updateCampaignStatusSchema = z
  .object({
    isActive: booleanField.optional(),
    isPublic: booleanField.optional(),
  })
  .strict()
  .refine(
    (data) => data.isActive !== undefined || data.isPublic !== undefined,
    {
      message: "At least one status field is required",
    },
  );
