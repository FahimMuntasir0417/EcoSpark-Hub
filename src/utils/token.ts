import { JwtPayload, SignOptions } from "jsonwebtoken";
import { Response } from "express";
import { jwtUtils } from "./jwt";
import { CookieUtils } from "./cookie";

const isProduction = process.env.NODE_ENV === "production";

const getAccessToken = (payload: JwtPayload) => {
  return jwtUtils.createToken(
    payload,
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    } as SignOptions,
  );
};

const getRefreshToken = (payload: JwtPayload) => {
  return jwtUtils.createToken(
    payload,
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions,
  );
};

const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
  maxAge,
});

const setAccessTokenCookie = (res: Response, token: string) => {
  CookieUtils.setCookie(
    res,
    "accessToken",
    token,
    getCookieOptions(24 * 60 * 60 * 1000),
  );
};

const setRefreshTokenCookie = (res: Response, token: string) => {
  CookieUtils.setCookie(
    res,
    "refreshToken",
    token,
    getCookieOptions(7 * 24 * 60 * 60 * 1000),
  );
};

const setBetterAuthSessionCookie = (res: Response, token: string) => {
  CookieUtils.setCookie(
    res,
    "better-auth.session_token",
    token,
    getCookieOptions(24 * 60 * 60 * 1000),
  );
};

export const tokenUtils = {
  getAccessToken,
  getRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setBetterAuthSessionCookie,
};
