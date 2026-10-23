import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const VerifyOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .min(4, 'Enter the code sent to your email')
    .max(8, 'Enter a valid OTP')
    .regex(/^\d+$/, 'OTP must be numeric'),
});

export type LoginFormData = z.infer<typeof LoginSchema>;
export type VerifyOtpFormData = z.infer<typeof VerifyOtpSchema>;
