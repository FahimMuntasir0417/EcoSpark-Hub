import status from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  ICreateCategoryPayload,
  IUpdateCategoryPayload,
} from "./category.interface";

const createCategory = async (payload: ICreateCategoryPayload) => {
  const existingByName = await prisma.category.findUnique({
    where: { name: payload.name },
  });

  if (existingByName) {
    throw new AppError(status.CONFLICT, "Category name already exists");
  }

  const existingBySlug = await prisma.category.findUnique({
    where: { slug: payload.slug },
  });

  if (existingBySlug) {
    throw new AppError(status.CONFLICT, "Category slug already exists");
  }

  return prisma.category.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      icon: payload.icon,
      color: payload.color,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
    },
  });
};

const getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
};

const getSingleCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ideas: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  return category;
};

const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          ideas: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  return category;
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
  const existingCategory = await prisma.category.findUnique({
    where: { id },
  });

  if (!existingCategory) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  if (payload.name && payload.name !== existingCategory.name) {
    const existingByName = await prisma.category.findUnique({
      where: { name: payload.name },
    });

    if (existingByName) {
      throw new AppError(status.CONFLICT, "Category name already exists");
    }
  }

  if (payload.slug && payload.slug !== existingCategory.slug) {
    const existingBySlug = await prisma.category.findUnique({
      where: { slug: payload.slug },
    });

    if (existingBySlug) {
      throw new AppError(status.CONFLICT, "Category slug already exists");
    }
  }

  return prisma.category.update({
    where: { id },
    data: payload,
  });
};

const deleteCategory = async (id: string) => {
  const existingCategory = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ideas: true,
        },
      },
    },
  });

  if (!existingCategory) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  if (existingCategory._count.ideas > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete category because ideas are linked to it",
    );
  }

  await prisma.category.delete({
    where: { id },
  });

  return null;
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
};
