import { Request, Response } from "express";
import status from "http-status";

import { getAuth } from "../../lib/auth";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CookieUtils } from "../../utils/cookie";
import { tokenUtils } from "../../utils/token";
import { AuthService } from "./auth.service";
import { envVars } from "../../config";
import AppError from "../../errors/AppError";
import { IUpdateMyProfilePayload } from "./auth.interface";

const DEFAULT_GOOGLE_REDIRECT_PATH = "/dashboard";
const OAUTH_HASH_SUCCESS_KEY = "success";

const sanitizeRedirectPath = (value: unknown) => {
  const redirectPath = Array.isArray(value) ? value[0] : value;

  if (typeof redirectPath !== "string") {
    return DEFAULT_GOOGLE_REDIRECT_PATH;
  }

  const normalizedPath = redirectPath.trim();

  if (
    !normalizedPath.startsWith("/") ||
    normalizedPath.startsWith("//") ||
    normalizedPath.includes("\\")
  ) {
    return DEFAULT_GOOGLE_REDIRECT_PATH;
  }

  return normalizedPath;
};

const getAuthOrigin = () => {
  return envVars.BETTER_AUTH_URL.replace(/\/+$/, "");
};

const buildFrontendOAuthSuccessUrl = (
  accessToken: string,
  refreshToken: string,
  redirectPath: string,
) => {
  const url = new URL("/login", envVars.FRONTEND_URL);
  const hashParams = new URLSearchParams({
    oauth: OAUTH_HASH_SUCCESS_KEY,
    accessToken,
    refreshToken,
  });

  if (redirectPath !== DEFAULT_GOOGLE_REDIRECT_PATH) {
    hashParams.set("redirect", redirectPath);
  }

  url.hash = hashParams.toString();

  return url.toString();
};

const registerMember = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await AuthService.registerMember(payload);

  const { accessToken, refreshToken, token, ...rest } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token as string);

  if (token) {
    tokenUtils.setBetterAuthSessionCookie(res, token as string);
  }

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Member registered successfully",
    data: {
      token,
      accessToken,
      refreshToken,
      ...rest,
    },
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await AuthService.loginUser(payload);
  const { accessToken, refreshToken, token, ...rest } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);

  if (token) {
    tokenUtils.setBetterAuthSessionCookie(res, token);
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      token,
      accessToken,
      refreshToken,
      ...rest,
    },
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.getAllUsers(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await AuthService.getMyProfile(userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const file = req.file as (Express.Multer.File & { path?: string }) | undefined;

  if (file && !file.path) {
    throw new AppError(status.BAD_REQUEST, "Image upload failed");
  }

  const payload = {
    ...req.body,
  } as IUpdateMyProfilePayload;

  if (file?.path) {
    payload.image = file.path;
  }

  const result = await AuthService.updateMyProfile(userId, payload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User profile updated successfully",
    data: result,
  });
});

const getNewToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  const betterAuthSessionToken = req.cookies["better-auth.session_token"];

  if (!refreshToken) {
    throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
  }

  if (!betterAuthSessionToken) {
    throw new AppError(status.UNAUTHORIZED, "Session token is missing");
  }

  const result = await AuthService.getNewToken(
    refreshToken,
    betterAuthSessionToken,
  );

  const { accessToken, refreshToken: newRefreshToken, sessionToken } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, sessionToken);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "New tokens generated successfully",
    data: {
      accessToken,
      refreshToken: newRefreshToken,
      sessionToken,
    },
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const betterAuthSessionToken = req.cookies["better-auth.session_token"];

  if (!betterAuthSessionToken) {
    throw new AppError(status.UNAUTHORIZED, "Session token is missing");
  }

  const result = await AuthService.changePassword(
    payload,
    betterAuthSessionToken,
  );

  const { accessToken, refreshToken, sessionToken } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, sessionToken);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const betterAuthSessionToken = req.cookies["better-auth.session_token"];

  if (!betterAuthSessionToken) {
    throw new AppError(status.UNAUTHORIZED, "Session token is missing");
  }

  const result = await AuthService.logoutUser(betterAuthSessionToken);

  CookieUtils.clearCookie(res, "accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  CookieUtils.clearCookie(res, "refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  CookieUtils.clearCookie(res, "better-auth.session_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logged out successfully",
    data: result,
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const result = await AuthService.verifyEmail(email, otp);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.alreadyVerified
      ? "Email already verified"
      : "Email verified successfully",
    data: {
      alreadyVerified: result.alreadyVerified,
    },
  });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  await AuthService.forgetPassword(email);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset OTP sent successfully",
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  await AuthService.resetPassword(email, otp, newPassword);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset successfully",
  });
});

// /api/v1/auth/login/google?redirect=/profile
const googleLogin = catchAsync((req: Request, res: Response) => {
  const redirectPath = sanitizeRedirectPath(req.query.redirect);
  const authOrigin = getAuthOrigin();
  const authSignInUrl = new URL("/api/auth/sign-in/social", authOrigin);
  const callbackURL = new URL("/api/v1/auth/google/success", authOrigin);
  const errorCallbackURL = new URL("/api/v1/auth/oauth/error", authOrigin);

  callbackURL.searchParams.set("redirect", redirectPath);

  res.render("googleRedirect", {
    authSignInUrlJson: JSON.stringify(authSignInUrl.toString()),
    callbackURL: callbackURL.toString(),
    callbackURLJson: JSON.stringify(callbackURL.toString()),
    errorCallbackURLJson: JSON.stringify(errorCallbackURL.toString()),
  });
});

const googleOAuthCallback = catchAsync((req: Request, res: Response) => {
  const queryIndex = req.originalUrl.indexOf("?");
  const queryString = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
  const authOrigin = getAuthOrigin();

  res.redirect(`${authOrigin}/api/auth/callback/google${queryString}`);
});

const googleLoginSuccess = catchAsync(async (req: Request, res: Response) => {
  const redirectPath = sanitizeRedirectPath(req.query.redirect);
  const sessionToken = req.cookies["better-auth.session_token"];

  if (!sessionToken) {
    return res.redirect(`${envVars.FRONTEND_URL}/login?error=oauth_failed`);
  }

  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: {
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
  });

  if (!session?.user) {
    return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_session_found`);
  }

  const result = await AuthService.googleLoginSuccess(session);
  const { accessToken, refreshToken } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);

  res.redirect(
    buildFrontendOAuthSuccessUrl(accessToken, refreshToken, redirectPath),
  );
});

const handleOAuthError = catchAsync((req: Request, res: Response) => {
  const error = (req.query.error as string) || "oauth_failed";
  res.redirect(`${envVars.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
});

export const AuthController = {
  registerMember,
  loginUser,
  getAllUsers,
  getMyProfile,
  updateMyProfile,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLogin,
  googleOAuthCallback,
  googleLoginSuccess,
  handleOAuthError,
};
