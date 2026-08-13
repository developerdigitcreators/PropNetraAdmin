'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
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
  nested?: boolean;
  default_selected_child?: string;
  default_selected?: boolean;
  children?: PermissionScope[];
}

const ACTION_ORDER = ['read', 'create', 'update', 'delete'];

function asScope(raw: unknown): PermissionScope | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.module_name !== 'string') return null;
  const children = Array.isArray(o.children)
    ? o.children.map(asScope).filter((s): s is PermissionScope => !!s)
    : undefined;
  return {
    module_name: o.module_name,
    display_name: typeof o.display_name === 'string' ? o.display_name : undefined,
    actions: Array.isArray(o.actions)
      ? o.actions.filter((a): a is string => typeof a === 'string')
      : [],
    nested: o.nested === true || !!(children && children.length > 0),
    default_selected_child:
      typeof o.default_selected_child === 'string' ? o.default_selected_child : undefined,
    default_selected: o.default_selected === true,
    children,
  };
}

function asScopes(raw: unknown): PermissionScope[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Array.isArray((raw as Record<string, unknown>).data)
        ? ((raw as Record<string, unknown>).data as unknown[])
        : Array.isArray((raw as Record<string, unknown>).scopes)
          ? ((raw as Record<string, unknown>).scopes as unknown[])
          : []
      : [];
  return list.map(asScope).filter((s): s is PermissionScope => !!s);
}

function formatModuleName(scope: PermissionScope) {
  if (scope.display_name) return scope.display_name;
  return scope.module_name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatActionName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function childModuleNames(scope: PermissionScope): string[] {
  return (scope.children || []).map((c) => c.module_name);
}

function hasAnyModulePerm(selected: string[], moduleName: string) {
  const prefix = `${moduleName}:`;
  return selected.some((p) => p === `${moduleName}:read` || p.startsWith(prefix));
}

function stripModulePerms(selected: string[], moduleNames: string[]) {
  const banned = new Set(moduleNames);
  return selected.filter((p) => !banned.has(p.split(':')[0]));
}

function defaultChildOf(scope: PermissionScope): PermissionScope | undefined {
  const name =
    scope.default_selected_child ||
    scope.children?.find((c) => c.default_selected)?.module_name;
  return scope.children?.find((c) => c.module_name === name) || scope.children?.[0];
}

function cruFor(scope: PermissionScope): string[] {
  const actions = (scope.actions || []).filter((a) => a !== 'delete');
  return actions.map((action) => `${scope.module_name}:${action}`);
}

function visibleActions(scope: PermissionScope, nestedChild: boolean) {
  const actions = scope.actions || [];
  return nestedChild ? actions.filter((a) => a !== 'delete') : actions;
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

  const nestedChildNames = useMemo(() => {
    const names = new Set<string>();
    for (const scope of scopes) {
      if (scope.nested) childModuleNames(scope).forEach((n) => names.add(n));
    }
    return names;
  }, [scopes]);

  const topLevelScopes = useMemo(
    () => scopes.filter((scope) => !nestedChildNames.has(scope.module_name)),
    [scopes, nestedChildNames],
  );

  const allActions = useMemo(() => {
    const collected = new Set<string>();
    const walk = (scope: PermissionScope, nestedChild = false) => {
      visibleActions(scope, nestedChild).forEach((a) => collected.add(a));
      (scope.children || []).forEach((child) => walk(child, true));
    };
    topLevelScopes.forEach((scope) => walk(scope));
    return Array.from(collected).sort((a, b) => {
      const ia = ACTION_ORDER.indexOf(a);
      const ib = ACTION_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [topLevelScopes]);

  const toggleLeaf = (module: string, action: string, parent?: PermissionScope) => {
    const permission = `${module}:${action}`;
    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter((p) => p !== permission));
      return;
    }
    const next = [...selectedPermissions, permission];
    if (parent && !next.includes(`${parent.module_name}:read`)) {
      next.push(`${parent.module_name}:read`);
    }
    onChange(next);
  };

  const toggleParent = (scope: PermissionScope) => {
    const childNames = childModuleNames(scope);
    const parentActive =
      hasAnyModulePerm(selectedPermissions, scope.module_name) ||
      childNames.some((name) => hasAnyModulePerm(selectedPermissions, name));

    if (parentActive) {
      onChange(stripModulePerms(selectedPermissions, [scope.module_name, ...childNames]));
      return;
    }

    const next = new Set(selectedPermissions);
    next.add(`${scope.module_name}:read`);
    const defaultChild = defaultChildOf(scope);
    if (defaultChild) cruFor(defaultChild).forEach((p) => next.add(p));
    onChange(Array.from(next));
  };

  const renderRow = (scope: PermissionScope, opts: { indent?: boolean; parent?: PermissionScope }) => {
    const indent = !!opts.indent;
    const isParent = !!scope.nested && !indent;
    const childNames = isParent ? childModuleNames(scope) : [];
    const parentChecked =
      isParent &&
      (hasAnyModulePerm(selectedPermissions, scope.module_name) ||
        childNames.some((name) => hasAnyModulePerm(selectedPermissions, name)));

    return (
      <tr
        key={scope.module_name}
        className="hover:bg-gray-50/50 transition-colors"
      >
        <td className={`px-6 py-4 font-medium ${indent ? 'pl-12 text-gray-700' : 'text-gray-900'}`}>
          <div className="flex items-center gap-2">
            {indent && <span className="text-gray-300 select-none">↳</span>}
            <span>{formatModuleName(scope)}</span>
          </div>
        </td>
        {allActions.map((action) => {
          const isApplicable = visibleActions(scope, indent).includes(action);
          const permission = `${scope.module_name}:${action}`;
          const isChecked = isParent
            ? parentChecked && action === 'read'
            : selectedPermissions.includes(permission);

          return (
            <td key={action} className="px-6 py-4 text-center">
              {isApplicable ? (
                <div className="flex justify-center">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() =>
                      isParent
                        ? toggleParent(scope)
                        : toggleLeaf(scope.module_name, action, opts.parent)
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
    );
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-12 flex justify-center items-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (topLevelScopes.length === 0) {
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
          {topLevelScopes.map((scope) => {
            const childNames = childModuleNames(scope);
            const showChildren =
              !!scope.nested &&
              (hasAnyModulePerm(selectedPermissions, scope.module_name) ||
                childNames.some((name) => hasAnyModulePerm(selectedPermissions, name)));

            return (
              <Fragment key={scope.module_name}>
                {renderRow(scope, {})}
                {showChildren &&
                  (scope.children || []).map((child) =>
                    renderRow(child, { indent: true, parent: scope }),
                  )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
