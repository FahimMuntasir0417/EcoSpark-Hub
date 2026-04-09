import status from "http-status";
import { QueryBuilder } from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { TagSearchableFields, TagSortableFields } from "./tag.constant";
import { ICreateTagPayload, IUpdateTagPayload } from "./tag.interface";

const createTag = async (payload: ICreateTagPayload) => {
  const existingByName = await prisma.tag.findUnique({
    where: { name: payload.name },
  });

  if (existingByName) {
    throw new AppError(status.CONFLICT, "Tag name already exists");
  }

  const existingBySlug = await prisma.tag.findUnique({
    where: { slug: payload.slug },
  });

  if (existingBySlug) {
    throw new AppError(status.CONFLICT, "Tag slug already exists");
  }

  return prisma.tag.create({
    data: {
      name: payload.name,
      slug: payload.slug,
    },
  });
};

const getAllTags = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: TagSearchableFields,
    sortableFields: TagSortableFields,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    prisma.tag.count({ where }),
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

const getSingleTag = async (id: string) => {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ideas: true,
        },
      },
    },
  });

  if (!tag) {
    throw new AppError(status.NOT_FOUND, "Tag not found");
  }

  return tag;
};

const getTagBySlug = async (slug: string) => {
  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          ideas: true,
        },
      },
    },
  });

  if (!tag) {
    throw new AppError(status.NOT_FOUND, "Tag not found");
  }

  return tag;
};

const updateTag = async (id: string, payload: IUpdateTagPayload) => {
  const existingTag = await prisma.tag.findUnique({
    where: { id },
  });

  if (!existingTag) {
    throw new AppError(status.NOT_FOUND, "Tag not found");
  }

  if (payload.name && payload.name !== existingTag.name) {
    const existingByName = await prisma.tag.findUnique({
      where: { name: payload.name },
    });

    if (existingByName) {
      throw new AppError(status.CONFLICT, "Tag name already exists");
    }
  }

  if (payload.slug && payload.slug !== existingTag.slug) {
    const existingBySlug = await prisma.tag.findUnique({
      where: { slug: payload.slug },
    });

    if (existingBySlug) {
      throw new AppError(status.CONFLICT, "Tag slug already exists");
    }
  }

  return prisma.tag.update({
    where: { id },
    data: payload,
  });
};

const deleteTag = async (id: string) => {
  const existingTag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ideas: true,
        },
      },
    },
  });

  if (!existingTag) {
    throw new AppError(status.NOT_FOUND, "Tag not found");
  }

  if (existingTag._count.ideas > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete tag because ideas are linked to it",
    );
  }

  await prisma.tag.delete({
    where: { id },
  });

  return null;
};

export const TagService = {
  createTag,
  getAllTags,
  getSingleTag,
  getTagBySlug,
  updateTag,
  deleteTag,
};
