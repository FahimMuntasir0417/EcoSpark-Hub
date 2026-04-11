import status from "http-status";
import { JwtPayload } from "jsonwebtoken";

import { getAuth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { tokenUtils } from "../../utils/token";
import { QueryBuilder } from "../../builder/queryBuilder";
import {
  IChangePasswordPayload,
  ILoginUserPayload,
  IRegisterMemberPayload,
  IUpdateMyProfilePayload,
} from "./auth.interface";

import AppError from "../../errors/AppError";
import { envVars } from "../../config";
import { Role, UserStatus } from "../../generated/prisma/enums";

const userProfileSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  role: true,
  status: true,
  needPasswordChange: true,
  isDeleted: true,
  deletedAt: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  admin: {
    select: {
      id: true,
      profileImage: true,
      contactNumber: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  member: {
    select: {
      id: true,
      profilePhoto: true,
      contactNumber: true,
      address: true,
      occupation: true,
      interests: true,
      experienceLevel: true,
      preferredCategories: true,
      membershipLevel: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  scientist: {
    select: {
      id: true,
      profilePhoto: true,
      contactNumber: true,
      address: true,
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
      isDeleted: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

const omitUndefined = <T extends Record<string, unknown>>(obj: T) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
};

const getRequiredTrimmedString = (value: unknown, fieldName: string) => {
  if (typeof value !== "string") {
    throw new AppError(status.BAD_REQUEST, `${fieldName} is required`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new AppError(status.BAD_REQUEST, `${fieldName} is required`);
  }

  return normalizedValue;
};

const getRequiredString = (value: unknown, fieldName: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(status.BAD_REQUEST, `${fieldName} is required`);
  }

  return value;
};

const getRequiredNormalizedEmail = (value: unknown) => {
  return getRequiredTrimmedString(value, "Email").toLowerCase();
};

const parseRole = (role: string): Role => {
  switch (role) {
    case Role.SUPER_ADMIN:
      return Role.SUPER_ADMIN;
    case Role.ADMIN:
      return Role.ADMIN;
    case Role.MODERATOR:
      return Role.MODERATOR;
    case Role.SCIENTIST:
      return Role.SCIENTIST;
    case Role.MEMBER:
      return Role.MEMBER;
    default:
      throw new AppError(status.BAD_REQUEST, `Invalid role: ${role}`);
  }
};

const parseUserStatus = (userStatus: string): UserStatus => {
  switch (userStatus) {
    case UserStatus.ACTIVE:
      return UserStatus.ACTIVE;
    case UserStatus.BLOCKED:
      return UserStatus.BLOCKED;
    case UserStatus.DELETED:
      return UserStatus.DELETED;
    case UserStatus.SUSPENDED:
      return UserStatus.SUSPENDED;
    default:
      throw new AppError(
        status.BAD_REQUEST,
        `Invalid user status: ${userStatus}`,
      );
  }
};

const buildTokenPayload = (user: {
  id: string;
  role: Role;
  name: string;
  email: string;
  status: UserStatus;
  emailVerified: boolean;
  deletedAt?: Date | null;
}) => {
  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    status: user.status,
    emailVerified: user.emailVerified,
    deletedAt: user.deletedAt ?? null,
  };
};

const registerMember = async (payload: IRegisterMemberPayload) => {
  const auth = await getAuth();
  const { name, email, password } = payload;
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser && existingUser.status !== UserStatus.DELETED) {
    throw new AppError(status.CONFLICT, "Email already registered");
  }

  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!data?.user) {
    throw new AppError(status.BAD_REQUEST, "Failed to register member");
  }

  try {
    const memberProfile = await prisma.$transaction(async (tx) => {
      return tx.member.create({
        data: {
          userId: data.user.id,
        },
      });
    });

    const accessToken = tokenUtils.getAccessToken(
      buildTokenPayload({
        id: data.user.id,
        role: parseRole(data.user.role),
        name: data.user.name,
        email: data.user.email,
        status: parseUserStatus(data.user.status),
        emailVerified: data.user.emailVerified,
        deletedAt: data.user.deletedAt ?? null,
      }),
    );

    const refreshToken = tokenUtils.getRefreshToken(
      buildTokenPayload({
        id: data.user.id,
        role: parseRole(data.user.role),
        name: data.user.name,
        email: data.user.email,
        status: parseUserStatus(data.user.status),
        emailVerified: data.user.emailVerified,
        deletedAt: data.user.deletedAt ?? null,
      }),
    );

    return {
      ...data,
      accessToken,
      refreshToken,
      memberProfile,
    };
  } catch (error) {
    console.error("registerMember failed:", error);

    const existingUser = await prisma.user.findUnique({
      where: {
        id: data.user.id,
      },
    });

    if (existingUser) {
      await prisma.user.delete({
        where: {
          id: data.user.id,
        },
      });
    }

    throw error;
  }
};

const loginUser = async (payload: ILoginUserPayload) => {
  const auth = await getAuth();
  const { email, password } = payload;

  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });

  if (!data?.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  if (data.user.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  if (data.user.status === UserStatus.SUSPENDED) {
    throw new AppError(status.FORBIDDEN, "User is suspended");
  }

  if (data.user.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "User is deleted");
  }

  if (data.user.deletedAt) {
    throw new AppError(status.NOT_FOUND, "User is deleted");
  }

  const accessToken = tokenUtils.getAccessToken(
    buildTokenPayload({
      id: data.user.id,
      role: parseRole(data.user.role),
      name: data.user.name,
      email: data.user.email,
      status: parseUserStatus(data.user.status),
      emailVerified: data.user.emailVerified,
      deletedAt: data.user.deletedAt ?? null,
    }),
  );

  const refreshToken = tokenUtils.getRefreshToken(
    buildTokenPayload({
      id: data.user.id,
      role: parseRole(data.user.role),
      name: data.user.name,
      email: data.user.email,
      status: parseUserStatus(data.user.status),
      emailVerified: data.user.emailVerified,
      deletedAt: data.user.deletedAt ?? null,
    }),
  );

  return {
    ...data,
    accessToken,
    refreshToken,
  };
};

const getNewToken = async (refreshToken: string, sessionToken: string) => {
  const session = await prisma.session.findUnique({
    where: {
      token: sessionToken,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }

  if (session.expiresAt < new Date()) {
    throw new AppError(status.UNAUTHORIZED, "Session expired");
  }

  const verifiedRefreshToken = jwtUtils.verifyToken(
    refreshToken,
    envVars.REFRESH_TOKEN_SECRET,
  );

  if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
  }

  const decoded = verifiedRefreshToken.data as JwtPayload;

  if (session.user.id !== decoded.userId) {
    throw new AppError(status.UNAUTHORIZED, "Token and session do not match");
  }

  if (session.user.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  if (session.user.status === UserStatus.SUSPENDED) {
    throw new AppError(status.FORBIDDEN, "User is suspended");
  }

  if (session.user.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "User is deleted");
  }

  if (session.user.deletedAt) {
    throw new AppError(status.NOT_FOUND, "User is deleted");
  }

  const tokenPayload = buildTokenPayload({
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
    deletedAt: session.user.deletedAt,
  });

  const newAccessToken = tokenUtils.getAccessToken(tokenPayload);
  const newRefreshToken = tokenUtils.getRefreshToken(tokenPayload);

  const updatedSession = await prisma.session.update({
    where: {
      token: sessionToken,
    },
    data: {
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionToken: updatedSession.token,
  };
};

const changePassword = async (
  payload: IChangePasswordPayload,
  sessionToken: string,
) => {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  if (!session?.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }

  const { currentPassword, newPassword } = payload;

  const result = await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  const accessToken = tokenUtils.getAccessToken(
    buildTokenPayload({
      id: session.user.id,
      role: parseRole(session.user.role),
      name: session.user.name,
      email: session.user.email,
      status: parseUserStatus(session.user.status),
      emailVerified: session.user.emailVerified,
      deletedAt: session.user.deletedAt ?? null,
    }),
  );

  const refreshToken = tokenUtils.getRefreshToken(
    buildTokenPayload({
      id: session.user.id,
      role: parseRole(session.user.role),
      name: session.user.name,
      email: session.user.email,
      status: parseUserStatus(session.user.status),
      emailVerified: session.user.emailVerified,
      deletedAt: session.user.deletedAt ?? null,
    }),
  );

  return {
    ...result,
    accessToken,
    refreshToken,
    sessionToken,
  };
};

const logoutUser = async (sessionToken: string) => {
  const auth = await getAuth();
  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  return result;
};

const verifyEmail = async (email: string, otp: string) => {
  const auth = await getAuth();
  const normalizedEmail = getRequiredNormalizedEmail(email);
  const normalizedOtp = getRequiredTrimmedString(otp, "OTP");

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!existingUser) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (existingUser.emailVerified) {
    return {
      status: true,
      alreadyVerified: true,
    };
  }

  const result = await auth.api.verifyEmailOTP({
    body: {
      email: normalizedEmail,
      otp: normalizedOtp,
    },
  });

  return {
    ...result,
    alreadyVerified: false,
  };
};

const forgetPassword = async (email: string) => {
  const auth = await getAuth();
  const normalizedEmail = getRequiredNormalizedEmail(email);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!existingUser) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!existingUser.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verified");
  }

  if (existingUser.deletedAt) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (existingUser.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  if (existingUser.status === UserStatus.SUSPENDED) {
    throw new AppError(status.FORBIDDEN, "User is suspended");
  }

  if (existingUser.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "User is deleted");
  }

  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email: normalizedEmail,
    },
  });
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const auth = await getAuth();
  const normalizedEmail = getRequiredNormalizedEmail(email);
  const normalizedOtp = getRequiredTrimmedString(otp, "OTP");
  const normalizedNewPassword = getRequiredString(newPassword, "New password");

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!existingUser) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!existingUser.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verified");
  }

  if (existingUser.deletedAt) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (existingUser.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  if (existingUser.status === UserStatus.SUSPENDED) {
    throw new AppError(status.FORBIDDEN, "User is suspended");
  }

  if (existingUser.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "User is deleted");
  }

  await auth.api.resetPasswordEmailOTP({
    body: {
      email: normalizedEmail,
      otp: normalizedOtp,
      password: normalizedNewPassword,
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: existingUser.id,
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const googleLoginSuccess = async (session: Record<string, any>) => {
  if (session.user.role === Role.MEMBER) {
    await prisma.member.upsert({
      where: {
        userId: session.user.id,
      },
      create: {
        userId: session.user.id,
      },
      update: {},
    });
  }

  const tokenPayload = {
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
    deletedAt: session.user.deletedAt ?? null,
  };

  const accessToken = tokenUtils.getAccessToken(tokenPayload);
  const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
  };
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["name", "email"],
    filterableFields: [
      "role",
      "status",
      "emailVerified",
      "needPasswordChange",
      "isDeleted",
    ],
    sortableFields: ["createdAt", "updatedAt", "name", "email"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      select: userProfileSelect,
    }),
    prisma.user.count({ where }),
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

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: userProfileSelect,
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

const updateMyProfile = async (
  userId: string,
  payload: IUpdateMyProfilePayload,
) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      admin: {
        select: {
          id: true,
        },
      },
      member: {
        select: {
          id: true,
        },
      },
      scientist: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existingUser) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const userData = omitUndefined({
    name: payload.name,
    image: payload.image,
  });

  const adminData = omitUndefined({
    profileImage: payload.image,
    contactNumber: payload.contactNumber,
  });

  const memberData = omitUndefined({
    profilePhoto: payload.image,
    contactNumber: payload.contactNumber,
    address: payload.address,
  });

  const scientistData = omitUndefined({
    profilePhoto: payload.image,
    contactNumber: payload.contactNumber,
    address: payload.address,
  });

  let roleSpecificData: Record<string, unknown> = {};

  if (existingUser.role === Role.ADMIN || existingUser.role === Role.SUPER_ADMIN) {
    roleSpecificData = adminData;
  } else if (existingUser.role === Role.MEMBER) {
    roleSpecificData = memberData;
  } else if (existingUser.role === Role.SCIENTIST) {
    roleSpecificData = scientistData;
  }

  if (Object.keys(userData).length === 0 && Object.keys(roleSpecificData).length === 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "No valid profile fields provided for update",
    );
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length > 0) {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: userData,
      });
    }

    if (existingUser.role === Role.ADMIN || existingUser.role === Role.SUPER_ADMIN) {
      if (Object.keys(adminData).length > 0) {
        if (!existingUser.admin) {
          throw new AppError(status.NOT_FOUND, "Admin profile not found");
        }

        await tx.admin.update({
          where: {
            userId,
          },
          data: adminData,
        });
      }
    } else if (existingUser.role === Role.MEMBER) {
      if (Object.keys(memberData).length > 0) {
        await tx.member.upsert({
          where: {
            userId,
          },
          create: {
            userId,
            ...memberData,
          },
          update: memberData,
        });
      }
    } else if (existingUser.role === Role.SCIENTIST) {
      if (Object.keys(scientistData).length > 0) {
        await tx.scientist.upsert({
          where: {
            userId,
          },
          create: {
            userId,
            ...scientistData,
          },
          update: scientistData,
        });
      }
    }
  });

  return getMyProfile(userId);
};

export const AuthService = {
  registerMember,
  loginUser,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLoginSuccess,
  getAllUsers,
  getMyProfile,
  updateMyProfile,
};
