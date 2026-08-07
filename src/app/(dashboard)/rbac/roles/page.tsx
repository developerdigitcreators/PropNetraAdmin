'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleSchema, RoleFormData } from '@/validators/rbac.schema';
import { rbacService } from '@/services/rbac.service';
import { PermissionMatrix } from '@/modules/rbac/permission-matrix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit2, Plus, Trash2 } from 'lucide-react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { DeleteRoleAlert } from '@/modules/rbac/delete-role-alert';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(RoleSchema),
    defaultValues: {
      name: '',
      permissions: [],
    }
  });

  const selectedPermissions = watch('permissions');

  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const data = await rbacService.getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateNew = () => {
    setEditingRole(null);
    reset({ name: '', permissions: [] });
    setIsFormVisible(true);
  };

  const handleEdit = (role: any) => {
    setEditingRole(role);
    // Assuming backend returns role.permissions or role.rolePermissions
    const perms = role.permissions || role.rolePermissions?.map((rp: any) => rp.permission) || [];
    reset({ name: role.name, permissions: perms });
    setIsFormVisible(true);
  };

  const handleCancel = () => {
    setEditingRole(null);
    reset({ name: '', permissions: [] });
    setIsFormVisible(false);
  };

  const handleDeleteClick = (role: any) => {
    setDeleteRoleTarget(role);
    setDeleteOpen(true);
  };

  const onSubmit = async (data: RoleFormData) => {
    setIsSubmitting(true);
    setSuccess(false);
    try {
      if (editingRole) {
        await rbacService.updateRole(editingRole.id, data);
      } else {
        await rbacService.createRole(data);
      }
      setSuccess(true);
      fetchRoles();
      setTimeout(() => {
        setSuccess(false);
        setIsFormVisible(false);
        setEditingRole(null);
        reset();
      }, 2000);
    } catch (error) {
      console.error('Failed to save role', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PermissionGuard permission="rbac:read" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view roles.</div>}>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Role Management</h1>
            <p className="text-gray-500 mt-1">Create custom roles and define their granular permission access.</p>
          </div>
          {!isFormVisible && (
            <Button onClick={handleCreateNew} className="bg-primary text-white hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Create Role
            </Button>
          )}
        </div>

        {!isFormVisible && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Role Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Permissions Count</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingRoles ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No roles found.</td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{role.name}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {role.permissions?.length || role.rolePermissions?.length || 0} permissions
                      </td>
                      <td className="px-6 py-4">
                        {role.is_active ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(role)} className="text-gray-500 hover:text-gray-700">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(role)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {isFormVisible && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-lg font-semibold">{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
              <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium text-gray-700">Role Name</label>
                <Input
                  type="text"
                  placeholder="e.g., Listings Manager"
                  {...register('name')}
                  className={`h-11 ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Permission Scope</label>
                  <p className="text-sm text-gray-500 mb-4">Select the modules and actions this role can perform.</p>
                </div>
                
                <PermissionMatrix 
                  selectedPermissions={selectedPermissions || []}
                  onChange={(perms) => setValue('permissions', perms, { shouldValidate: true })}
                />
                {errors.permissions && (
                  <p className="text-red-500 text-xs mt-1">{errors.permissions.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button 
                  type="submit" 
                  className="h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingRole ? 'Save Changes' : 'Create Role'
                  )}
                </Button>
                {success && <span className="text-sm text-green-600 font-medium">Role {editingRole ? 'updated' : 'created'} successfully!</span>}
              </div>
            </form>
          </div>
        )}
      </div>

      {deleteRoleTarget && (
        <DeleteRoleAlert
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          role={deleteRoleTarget}
          onSuccess={fetchRoles}
        />
      )}
    </PermissionGuard>
  );
}
