/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import status from "http-status";

import { prisma } from "../lib/prisma";
import { CookieUtils } from "../utils/cookie";
import { jwtUtils } from "../utils/jwt";
import { Role, UserStatus } from "../generated/prisma/client";
import { envVars } from "../config";
import AppError from "../errors/AppError";

export const checkAuth =
  (...authRoles: Role[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authorizationHeader = req.headers.authorization;
      const bearerToken = authorizationHeader?.startsWith("Bearer ")
        ? authorizationHeader.slice(7).trim()
        : undefined;
      const accessToken = bearerToken || CookieUtils.getCookie(req, "accessToken");
      const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");

      if (!accessToken) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! No access token provided.",
        );
      }

      const verifiedToken = jwtUtils.verifyToken(
        accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );

      if (!verifiedToken.success) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! Invalid access token.",
        );
      }

      const tokenUserId = verifiedToken.data?.userId as string | undefined;

      if (!tokenUserId) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! Invalid access token payload.",
        );
      }

      let user = null as Awaited<ReturnType<typeof prisma.user.findUnique>> | null;

      if (sessionToken) {
        const sessionExists = await prisma.session.findFirst({
          where: {
            token: sessionToken,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            user: true,
          },
        });

        if (sessionExists?.user) {
          const now = new Date();
          const expiresAt = new Date(sessionExists.expiresAt);
          const createdAt = new Date(sessionExists.createdAt);

          const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
          const timeRemaining = expiresAt.getTime() - now.getTime();
          const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

          if (percentRemaining < 20) {
            res.setHeader("X-Session-Refresh", "true");
            res.setHeader("X-Session-Expires-At", expiresAt.toISOString());
            res.setHeader("X-Time-Remaining", timeRemaining.toString());
          }

          user = sessionExists.user;
        }
      }

      if (!user) {
        user = await prisma.user.findUnique({
          where: {
            id: tokenUserId,
          },
        });
      }

      if (!user) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized access! User not found.");
      }

      if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! User is not active.",
        );
      }

      if (user.isDeleted) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! User is deleted.",
        );
      }

      if (authRoles.length > 0 && !authRoles.includes(user.role)) {
        throw new AppError(
          status.FORBIDDEN,
          "Forbidden access! You do not have permission to access this resource.",
        );
      }

      req.user = {
        userId: user.id,
        role: user.role,
        email: user.email,
      };

      next();
    } catch (error: any) {
      next(error);
    }
  };
