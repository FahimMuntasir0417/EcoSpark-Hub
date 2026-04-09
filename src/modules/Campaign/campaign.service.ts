import status from "http-status";
import { QueryBuilder } from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  ICreateCampaignPayload,
  IUpdateCampaignPayload,
  IUpdateCampaignStatusPayload,
} from "./campaign.interface";

const campaignInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
    },
  },
  _count: {
    select: {
      ideas: true,
    },
  },
} as const;

const ensureCampaignExists = async (id: string) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new AppError(status.NOT_FOUND, "Campaign not found");
  }

  return campaign;
};

const createCampaign = async (
  createdById: string,
  payload: ICreateCampaignPayload,
) => {
  const existingSlug = await prisma.campaign.findUnique({
    where: { slug: payload.slug },
  });

  if (existingSlug) {
    throw new AppError(status.CONFLICT, "Campaign slug already exists");
  }

  const campaign = await prisma.campaign.create({
    data: {
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      bannerImage: payload.bannerImage,
      isActive: payload.isActive ?? true,
      isPublic: payload.isPublic ?? true,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      goalText: payload.goalText,
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
      createdById,
    },
    include: campaignInclude,
  });

  return campaign;
};

const getAllCampaigns = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["title", "slug", "description", "goalText"],
    filterableFields: ["isActive", "isPublic", "createdById"],
    sortableFields: ["createdAt", "updatedAt", "startDate", "endDate", "title"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take,
      include: campaignInclude,
      orderBy,
    }),
    prisma.campaign.count({ where }),
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

const getSingleCampaign = async (id: string) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      ...campaignInclude,
      ideas: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          isFeatured: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!campaign) {
    throw new AppError(status.NOT_FOUND, "Campaign not found");
  }

  return campaign;
};

const getCampaignBySlug = async (slug: string) => {
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    include: {
      ...campaignInclude,
      ideas: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          isFeatured: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!campaign) {
    throw new AppError(status.NOT_FOUND, "Campaign not found");
  }

  return campaign;
};

const updateCampaign = async (id: string, payload: IUpdateCampaignPayload) => {
  const existingCampaign = await ensureCampaignExists(id);

  if (payload.slug && payload.slug !== existingCampaign.slug) {
    const existingSlug = await prisma.campaign.findUnique({
      where: { slug: payload.slug },
    });

    if (existingSlug) {
      throw new AppError(status.CONFLICT, "Campaign slug already exists");
    }
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id },
    data: {
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      bannerImage: payload.bannerImage,
      isActive: payload.isActive,
      isPublic: payload.isPublic,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      goalText: payload.goalText,
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
    },
    include: campaignInclude,
  });

  return updatedCampaign;
};

const updateCampaignStatus = async (
  id: string,
  payload: IUpdateCampaignStatusPayload,
) => {
  await ensureCampaignExists(id);

  const updatedCampaign = await prisma.campaign.update({
    where: { id },
    data: {
      isActive: payload.isActive,
      isPublic: payload.isPublic,
    },
    include: campaignInclude,
  });

  return updatedCampaign;
};

const deleteCampaign = async (id: string) => {
  await ensureCampaignExists(id);

  await prisma.campaign.delete({
    where: { id },
  });

  return {
    success: true,
  };
};

const getCampaignIdeas = async (id: string, query: Record<string, unknown>) => {
  await ensureCampaignExists(id);

  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["title", "slug", "excerpt"],
    filterableFields: [
      "status",
      "visibility",
      "accessType",
      "isFeatured",
      "authorId",
      "categoryId",
    ],
    sortableFields: ["createdAt", "updatedAt", "publishedAt", "title"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    baseWhere: {
      campaignId: id,
      deletedAt: null,
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.idea.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        visibility: true,
        accessType: true,
        isFeatured: true,
        publishedAt: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy,
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

export const CampaignService = {
  createCampaign,
  getAllCampaigns,
  getSingleCampaign,
  getCampaignBySlug,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getCampaignIdeas,
};
