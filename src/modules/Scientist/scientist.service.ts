import status from "http-status";
import { Role } from "../../generated/prisma/enums";

import AppError from "../../errors/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import {
  IAssignScientistSpecialtiesPayload,
  ICreateScientistPayload,
  IUpdateScientistPayload,
} from "./scientist.interface";

const scientistInclude = {
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  scientistSpecialties: {
    where: {
      specialty: {
        is: {
          isDeleted: false,
        },
      },
    },
    select: {
      specialty: {
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
        },
      },
    },
  },
} as const;

const createScientist = async (payload: ICreateScientistPayload) => {
  const specialties: Array<{ id: string }> = [];

  for (const specialtyId of payload.specialties) {
    const specialty = await prisma.specialty.findUnique({
      where: {
        id: specialtyId,
      },
      select: {
        id: true,
        isDeleted: true,
      },
    });

    if (!specialty || specialty.isDeleted) {
      throw new AppError(
        status.NOT_FOUND,
        `Specialty with id ${specialtyId} not found`,
      );
    }

    specialties.push({ id: specialty.id });
  }

  const userExists = await prisma.user.findUnique({
    where: {
      email: payload.scientist.email,
    },
  });

  if (userExists) {
    throw new AppError(status.CONFLICT, "User with this email already exists");
  }

  const scientistExists = await prisma.scientist.findUnique({
    where: {
      email: payload.scientist.email,
    },
  });

  if (scientistExists) {
    throw new AppError(
      status.CONFLICT,
      "Scientist with this email already exists",
    );
  }

  if (payload.scientist.orcid) {
    const orcidExists = await prisma.scientist.findFirst({
      where: {
        orcid: payload.scientist.orcid,
      },
    });

    if (orcidExists) {
      throw new AppError(
        status.CONFLICT,
        "Scientist with this ORCID already exists",
      );
    }
  }

  const userData = await auth.api.signUpEmail({
    body: {
      email: payload.scientist.email,
      password: payload.password,
      role: Role.SCIENTIST,
      name: payload.scientist.name,
      needPasswordChange: true,
    },
  });

  if (!userData?.user) {
    throw new AppError(status.BAD_REQUEST, "Failed to create scientist user");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const scientistData = await tx.scientist.create({
        data: {
          userId: userData.user.id,
          ...payload.scientist,
        },
      });

      const scientistSpecialtyData = specialties.map((specialty) => ({
        scientistId: scientistData.id,
        specialtyId: specialty.id,
      }));

      if (scientistSpecialtyData.length > 0) {
        await tx.scientistSpecialty.createMany({
          data: scientistSpecialtyData,
          skipDuplicates: true,
        });
      }

      const scientist = await tx.scientist.findUnique({
        where: {
          id: scientistData.id,
        },
        include: scientistInclude,
      });

      return scientist;
    });

    return result;
  } catch (error) {
    console.log("Transaction error:", error);

    await prisma.user.deleteMany({
      where: {
        id: userData.user.id,
      },
    });

    throw error;
  }
};

const getAllScientists = async () => {
  const scientists = await prisma.scientist.findMany({
    where: {
      isDeleted: false,
    },
    include: scientistInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return scientists;
};

const getSingleScientist = async (id: string) => {
  const scientist = await prisma.scientist.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: scientistInclude,
  });

  if (!scientist) {
    throw new AppError(status.NOT_FOUND, "Scientist not found");
  }

  return scientist;
};

const getScientistByUserId = async (userId: string) => {
  const scientist = await prisma.scientist.findFirst({
    where: {
      userId,
      isDeleted: false,
    },
    include: scientistInclude,
  });

  if (!scientist) {
    throw new AppError(status.NOT_FOUND, "Scientist not found");
  }

  return scientist;
};

const updateScientist = async (
  id: string,
  payload: IUpdateScientistPayload,
) => {
  const existingScientist = await prisma.scientist.findFirst({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!existingScientist) {
    throw new AppError(status.NOT_FOUND, "Scientist not found");
  }

  if (payload.email && payload.email !== existingScientist.email) {
    const scientistByEmail = await prisma.scientist.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (scientistByEmail) {
      throw new AppError(
        status.CONFLICT,
        "Scientist with this email already exists",
      );
    }
  }

  if (payload.orcid && payload.orcid !== existingScientist.orcid) {
    const scientistByOrcid = await prisma.scientist.findFirst({
      where: {
        orcid: payload.orcid,
        NOT: {
          id,
        },
      },
    });

    if (scientistByOrcid) {
      throw new AppError(status.CONFLICT, "ORCID already exists");
    }
  }

  const updatedScientist = await prisma.scientist.update({
    where: {
      id,
    },
    data: {
      ...payload,
      verifiedAt: payload.verifiedById ? new Date() : undefined,
    },
    include: scientistInclude,
  });

  return updatedScientist;
};

const assignScientistSpecialties = async (
  scientistId: string,
  payload: IAssignScientistSpecialtiesPayload,
) => {
  const scientist = await prisma.scientist.findFirst({
    where: {
      id: scientistId,
      isDeleted: false,
    },
  });

  if (!scientist) {
    throw new AppError(status.NOT_FOUND, "Scientist not found");
  }

  const specialties = await prisma.specialty.findMany({
    where: {
      id: {
        in: payload.specialtyIds,
      },
      isDeleted: false,
    },
    select: {
      id: true,
    },
  });

  if (specialties.length !== payload.specialtyIds.length) {
    throw new AppError(
      status.BAD_REQUEST,
      "One or more specialties are invalid or deleted",
    );
  }

  await prisma.scientistSpecialty.createMany({
    data: payload.specialtyIds.map((specialtyId) => ({
      scientistId,
      specialtyId,
    })),
    skipDuplicates: true,
  });

  const updatedScientist = await prisma.scientist.findUnique({
    where: {
      id: scientistId,
    },
    include: scientistInclude,
  });

  return updatedScientist;
};

const removeScientistSpecialty = async (
  scientistId: string,
  specialtyId: string,
) => {
  const relation = await prisma.scientistSpecialty.findUnique({
    where: {
      scientistId_specialtyId: {
        scientistId,
        specialtyId,
      },
    },
  });

  if (!relation) {
    throw new AppError(
      status.NOT_FOUND,
      "Specialty is not assigned to this scientist",
    );
  }

  await prisma.scientistSpecialty.delete({
    where: {
      scientistId_specialtyId: {
        scientistId,
        specialtyId,
      },
    },
  });

  const updatedScientist = await prisma.scientist.findUnique({
    where: {
      id: scientistId,
    },
    include: scientistInclude,
  });

  return updatedScientist;
};

const deleteScientist = async (id: string) => {
  const scientist = await prisma.scientist.findFirst({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!scientist) {
    throw new AppError(status.NOT_FOUND, "Scientist not found");
  }

  const deletedScientist = await prisma.scientist.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
    include: scientistInclude,
  });

  return deletedScientist;
};

export const ScientistService = {
  createScientist,
  getAllScientists,
  getSingleScientist,
  getScientistByUserId,
  updateScientist,
  assignScientistSpecialties,
  removeScientistSpecialty,
  deleteScientist,
};
