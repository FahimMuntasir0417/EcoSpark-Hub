import {
  Role,
  UserStatus,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }

  return Number(value) || 0;
};

type GroupCountItem = {
  _count: {
    _all: number;
  };
};

const mapGroupCounts = <
  T extends GroupCountItem,
  K extends Exclude<keyof T, "_count">,
>(
  items: T[],
  key: K,
) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const value = item[key];

    if (typeof value === "string") {
      acc[value] = item._count._all;
    }

    return acc;
  }, {});

const getCount = (counts: Record<string, number>, key: string) => counts[key] ?? 0;

const sumCounts = (counts: Record<string, number>) =>
  Object.values(counts).reduce((total, count) => total + count, 0);

const getMemberAnalytics = async (userId: string) => {
  const [
    ideaStatusGroups,
    publishedIdeas,
    ideaEngagement,
    purchaseStatusGroups,
    totalSpentAggregate,
    commentsCount,
    votesCount,
    bookmarksCount,
    experienceReportsCount,
    unreadNotificationsCount,
    newsletterSubscription,
  ] = await Promise.all([
    prisma.idea.groupBy({
      by: ["status"],
      where: {
        authorId: userId,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.idea.count({
      where: {
        authorId: userId,
        deletedAt: null,
        publishedAt: {
          not: null,
        },
      },
    }),
    prisma.idea.aggregate({
      where: {
        authorId: userId,
        deletedAt: null,
      },
      _sum: {
        totalViews: true,
        totalUpvotes: true,
        totalComments: true,
        totalBookmarks: true,
      },
    }),
    prisma.ideaPurchase.groupBy({
      by: ["status"],
      where: {
        userId,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.ideaPurchase.aggregate({
      where: {
        userId,
        status: "PAID",
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.comment.count({
      where: {
        authorId: userId,
      },
    }),
    prisma.vote.count({
      where: {
        userId,
      },
    }),
    prisma.ideaBookmark.count({
      where: {
        userId,
      },
    }),
    prisma.experienceReport.count({
      where: {
        authorId: userId,
      },
    }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
    prisma.newsletterSubscription.findFirst({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
  ]);

  const ideaCounts = mapGroupCounts(ideaStatusGroups, "status");
  const purchaseCounts = mapGroupCounts(purchaseStatusGroups, "status");

  return {
    role: Role.MEMBER,
    profile: {
      unreadNotifications: unreadNotificationsCount,
      hasNewsletterSubscription: Boolean(newsletterSubscription),
    },
    ideas: {
      totalCreated: sumCounts(ideaCounts),
      draft: getCount(ideaCounts, "DRAFT"),
      underReview: getCount(ideaCounts, "UNDER_REVIEW"),
      approved: getCount(ideaCounts, "APPROVED"),
      rejected: getCount(ideaCounts, "REJECTED"),
      archived: getCount(ideaCounts, "ARCHIVED"),
      published: publishedIdeas,
    },
    purchases: {
      total: sumCounts(purchaseCounts),
      paid: getCount(purchaseCounts, "PAID"),
      pending: getCount(purchaseCounts, "PENDING"),
      failed: getCount(purchaseCounts, "FAILED"),
      refunded: getCount(purchaseCounts, "REFUNDED"),
      cancelled: getCount(purchaseCounts, "CANCELLED"),
      totalSpent: toNumber(totalSpentAggregate._sum.amount),
    },
    activity: {
      comments: commentsCount,
      votes: votesCount,
      bookmarks: bookmarksCount,
      experienceReports: experienceReportsCount,
    },
    engagement: {
      totalViews: ideaEngagement._sum.totalViews ?? 0,
      totalUpvotes: ideaEngagement._sum.totalUpvotes ?? 0,
      totalComments: ideaEngagement._sum.totalComments ?? 0,
      totalBookmarks: ideaEngagement._sum.totalBookmarks ?? 0,
    },
  };
};

const getScientistAnalytics = async (userId: string) => {
  const [
    scientistProfile,
    ideaStatusGroups,
    publishedIdeas,
    featuredIdeas,
    highlightedIdeas,
    ideaEngagement,
    commentsCount,
    votesCount,
    experienceReportsCount,
    reviewFeedbackCount,
    unreadNotificationsCount,
  ] = await Promise.all([
    prisma.scientist.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        verifiedAt: true,
        _count: {
          select: {
            scientistSpecialties: true,
          },
        },
      },
    }),
    prisma.idea.groupBy({
      by: ["status"],
      where: {
        authorId: userId,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.idea.count({
      where: {
        authorId: userId,
        deletedAt: null,
        publishedAt: {
          not: null,
        },
      },
    }),
    prisma.idea.count({
      where: {
        authorId: userId,
        deletedAt: null,
        isFeatured: true,
      },
    }),
    prisma.idea.count({
      where: {
        authorId: userId,
        deletedAt: null,
        isHighlighted: true,
      },
    }),
    prisma.idea.aggregate({
      where: {
        authorId: userId,
        deletedAt: null,
      },
      _sum: {
        totalViews: true,
        totalUpvotes: true,
        totalComments: true,
        totalBookmarks: true,
      },
      _avg: {
        ecoScore: true,
        impactScore: true,
        feasibilityScore: true,
      },
    }),
    prisma.comment.count({
      where: {
        authorId: userId,
      },
    }),
    prisma.vote.count({
      where: {
        userId,
      },
    }),
    prisma.experienceReport.count({
      where: {
        authorId: userId,
      },
    }),
    prisma.ideaReviewFeedback.count({
      where: {
        idea: {
          authorId: userId,
          deletedAt: null,
        },
      },
    }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  const ideaCounts = mapGroupCounts(ideaStatusGroups, "status");

  return {
    role: Role.SCIENTIST,
    profile: {
      hasScientistProfile: Boolean(scientistProfile),
      isVerified: Boolean(scientistProfile?.verifiedAt),
      specialties: scientistProfile?._count.scientistSpecialties ?? 0,
      unreadNotifications: unreadNotificationsCount,
    },
    ideas: {
      totalCreated: sumCounts(ideaCounts),
      draft: getCount(ideaCounts, "DRAFT"),
      underReview: getCount(ideaCounts, "UNDER_REVIEW"),
      approved: getCount(ideaCounts, "APPROVED"),
      rejected: getCount(ideaCounts, "REJECTED"),
      archived: getCount(ideaCounts, "ARCHIVED"),
      published: publishedIdeas,
      featured: featuredIdeas,
      highlighted: highlightedIdeas,
      reviewFeedbackReceived: reviewFeedbackCount,
    },
    activity: {
      comments: commentsCount,
      votes: votesCount,
      experienceReports: experienceReportsCount,
    },
    engagement: {
      totalViews: ideaEngagement._sum.totalViews ?? 0,
      totalUpvotes: ideaEngagement._sum.totalUpvotes ?? 0,
      totalComments: ideaEngagement._sum.totalComments ?? 0,
      totalBookmarks: ideaEngagement._sum.totalBookmarks ?? 0,
      averageEcoScore: ideaEngagement._avg.ecoScore ?? 0,
      averageImpactScore: ideaEngagement._avg.impactScore ?? 0,
      averageFeasibilityScore: ideaEngagement._avg.feasibilityScore ?? 0,
    },
  };
};

const getAdminAnalytics = async () => {
  const [
    userRoleGroups,
    userStatusGroups,
    totalScientists,
    verifiedScientists,
    ideaStatusGroups,
    featuredIdeas,
    highlightedIdeas,
    publishedIdeas,
    paidIdeas,
    purchaseStatusGroups,
    totalRevenueAggregate,
    pendingIdeaReports,
    pendingCommentReports,
    pendingExperienceReports,
    moderationActionsCount,
    totalExperienceReports,
    featuredExperienceReports,
    newsletterSubscribers,
    totalCampaigns,
    activeCampaigns,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      where: {
        isDeleted: false,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.user.groupBy({
      by: ["status"],
      where: {
        isDeleted: false,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.scientist.count({
      where: {
        isDeleted: false,
      },
    }),
    prisma.scientist.count({
      where: {
        isDeleted: false,
        verifiedAt: {
          not: null,
        },
      },
    }),
    prisma.idea.groupBy({
      by: ["status"],
      where: {
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.idea.count({
      where: {
        deletedAt: null,
        isFeatured: true,
      },
    }),
    prisma.idea.count({
      where: {
        deletedAt: null,
        isHighlighted: true,
      },
    }),
    prisma.idea.count({
      where: {
        deletedAt: null,
        publishedAt: {
          not: null,
        },
      },
    }),
    prisma.idea.count({
      where: {
        deletedAt: null,
        accessType: "PAID",
      },
    }),
    prisma.ideaPurchase.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.ideaPurchase.aggregate({
      where: {
        status: "PAID",
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.ideaReport.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.commentReport.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.experienceReport.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.moderationAction.count(),
    prisma.experienceReport.count(),
    prisma.experienceReport.count({
      where: {
        isFeatured: true,
      },
    }),
    prisma.newsletterSubscription.count({
      where: {
        isActive: true,
      },
    }),
    prisma.campaign.count(),
    prisma.campaign.count({
      where: {
        isActive: true,
      },
    }),
  ]);

  const userRoleCounts = mapGroupCounts(userRoleGroups, "role");
  const userStatusCounts = mapGroupCounts(userStatusGroups, "status");
  const ideaCounts = mapGroupCounts(ideaStatusGroups, "status");
  const purchaseCounts = mapGroupCounts(purchaseStatusGroups, "status");

  return {
    role: Role.ADMIN,
    users: {
      total: sumCounts(userRoleCounts),
      admins:
        getCount(userRoleCounts, Role.ADMIN) +
        getCount(userRoleCounts, Role.SUPER_ADMIN),
      scientists: getCount(userRoleCounts, Role.SCIENTIST),
      members: getCount(userRoleCounts, Role.MEMBER),
      moderators: getCount(userRoleCounts, Role.MODERATOR),
      active: getCount(userStatusCounts, UserStatus.ACTIVE),
      blocked: getCount(userStatusCounts, UserStatus.BLOCKED),
      suspended: getCount(userStatusCounts, UserStatus.SUSPENDED),
      deleted: getCount(userStatusCounts, UserStatus.DELETED),
    },
    scientists: {
      total: totalScientists,
      verified: verifiedScientists,
      pendingVerification: totalScientists - verifiedScientists,
    },
    ideas: {
      total: sumCounts(ideaCounts),
      draft: getCount(ideaCounts, "DRAFT"),
      underReview: getCount(ideaCounts, "UNDER_REVIEW"),
      approved: getCount(ideaCounts, "APPROVED"),
      rejected: getCount(ideaCounts, "REJECTED"),
      archived: getCount(ideaCounts, "ARCHIVED"),
      published: publishedIdeas,
      featured: featuredIdeas,
      highlighted: highlightedIdeas,
      paidAccess: paidIdeas,
    },
    commerce: {
      totalPurchases: sumCounts(purchaseCounts),
      paidPurchases: getCount(purchaseCounts, "PAID"),
      pendingPurchases: getCount(purchaseCounts, "PENDING"),
      failedPurchases: getCount(purchaseCounts, "FAILED"),
      refundedPurchases: getCount(purchaseCounts, "REFUNDED"),
      cancelledPurchases: getCount(purchaseCounts, "CANCELLED"),
      totalRevenue: toNumber(totalRevenueAggregate._sum.amount),
    },
    moderation: {
      pendingIdeaReports,
      pendingCommentReports,
      pendingExperienceReports,
      totalModerationActions: moderationActionsCount,
    },
    community: {
      totalExperienceReports,
      featuredExperienceReports,
      newsletterSubscribers,
    },
    campaigns: {
      total: totalCampaigns,
      active: activeCampaigns,
    },
  };
};

export const AnalyticsService = {
  getMemberAnalytics,
  getScientistAnalytics,
  getAdminAnalytics,
};
