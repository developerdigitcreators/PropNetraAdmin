import { z } from 'zod';

export const RoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
});

export type RoleFormData = z.infer<typeof RoleSchema>;

export const AdminUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  contact: z.string().min(10, 'Contact number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role_id: z.string().optional(),
});

export type AdminUserFormData = z.infer<typeof AdminUserSchema>;

export const AssignRoleSchema = z.object({
  roleId: z.string().uuid('Please select a valid role'),
});

export type AssignRoleFormData = z.infer<typeof AssignRoleSchema>;
