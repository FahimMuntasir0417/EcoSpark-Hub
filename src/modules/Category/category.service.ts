import status from "http-status";
import { QueryBuilder } from "../../builder/queryBuilder";
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

const getAllCategories = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["name", "slug", "description", "seoTitle"],
    filterableFields: ["isActive", "color"],
    sortableFields: ["sortOrder", "createdAt", "updatedAt", "name"],
    defaultSortBy: "sortOrder",
    defaultSortOrder: "asc",
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    prisma.category.count({ where }),
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
