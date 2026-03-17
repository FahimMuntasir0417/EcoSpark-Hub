import status from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  IModerationCommentActionPayload,
  IReportCommentPayload,
  IReportIdeaPayload,
  IReviewFeedbackPayload,
  IReviewIdeaPayload,
  IReviewReportPayload,
} from "./moderation.interface";

const syncIdeaCommentCount = async (ideaId: string) => {
  const totalComments = await prisma.comment.count({
    where: {
      ideaId,
      isDeleted: false,
    },
  });

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      totalComments,
      lastActivityAt: new Date(),
    },
  });
};

const ensureIdeaExists = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea || idea.deletedAt) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  return idea;
};

const ensureCommentExists = async (commentId: string) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  return comment;
};

const ensureIdeaReportExists = async (id: string) => {
  const report = await prisma.ideaReport.findUnique({
    where: { id },
  });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Idea report not found");
  }

  return report;
};

const ensureCommentReportExists = async (id: string) => {
  const report = await prisma.commentReport.findUnique({
    where: { id },
  });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Comment report not found");
  }

  return report;
};

const reportIdea = async (
  ideaId: string,
  reporterId: string,
  payload: IReportIdeaPayload,
) => {
  await ensureIdeaExists(ideaId);

  const existingReport = await prisma.ideaReport.findUnique({
    where: {
      ideaId_reporterId: {
        ideaId,
        reporterId,
      },
    },
  });

  if (existingReport) {
    throw new AppError(status.CONFLICT, "You already reported this idea");
  }

  const report = await prisma.ideaReport.create({
    data: {
      ideaId,
      reporterId,
      reason: payload.reason,
      note: payload.note,
    },
    include: {
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return report;
};

const reportComment = async (
  commentId: string,
  reporterId: string,
  payload: IReportCommentPayload,
) => {
  await ensureCommentExists(commentId);

  const existingReport = await prisma.commentReport.findUnique({
    where: {
      commentId_reporterId: {
        commentId,
        reporterId,
      },
    },
  });

  if (existingReport) {
    throw new AppError(status.CONFLICT, "You already reported this comment");
  }

  const report = await prisma.commentReport.create({
    data: {
      commentId,
      reporterId,
      reason: payload.reason,
      note: payload.note,
    },
    include: {
      comment: {
        select: {
          id: true,
          content: true,
          ideaId: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return report;
};

const getIdeaReports = async () => {
  return prisma.ideaReport.findMany({
    include: {
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSingleIdeaReport = async (id: string) => {
  const report = await prisma.ideaReport.findUnique({
    where: { id },
    include: {
      idea: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          category: true,
          campaign: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Idea report not found");
  }

  return report;
};

const reviewIdeaReport = async (
  id: string,
  actorId: string,
  payload: IReviewReportPayload,
) => {
  const report = await ensureIdeaReportExists(id);

  const result = await prisma.$transaction(async (tx) => {
    const updatedReport = await tx.ideaReport.update({
      where: { id },
      data: {
        status: payload.status,
        note: payload.note ?? report.note,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId,
        ideaId: report.ideaId,
        actionType: "REPORT_RESOLVED",
        note: payload.note,
        metadata: {
          reportId: id,
          reportType: "IDEA",
          resolvedStatus: payload.status,
        },
      },
    });

    return updatedReport;
  });

  return result;
};

const getCommentReports = async () => {
  return prisma.commentReport.findMany({
    include: {
      comment: {
        select: {
          id: true,
          content: true,
          ideaId: true,
          isDeleted: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSingleCommentReport = async (id: string) => {
  const report = await prisma.commentReport.findUnique({
    where: { id },
    include: {
      comment: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          idea: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Comment report not found");
  }

  return report;
};

const reviewCommentReport = async (
  id: string,
  actorId: string,
  payload: IReviewReportPayload,
) => {
  const report = await ensureCommentReportExists(id);

  const result = await prisma.$transaction(async (tx) => {
    const updatedReport = await tx.commentReport.update({
      where: { id },
      data: {
        status: payload.status,
        note: payload.note ?? report.note,
      },
      include: {
        comment: {
          select: {
            id: true,
            content: true,
            ideaId: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId,
        commentId: report.commentId,
        actionType: "REPORT_RESOLVED",
        note: payload.note,
        metadata: {
          reportId: id,
          reportType: "COMMENT",
          resolvedStatus: payload.status,
        },
      },
    });

    return updatedReport;
  });

  return result;
};

const createIdeaReviewFeedback = async (
  ideaId: string,
  reviewerId: string,
  payload: IReviewFeedbackPayload,
) => {
  await ensureIdeaExists(ideaId);

  const feedback = await prisma.ideaReviewFeedback.create({
    data: {
      ideaId,
      reviewerId,
      feedbackType: payload.feedbackType ?? "REVIEW",
      title: payload.title,
      message: payload.message,
      isVisibleToAuthor: payload.isVisibleToAuthor ?? true,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return feedback;
};

const getIdeaReviewFeedbacks = async (ideaId: string) => {
  await ensureIdeaExists(ideaId);

  return prisma.ideaReviewFeedback.findMany({
    where: {
      ideaId,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSingleReviewFeedback = async (id: string) => {
  const feedback = await prisma.ideaReviewFeedback.findUnique({
    where: { id },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  if (!feedback) {
    throw new AppError(status.NOT_FOUND, "Review feedback not found");
  }

  return feedback;
};

const reviewIdea = async (
  ideaId: string,
  actorId: string,
  payload: IReviewIdeaPayload,
) => {
  const idea = await ensureIdeaExists(ideaId);

  const statusMap: Record<
    IReviewIdeaPayload["action"],
    "APPROVED" | "REJECTED" | "ARCHIVED"
  > = {
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    ARCHIVED: "ARCHIVED",
  };

  const moderationActionMap: Record<
    IReviewIdeaPayload["action"],
    "IDEA_APPROVED" | "IDEA_REJECTED" | "IDEA_ARCHIVED"
  > = {
    APPROVED: "IDEA_APPROVED",
    REJECTED: "IDEA_REJECTED",
    ARCHIVED: "IDEA_ARCHIVED",
  };

  const nextStatus = statusMap[payload.action];
  const actionType = moderationActionMap[payload.action];

  const result = await prisma.$transaction(async (tx) => {
    const updatedIdea = await tx.idea.update({
      where: { id: ideaId },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        archivedAt: payload.action === "ARCHIVED" ? new Date() : undefined,
        rejectionFeedback:
          payload.action === "REJECTED"
            ? payload.rejectionFeedback
            : idea.rejectionFeedback,
        adminNote: payload.note,
        lastActivityAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        category: true,
        campaign: true,
      },
    });

    await tx.ideaStatusLog.create({
      data: {
        ideaId,
        actorId,
        fromStatus: idea.status,
        toStatus: nextStatus,
        note: payload.note,
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId,
        ideaId,
        actionType,
        note: payload.note,
        metadata: {
          fromStatus: idea.status,
          toStatus: nextStatus,
        },
      },
    });

    if (payload.action === "REJECTED" && payload.rejectionFeedback) {
      await tx.ideaReviewFeedback.create({
        data: {
          ideaId,
          reviewerId: actorId,
          feedbackType: "REJECTION",
          title: "Idea Rejected",
          message: payload.rejectionFeedback,
          isVisibleToAuthor: true,
        },
      });
    }

    return updatedIdea;
  });

  return result;
};

const deleteCommentByModerator = async (
  commentId: string,
  actorId: string,
  payload: IModerationCommentActionPayload,
) => {
  const comment = await ensureCommentExists(commentId);

  const result = await prisma.$transaction(async (tx) => {
    const updatedComment = await tx.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId,
        commentId,
        actionType: "COMMENT_DELETED",
        note: payload.note,
        metadata: {
          ideaId: comment.ideaId,
        },
      },
    });

    return updatedComment;
  });

  await syncIdeaCommentCount(comment.ideaId);

  return result;
};

const restoreCommentByModerator = async (
  commentId: string,
  actorId: string,
  payload: IModerationCommentActionPayload,
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedComment = await tx.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId,
        commentId,
        actionType: "COMMENT_RESTORED",
        note: payload.note,
        metadata: {
          ideaId: comment.ideaId,
        },
      },
    });

    return updatedComment;
  });

  await syncIdeaCommentCount(comment.ideaId);

  return result;
};

const getModerationActions = async () => {
  return prisma.moderationAction.findMany({
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      comment: {
        select: {
          id: true,
          content: true,
          ideaId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSingleModerationAction = async (id: string) => {
  const action = await prisma.moderationAction.findUnique({
    where: { id },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      comment: {
        select: {
          id: true,
          content: true,
          ideaId: true,
        },
      },
    },
  });

  if (!action) {
    throw new AppError(status.NOT_FOUND, "Moderation action not found");
  }

  return action;
};

export const ModerationService = {
  reportIdea,
  reportComment,
  getIdeaReports,
  getSingleIdeaReport,
  reviewIdeaReport,
  getCommentReports,
  getSingleCommentReport,
  reviewCommentReport,
  createIdeaReviewFeedback,
  getIdeaReviewFeedbacks,
  getSingleReviewFeedback,
  reviewIdea,
  deleteCommentByModerator,
  restoreCommentByModerator,
  getModerationActions,
  getSingleModerationAction,
};
