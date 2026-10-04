'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { VerifiedLeadFilterOption } from '@/services/verified-leads.service';

export function withCount(label: string, count?: number) {
  return count == null ? label : `${label} (${count})`;
}

/** Keeps the current selection visible even when the API stops returning it. */
export function ensureSelected(
  options: VerifiedLeadFilterOption[],
  value: string,
  label?: string,
): VerifiedLeadFilterOption[] {
  if (!value || value === 'all' || options.some((o) => o.value === value)) {
    return options;
  }
  return [{ value, label: label || value, count: 0 }, ...options];
}

type Props = {
  roleOptions: VerifiedLeadFilterOption[];
  role: string;
  onRoleChange: (value: string) => void;
  projectOptions: VerifiedLeadFilterOption[];
  project: string;
  onProjectChange: (value: string) => void;
};

/** Project name filter with a User role section on top (counts from filter-options). */
export function VerifiedLeadsProjectFilter({
  roleOptions,
  role,
  onRoleChange,
  projectOptions,
  project,
  onProjectChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const roles = useMemo(
    () => (roleOptions.length ? ensureSelected(roleOptions, role) : []),
    [roleOptions, role],
  );

  const projects = useMemo(
    () => ensureSelected(projectOptions, project),
    [projectOptions, project],
  );
  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.value === project || p.label.toLowerCase().includes(q),
    );
  }, [projects, query, project]);

  const roleLabel =
    role && role !== 'all' ? roles.find((r) => r.value === role)?.label || role : '';
  const summary = [project || null, roleLabel || null].filter(Boolean).join(' · ');

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs text-gray-500">Project name</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-8 w-[220px] items-center justify-between gap-2 rounded-lg border border-input bg-white px-2.5 text-sm outline-none',
          !summary && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{summary || 'All projects & roles'}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-[300px] overflow-hidden rounded-lg border border-input bg-white shadow-md">
          <div className="border-b border-gray-100 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              User role
            </p>
            <div className="space-y-1">
              {roles.length === 0 ? (
                <p className="text-xs text-gray-400">Loading…</p>
              ) : null}
              {roles.map((r) => {
                const checked = (role || 'all') === r.value;
                return (
                  <label
                    key={r.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-gray-50',
                      r.count === 0 && !checked ? 'text-gray-400' : 'text-gray-800',
                    )}
                  >
                    <input
                      type="radio"
                      name="verified-leads-user-role"
                      className="accent-primary"
                      checked={checked}
                      onChange={() => onRoleChange(r.value)}
                    />
                    {withCount(r.label, r.count)}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-3 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Project
            </p>
            {project ? (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => onProjectChange('')}
              >
                Clear project
              </button>
            ) : null}
          </div>
          <div className="relative p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search project"
              className="pl-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 pt-0">
            {visibleProjects.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-gray-500">No projects.</p>
            ) : (
              visibleProjects.map((p) => {
                const active = p.value === project;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onProjectChange(active ? '' : p.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      active
                        ? 'bg-primary-light text-primary'
                        : p.count === 0
                          ? 'text-gray-400 hover:bg-gray-50'
                          : 'text-gray-900 hover:bg-gray-50',
                    )}
                  >
                    <Check className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{withCount(p.label, p.count)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
