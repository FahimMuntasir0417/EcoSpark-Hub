/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { Role, UserStatus } from "../generated/prisma/client";
import { envVars } from "../config";
import { prisma } from "../lib/prisma";
import { CookieUtils } from "../utils/cookie";
import { jwtUtils } from "../utils/jwt";

export const optionalAuth =
  (...authRoles: Role[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authorizationHeader = req.headers.authorization;
      const bearerToken = authorizationHeader?.startsWith("Bearer ")
        ? authorizationHeader.slice(7).trim()
        : undefined;
      const accessToken = bearerToken || CookieUtils.getCookie(req, "accessToken");

      if (!accessToken) {
        return next();
      }

      const verifiedToken = jwtUtils.verifyToken(
        accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );

      if (!verifiedToken.success) {
        return next();
      }

      const tokenUserId = verifiedToken.data?.userId as string | undefined;

      if (!tokenUserId) {
        return next();
      }

      const user = await prisma.user.findUnique({
        where: {
          id: tokenUserId,
        },
      });

      if (!user || user.isDeleted) {
        return next();
      }

      if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
        return next();
      }

      if (authRoles.length > 0 && !authRoles.includes(user.role)) {
        return next();
      }

      req.user = {
        userId: user.id,
        role: user.role,
        email: user.email,
      };

      return next();
    } catch (_error: any) {
      return next();
    }
  };
