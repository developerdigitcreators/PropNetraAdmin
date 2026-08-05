'use client';

import { Checkbox } from '@/components/ui/checkbox';

const MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'listings', name: 'Property Listings' },
  { id: 'users', name: 'User Management' },
  { id: 'locations', name: 'Location Moderation' },
  { id: 'rbac', name: 'Role & Permissions' },
];

const ACTIONS = [
  { id: 'read', label: 'Read' },
  { id: 'create', label: 'Create' },
  { id: 'update', label: 'Update' },
  { id: 'delete', label: 'Delete' },
];

interface PermissionMatrixProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}

export function PermissionMatrix({ selectedPermissions, onChange }: PermissionMatrixProps) {
  const togglePermission = (module: string, action: string) => {
    const permission = `${module}:${action}`;
    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter((p) => p !== permission));
    } else {
      onChange([...selectedPermissions, permission]);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 font-semibold text-gray-700">Module Name</th>
            {ACTIONS.map((action) => (
              <th key={action.id} className="px-6 py-4 font-semibold text-gray-700 text-center">
                {action.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {MODULES.map((module) => (
            <tr key={module.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">{module.name}</td>
              {ACTIONS.map((action) => {
                const permission = `${module.id}:${action.id}`;
                const isChecked = selectedPermissions.includes(permission);
                
                return (
                  <td key={action.id} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => togglePermission(module.id, action.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
