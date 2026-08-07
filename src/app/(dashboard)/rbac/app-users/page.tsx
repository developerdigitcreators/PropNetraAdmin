'use client';

import { useState, useEffect } from 'react';
import { AssignRoleModal } from '@/modules/rbac/assign-role-modal';
import { UserFormModal } from '@/modules/rbac/user-form-modal';
import { DeleteUserAlert } from '@/modules/rbac/delete-user-alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { rbacService } from '@/services/rbac.service';
import { adminUsersService } from '@/services/admin-users.service';
import { Loader2, Plus, Edit2, Trash2 } from 'lucide-react';

import { PermissionGuard } from '@/components/common/permission-guard';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [roles, setRoles] = useState<any[]>([]);

  // Modal states
  const [assignRoleUser, setAssignRoleUser] = useState<any>(null);
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);

  const [formUser, setFormUser] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminUsersService.getUsers('app');
      // the api returns { success, data } which is unwrapped by interceptor to array
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    rbacService.getRoles('app').then((data) => setRoles(Array.isArray(data) ? data : [])).catch(console.error);
  }, []);

  const handleCreateNew = () => {
    setFormUser(null);
    setFormOpen(true);
  };

  const handleEditClick = (user: any) => {
    setFormUser(user);
    setFormOpen(true);
  };

  const handleDeleteClick = (user: any) => {
    setDeleteUser(user);
    setDeleteOpen(true);
  };

  const handleAssignClick = (user: any) => {
    setAssignRoleUser(user);
    setAssignRoleOpen(true);
  };

  return (
    <PermissionGuard permission="users:read" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view app users.</div>}>
      <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">App Users</h1>
          <p className="text-gray-500 mt-1">Manage external app users (Agents, Builders, etc) and their roles.</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">User Details</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Active Role</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email} • {user.contact}</p>
                    </td>
                    <td className="px-6 py-4">
                      {user.userRoles && user.userRoles.length > 0 && user.userRoles[0]?.role?.name ? (
                        <Badge variant="secondary" className="bg-primary-light text-primary hover:bg-primary/20 capitalize">
                          {user.userRoles[0].role.name.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No role assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleAssignClick(user)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Assign Role">
                          <ShieldIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)} className="text-gray-500 hover:text-gray-700" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(user)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete">
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
      </div>

      <UserFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        user={formUser}
        roles={roles}
        onSuccess={fetchUsers}
      />

      <DeleteUserAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        user={deleteUser}
        onSuccess={fetchUsers}
      />

      {assignRoleUser && (
        <AssignRoleModal
          user={assignRoleUser}
          roles={roles}
          open={assignRoleOpen}
          onOpenChange={setAssignRoleOpen}
          onSuccess={fetchUsers}
        />
      )}
    </div>
    </PermissionGuard>
  );
}

// Temporary inline icon component to avoid adding more lucide imports than necessary at top level if not present
function ShieldIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
