import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  employeeId: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'COMMANDER', 'BOP_OPERATOR', 'ANALYST', 'INVESTIGATOR', 'AUDITOR']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const faceVerifySchema = z.object({
  descriptor: z.array(z.number()).length(128, 'Face descriptor must be a 128-element array'),
  forceEnroll: z.boolean().optional(),
});
