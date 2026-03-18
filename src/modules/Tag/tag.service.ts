import status from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
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

const getAllTags = async () => {
  return prisma.tag.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSingleTag = async (id: string) => {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ideaTags: true,
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
          ideaTags: true,
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
          ideaTags: true,
        },
      },
    },
  });

  if (!existingTag) {
    throw new AppError(status.NOT_FOUND, "Tag not found");
  }

  if (existingTag._count.ideaTags > 0) {
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
