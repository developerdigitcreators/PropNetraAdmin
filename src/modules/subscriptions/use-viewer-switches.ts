'use client';

import { useEffect, useState } from 'react';
import {
  featureControlsService,
  type FeatureControls,
} from '@/services/feature-controls.service';

export type ViewerSwitches = { developer: boolean; dbf: boolean; agent: boolean };

const FALLBACK: ViewerSwitches = { developer: true, dbf: true, agent: true };

function fromControls(c: FeatureControls | null): ViewerSwitches {
  if (!c) return FALLBACK;
  return {
    developer: c.listing_viewers_developer_enabled !== false,
    dbf: c.listing_viewers_dbf_enabled !== false,
    agent: c.listing_viewers_agent_enabled !== false,
  };
}

/** Listing-viewer contact add-ons stay hidden. Plan-limit reveal follows these switches. */
export function useViewerSwitches(): ViewerSwitches {
  const [value, setValue] = useState<ViewerSwitches>(FALLBACK);
  useEffect(() => {
    featureControlsService
      .get()
      .then((c) => setValue(fromControls(c)))
      .catch(() => undefined);
  }, []);
  return value;
}

export function viewerAddonVisible(type: string, _switches: ViewerSwitches) {
  if (type === 'DEVELOPER_VIEWER_CONTACTS' || type === 'DBF_VIEWER_CONTACTS') return false;
  return true;
}

function quotaPart(value: number | null | undefined) {
  if (value == null) return 'Unlimited';
  if (value === 0) return 'Blocked';
  return String(value);
}

export function viewerQuotaLabel(daily: number | null | undefined, monthly: number | null | undefined) {
  if (daily == null && monthly == null) return 'Unlimited';
  return `${quotaPart(daily)} per day · ${quotaPart(monthly)} per month`;
}
