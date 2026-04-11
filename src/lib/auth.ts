import { envVars } from "../config";
import { sendEmail } from "../utils/email";
import { prisma } from "./prisma";
import { Role, UserStatus } from "../generated/prisma/enums";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

type AuthModuleSpecifier =
  | "better-auth"
  | "better-auth/adapters/prisma"
  | "better-auth/plugins"
  | "better-auth/node";

type BetterAuthModule = typeof import("better-auth");
type BetterAuthPrismaModule = typeof import("better-auth/adapters/prisma");
type BetterAuthPluginsModule = typeof import("better-auth/plugins");
type BetterAuthNodeModule = typeof import("better-auth/node");

const runtimeRequire = createRequire(path.join(process.cwd(), "package.json"));

// Keep Better Auth specifiers literal so Vercel can trace them into the bundle.
const esmModuleUrls: Record<AuthModuleSpecifier, string> = {
  "better-auth": pathToFileURL(
    typeof require === "function" && typeof require.resolve === "function"
      ? require.resolve("better-auth")
      : runtimeRequire.resolve("better-auth"),
  ).href,
  "better-auth/adapters/prisma": pathToFileURL(
    typeof require === "function" && typeof require.resolve === "function"
      ? require.resolve("better-auth/adapters/prisma")
      : runtimeRequire.resolve("better-auth/adapters/prisma"),
  ).href,
  "better-auth/plugins": pathToFileURL(
    typeof require === "function" && typeof require.resolve === "function"
      ? require.resolve("better-auth/plugins")
      : runtimeRequire.resolve("better-auth/plugins"),
  ).href,
  "better-auth/node": pathToFileURL(
    typeof require === "function" && typeof require.resolve === "function"
      ? require.resolve("better-auth/node")
      : runtimeRequire.resolve("better-auth/node"),
  ).href,
};

const importEsmModule = <T>(specifier: AuthModuleSpecifier) => {
  return Function("modulePath", "return import(modulePath);")(
    esmModuleUrls[specifier],
  ) as Promise<T>;
};

const createAuth = async () => {
  const [{ betterAuth }, { prismaAdapter }, { bearer, emailOTP }] =
    await Promise.all([
      importEsmModule<BetterAuthModule>("better-auth"),
      importEsmModule<BetterAuthPrismaModule>("better-auth/adapters/prisma"),
      importEsmModule<BetterAuthPluginsModule>("better-auth/plugins"),
    ]);

  return betterAuth({
    baseURL: envVars.BETTER_AUTH_URL,
    secret: envVars.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },

    socialProviders: {
      google: {
        clientId: envVars.GOOGLE_CLIENT_ID,
        clientSecret: envVars.GOOGLE_CLIENT_SECRET,
        callbackUrl: envVars.GOOGLE_CALLBACK_URL,
        mapProfileToUser: () => {
          return {
            role: Role.MEMBER,
            status: UserStatus.ACTIVE,
            needPasswordChange: false,
            emailVerified: true,
            isDeleted: false,
            deletedAt: null,
          };
        },
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },

    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: Role.MEMBER,
        },

        status: {
          type: "string",
          required: true,
          defaultValue: UserStatus.ACTIVE,
        },

        needPasswordChange: {
          type: "boolean",
          required: true,
          defaultValue: false,
        },

        isDeleted: {
          type: "boolean",
          required: true,
          defaultValue: false,
        },

        deletedAt: {
          type: "date",
          required: false,
          defaultValue: null,
        },
      },
    },

    plugins: [
      bearer(),
      emailOTP({
        overrideDefaultEmailVerification: true,
        async sendVerificationOTP({
          email,
          otp,
          type,
        }: {
          email: string;
          otp: string;
          type: string;
        }) {
          if (type === "email-verification") {
            const user = await prisma.user.findUnique({
              where: {
                email,
              },
            });

            if (user && !user.emailVerified) {
              await sendEmail({
                to: email,
                subject: "Verify your email",
                templateName: "otp",
                templateData: {
                  name: user.name,
                  otp,
                },
              });
            }
          } else if (type === "forget-password") {
            const user = await prisma.user.findUnique({
              where: {
                email,
              },
            });

            if (user) {
              await sendEmail({
                to: email,
                subject: "Password Reset OTP",
                templateName: "otp",
                templateData: {
                  name: user.name,
                  otp,
                },
              });
            }
          }
        },
        expiresIn: 2 * 60, // 2 minutes in seconds
        otpLength: 6,
      }),
    ],

    session: {
      expiresIn: 60 * 60 * 60 * 24, // 1 day in seconds
      updateAge: 60 * 60 * 60 * 24, // 1 day in seconds
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 60 * 24, // 1 day in seconds
      },
    },

    redirectURLs: {
      signIn: `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success`,
    },

    trustedOrigins: [
      process.env.BETTER_AUTH_URL || "http://localhost:5000",
      envVars.FRONTEND_URL,
    ],

    advanced: {
      // disableCSRFCheck: true,
      useSecureCookies: false,
      cookies: {
        state: {
          attributes: {
            sameSite: "none",
            secure: true,
            httpOnly: true,
            path: "/",
          },
        },
        sessionToken: {
          attributes: {
            sameSite: "none",
            secure: true,
            httpOnly: true,
            path: "/",
          },
        },
      },
    },
  });
};

type AuthInstance = Awaited<ReturnType<typeof createAuth>>;

let authPromise: Promise<AuthInstance> | null = null;

const getAuth = (): Promise<AuthInstance> => {
  if (!authPromise) {
    authPromise = createAuth();
  }

  return authPromise;
};

const getAuthNodeHandler = async () => {
  const [{ toNodeHandler }, auth] = await Promise.all([
    importEsmModule<BetterAuthNodeModule>("better-auth/node"),
    getAuth(),
  ]);

  return toNodeHandler(auth);
};

export { getAuth, getAuthNodeHandler };
