import status from "http-status";
import { QueryBuilder } from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { InteractionService } from "../Interaction/interaction.service";
import {
  ICreateMyCommentPayload,
  ICreateMyVotePayload,
  IUpdateMyCommentPayload,
  IUpdateMyVotePayload,
} from "./user.interface";

const voteInclude = {
  idea: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      visibility: true,
      accessType: true,
      coverImageUrl: true,
      totalUpvotes: true,
      totalDownvotes: true,
      totalComments: true,
      totalBookmarks: true,
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
      campaign: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  },
} as const;

const commentInclude = {
  idea: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      coverImageUrl: true,
    },
  },
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

const ensureVoteExists = async (voteId: string) => {
  const vote = await prisma.vote.findUnique({
    where: { id: voteId },
  });

  if (!vote) {
    throw new AppError(status.NOT_FOUND, "Vote not found");
  }

  return vote;
};

const getMyVotes = async (userId: string, query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    filterableFields: ["ideaId", "type"],
    sortableFields: ["createdAt", "updatedAt"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    baseWhere: {
      userId,
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.vote.findMany({
      where,
      skip,
      take,
      include: voteInclude,
      orderBy,
    }),
    prisma.vote.count({ where }),
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

const createMyVote = async (userId: string, payload: ICreateMyVotePayload) => {
  return InteractionService.voteIdea(payload.ideaId, userId, {
    type: payload.type,
  });
};

const updateMyVote = async (
  voteId: string,
  userId: string,
  payload: IUpdateMyVotePayload,
) => {
  const vote = await ensureVoteExists(voteId);

  if (vote.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only update your own vote");
  }

  return InteractionService.updateVote(vote.ideaId, userId, {
    type: payload.type,
  });
};

const deleteMyVote = async (voteId: string, userId: string) => {
  const vote = await ensureVoteExists(voteId);

  if (vote.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own vote");
  }

  return InteractionService.removeVote(vote.ideaId, userId);
};

const getMyComments = async (userId: string, query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["content"],
    filterableFields: ["ideaId", "parentId", "isEdited"],
    sortableFields: ["createdAt", "updatedAt"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    baseWhere: {
      authorId: userId,
      isDeleted: false,
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      skip,
      take,
      include: commentInclude,
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

const createMyComment = async (
  userId: string,
  payload: ICreateMyCommentPayload,
) => {
  if (payload.parentId) {
    return InteractionService.replyToComment(payload.parentId, userId, {
      content: payload.content,
    });
  }

  if (!payload.ideaId) {
    throw new AppError(status.BAD_REQUEST, "ideaId is required");
  }

  return InteractionService.createComment(payload.ideaId, userId, {
    content: payload.content,
  });
};

const updateMyComment = async (
  commentId: string,
  userId: string,
  payload: IUpdateMyCommentPayload,
) => {
  return InteractionService.updateComment(commentId, userId, {
    content: payload.content,
  });
};

const deleteMyComment = async (commentId: string, userId: string) => {
  return InteractionService.deleteComment(commentId, userId);
};

export const UserService = {
  getMyVotes,
  createMyVote,
  updateMyVote,
  deleteMyVote,
  getMyComments,
  createMyComment,
  updateMyComment,
  deleteMyComment,
};
