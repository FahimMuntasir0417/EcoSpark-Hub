export interface ICreateIdeaPayload {
  title: string;
  slug: string;
  excerpt?: string;
  problemStatement: string;
  proposedSolution: string;
  description: string;
  implementationSteps?: string;
  risksAndChallenges?: string;
  requiredResources?: string;
  expectedBenefits?: string;
  targetAudience?: string;
  coverImageUrl?: string;
  videoUrl?: string;

  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  accessType?: "FREE" | "PAID" | "MEMBERS_ONLY";
  price?: number;
  currency?: string;

  categoryId: string;
  campaignId?: string;

  estimatedCost?: number;
  implementationEffort?: number;
  expectedImpact?: number;
  timeToImplementDays?: number;
  resourceAvailability?: number;
  innovationLevel?: number;
  scalabilityScore?: number;

  feasibilityScore?: number;
  impactScore?: number;
  ecoScore?: number;

  estimatedWasteReductionKgMonth?: number;
  estimatedCo2ReductionKgMonth?: number;
  estimatedCostSavingsMonth?: number;
  estimatedWaterSavedLitersMonth?: number;
  estimatedEnergySavedKwhMonth?: number;

  seoTitle?: string;
  seoDescription?: string;

  tagIds?: string[];
}

export interface IUpdateIdeaPayload extends Partial<ICreateIdeaPayload> {
  rejectionFeedback?: string;
  adminNote?: string;
}

export interface IUpdateIdeaTagsPayload {
  tagIds: string[];
}

export interface ICreateIdeaAttachmentPayload {
  title?: string;
  fileUrl: string;
  fileType: "PDF" | "DOC" | "IMAGE" | "VIDEO" | "OTHER";
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface ICreateIdeaMediaPayload {
  url: string;
  type: "IMAGE" | "VIDEO";
  altText?: string;
  caption?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface IRejectIdeaPayload {
  rejectionFeedback: string;
  adminNote?: string;
}
