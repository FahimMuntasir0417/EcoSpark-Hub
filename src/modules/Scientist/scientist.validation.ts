import { z } from "zod";

export const createScientistSchema = z
  .object({
    password: z
      .string({ error: "Password is required" })
      .min(6, "Password must be at least 6 characters long"),

    specialties: z
      .array(z.string().uuid("Each specialty id must be a valid UUID"))
      .min(1, "At least one specialty is required"),

    scientist: z
      .object({
        name: z
          .string({ error: "Name is required" })
          .trim()
          .min(1, "Name is required"),

        email: z
          .string({ error: "Email is required" })
          .trim()
          .email("Invalid email address"),

        profilePhoto: z.string().trim().optional(),

        contactNumber: z
          .string()
          .trim()
          .max(50, "Contact number is too long")
          .optional(),

        address: z.string().trim().max(500, "Address is too long").optional(),

        institution: z
          .string()
          .trim()
          .max(150, "Institution cannot be more than 150 characters")
          .optional(),

        department: z
          .string()
          .trim()
          .max(150, "Department cannot be more than 150 characters")
          .optional(),

        specialization: z
          .string()
          .trim()
          .max(150, "Specialization cannot be more than 150 characters")
          .optional(),

        researchInterests: z
          .string()
          .trim()
          .max(5000, "Research interests is too long")
          .optional(),

        yearsOfExperience: z
          .number()
          .int("Years of experience must be an integer")
          .min(0, "Years of experience cannot be negative")
          .optional(),

        qualification: z
          .string()
          .trim()
          .max(150, "Qualification cannot be more than 150 characters")
          .optional(),

        linkedinUrl: z
          .string()
          .trim()
          .url("Invalid LinkedIn URL")
          .max(500, "LinkedIn URL cannot be more than 500 characters")
          .optional(),

        googleScholarUrl: z
          .string()
          .trim()
          .url("Invalid Google Scholar URL")
          .max(500, "Google Scholar URL cannot be more than 500 characters")
          .optional(),

        orcid: z
          .string()
          .trim()
          .max(19, "ORCID cannot be more than 19 characters")
          .optional(),
      })
      .strict(),
  })
  .strict();

export const updateScientistSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").optional(),

    email: z.string().trim().email("Invalid email address").optional(),

    profilePhoto: z.string().trim().optional(),

    contactNumber: z
      .string()
      .trim()
      .max(50, "Contact number is too long")
      .optional(),

    address: z.string().trim().max(500, "Address is too long").optional(),

    institution: z
      .string()
      .trim()
      .max(150, "Institution cannot be more than 150 characters")
      .optional(),

    department: z
      .string()
      .trim()
      .max(150, "Department cannot be more than 150 characters")
      .optional(),

    specialization: z
      .string()
      .trim()
      .max(150, "Specialization cannot be more than 150 characters")
      .optional(),

    researchInterests: z
      .string()
      .trim()
      .max(5000, "Research interests is too long")
      .optional(),

    yearsOfExperience: z
      .number()
      .int("Years of experience must be an integer")
      .min(0, "Years of experience cannot be negative")
      .optional(),

    qualification: z
      .string()
      .trim()
      .max(150, "Qualification cannot be more than 150 characters")
      .optional(),

    linkedinUrl: z
      .string()
      .trim()
      .url("Invalid LinkedIn URL")
      .max(500, "LinkedIn URL cannot be more than 500 characters")
      .optional(),

    googleScholarUrl: z
      .string()
      .trim()
      .url("Invalid Google Scholar URL")
      .max(500, "Google Scholar URL cannot be more than 500 characters")
      .optional(),

    orcid: z
      .string()
      .trim()
      .max(19, "ORCID cannot be more than 19 characters")
      .optional(),

    verifiedById: z.string().trim().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });

export const assignScientistSpecialtiesSchema = z
  .object({
    specialtyIds: z
      .array(z.string().uuid("Each specialty id must be a valid UUID"))
      .min(1, "At least one specialty id is required"),
  })
  .strict();
