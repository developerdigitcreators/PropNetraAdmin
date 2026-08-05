import { z } from 'zod';

export const LoginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or Mobile is required')
    .refine(
      (val) => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const isMobile = /^[6-9]\d{9}$/.test(val);
        return isEmail || isMobile;
      },
      {
        message: 'Enter a valid email or 10-digit mobile number',
      }
    ),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof LoginSchema>;
