import status from "http-status";
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
  const where: Record<string, unknown> = {};

  if (query.isActive === "true") where.isActive = true;
  if (query.isActive === "false") where.isActive = false;

  if (query.isPublic === "true") where.isPublic = true;
  if (query.isPublic === "false") where.isPublic = false;

  const campaigns = await prisma.campaign.findMany({
    where,
    include: campaignInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return campaigns;
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

const getCampaignIdeas = async (id: string) => {
  await ensureCampaignExists(id);

  const ideas = await prisma.idea.findMany({
    where: {
      campaignId: id,
      deletedAt: null,
    },
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return ideas;
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
