import status from "http-status";
import { JwtPayload } from "jsonwebtoken";

import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { tokenUtils } from "../../utils/token";
import {
  IChangePasswordPayload,
  ILoginUserPayload,
  IRegisterMemberPayload,
} from "./auth.interface";

import AppError from "../../errors/AppError";
import { envVars } from "../../config";
import { Role, UserStatus } from "../../generated/prisma/enums";

const parseRole = (role: string): Role => {
  switch (role) {
    case Role.SUPER_ADMIN:
      return Role.SUPER_ADMIN;
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
  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  return result;
};

const verifyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });

  if (result?.status) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        emailVerified: true,
      },
    });
  }

  return result;
};

const forgetPassword = async (email: string) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
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

  if (existingUser.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "User is deleted");
  }

  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    },
  });
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
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

  if (existingUser.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "User is deleted");
  }

  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
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
  const existingMemberProfile = await prisma.member.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (session.user.role === Role.MEMBER) {
    if (!existingMemberProfile) {
      await prisma.member.create({
        data: {
          userId: session.user.id,
          name: session.user.name,
          email: session.user.email,
        },
      });
    } else if (
      existingMemberProfile.name !== session.user.name ||
      existingMemberProfile.email !== session.user.email
    ) {
      await prisma.member.update({
        where: {
          userId: session.user.id,
        },
        data: {
          name: session.user.name,
          email: session.user.email,
        },
      });
    }
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
};
