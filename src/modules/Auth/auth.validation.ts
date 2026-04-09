import { z } from "zod";

export const registerMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address")
  .transform((email) => email.toLowerCase());

const otpSchema = z.string().trim().min(1, "OTP is required");

export const verifyEmailSchema = z
  .object({
    email: emailSchema,
    otp: otpSchema,
  })
  .strict();

export const forgetPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    otp: otpSchema,
    newPassword: z.string().min(6, "Password must be at least 6 characters long"),
  })
  .strict();

const updateMyProfileFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    image: z.string().trim().max(500).optional(),
    contactNumber: z.string().trim().optional(),
    address: z.string().trim().optional(),
  })
  .strict();

export const updateMyProfileSchema = z
  .object({
    data: z.string().trim().optional(),
    name: z.string().trim().min(1).max(150).optional(),
    image: z.string().trim().max(500).optional(),
    contactNumber: z.string().trim().optional(),
    address: z.string().trim().optional(),
  })
  .strict()
  .transform((value, ctx) => {
    let parsedData: Record<string, unknown> = {};

    if (value.data) {
      try {
        const parsed = JSON.parse(value.data);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "data must be a valid JSON object",
          });
          return z.NEVER;
        }

        parsedData = parsed as Record<string, unknown>;
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["data"],
          message: "data must be a valid JSON string",
        });
        return z.NEVER;
      }
    }

    const directFields = Object.fromEntries(
      Object.entries(value).filter(
        ([key, fieldValue]) => key !== "data" && fieldValue !== undefined,
      ),
    );

    return {
      ...parsedData,
      ...directFields,
    };
  })
  .pipe(updateMyProfileFieldsSchema);
