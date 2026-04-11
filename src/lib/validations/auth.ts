import { z } from "zod";

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

export const artistRegistrationSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string(),
    displayName: z.string().min(1, "Display name is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ArtistRegistrationInput = z.infer<typeof artistRegistrationSchema>;

export const organizerRegistrationSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string(),
    displayName: z.string().min(1, "Display name is required"),
    conventionName: z.string().min(1, "Convention name is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type OrganizerRegistrationInput = z.infer<
  typeof organizerRegistrationSchema
>;

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
