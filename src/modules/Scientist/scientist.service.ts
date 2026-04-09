import status from "http-status";

import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { Role, UserStatus } from "../../generated/prisma/enums";
import {
  IAssignScientistSpecialtiesPayload,
  ICreateScientistPayload,
  IUpdateScientistPayload,
  IVerifyScientistPayload,
} from "./scientist.interface";
import { QueryBuilder } from "../../builder/queryBuilder";

const scientistSelect = {
  id: true,
  userId: true,
  profilePhoto: true,
  contactNumber: true,
  address: true,
  isDeleted: true,
  deletedAt: true,
  institution: true,
  department: true,
  specialization: true,
  researchInterests: true,
  yearsOfExperience: true,
  qualification: true,
  linkedinUrl: true,
  googleScholarUrl: true,
  orcid: true,
  verifiedAt: true,
  verifiedById: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      image: true,
      isDeleted: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  verifiedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  scientistSpecialties: {
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

const ensureScientistExists = async (id: string) => {
  const scientist = await prisma.scientist.findUnique({
    where: { id },
  });

  if (!scientist || scientist.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Scientist not found");
  }

  return scientist;
};

const ensureSpecialtiesExist = async (specialtyIds: string[]) => {
  if (!specialtyIds.length) return [];

  const specialties = await prisma.specialty.findMany({
    where: {
      id: { in: specialtyIds },
      isDeleted: false,
    },
  });

  if (specialties.length !== specialtyIds.length) {
    throw new AppError(status.NOT_FOUND, "One or more specialties not found");
  }

  return specialties;
};

const createScientist = async (payload: ICreateScientistPayload) => {
  const { userId, scientist, specialtyIds = [] } = payload;

  await ensureSpecialtiesExist(specialtyIds);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      member: true,
      scientist: true,
    },
  });

  if (!user || user.isDeleted) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only active users can become scientists",
    );
  }

  if (user.role !== Role.MEMBER) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only members can be promoted to scientist",
    );
  }

  if (scientist.orcid) {
    const existingOrcid = await prisma.scientist.findFirst({
      where: {
        orcid: scientist.orcid,
        NOT: {
          userId,
        },
      },
    });

    if (existingOrcid) {
      throw new AppError(
        status.CONFLICT,
        "Scientist with this ORCID already exists",
      );
    }
  }

  const existingScientist = await prisma.scientist.findUnique({
    where: { userId },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (!user.member) {
      await tx.member.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    }

    let scientistData;

    if (existingScientist) {
      if (!existingScientist.isDeleted) {
        throw new AppError(
          status.CONFLICT,
          "This member is already a scientist",
        );
      }

      scientistData = await tx.scientist.update({
        where: { userId },
        data: {
          profilePhoto: scientist.profilePhoto,
          contactNumber: scientist.contactNumber,
          address: scientist.address,
          institution: scientist.institution,
          department: scientist.department,
          specialization: scientist.specialization,
          researchInterests: scientist.researchInterests,
          yearsOfExperience: scientist.yearsOfExperience,
          qualification: scientist.qualification,
          linkedinUrl: scientist.linkedinUrl,
          googleScholarUrl: scientist.googleScholarUrl,
          orcid: scientist.orcid,
          isDeleted: false,
          deletedAt: null,
          verifiedAt: null,
          verifiedById: null,
        },
      });

      await tx.scientistSpecialty.deleteMany({
        where: {
          scientistId: scientistData.id,
        },
      });
    } else {
      scientistData = await tx.scientist.create({
        data: {
          userId,
          profilePhoto: scientist.profilePhoto,
          contactNumber: scientist.contactNumber,
          address: scientist.address,
          institution: scientist.institution,
          department: scientist.department,
          specialization: scientist.specialization,
          researchInterests: scientist.researchInterests,
          yearsOfExperience: scientist.yearsOfExperience,
          qualification: scientist.qualification,
          linkedinUrl: scientist.linkedinUrl,
          googleScholarUrl: scientist.googleScholarUrl,
          orcid: scientist.orcid,
        },
      });
    }

    if (specialtyIds.length) {
      await tx.scientistSpecialty.createMany({
        data: specialtyIds.map((specialtyId) => ({
          scientistId: scientistData.id,
          specialtyId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        role: Role.SCIENTIST,
      },
    });

    return tx.scientist.findUnique({
      where: {
        id: scientistData.id,
      },
      select: scientistSelect,
    });
  });

  return result;
};

/*
const getAllScientists = async () => {
  return prisma.scientist.findMany({
    where: {
      isDeleted: false,
      user: {
        isDeleted: false,
      },
    },
    select: scientistSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
};
*/

const getAllScientists = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: [
      "user.name",
      "user.email",
      "institution",
      "department",
      "specialization",
      "researchInterests",
      "qualification",
    ],
    filterableFields: [
      "verifiedById",
      "institution",
      "department",
      "specialization",
    ],
    sortableFields: [
      "createdAt",
      "updatedAt",
      "yearsOfExperience",
      "verifiedAt",
    ],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    baseWhere: {
      isDeleted: false,
      user: {
        isDeleted: false,
      },
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.scientist.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        userId: true,
        institution: true,
        department: true,
        specialization: true,
        researchInterests: true,
        yearsOfExperience: true,
        qualification: true,
        verifiedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        scientistSpecialties: {
          select: {
            specialty: true,
          },
        },
      },
    }),
    prisma.scientist.count({ where }),
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

const getSingleScientist = async (id: string) => {
  const scientist = await prisma.scientist.findFirst({
    where: {
      id,
      isDeleted: false,
      user: {
        isDeleted: false,
      },
    },
    select: scientistSelect,
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
      user: {
        isDeleted: false,
      },
    },
    select: scientistSelect,
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
  const existingScientist = await ensureScientistExists(id);

  if (payload.orcid && payload.orcid !== existingScientist.orcid) {
    const existingOrcid = await prisma.scientist.findFirst({
      where: {
        orcid: payload.orcid,
        NOT: {
          id,
        },
      },
    });

    if (existingOrcid) {
      throw new AppError(
        status.CONFLICT,
        "Scientist with this ORCID already exists",
      );
    }
  }

  return prisma.scientist.update({
    where: { id },
    data: payload,
    select: scientistSelect,
  });
};

const assignScientistSpecialties = async (
  id: string,
  payload: IAssignScientistSpecialtiesPayload,
) => {
  await ensureScientistExists(id);
  await ensureSpecialtiesExist(payload.specialtyIds);

  return prisma.$transaction(async (tx) => {
    await tx.scientistSpecialty.deleteMany({
      where: {
        scientistId: id,
      },
    });

    await tx.scientistSpecialty.createMany({
      data: payload.specialtyIds.map((specialtyId) => ({
        scientistId: id,
        specialtyId,
      })),
      skipDuplicates: true,
    });

    return tx.scientist.findUnique({
      where: { id },
      select: scientistSelect,
    });
  });
};

const removeScientistSpecialty = async (id: string, specialtyId: string) => {
  await ensureScientistExists(id);

  const existingRelation = await prisma.scientistSpecialty.findUnique({
    where: {
      scientistId_specialtyId: {
        scientistId: id,
        specialtyId,
      },
    },
  });

  if (!existingRelation) {
    throw new AppError(
      status.NOT_FOUND,
      "Scientist specialty relation not found",
    );
  }

  await prisma.scientistSpecialty.delete({
    where: {
      scientistId_specialtyId: {
        scientistId: id,
        specialtyId,
      },
    },
  });

  return null;
};

const verifyScientist = async (
  id: string,
  actorId: string,
  payload: IVerifyScientistPayload,
) => {
  await ensureScientistExists(id);

  return prisma.scientist.update({
    where: { id },
    data: {
      verifiedAt: payload.verified ? new Date() : null,
      verifiedById: payload.verified ? actorId : null,
    },
    select: scientistSelect,
  });
};

const deleteScientist = async (id: string) => {
  const existingScientist = await ensureScientistExists(id);

  return prisma.$transaction(async (tx) => {
    await tx.scientist.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        verifiedAt: null,
        verifiedById: null,
      },
    });

    await tx.scientistSpecialty.deleteMany({
      where: {
        scientistId: id,
      },
    });

    await tx.user.update({
      where: {
        id: existingScientist.userId,
      },
      data: {
        role: Role.MEMBER,
      },
    });

    return null;
  });
};

export const ScientistService = {
  createScientist,
  getAllScientists,
  getSingleScientist,
  getScientistByUserId,
  updateScientist,
  assignScientistSpecialties,
  removeScientistSpecialty,
  verifyScientist,
  deleteScientist,
};
