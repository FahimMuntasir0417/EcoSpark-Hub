import { z } from "zod";

const visibilityEnum = z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]);
const accessTypeEnum = z.enum(["FREE", "PAID", "MEMBERS_ONLY"]);
const mediaTypeEnum = z.enum(["IMAGE", "VIDEO"]);

const ideaBaseSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    slug: z.string().trim().min(1, "Slug is required"),
    excerpt: z.string().trim().optional(),
    problemStatement: z.string().trim().min(1, "Problem statement is required"),
    proposedSolution: z.string().trim().min(1, "Proposed solution is required"),
    description: z.string().trim().min(1, "Description is required"),
    implementationSteps: z.string().trim().optional(),
    risksAndChallenges: z.string().trim().optional(),
    requiredResources: z.string().trim().optional(),
    expectedBenefits: z.string().trim().optional(),
    targetAudience: z.string().trim().optional(),
    coverImageUrl: z.string().trim().optional(),
    videoUrl: z.string().trim().optional(),

    visibility: visibilityEnum.optional(),
    accessType: accessTypeEnum.optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().trim().optional(),

    categoryId: z.string().cuid("Invalid categoryId"),
    campaignId: z.string().cuid("Invalid campaignId").optional(),

    estimatedCost: z.number().int().nonnegative().optional(),
    implementationEffort: z.number().int().min(1).max(5).optional(),
    expectedImpact: z.number().int().min(1).max(5).optional(),
    timeToImplementDays: z.number().int().nonnegative().optional(),
    resourceAvailability: z.number().int().min(1).max(5).optional(),
    innovationLevel: z.number().int().min(1).max(5).optional(),
    scalabilityScore: z.number().int().min(1).max(5).optional(),

    feasibilityScore: z.number().optional(),
    impactScore: z.number().optional(),
    ecoScore: z.number().optional(),

    estimatedWasteReductionKgMonth: z.number().optional(),
    estimatedCo2ReductionKgMonth: z.number().optional(),
    estimatedCostSavingsMonth: z.number().optional(),
    estimatedWaterSavedLitersMonth: z.number().optional(),
    estimatedEnergySavedKwhMonth: z.number().optional(),

    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),

    tagIds: z
      .array(z.string().cuid("Each tagId must be a valid cuid"))
      .optional(),
  })
  .strict();

export const createIdeaSchema = ideaBaseSchema
  .extend({
    authorId: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) =>
      !(
        data.accessType === "PAID" &&
        (data.price === undefined || data.price <= 0)
      ),
    {
      message:
        "Price is required and must be greater than 0 when accessType is PAID",
      path: ["price"],
    },
  );

export const updateIdeaSchema = ideaBaseSchema
  .partial()
  .extend({
    rejectionFeedback: z.string().trim().optional(),
    adminNote: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  })
  .refine(
    (data) =>
      !(
        data.accessType === "PAID" &&
        (data.price === undefined || data.price <= 0)
      ),
    {
      message:
        "Price must be greater than 0 when accessType is PAID in the update payload",
      path: ["price"],
    },
  );

export const updateIdeaTagsSchema = z
  .object({
    tagIds: z.array(z.string().cuid("Each tagId must be a valid cuid")),
  })
  .strict();

export const createIdeaAttachmentSchema = z
  .object({
    title: z.string().trim().optional(),
    data: z.string().trim().optional(),
  })
  .strict();

export const createIdeaMediaSchema = z
  .object({
    data: z.string().trim().optional(),
    url: z.string().trim().min(1, "url cannot be empty").optional(),
    type: mediaTypeEnum.optional(),
    altText: z.string().trim().optional(),
    caption: z.string().trim().optional(),
    sortOrder: z.coerce.number().int().nonnegative().optional(),
    isPrimary: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .optional()
      .transform((value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      }),
  })
  .strict();

export const rejectIdeaSchema = z
  .object({
    status: z.literal("REJECTED").optional(),
    rejectionFeedback: z
      .string()
      .trim()
      .min(1, "rejectionFeedback is required"),
    adminNote: z.string().trim().optional(),
  })
  .strict();
