import status from "http-status";
import AppError from "../../errors/AppError";
import { envVars } from "../../config";
import {
  IdeaStatus,
  ModerationStatus,
  PaymentStatus,
  Prisma,
  Role,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import {
  IAiAction,
  IAiAlert,
  IAiInsight,
  IAiSuggestion,
  IChatPayload,
  IIdeaFormSuggestionPayload,
} from "./ai.interface";

type ScoreItem = {
  id: string;
  name: string;
  slug?: string | null;
  score: number;
};

type PreferenceIdea = {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type AiProviderConfig = {
  provider: "openai";
  apiKey: string;
  model: string;
};

type OpenAiContent = {
  text?: string;
};

type OpenAiOutput = {
  content?: OpenAiContent[];
};

type OpenAiResponseBody = {
  output_text?: string;
  output?: OpenAiOutput[];
  error?: {
    message?: string;
  };
};

const ideaCardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  status: true,
  accessType: true,
  price: true,
  currency: true,
  ecoScore: true,
  totalViews: true,
  totalUpvotes: true,
  totalBookmarks: true,
  totalComments: true,
  publishedAt: true,
  lastActivityAt: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
    },
  },
} as const;

const preferenceIdeaSelect = {
  id: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

const publicIdeaWhere: Prisma.IdeaWhereInput = {
  deletedAt: null,
  OR: [
    {
      publishedAt: {
        not: null,
      },
    },
    {
      status: IdeaStatus.APPROVED,
    },
  ],
};

const clampLimit = (
  value: unknown,
  defaultLimit = 8,
  maxLimit = 20,
): number => {
  const limit = Number(value);

  if (!Number.isFinite(limit) || limit <= 0) {
    return defaultLimit;
  }

  return Math.min(Math.floor(limit), maxLimit);
};

const normalizeSearchTerm = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const daysSince = (value?: Date | null) => {
  if (!value) {
    return 365;
  }

  return Math.max(0, (Date.now() - value.getTime()) / (24 * 60 * 60 * 1000));
};

const scoreTrendingIdea = (idea: {
  ecoScore: number | null;
  totalViews: number;
  totalUpvotes: number;
  totalBookmarks: number;
  totalComments: number;
  lastActivityAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
}) => {
  const activityDate = idea.lastActivityAt ?? idea.publishedAt ?? idea.createdAt;
  const recencyScore = Math.max(0, 21 - daysSince(activityDate));

  return (
    idea.totalViews * 0.2 +
    idea.totalUpvotes * 4 +
    idea.totalBookmarks * 5 +
    idea.totalComments * 2 +
    (idea.ecoScore ?? 0) * 3 +
    recencyScore
  );
};

const incrementScore = (
  map: Map<string, ScoreItem>,
  item: { id: string; name: string; slug?: string | null },
  weight: number,
) => {
  const existing = map.get(item.id);

  if (existing) {
    existing.score += weight;
    return;
  }

  map.set(item.id, {
    id: item.id,
    name: item.name,
    slug: item.slug,
    score: weight,
  });
};

const toSortedScores = (map: Map<string, ScoreItem>) =>
  [...map.values()].sort((a, b) => b.score - a.score);

const getUserPreferenceProfile = async (userId: string) => {
  const [createdIdeas, bookmarks, votes, purchases] = await Promise.all([
    prisma.idea.findMany({
      where: {
        authorId: userId,
        deletedAt: null,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      select: preferenceIdeaSelect,
    }),
    prisma.ideaBookmark.findMany({
      where: {
        userId,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        idea: {
          select: preferenceIdeaSelect,
        },
      },
    }),
    prisma.vote.findMany({
      where: {
        userId,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        idea: {
          select: preferenceIdeaSelect,
        },
      },
    }),
    prisma.ideaPurchase.findMany({
      where: {
        userId,
        status: PaymentStatus.PAID,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        idea: {
          select: preferenceIdeaSelect,
        },
      },
    }),
  ]);

  const categoryScores = new Map<string, ScoreItem>();
  const tagScores = new Map<string, ScoreItem>();

  const addIdea = (idea: PreferenceIdea, weight: number) => {
    incrementScore(categoryScores, idea.category, weight);

    idea.tags.forEach((tag) => {
      incrementScore(tagScores, tag, weight);
    });
  };

  createdIdeas.forEach((idea) => addIdea(idea, 2));
  bookmarks.forEach((bookmark) => addIdea(bookmark.idea, 4));
  votes.forEach((vote) => addIdea(vote.idea, 3));
  purchases.forEach((purchase) => addIdea(purchase.idea, 5));

  const categories = toSortedScores(categoryScores);
  const tags = toSortedScores(tagScores);

  return {
    categories,
    tags,
    topCategory: categories[0] ?? null,
    topTag: tags[0] ?? null,
    categoryIds: categories.slice(0, 5).map((item) => item.id),
    tagIds: tags.slice(0, 8).map((item) => item.id),
  };
};

const getSearchSuggestions = async (query: Record<string, unknown>) => {
  const searchTerm = normalizeSearchTerm(query.searchTerm);
  const limit = clampLimit(query.limit, 8, 15);

  if (searchTerm.length < 2) {
    return [];
  }

  const [ideas, categories, tags] = await Promise.all([
    prisma.idea.findMany({
      where: {
        AND: [
          publicIdeaWhere,
          {
            OR: [
              {
                title: {
                  contains: searchTerm,
                  mode: "insensitive",
                },
              },
              {
                excerpt: {
                  contains: searchTerm,
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
      },
      take: limit,
      orderBy: {
        totalViews: "desc",
      },
      select: {
        title: true,
        slug: true,
      },
    }),
    prisma.category.findMany({
      where: {
        isActive: true,
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      take: Math.ceil(limit / 2),
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.tag.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      take: Math.ceil(limit / 2),
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  const suggestions: IAiSuggestion[] = [
    ...ideas.map((idea) => ({
      type: "IDEA" as const,
      label: idea.title,
      value: idea.slug,
      href: `/ideas/${idea.slug}`,
    })),
    ...categories.map((category) => ({
      type: "CATEGORY" as const,
      label: category.name,
      value: category.id,
      href: `/ideas?categoryId=${category.id}`,
    })),
    ...tags.map((tag) => ({
      type: "TAG" as const,
      label: tag.name,
      value: tag.id,
      href: `/ideas?tag=${tag.slug}`,
    })),
  ];

  return suggestions.slice(0, limit);
};

const getTrendingIdeas = async (query: Record<string, unknown>) => {
  const limit = clampLimit(query.limit, 8, 20);

  const ideas = await prisma.idea.findMany({
    where: publicIdeaWhere,
    take: 60,
    orderBy: [
      {
        totalViews: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: ideaCardSelect,
  });

  return ideas
    .map((idea) => ({
      ...idea,
      aiScore: scoreTrendingIdea(idea),
      reason: "Trending from recent views, votes, bookmarks, and eco score",
    }))
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, limit);
};

const getRecommendations = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const limit = clampLimit(query.limit, 8, 20);
  const preference = await getUserPreferenceProfile(userId);
  const preferenceFilters: Prisma.IdeaWhereInput[] = [];

  if (preference.categoryIds.length) {
    preferenceFilters.push({
      categoryId: {
        in: preference.categoryIds,
      },
    });
  }

  if (preference.tagIds.length) {
    preferenceFilters.push({
      tags: {
        some: {
          id: {
            in: preference.tagIds,
          },
        },
      },
    });
  }

  if (!preferenceFilters.length) {
    const trendingIdeas = await getTrendingIdeas({
      limit,
    });

    return {
      source: "TRENDING_FALLBACK",
      basedOn: {
        category: null,
        tag: null,
      },
      data: trendingIdeas,
    };
  }

  const ideas = await prisma.idea.findMany({
    where: {
      AND: [
        publicIdeaWhere,
        {
          authorId: {
            not: userId,
          },
        },
        {
          OR: preferenceFilters,
        },
      ],
    },
    take: 60,
    orderBy: {
      updatedAt: "desc",
    },
    select: ideaCardSelect,
  });

  const categoryScoreMap = new Map(
    preference.categories.map((item) => [item.id, item.score]),
  );
  const tagScoreMap = new Map(preference.tags.map((item) => [item.id, item.score]));

  const rankedIdeas = ideas
    .map((idea) => {
      const categoryBoost = categoryScoreMap.get(idea.category.id) ?? 0;
      const tagBoost = idea.tags.reduce(
        (total, tag) => total + (tagScoreMap.get(tag.id) ?? 0),
        0,
      );
      const aiScore = scoreTrendingIdea(idea) + categoryBoost * 8 + tagBoost * 4;
      const reason = preference.topCategory
        ? `Recommended because you interact with ${preference.topCategory.name} ideas`
        : "Recommended from your recent EcoSpark activity";

      return {
        ...idea,
        aiScore,
        reason,
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, limit);

  return {
    source: "PERSONALIZED",
    basedOn: {
      category: preference.topCategory,
      tag: preference.topTag,
    },
    data: rankedIdeas,
  };
};

const getPersonalizedBanner = async (userId: string) => {
  const preference = await getUserPreferenceProfile(userId);

  if (preference.topCategory) {
    return {
      title: `${preference.topCategory.name} Ideas Are Waiting`,
      subtitle:
        "Based on your recent votes, bookmarks, purchases, and created ideas.",
      ctaText: "Explore Recommended Ideas",
      ctaLink: `/ideas?categoryId=${preference.topCategory.id}`,
      personalization: {
        category: preference.topCategory,
        tag: preference.topTag,
      },
    };
  }

  return {
    title: "Discover High-Impact Sustainability Ideas",
    subtitle:
      "Explore trending EcoSpark ideas ranked by activity and eco impact.",
    ctaText: "Explore Trending Ideas",
    ctaLink: "/ai-discover",
    personalization: {
      category: null,
      tag: null,
    },
  };
};

const getAdminDashboardInsights = async () => {
  const [
    totalUsers,
    totalIdeas,
    paidPurchases,
    pendingIdeaReports,
    pendingCommentReports,
    categoryGroups,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        isDeleted: false,
      },
    }),
    prisma.idea.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.ideaPurchase.count({
      where: {
        status: PaymentStatus.PAID,
      },
    }),
    prisma.ideaReport.count({
      where: {
        status: ModerationStatus.PENDING,
      },
    }),
    prisma.commentReport.count({
      where: {
        status: ModerationStatus.PENDING,
      },
    }),
    prisma.idea.groupBy({
      by: ["categoryId"],
      where: {
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const topCategoryGroup = categoryGroups.sort(
    (a, b) => b._count._all - a._count._all,
  )[0];
  const topCategory = topCategoryGroup
    ? await prisma.category.findUnique({
        where: {
          id: topCategoryGroup.categoryId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })
    : null;

  const insights: IAiInsight[] = [
    {
      type: "INFO",
      title: "Platform activity",
      message: `${totalUsers} active users and ${totalIdeas} ideas are currently tracked by EcoSpark.`,
    },
    {
      type: "SUCCESS",
      title: "Commerce signal",
      message: `${paidPurchases} paid idea purchases are confirmed.`,
    },
    {
      type: pendingIdeaReports + pendingCommentReports > 0 ? "WARNING" : "INFO",
      title: "Moderation queue",
      message: `${pendingIdeaReports + pendingCommentReports} reports are waiting for review.`,
    },
  ];

  if (topCategory) {
    insights.push({
      type: "INFO",
      title: "Top content category",
      message: `${topCategory.name} has the most idea activity on the platform.`,
    });
  }

  return {
    role: Role.ADMIN,
    insights,
  };
};

const getUserDashboardInsights = async (userId: string, role: Role) => {
  const [
    ideaStatusGroups,
    bookmarkCount,
    purchaseCount,
    unreadNotifications,
    categoryGroups,
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
    prisma.ideaBookmark.count({
      where: {
        userId,
      },
    }),
    prisma.ideaPurchase.count({
      where: {
        userId,
        status: PaymentStatus.PAID,
      },
    }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
    prisma.idea.groupBy({
      by: ["categoryId"],
      where: {
        authorId: userId,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const statusCounts = ideaStatusGroups.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    },
    {},
  );
  const topCategoryGroup = categoryGroups.sort(
    (a, b) => b._count._all - a._count._all,
  )[0];
  const topCategory = topCategoryGroup
    ? await prisma.category.findUnique({
        where: {
          id: topCategoryGroup.categoryId,
        },
        select: {
          name: true,
        },
      })
    : null;

  const insights: IAiInsight[] = [
    {
      type: "INFO",
      title: "Idea progress",
      message: `You have ${statusCounts[IdeaStatus.DRAFT] ?? 0} draft ideas and ${
        statusCounts[IdeaStatus.APPROVED] ?? 0
      } approved ideas.`,
    },
    {
      type: "SUCCESS",
      title: "Discovery profile",
      message: `Your activity includes ${bookmarkCount} bookmarks and ${purchaseCount} paid idea purchases.`,
    },
  ];

  if (topCategory) {
    insights.push({
      type: "INFO",
      title: "Top interest",
      message: `${topCategory.name} is your strongest idea category so far.`,
    });
  }

  if (unreadNotifications > 0) {
    insights.push({
      type: "WARNING",
      title: "Unread notifications",
      message: `${unreadNotifications} notifications may need your attention.`,
    });
  }

  return {
    role,
    insights,
  };
};

const getDashboardInsights = async (userId: string, role: Role) => {
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
    return getAdminDashboardInsights();
  }

  return getUserDashboardInsights(userId, role);
};

const getNextActions = async (userId: string, role: Role) => {
  const [draftIdeas, pendingPurchases, unreadNotifications, bookmarkCount] =
    await Promise.all([
      prisma.idea.count({
        where: {
          authorId: userId,
          status: IdeaStatus.DRAFT,
          deletedAt: null,
        },
      }),
      prisma.ideaPurchase.count({
        where: {
          userId,
          status: PaymentStatus.PENDING,
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      prisma.ideaBookmark.count({
        where: {
          userId,
        },
      }),
    ]);

  const actions: IAiAction[] = [];

  if (draftIdeas > 0) {
    actions.push({
      title: "Submit your draft idea",
      reason: `You have ${draftIdeas} draft idea${draftIdeas > 1 ? "s" : ""} that can be sent for review.`,
      link: "/dashboard/my-ideas",
      priority: "HIGH",
    });
  }

  if (role === Role.SCIENTIST) {
    const scientistProfile = await prisma.scientist.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        verifiedAt: true,
      },
    });

    if (!scientistProfile?.verifiedAt) {
      actions.push({
        title: "Complete scientist verification",
        reason:
          "Verified scientist profiles can build more trust around submitted ideas.",
        link: "/dashboard/profile",
        priority: "MEDIUM",
      });
    }
  }

  if (pendingPurchases > 0) {
    actions.push({
      title: "Check pending purchases",
      reason: `${pendingPurchases} checkout session${pendingPurchases > 1 ? "s are" : " is"} still pending.`,
      link: "/dashboard/purchases",
      priority: "MEDIUM",
    });
  }

  if (unreadNotifications > 0) {
    actions.push({
      title: "Review notifications",
      reason: `${unreadNotifications} notification${unreadNotifications > 1 ? "s need" : " needs"} your attention.`,
      link: "/dashboard/notifications",
      priority: "LOW",
    });
  }

  if (bookmarkCount === 0) {
    actions.push({
      title: "Bookmark useful ideas",
      reason:
        "Bookmarks help EcoSpark personalize your AI recommendations over time.",
      link: "/ai-discover",
      priority: "LOW",
    });
  }

  if (!actions.length) {
    actions.push({
      title: "Explore trending ideas",
      reason: "Your account is up to date. Discover what is active now.",
      link: "/ai-discover",
      priority: "LOW",
    });
  }

  return {
    actions,
  };
};

const getDateWindow = () => {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 7);

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 7);

  return {
    now,
    currentStart,
    previousStart,
  };
};

const hasSpike = (current: number, previous: number, minimum: number) => {
  if (current < minimum) {
    return false;
  }

  if (previous === 0) {
    return current >= minimum;
  }

  return current >= previous * 1.5;
};

const getAnomalyAlerts = async () => {
  const { now, currentStart, previousStart } = getDateWindow();

  const [
    currentIdeaReports,
    previousIdeaReports,
    currentCommentReports,
    previousCommentReports,
    currentFailedPurchases,
    previousFailedPurchases,
    currentIdeas,
    previousIdeas,
    currentRejectedIdeas,
    previousRejectedIdeas,
    currentUsers,
    previousUsers,
  ] = await Promise.all([
    prisma.ideaReport.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.ideaReport.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.commentReport.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.commentReport.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.ideaPurchase.count({
      where: {
        status: PaymentStatus.FAILED,
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.ideaPurchase.count({
      where: {
        status: PaymentStatus.FAILED,
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.idea.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.idea.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.idea.count({
      where: {
        status: IdeaStatus.REJECTED,
        reviewedAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.idea.count({
      where: {
        status: IdeaStatus.REJECTED,
        reviewedAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: now,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    }),
  ]);

  const alerts: IAiAlert[] = [];
  const currentReports = currentIdeaReports + currentCommentReports;
  const previousReports = previousIdeaReports + previousCommentReports;

  if (hasSpike(currentReports, previousReports, 5)) {
    alerts.push({
      type: "WARNING",
      title: "High report activity",
      message: `Reports increased from ${previousReports} to ${currentReports} in the last 7 days.`,
      priority: "HIGH",
    });
  }

  if (hasSpike(currentFailedPurchases, previousFailedPurchases, 3)) {
    alerts.push({
      type: "WARNING",
      title: "Payment failure spike",
      message: `Failed purchases increased from ${previousFailedPurchases} to ${currentFailedPurchases}.`,
      priority: "HIGH",
    });
  }

  if (previousIdeas >= 5 && currentIdeas <= previousIdeas * 0.5) {
    alerts.push({
      type: "WARNING",
      title: "Idea submissions dropped",
      message: `New ideas dropped from ${previousIdeas} to ${currentIdeas} compared with the previous week.`,
      priority: "MEDIUM",
    });
  }

  if (hasSpike(currentRejectedIdeas, previousRejectedIdeas, 4)) {
    alerts.push({
      type: "INFO",
      title: "Rejected ideas increased",
      message: `Rejected ideas increased from ${previousRejectedIdeas} to ${currentRejectedIdeas}.`,
      priority: "MEDIUM",
    });
  }

  if (hasSpike(currentUsers, previousUsers, 10)) {
    alerts.push({
      type: "INFO",
      title: "User signup spike",
      message: `New users increased from ${previousUsers} to ${currentUsers}.`,
      priority: "LOW",
    });
  }

  if (!alerts.length) {
    alerts.push({
      type: "INFO",
      title: "No unusual platform activity",
      message: "No major anomaly was detected in the last 7 days.",
      priority: "LOW",
    });
  }

  return {
    comparedRange: {
      currentStart,
      currentEnd: now,
      previousStart,
      previousEnd: currentStart,
    },
    metrics: {
      reports: {
        current: currentReports,
        previous: previousReports,
      },
      failedPurchases: {
        current: currentFailedPurchases,
        previous: previousFailedPurchases,
      },
      ideas: {
        current: currentIdeas,
        previous: previousIdeas,
      },
      rejectedIdeas: {
        current: currentRejectedIdeas,
        previous: previousRejectedIdeas,
      },
      users: {
        current: currentUsers,
        previous: previousUsers,
      },
    },
    alerts,
  };
};

const getAiProviderConfig = (): AiProviderConfig => {
  const provider = (envVars.AI_PROVIDER ?? "openai").trim().toLowerCase();
  const apiKey = envVars.AI_API_KEY?.trim();
  const model = envVars.AI_MODEL?.trim() || "gpt-5-mini";

  if (provider !== "openai") {
    throw new AppError(status.NOT_IMPLEMENTED, "Only OpenAI AI provider is supported");
  }

  if (!apiKey || apiKey === "your_new_openai_api_key_here") {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "AI_API_KEY is not configured on the backend",
    );
  }

  return {
    provider: "openai",
    apiKey,
    model,
  };
};

const extractOpenAiText = (body: OpenAiResponseBody) => {
  if (body.output_text) {
    return body.output_text.trim();
  }

  const outputText = body.output
    ?.flatMap((output) => output.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim();

  if (!outputText) {
    throw new AppError(status.BAD_GATEWAY, "AI provider returned an empty response");
  }

  return outputText;
};

const generateAiText = async (instructions: string, input: string) => {
  const config = getAiProviderConfig();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      instructions,
      input,
      store: false,
    }),
  });

  const body = (await response.json()) as OpenAiResponseBody;

  if (!response.ok) {
    throw new AppError(
      status.BAD_GATEWAY,
      body.error?.message ?? "AI provider request failed",
    );
  }

  return extractOpenAiText(body);
};

const getChatContext = async (userId: string) => {
  const [user, createdIdeas, bookmarks, purchases, unreadNotifications] =
    await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          name: true,
          role: true,
        },
      }),
      prisma.idea.count({
        where: {
          authorId: userId,
          deletedAt: null,
        },
      }),
      prisma.ideaBookmark.count({
        where: {
          userId,
        },
      }),
      prisma.ideaPurchase.count({
        where: {
          userId,
          status: PaymentStatus.PAID,
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

  return {
    user,
    createdIdeas,
    bookmarks,
    purchases,
    unreadNotifications,
  };
};

const chat = async (userId: string, payload: IChatPayload) => {
  const context = await getChatContext(userId);
  const instructions = [
    "You are EcoSpark AI Assistant.",
    "EcoSpark is an eco-innovation platform for sustainability ideas, campaigns, comments, experience reports, and paid idea access.",
    "Help users navigate the product, improve idea submissions, understand campaigns, and explain paid idea access.",
    "Keep answers concise, practical, and friendly. Do not claim to perform actions that the API has not performed.",
    "If the user asks for medical, legal, or financial advice, give general information and suggest a qualified professional.",
  ].join(" ");

  const input = [
    `User context: ${JSON.stringify(context)}`,
    `User message: ${payload.message}`,
  ].join("\n\n");

  const reply = await generateAiText(instructions, input);

  return {
    reply,
    suggestedActions: [
      {
        label: "Explore recommended ideas",
        href: "/ai-discover",
      },
      {
        label: "Review dashboard insights",
        href: "/dashboard",
      },
    ],
  };
};

const parseJsonFromAiText = (value: string) => {
  const trimmed = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new AppError(status.BAD_GATEWAY, "AI provider returned invalid JSON");
  }
};

const getIdeaFormSuggestions = async (
  userId: string,
  payload: IIdeaFormSuggestionPayload,
) => {
  const preference = await getUserPreferenceProfile(userId);
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
  const tags = await prisma.tag.findMany({
    orderBy: {
      name: "asc",
    },
    take: 50,
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const instructions = [
    "You generate JSON suggestions for EcoSpark sustainability idea forms.",
    "Return only valid JSON. No markdown.",
    "Use concise, practical language.",
    "Prefer existing category and tag names when possible.",
    "JSON shape: {\"excerpt\":\"\",\"description\":\"\",\"proposedSolution\":\"\",\"implementationSteps\":\"\",\"expectedBenefits\":\"\",\"risksAndChallenges\":\"\",\"requiredResources\":\"\",\"suggestedCategoryName\":\"\",\"suggestedTags\":[\"\"]}.",
  ].join(" ");

  const input = JSON.stringify({
    draft: payload,
    userPreference: {
      category: preference.topCategory,
      tag: preference.topTag,
    },
    availableCategories: categories,
    availableTags: tags,
  });

  const text = await generateAiText(instructions, input);
  const parsed = parseJsonFromAiText(text);

  return {
    suggestions: {
      excerpt: typeof parsed.excerpt === "string" ? parsed.excerpt : undefined,
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      proposedSolution:
        typeof parsed.proposedSolution === "string"
          ? parsed.proposedSolution
          : undefined,
      implementationSteps:
        typeof parsed.implementationSteps === "string"
          ? parsed.implementationSteps
          : undefined,
      expectedBenefits:
        typeof parsed.expectedBenefits === "string"
          ? parsed.expectedBenefits
          : undefined,
      risksAndChallenges:
        typeof parsed.risksAndChallenges === "string"
          ? parsed.risksAndChallenges
          : undefined,
      requiredResources:
        typeof parsed.requiredResources === "string"
          ? parsed.requiredResources
          : undefined,
      suggestedCategoryName:
        typeof parsed.suggestedCategoryName === "string"
          ? parsed.suggestedCategoryName
          : undefined,
      suggestedTags: Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags.filter(
            (tag): tag is string => typeof tag === "string",
          )
        : [],
    },
  };
};

export const AiService = {
  getSearchSuggestions,
  getRecommendations,
  getTrendingIdeas,
  getPersonalizedBanner,
  getDashboardInsights,
  getNextActions,
  getAnomalyAlerts,
  chat,
  getIdeaFormSuggestions,
};
