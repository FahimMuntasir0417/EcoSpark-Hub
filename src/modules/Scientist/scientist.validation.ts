import { z } from "zod";

export const createScientistSchema = z
  .object({
    userId: z.string().trim().min(1, "userId is required"),

    scientist: z
      .object({
        profilePhoto: z.string().trim().optional(),
        contactNumber: z.string().trim().optional(),
        address: z.string().trim().optional(),
        institution: z.string().trim().max(150).optional(),
        department: z.string().trim().max(150).optional(),
        specialization: z.string().trim().max(150).optional(),
        researchInterests: z.string().trim().optional(),
        yearsOfExperience: z.number().int().min(0).optional(),
        qualification: z.string().trim().max(150).optional(),
        linkedinUrl: z.string().trim().optional(),
        googleScholarUrl: z.string().trim().optional(),
        orcid: z.string().trim().max(19).optional(),
      })
      .strict(),

    specialtyIds: z.array(z.string().uuid("Invalid specialty id")).optional(),
  })
  .strict();

export const updateScientistSchema = z
  .object({
    profilePhoto: z.string().trim().optional(),
    contactNumber: z.string().trim().optional(),
    address: z.string().trim().optional(),
    institution: z.string().trim().max(150).optional(),
    department: z.string().trim().max(150).optional(),
    specialization: z.string().trim().max(150).optional(),
    researchInterests: z.string().trim().optional(),
    yearsOfExperience: z.number().int().min(0).optional(),
    qualification: z.string().trim().max(150).optional(),
    linkedinUrl: z.string().trim().optional(),
    googleScholarUrl: z.string().trim().optional(),
    orcid: z.string().trim().max(19).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });

export const assignScientistSpecialtiesSchema = z
  .object({
    specialtyIds: z
      .array(z.string().uuid("Invalid specialty id"))
      .min(1, "At least one specialty id is required"),
  })
  .strict();

export const verifyScientistSchema = z
  .object({
    verified: z.boolean(),
  })
  .strict();
