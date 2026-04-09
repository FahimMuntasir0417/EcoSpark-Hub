import status from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { UserStatus } from "../../generated/prisma/enums";
import {
  ICreateIdeaAttachmentPayload,
  ICreateIdeaMediaPayload,
  ICreateIdeaPayload,
  IRejectIdeaPayload,
  IUpdateIdeaPayload,
  IUpdateIdeaTagsPayload,
} from "./idea.interface";
import { QueryBuilder } from "../../builder/queryBuilder";

const ideaInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
    },
  },
  category: true,
  campaign: true,
  tags: true,
  attachments: true,
  media: true,
} as const;

const ensureCategoryExists = async (categoryId: string) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category || !category.isActive) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  return category;
};

const ensureCampaignExists = async (campaignId?: string) => {
  if (!campaignId) return null;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new AppError(status.NOT_FOUND, "Campaign not found");
  }

  return campaign;
};

const ensureTagsExist = async (tagIds: string[] = []) => {
  if (!tagIds.length) return [];

  const tags = await prisma.tag.findMany({
    where: {
      id: {
        in: tagIds,
      },
    },
    select: { id: true },
  });

  if (tags.length !== tagIds.length) {
    throw new AppError(status.BAD_REQUEST, "One or more tags are invalid");
  }

  return tags;
};

const ensureIdeaExists = async (id: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id },
  });

  if (!idea || idea.deletedAt) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  return idea;
};

const ensureAuthorExists = async (authorId: string) => {
  const normalizedAuthorId = authorId?.trim();

  if (!normalizedAuthorId) {
    throw new AppError(status.BAD_REQUEST, "Author id is required");
  }

  const author = await prisma.user.findUnique({
    where: { id: normalizedAuthorId },
  });

  if (!author || author.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Author not found");
  }

  if (author.status !== UserStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only active users can create ideas",
    );
  }

  return author;
};

const createIdea = async (authorId: string, payload: ICreateIdeaPayload) => {
  const normalizedAuthorId = authorId.trim();

  await ensureAuthorExists(normalizedAuthorId);
  await ensureCategoryExists(payload.categoryId);
  await ensureCampaignExists(payload.campaignId);
  await ensureTagsExist(payload.tagIds);

  const existingSlug = await prisma.idea.findUnique({
    where: { slug: payload.slug },
  });

  if (existingSlug) {
    throw new AppError(status.CONFLICT, "Idea slug already exists");
  }

  const result = await prisma.idea.create({
    data: {
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      problemStatement: payload.problemStatement,
      proposedSolution: payload.proposedSolution,
      description: payload.description,
      implementationSteps: payload.implementationSteps,
      risksAndChallenges: payload.risksAndChallenges,
      requiredResources: payload.requiredResources,
      expectedBenefits: payload.expectedBenefits,
      targetAudience: payload.targetAudience,
      coverImageUrl: payload.coverImageUrl,
      videoUrl: payload.videoUrl,

      visibility: payload.visibility,
      accessType: payload.accessType,
      price: payload.price,
      currency: payload.currency ?? "USD",

      categoryId: payload.categoryId,
      campaignId: payload.campaignId,
      authorId: normalizedAuthorId,

      estimatedCost: payload.estimatedCost,
      implementationEffort: payload.implementationEffort,
      expectedImpact: payload.expectedImpact,
      timeToImplementDays: payload.timeToImplementDays,
      resourceAvailability: payload.resourceAvailability,
      innovationLevel: payload.innovationLevel,
      scalabilityScore: payload.scalabilityScore,

      feasibilityScore: payload.feasibilityScore,
      impactScore: payload.impactScore,
      ecoScore: payload.ecoScore,

      estimatedWasteReductionKgMonth: payload.estimatedWasteReductionKgMonth,
      estimatedCo2ReductionKgMonth: payload.estimatedCo2ReductionKgMonth,
      estimatedCostSavingsMonth: payload.estimatedCostSavingsMonth,
      estimatedWaterSavedLitersMonth: payload.estimatedWaterSavedLitersMonth,
      estimatedEnergySavedKwhMonth: payload.estimatedEnergySavedKwhMonth,

      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
      lastActivityAt: new Date(),
      tags: payload.tagIds?.length
        ? {
            connect: payload.tagIds.map((tagId) => ({ id: tagId })),
          }
        : undefined,
    },
    include: ideaInclude,
  });

  return result;
};

// const getAllIdeas = async (query: Record<string, unknown>) => {
//   const where: Record<string, unknown> = {
//     deletedAt: null,
//   };

//   if (query.status) where.status = query.status;
//   if (query.categoryId) where.categoryId = query.categoryId;
//   if (query.campaignId) where.campaignId = query.campaignId;
//   if (query.authorId) where.authorId = query.authorId;
//   if (query.accessType) where.accessType = query.accessType;

//   if (query.featured === "true") {
//     where.isFeatured = true;
//   }

//   const ideas = await prisma.idea.findMany({
//     where,
//     include: ideaInclude,
//     orderBy: {
//       createdAt: "desc",
//     },
//   });

//   return ideas;
// };

const getAllIdeas = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: [
      "title",
      "excerpt",
      "description",
      "problemStatement",
      "proposedSolution",
    ],
    filterableFields: [
      "status",
      "categoryId",
      "campaignId",
      "authorId",
      "accessType",
      "visibility",
      "isFeatured",
    ],
    sortableFields: [
      "createdAt",
      "updatedAt",
      "publishedAt",
      "submittedAt",
      "ecoScore",
      "trendingScore",
      "totalViews",
    ],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    baseWhere: {
      deletedAt: null,
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.idea.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        author: true,
        category: true,
        campaign: true,
      },
    }),
    prisma.idea.count({ where }),
  ]);

  return {
    meta: {
      ...meta,
      total,
      totalPage: Math.ceil(total / meta.limit),
    },
    data,
  };
};

const getSingleIdea = async (id: string) => {
  const idea = await prisma.idea.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      ...ideaInclude,
      statusLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },
      reviewFeedbacks: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  return idea;
};

const getIdeaBySlug = async (slug: string) => {
  const idea = await prisma.idea.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
    include: ideaInclude,
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  return idea;
};

const updateIdea = async (id: string, payload: IUpdateIdeaPayload) => {
  const existingIdea = await ensureIdeaExists(id);
  const { tagIds, ...ideaData } = payload;

  if (payload.categoryId) {
    await ensureCategoryExists(payload.categoryId);
  }

  if (payload.campaignId) {
    await ensureCampaignExists(payload.campaignId);
  }

  if (payload.tagIds) {
    await ensureTagsExist(payload.tagIds);
  }

  if (payload.slug && payload.slug !== existingIdea.slug) {
    const existingSlug = await prisma.idea.findUnique({
      where: { slug: payload.slug },
    });

    if (existingSlug) {
      throw new AppError(status.CONFLICT, "Idea slug already exists");
    }
  }

  const updatedIdea = await prisma.idea.update({
    where: { id },
    data: {
      ...ideaData,
      ...(tagIds
        ? {
            tags: {
              set: tagIds.map((tagId) => ({ id: tagId })),
            },
          }
        : {}),
      lastActivityAt: new Date(),
    },
    include: ideaInclude,
  });

  return updatedIdea;
};

const deleteIdea = async (id: string) => {
  await ensureIdeaExists(id);

  const deletedIdea = await prisma.idea.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
    include: ideaInclude,
  });

  return deletedIdea;
};

const submitIdea = async (id: string, actorId: string) => {
  const idea = await ensureIdeaExists(id);

  if (idea.status !== "DRAFT") {
    throw new AppError(status.BAD_REQUEST, "Only draft ideas can be submitted");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.idea.update({
      where: { id },
      data: {
        status: "UNDER_REVIEW",
        submittedAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: ideaInclude,
    });

    await tx.ideaStatusLog.create({
      data: {
        ideaId: id,
        actorId,
        fromStatus: idea.status,
        toStatus: "UNDER_REVIEW",
      },
    });

    return updated;
  });

  return result;
};

const approveIdea = async (id: string, actorId: string) => {
  const idea = await ensureIdeaExists(id);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.idea.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: ideaInclude,
    });

    await tx.ideaStatusLog.create({
      data: {
        ideaId: id,
        actorId,
        fromStatus: idea.status,
        toStatus: "APPROVED",
      },
    });

    return updated;
  });

  return result;
};

const rejectIdea = async (
  id: string,
  actorId: string,
  payload: IRejectIdeaPayload,
) => {
  const idea = await ensureIdeaExists(id);
  const targetStatus = payload.status ?? "REJECTED";

  if (targetStatus !== "REJECTED") {
    throw new AppError(
      status.BAD_REQUEST,
      "Invalid status for reject endpoint. Use REJECTED only.",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.idea.update({
      where: { id },
      data: {
        status: targetStatus,
        rejectionFeedback: payload.rejectionFeedback,
        adminNote: payload.adminNote,
        reviewedAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: ideaInclude,
    });

    await tx.ideaStatusLog.create({
      data: {
        ideaId: id,
        actorId,
        fromStatus: idea.status,
        toStatus: targetStatus,
        note: payload.rejectionFeedback,
      },
    });

    await tx.ideaReviewFeedback.create({
      data: {
        ideaId: id,
        reviewerId: actorId,
        feedbackType: "REJECTION",
        message: payload.rejectionFeedback,
        title: "Idea Rejected",
      },
    });

    return updated;
  });

  return result;
};

const archiveIdea = async (id: string, actorId: string) => {
  const idea = await ensureIdeaExists(id);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.idea.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: ideaInclude,
    });

    await tx.ideaStatusLog.create({
      data: {
        ideaId: id,
        actorId,
        fromStatus: idea.status,
        toStatus: "ARCHIVED",
      },
    });

    return updated;
  });

  return result;
};

const publishIdea = async (id: string) => {
  await ensureIdeaExists(id);

  return prisma.idea.update({
    where: { id },
    data: {
      publishedAt: new Date(),
      lastActivityAt: new Date(),
    },
    include: ideaInclude,
  });
};

const featureIdea = async (id: string) => {
  await ensureIdeaExists(id);

  return prisma.idea.update({
    where: { id },
    data: {
      isFeatured: true,
      featuredAt: new Date(),
    },
    include: ideaInclude,
  });
};

const highlightIdea = async (id: string) => {
  await ensureIdeaExists(id);

  return prisma.idea.update({
    where: { id },
    data: {
      isHighlighted: true,
    },
    include: ideaInclude,
  });
};

const updateIdeaTags = async (id: string, payload: IUpdateIdeaTagsPayload) => {
  await ensureIdeaExists(id);
  await ensureTagsExist(payload.tagIds);

  const result = await prisma.idea.update({
    where: { id },
    data: {
      tags: {
        set: payload.tagIds.map((tagId) => ({ id: tagId })),
      },
      lastActivityAt: new Date(),
    },
    include: ideaInclude,
  });

  return result;
};

const addIdeaAttachment = async (
  ideaId: string,
  payload: ICreateIdeaAttachmentPayload,
) => {
  await ensureIdeaExists(ideaId);

  const attachment = await prisma.ideaAttachment.create({
    data: {
      ideaId,
      ...payload,
    },
  });

  return attachment;
};

const deleteIdeaAttachment = async (ideaId: string, attachmentId: string) => {
  await ensureIdeaExists(ideaId);

  const attachment = await prisma.ideaAttachment.findFirst({
    where: {
      id: attachmentId,
      ideaId,
    },
  });

  if (!attachment) {
    throw new AppError(status.NOT_FOUND, "Attachment not found");
  }

  await prisma.ideaAttachment.delete({
    where: { id: attachmentId },
  });

  return {
    success: true,
  };
};

const addIdeaMedia = async (
  ideaId: string,
  payload: ICreateIdeaMediaPayload,
) => {
  await ensureIdeaExists(ideaId);

  const result = await prisma.$transaction(async (tx) => {
    if (payload.isPrimary) {
      await tx.ideaMedia.updateMany({
        where: { ideaId },
        data: { isPrimary: false },
      });
    }

    return tx.ideaMedia.create({
      data: {
        ideaId,
        url: payload.url,
        type: payload.type,
        altText: payload.altText,
        caption: payload.caption,
        sortOrder: payload.sortOrder ?? 0,
        isPrimary: payload.isPrimary ?? false,
      },
    });
  });

  return result;
};

const deleteIdeaMedia = async (ideaId: string, mediaId: string) => {
  await ensureIdeaExists(ideaId);

  const media = await prisma.ideaMedia.findFirst({
    where: {
      id: mediaId,
      ideaId,
    },
  });

  if (!media) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  await prisma.ideaMedia.delete({
    where: { id: mediaId },
  });

  return {
    success: true,
  };
};

export const IdeaService = {
  createIdea,
  getAllIdeas,
  getSingleIdea,
  getIdeaBySlug,
  updateIdea,
  deleteIdea,
  submitIdea,
  approveIdea,
  rejectIdea,
  archiveIdea,
  publishIdea,
  featureIdea,
  highlightIdea,
  updateIdeaTags,
  addIdeaAttachment,
  deleteIdeaAttachment,
  addIdeaMedia,
  deleteIdeaMedia,
};
