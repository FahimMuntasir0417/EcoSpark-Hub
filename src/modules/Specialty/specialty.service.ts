import status from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../errors/AppError";
import {
  ICreateSpecialtyPayload,
  IUpdateSpecialtyPayload,
} from "./specialty.interface";

const createSpecialty = async (payload: ICreateSpecialtyPayload) => {
  const existingSpecialty = await prisma.specialty.findFirst({
    where: {
      title: payload.title,
    },
  });

  if (existingSpecialty) {
    throw new AppError(status.CONFLICT, "Specialty already exists");
  }

  const specialty = await prisma.specialty.create({
    data: {
      title: payload.title,
      description: payload.description,
      icon: payload.icon,
    },
  });

  return specialty;
};

const getAllSpecialties = async () => {
  const specialties = await prisma.specialty.findMany({
    where: {
      isDeleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return specialties;
};

const getSingleSpecialty = async (id: string) => {
  const specialty = await prisma.specialty.findFirst({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!specialty) {
    throw new AppError(status.NOT_FOUND, "Specialty not found");
  }

  return specialty;
};

const updateSpecialty = async (
  id: string,
  payload: IUpdateSpecialtyPayload,
) => {
  const existingSpecialty = await prisma.specialty.findFirst({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!existingSpecialty) {
    throw new AppError(status.NOT_FOUND, "Specialty not found");
  }

  if (payload.title && payload.title !== existingSpecialty.title) {
    const titleExists = await prisma.specialty.findFirst({
      where: {
        title: payload.title,
        NOT: {
          id,
        },
      },
    });

    if (titleExists) {
      throw new AppError(status.CONFLICT, "Specialty title already exists");
    }
  }

  const updatedSpecialty = await prisma.specialty.update({
    where: {
      id,
    },
    data: {
      title: payload.title,
      description: payload.description,
      icon: payload.icon,
    },
  });

  return updatedSpecialty;
};

const deleteSpecialty = async (id: string) => {
  const existingSpecialty = await prisma.specialty.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      scientistSpecialties: true,
    },
  });

  if (!existingSpecialty) {
    throw new AppError(status.NOT_FOUND, "Specialty not found");
  }

  const deletedSpecialty = await prisma.specialty.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return deletedSpecialty;
};

export const SpecialtyService = {
  createSpecialty,
  getAllSpecialties,
  getSingleSpecialty,
  updateSpecialty,
  deleteSpecialty,
};
