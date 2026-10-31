'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PickerCityFields } from '@/modules/developer-home/picker-city-fields';
import { DeveloperPicker } from '@/modules/developer-home/developer-picker';
import { ProjectMultiPicker } from '@/modules/developer-home/project-multi-picker';
import type {
  HomeDeveloperPreview,
  HomePostPreview,
  NamedRow,
} from '@/services/developer-home.service';

export type AddItemWizardMode = 'projects' | 'developer-only';

type AddItemWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AddItemWizardMode;
  title: string;
  description?: string;
  submitLabel?: string;
  /** Page display city — picker defaults to this. */
  displayStateId: string;
  displayCityId: string;
  states: NamedRow[];
  cities: NamedRow[];
  excludeListingIds?: string[];
  excludeDeveloperIds?: string[];
  onSubmitProjects: (posts: HomePostPreview[]) => void;
  onSubmitDeveloper: (developer: HomeDeveloperPreview) => void;
};

export function AddItemWizard({
  open,
  onOpenChange,
  mode,
  title,
  description,
  submitLabel,
  displayStateId,
  displayCityId,
  states,
  cities,
  excludeListingIds,
  excludeDeveloperIds,
  onSubmitProjects,
  onSubmitDeveloper,
}: AddItemWizardProps) {
  const [pickerStateId, setPickerStateId] = useState('');
  const [pickerCityId, setPickerCityId] = useState('');
  const [developerId, setDeveloperId] = useState('');
  const [developer, setDeveloper] = useState<HomeDeveloperPreview | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState('');
  const postCacheRef = useRef(new Map<string, HomePostPreview>());

  useEffect(() => {
    if (!open) return;
    setPickerStateId(displayStateId);
    setPickerCityId(displayCityId);
    setDeveloperId('');
    setDeveloper(null);
    setSelectedProjectIds([]);
    setLocalError('');
    postCacheRef.current.clear();
  }, [open, displayStateId, displayCityId]);

  const canSubmitProjects = mode === 'projects' && selectedProjectIds.length > 0 && pickerCityId;
  const canSubmitDeveloper = mode === 'developer-only' && developerId && developer && pickerCityId;

  const handleSubmit = () => {
    setLocalError('');
    if (mode === 'developer-only') {
      if (!developer) {
        setLocalError('Select a developer.');
        return;
      }
      onSubmitDeveloper(developer);
      onOpenChange(false);
      return;
    }
    const posts = selectedProjectIds
      .map((id) => postCacheRef.current.get(id))
      .filter(Boolean) as HomePostPreview[];
    if (posts.length !== selectedProjectIds.length) {
      setLocalError('Could not resolve one or more projects. Try again.');
      return;
    }
    onSubmitProjects(posts);
    onOpenChange(false);
  };

  const cachePosts = (rows: HomePostPreview[]) => {
    rows.forEach((p) => postCacheRef.current.set(p.id, p));
  };

  const pickerHint = useMemo(() => {
    if (!displayCityId || pickerCityId === displayCityId) return null;
    const name = cities.find((c) => c.id === pickerCityId)?.name;
    return name
      ? `Picker city (${name}) may differ from the section display city — cross-city picks are allowed.`
      : null;
  }, [cities, displayCityId, pickerCityId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-5 pt-1">
          <PickerCityFields
            states={states}
            cities={cities}
            stateId={pickerStateId}
            cityId={pickerCityId}
            onChange={(patch) => {
              if (patch.stateId !== undefined) setPickerStateId(patch.stateId);
              if (patch.cityId !== undefined) {
                setPickerCityId(patch.cityId);
                setDeveloperId('');
                setDeveloper(null);
                setSelectedProjectIds([]);
              }
            }}
          />
          {pickerHint ? <p className="text-xs text-amber-700">{pickerHint}</p> : null}
          <DeveloperPicker
            cityId={pickerCityId}
            value={developerId}
            excludeDeveloperIds={excludeDeveloperIds}
            onValueChange={(id, dev) => {
              setDeveloperId(id);
              setDeveloper(dev ?? null);
              setSelectedProjectIds([]);
            }}
          />
          {mode === 'projects' ? (
            <ProjectMultiPicker
              cityId={pickerCityId}
              developerId={developerId}
              excludeListingIds={excludeListingIds}
              selectedIds={selectedProjectIds}
              onSelectedIdsChange={setSelectedProjectIds}
              onPostsCacheUpdate={cachePosts}
              disabled={!pickerCityId}
            />
          ) : null}
          {localError ? <p className="text-sm text-red-600">{localError}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={mode === 'projects' ? !canSubmitProjects : !canSubmitDeveloper}
            onClick={handleSubmit}
          >
            {submitLabel ?? (mode === 'projects' ? 'Add projects' : 'Add developer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
