'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { rbacService } from '@/services/rbac.service';
import { Loader2 } from 'lucide-react';

interface PermissionMatrixProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}

interface PermissionScope {
  module_name: string;
  display_name?: string;
  actions: string[];
}

function asScopes(raw: unknown): PermissionScope[] {
  if (Array.isArray(raw)) return raw as PermissionScope[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as PermissionScope[];
    if (Array.isArray(obj.scopes)) return obj.scopes as PermissionScope[];
  }
  return [];
}

export function PermissionMatrix({ selectedPermissions, onChange }: PermissionMatrixProps) {
  const [scopes, setScopes] = useState<PermissionScope[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScopes = async () => {
      try {
        const data = await rbacService.getPermissionScopes();
        setScopes(asScopes(data));
      } catch (error) {
        console.error('Failed to fetch permission scopes', error);
        setScopes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchScopes();
  }, []);

  // Unique action columns across all modules (API sends plain action strings)
  const allActions = Array.from(new Set(scopes.flatMap((s) => s.actions || []))).sort();

  const togglePermission = (module: string, action: string) => {
    const permission = `${module}:${action}`;
    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter((p) => p !== permission));
    } else {
      onChange([...selectedPermissions, permission]);
    }
  };

  const formatModuleName = (scope: PermissionScope) => {
    if (scope.display_name) return scope.display_name;
    return scope.module_name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatActionName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-12 flex justify-center items-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (scopes.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-12 text-center text-gray-500">
        No permission scopes found.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 font-semibold text-gray-700">Module Name</th>
            {allActions.map((action) => (
              <th
                key={action}
                className="px-6 py-4 font-semibold text-gray-700 text-center"
              >
                {formatActionName(action)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scopes.map((scope) => (
            <tr
              key={scope.module_name}
              className="hover:bg-gray-50/50 transition-colors"
            >
              <td className="px-6 py-4 font-medium text-gray-900">
                {formatModuleName(scope)}
              </td>
              {allActions.map((action) => {
                const isApplicable = (scope.actions || []).includes(action);
                const permission = `${scope.module_name}:${action}`;
                const isChecked = selectedPermissions.includes(permission);

                return (
                  <td key={action} className="px-6 py-4 text-center">
                    {isApplicable ? (
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() =>
                            togglePermission(scope.module_name, action)
                          }
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
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
