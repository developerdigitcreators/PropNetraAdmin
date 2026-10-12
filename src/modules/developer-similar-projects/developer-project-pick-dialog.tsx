'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/common/searchable-select';
import {
  developerSimilarProjectsService,
  devSimilarApiError,
  type DevProjectPreview,
} from '@/services/developer-similar-projects.service';

const UNKNOWN_DEVELOPER = 'Unknown developer';

function developerOf(p: DevProjectPreview) {
  return p.developerName || UNKNOWN_DEVELOPER;
}

export function DeveloperProjectPickDialog({
  open,
  title,
  description,
  submitLabel,
  excludeIds,
  markConfigured = false,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  excludeIds?: string[];
  /** Tag projects that already have a similar-projects set. */
  markConfigured?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (project: DevProjectPreview) => void;
}) {
  const [projects, setProjects] = useState<DevProjectPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [developer, setDeveloper] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDeveloper('');
    setProjectId('');
    setError('');
    setLoading(true);
    developerSimilarProjectsService
      .listAllPosts()
      .then((rows) => {
        if (!cancelled) setProjects(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setProjects([]);
          setError(devSimilarApiError(err, 'Failed to load projects.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const available = useMemo(() => {
    const excluded = new Set(excludeIds || []);
    return projects.filter((p) => !excluded.has(p.id));
  }, [projects, excludeIds]);

  const developerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of available) counts.set(developerOf(p), (counts.get(developerOf(p)) || 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ value: name, label: name, badge: count }));
  }, [available]);

  const projectOptions = useMemo(
    () =>
      available
        .filter((p) => developerOf(p) === developer)
        .map((p) => ({
          value: p.id,
          label:
            [p.title, p.location].filter(Boolean).join(' · ') +
            (markConfigured && p.hasSimilarSet ? ' (configured)' : ''),
        })),
    [available, developer, markConfigured],
  );

  const handleSubmit = () => {
    const project = available.find((p) => p.id === projectId);
    if (!project) {
      setError(developer ? 'Select a project first.' : 'Select a developer first.');
      return;
    }
    onSubmit(project);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Developer</label>
            <SearchableSelect
              options={developerOptions}
              value={developer}
              onValueChange={(v) => {
                setDeveloper(v);
                setProjectId('');
                setError('');
              }}
              loading={loading}
              placeholder="Select a developer"
              searchPlaceholder="Search developer"
              emptyText="No published Developer projects found."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Project</label>
            <SearchableSelect
              options={projectOptions}
              value={projectId}
              onValueChange={(v) => {
                setProjectId(v);
                setError('');
              }}
              disabled={!developer}
              placeholder={developer ? 'Select a project' : 'Select a developer first'}
              searchPlaceholder="Search project or location"
              emptyText="No matching projects."
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
