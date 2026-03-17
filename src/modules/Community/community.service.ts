import status from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  ICreateExperienceReportPayload,
  ISubscribeNewsletterPayload,
  IUnsubscribeNewsletterPayload,
  IUpdateExperienceReportPayload,
} from "./community.interface";

const experienceReportInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  },
  idea: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
} as const;

const notificationInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
} as const;

const ensureIdeaExists = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea || idea.deletedAt) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  return idea;
};

const ensureExperienceReportExists = async (id: string) => {
  const report = await prisma.experienceReport.findUnique({
    where: { id },
  });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Experience report not found");
  }

  return report;
};

const ensureNotificationExists = async (id: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

  return notification;
};

const createExperienceReport = async (
  authorId: string,
  payload: ICreateExperienceReportPayload,
) => {
  await ensureIdeaExists(payload.ideaId);

  const report = await prisma.experienceReport.create({
    data: {
      ideaId: payload.ideaId,
      authorId,
      title: payload.title,
      summary: payload.summary,
      outcome: payload.outcome,
      challenges: payload.challenges,
      measurableResult: payload.measurableResult,
      adoptedScale: payload.adoptedScale,
      location: payload.location,
      effectivenessRating: payload.effectivenessRating,
      beforeImageUrl: payload.beforeImageUrl,
      afterImageUrl: payload.afterImageUrl,
    },
    include: experienceReportInclude,
  });

  return report;
};

const getAllExperienceReports = async () => {
  return prisma.experienceReport.findMany({
    include: experienceReportInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSingleExperienceReport = async (id: string) => {
  const report = await prisma.experienceReport.findUnique({
    where: { id },
    include: experienceReportInclude,
  });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Experience report not found");
  }

  return report;
};

const getIdeaExperienceReports = async (ideaId: string) => {
  await ensureIdeaExists(ideaId);

  return prisma.experienceReport.findMany({
    where: {
      ideaId,
    },
    include: experienceReportInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const updateExperienceReport = async (
  id: string,
  userId: string,
  payload: IUpdateExperienceReportPayload,
) => {
  const report = await ensureExperienceReportExists(id);

  if (report.authorId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only update your own experience report",
    );
  }

  return prisma.experienceReport.update({
    where: { id },
    data: {
      ...payload,
    },
    include: experienceReportInclude,
  });
};

const deleteExperienceReport = async (id: string, userId: string) => {
  const report = await ensureExperienceReportExists(id);

  if (report.authorId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own experience report",
    );
  }

  await prisma.experienceReport.delete({
    where: { id },
  });

  return {
    success: true,
  };
};

const approveExperienceReport = async (id: string) => {
  await ensureExperienceReportExists(id);

  return prisma.experienceReport.update({
    where: { id },
    data: {
      status: "APPROVED",
    },
    include: experienceReportInclude,
  });
};

const rejectExperienceReport = async (id: string) => {
  await ensureExperienceReportExists(id);

  return prisma.experienceReport.update({
    where: { id },
    data: {
      status: "REJECTED",
      isFeatured: false,
    },
    include: experienceReportInclude,
  });
};

const featureExperienceReport = async (id: string) => {
  await ensureExperienceReportExists(id);

  return prisma.experienceReport.update({
    where: { id },
    data: {
      isFeatured: true,
    },
    include: experienceReportInclude,
  });
};

const getMyNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    include: notificationInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSingleNotification = async (id: string, userId: string) => {
  const notification = await ensureNotificationExists(id);

  if (notification.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only access your own notification",
    );
  }

  return prisma.notification.findUnique({
    where: { id },
    include: notificationInclude,
  });
};

const markNotificationRead = async (id: string, userId: string) => {
  const notification = await ensureNotificationExists(id);

  if (notification.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only update your own notification",
    );
  }

  return prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
    },
    include: notificationInclude,
  });
};

const markAllNotificationsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return {
    success: true,
  };
};

const deleteNotification = async (id: string, userId: string) => {
  const notification = await ensureNotificationExists(id);

  if (notification.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own notification",
    );
  }

  await prisma.notification.delete({
    where: { id },
  });

  return {
    success: true,
  };
};

const subscribeNewsletter = async (
  userId: string | null,
  payload: ISubscribeNewsletterPayload,
) => {
  const existingSubscription = await prisma.newsletterSubscription.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingSubscription) {
    if (existingSubscription.isActive) {
      throw new AppError(
        status.CONFLICT,
        "Email is already subscribed to the newsletter",
      );
    }

    return prisma.newsletterSubscription.update({
      where: {
        email: payload.email,
      },
      data: {
        isActive: true,
        unsubscribedAt: null,
        source: payload.source ?? existingSubscription.source,
        userId: userId ?? existingSubscription.userId,
      },
    });
  }

  return prisma.newsletterSubscription.create({
    data: {
      email: payload.email,
      userId: userId ?? undefined,
      source: payload.source,
      isActive: true,
    },
  });
};

const unsubscribeNewsletter = async (
  payload: IUnsubscribeNewsletterPayload,
) => {
  const existingSubscription = await prisma.newsletterSubscription.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!existingSubscription) {
    throw new AppError(status.NOT_FOUND, "Subscription not found");
  }

  if (!existingSubscription.isActive) {
    throw new AppError(status.BAD_REQUEST, "Subscription is already inactive");
  }

  return prisma.newsletterSubscription.update({
    where: {
      email: payload.email,
    },
    data: {
      isActive: false,
      unsubscribedAt: new Date(),
    },
  });
};

const getNewsletterSubscriptions = async () => {
  return prisma.newsletterSubscription.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      subscribedAt: "desc",
    },
  });
};

export const CommunityService = {
  createExperienceReport,
  getAllExperienceReports,
  getSingleExperienceReport,
  getIdeaExperienceReports,
  updateExperienceReport,
  deleteExperienceReport,
  approveExperienceReport,
  rejectExperienceReport,
  featureExperienceReport,
  getMyNotifications,
  getSingleNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  subscribeNewsletter,
  unsubscribeNewsletter,
  getNewsletterSubscriptions,
};
