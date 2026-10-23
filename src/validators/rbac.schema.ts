import { z } from 'zod';

export const RoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
});

export type RoleFormData = z.infer<typeof RoleSchema>;

export const AdminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name is too long'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address'),
  contact: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional()
    .or(z.literal('')),
  role_id: z.string().optional(),
});

export type AdminUserFormData = z.infer<typeof AdminUserSchema>;

export const AssignRoleSchema = z.object({
  roleId: z.string().uuid('Please select a valid role'),
});

export type AssignRoleFormData = z.infer<typeof AssignRoleSchema>;
