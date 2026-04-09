import status from "http-status";
import { QueryBuilder } from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  ICommentPayload,
  IUpdateCommentPayload,
  IVotePayload,
} from "./interaction.interface";

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

  if (!comment || comment.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  return comment;
};

const syncIdeaCounters = async (ideaId: string) => {
  const [upvotes, downvotes, comments, bookmarks] = await Promise.all([
    prisma.vote.count({
      where: {
        ideaId,
        type: "UP",
      },
    }),
    prisma.vote.count({
      where: {
        ideaId,
        type: "DOWN",
      },
    }),
    prisma.comment.count({
      where: {
        ideaId,
        isDeleted: false,
      },
    }),
    prisma.ideaBookmark.count({
      where: {
        ideaId,
      },
    }),
  ]);

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      totalUpvotes: upvotes,
      totalDownvotes: downvotes,
      totalComments: comments,
      totalBookmarks: bookmarks,
      lastActivityAt: new Date(),
    },
  });
};

const voteIdea = async (
  ideaId: string,
  userId: string,
  payload: IVotePayload,
) => {
  await ensureIdeaExists(ideaId);

  const existingVote = await prisma.vote.findUnique({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
  });

  if (existingVote) {
    throw new AppError(
      status.CONFLICT,
      "Vote already exists. Use update vote instead.",
    );
  }

  const vote = await prisma.vote.create({
    data: {
      ideaId,
      userId,
      type: payload.type,
    },
  });

  await syncIdeaCounters(ideaId);

  return vote;
};

const updateVote = async (
  ideaId: string,
  userId: string,
  payload: IVotePayload,
) => {
  await ensureIdeaExists(ideaId);

  const existingVote = await prisma.vote.findUnique({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
  });

  if (!existingVote) {
    throw new AppError(status.NOT_FOUND, "Vote not found");
  }

  const updatedVote = await prisma.vote.update({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
    data: {
      type: payload.type,
    },
  });

  await syncIdeaCounters(ideaId);

  return updatedVote;
};

const removeVote = async (ideaId: string, userId: string) => {
  await ensureIdeaExists(ideaId);

  const existingVote = await prisma.vote.findUnique({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
  });

  if (!existingVote) {
    throw new AppError(status.NOT_FOUND, "Vote not found");
  }

  await prisma.vote.delete({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
  });

  await syncIdeaCounters(ideaId);

  return {
    success: true,
  };
};

const createComment = async (
  ideaId: string,
  authorId: string,
  payload: ICommentPayload,
) => {
  await ensureIdeaExists(ideaId);

  const comment = await prisma.comment.create({
    data: {
      ideaId,
      authorId,
      content: payload.content,
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

  await syncIdeaCounters(ideaId);

  return comment;
};

const getIdeaComments = async (ideaId: string, query: Record<string, unknown>) => {
  await ensureIdeaExists(ideaId);

  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["content"],
    filterableFields: ["authorId", "isEdited"],
    sortableFields: ["createdAt", "updatedAt"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    baseWhere: {
      ideaId,
      parentId: null,
      isDeleted: false,
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      skip,
      take,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        replies: {
          where: {
            isDeleted: false,
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
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy,
    }),
    prisma.comment.count({ where }),
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

const updateComment = async (
  commentId: string,
  userId: string,
  payload: IUpdateCommentPayload,
) => {
  const comment = await ensureCommentExists(commentId);

  if (comment.authorId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only update your own comment",
    );
  }

  const updatedComment = await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      content: payload.content,
      isEdited: true,
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

  return updatedComment;
};

const deleteComment = async (commentId: string, userId: string) => {
  const comment = await ensureCommentExists(commentId);

  if (comment.authorId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own comment",
    );
  }

  const deletedComment = await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  await syncIdeaCounters(comment.ideaId);

  return deletedComment;
};

const replyToComment = async (
  commentId: string,
  authorId: string,
  payload: ICommentPayload,
) => {
  const parentComment = await ensureCommentExists(commentId);

  const reply = await prisma.comment.create({
    data: {
      ideaId: parentComment.ideaId,
      authorId,
      parentId: parentComment.id,
      content: payload.content,
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
      parent: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  });

  await syncIdeaCounters(parentComment.ideaId);

  return reply;
};

const getCommentReplies = async (
  commentId: string,
  query: Record<string, unknown>,
) => {
  await ensureCommentExists(commentId);

  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["content"],
    filterableFields: ["authorId", "isEdited"],
    sortableFields: ["createdAt", "updatedAt"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "asc",
    baseWhere: {
      parentId: commentId,
      isDeleted: false,
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      skip,
      take,
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
      orderBy,
    }),
    prisma.comment.count({ where }),
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

const bookmarkIdea = async (ideaId: string, userId: string) => {
  await ensureIdeaExists(ideaId);

  const existingBookmark = await prisma.ideaBookmark.findUnique({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
  });

  if (existingBookmark) {
    throw new AppError(status.CONFLICT, "Idea already bookmarked");
  }

  const bookmark = await prisma.ideaBookmark.create({
    data: {
      ideaId,
      userId,
    },
  });

  await syncIdeaCounters(ideaId);

  return bookmark;
};

const removeBookmark = async (ideaId: string, userId: string) => {
  await ensureIdeaExists(ideaId);

  const existingBookmark = await prisma.ideaBookmark.findUnique({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
  });

  if (!existingBookmark) {
    throw new AppError(status.NOT_FOUND, "Bookmark not found");
  }

  await prisma.ideaBookmark.delete({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
  });

  await syncIdeaCounters(ideaId);

  return {
    success: true,
  };
};

const getMyBookmarks = async (userId: string, query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    filterableFields: ["ideaId"],
    sortableFields: ["createdAt"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    baseWhere: {
      userId,
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.ideaBookmark.findMany({
      where,
      skip,
      take,
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
      },
      orderBy,
    }),
    prisma.ideaBookmark.count({ where }),
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

export const InteractionService = {
  voteIdea,
  updateVote,
  removeVote,
  createComment,
  getIdeaComments,
  updateComment,
  deleteComment,
  replyToComment,
  getCommentReplies,
  bookmarkIdea,
  removeBookmark,
  getMyBookmarks,
};
