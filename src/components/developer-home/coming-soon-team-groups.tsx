'use client';

import { useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import {
  developerHomeApiError,
  developerHomeService,
  type AdminTeamMember,
  type ComingSoonTeamGroupView,
  type LocationRow,
  type NamedRow,
  type TeamGroupDisplay,
} from '@/services/developer-home.service';
import { TeamMemberFormDialog } from './team-member-form-dialog';
import { Check, Loader2, MapPin, Plus, Trash2, UserPlus } from 'lucide-react';

export type EditorTeamGroup = {
  key: string;
  locationId: string;
  locationName: string;
  microMarketId: string;
  microMarketName: string;
  memberIds: string[];
  display: TeamGroupDisplay[];
};

const DISPLAY_ORDER: TeamGroupDisplay[] = ['micromarket', 'location'];

function normalizeDisplay(raw: unknown, hasLocation: boolean): TeamGroupDisplay[] {
  const list = Array.isArray(raw) ? raw : [];
  return DISPLAY_ORDER.filter((d) => list.includes(d) && (d !== 'location' || hasLocation));
}

let keySeq = 0;
const nextKey = () => `tg-${Date.now()}-${keySeq++}`;

export function toEditorTeamGroups(groups?: ComingSoonTeamGroupView[]): EditorTeamGroup[] {
  return (groups || []).map((g) => ({
    key: nextKey(),
    locationId: g.location?.id || '',
    locationName: g.location?.name || '',
    microMarketId: g.microMarket.id,
    microMarketName: g.microMarket.name,
    memberIds: (g.members || []).map((m) => m.id),
    display: normalizeDisplay(g.display, !!g.location?.id),
  }));
}

export function toEditorTeamGroupsFromApi(
  groups?: Array<{
    location?: { id: string; name: string } | null;
    microMarket?: { id: string; name: string };
    display?: TeamGroupDisplay[];
    memberIds?: string[];
    members?: Array<{ id: string }>;
  }>,
): EditorTeamGroup[] {
  return (groups || [])
    .filter((g) => g.microMarket?.id)
    .map((g) => ({
      key: nextKey(),
      locationId: g.location?.id || '',
      locationName: g.location?.name || '',
      microMarketId: g.microMarket!.id,
      microMarketName: g.microMarket!.name,
      memberIds: g.memberIds?.length
        ? g.memberIds
        : (g.members || []).map((m) => m.id),
      display: normalizeDisplay(g.display, !!g.location?.id),
    }));
}

/** Returns an error message if any section is incomplete. */
export function teamGroupsError(groups: EditorTeamGroup[]): string | null {
  if (groups.some((g) => !g.microMarketId)) return 'Select a micro-market for every Coming Soon section.';
  if (groups.some((g) => !g.memberIds.length)) return 'Add at least one team member to every Coming Soon section.';
  return null;
}

const cityCache = new Map<string, Promise<{ markets: NamedRow[]; locations: LocationRow[] }>>();
const teamCache = new Map<string, Promise<AdminTeamMember[]>>();

function loadCity(cityId: string) {
  let p = cityCache.get(cityId);
  if (!p) {
    p = Promise.all([developerHomeService.microMarkets(cityId), developerHomeService.locations(cityId)]).then(
      ([markets, locations]) => ({ markets, locations }),
    );
    p.catch(() => cityCache.delete(cityId));
    cityCache.set(cityId, p);
  }
  return p;
}

function loadTeam(developerId: string) {
  let p = teamCache.get(developerId);
  if (!p) {
    p = developerHomeService.listTeam(developerId);
    p.catch(() => teamCache.delete(developerId));
    teamCache.set(developerId, p);
  }
  return p;
}

export function ComingSoonTeamGroups({
  developerId,
  cityId,
  groups,
  disabled,
  onChange,
}: {
  developerId: string;
  cityId: string;
  groups: EditorTeamGroup[];
  disabled?: boolean;
  onChange: (groups: EditorTeamGroup[]) => void;
}) {
  const [markets, setMarkets] = useState<NamedRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [members, setMembers] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addFor, setAddFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([loadCity(cityId), loadTeam(developerId)])
      .then(([city, team]) => {
        if (cancelled) return;
        setMarkets(city.markets);
        setLocations(city.locations);
        setMembers(team);
      })
      .catch((err) => !cancelled && setError(developerHomeApiError(err, 'Could not load locations or team.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cityId, developerId]);

  const marketName = useMemo(() => new Map(markets.map((m) => [m.id, m.name])), [markets]);
  const activeMembers = members.filter((m) => m.isActive);

  const update = (key: string, patch: Partial<EditorTeamGroup>) =>
    onChange(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)));

  const pickLocation = (g: EditorTeamGroup, locationId: string) => {
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return;
    update(g.key, {
      locationId: loc.id,
      locationName: loc.name,
      ...(loc.microMarketId
        ? { microMarketId: loc.microMarketId, microMarketName: marketName.get(loc.microMarketId) || '' }
        : {}),
    });
  };

  const pickMarket = (g: EditorTeamGroup, microMarketId: string) => {
    const keepLocation = locations.find((l) => l.id === g.locationId)?.microMarketId === microMarketId;
    update(g.key, {
      microMarketId,
      microMarketName: marketName.get(microMarketId) || '',
      ...(keepLocation
        ? {}
        : { locationId: '', locationName: '', display: g.display.filter((d) => d !== 'location') }),
    });
  };

  const toggleDisplay = (g: EditorTeamGroup, value: TeamGroupDisplay) => {
    const next = g.display.includes(value)
      ? g.display.filter((d) => d !== value)
      : [...g.display, value];
    update(g.key, { display: DISPLAY_ORDER.filter((d) => next.includes(d)) });
  };
  const toggleMember = (g: EditorTeamGroup, id: string) =>
    update(g.key, {
      memberIds: g.memberIds.includes(id) ? g.memberIds.filter((m) => m !== id) : [...g.memberIds, id],
    });

  const addGroup = () =>
    onChange([
      ...groups,
      {
        key: nextKey(),
        locationId: '',
        locationName: '',
        microMarketId: '',
        microMarketName: '',
        memberIds: [],
        display: [],
      },
    ]);

  const onMemberCreated = (m: AdminTeamMember) => {
    setMembers((prev) => [...prev, m]);
    teamCache.delete(developerId);
    const g = groups.find((x) => x.key === addFor);
    if (g) update(g.key, { memberIds: [...g.memberIds, m.id] });
    setAddFor(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading locations and team…
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-700">
          Team members shown when the card is tapped, grouped by micro-market
        </p>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addGroup} disabled={groups.length >= 20}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add location / micro-market
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {groups.length === 0 && (
        <p className="text-xs text-gray-500">No sections yet. Tapping the card will show no team members.</p>
      )}

      {groups.map((g) => {
        const locOptions = locations
          .filter((l) => !g.microMarketId || !l.microMarketId || l.microMarketId === g.microMarketId)
          .map((l) => ({
            value: l.id,
            label: l.microMarketId && marketName.get(l.microMarketId)
              ? `${l.name} · ${marketName.get(l.microMarketId)}`
              : l.name,
          }));
        return (
          <div key={g.key} className="space-y-2 rounded-md border bg-gray-50 p-3">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-center">
              <SearchableSelect
                options={locOptions}
                value={g.locationId}
                selectedLabel={g.locationName}
                onValueChange={(v) => pickLocation(g, v)}
                disabled={disabled}
                placeholder="Location (optional)"
                searchPlaceholder="Search location"
                emptyText="No locations found."
              />
              <SearchableSelect
                options={markets.map((m) => ({ value: m.id, label: m.name }))}
                value={g.microMarketId}
                selectedLabel={g.microMarketName}
                onValueChange={(v) => pickMarket(g, v)}
                disabled={disabled}
                placeholder="Micro-market *"
                searchPlaceholder="Search micro-market"
                emptyText="No micro-markets found."
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onChange(groups.filter((x) => x.key !== g.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {g.microMarketName && (
              <p className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                {[g.locationName, g.microMarketName].filter(Boolean).join(', ')}
              </p>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      id: 'micromarket',
                      label: 'Show Micromarket',
                      on: g.display.includes('micromarket'),
                      off: false,
                      click: () => toggleDisplay(g, 'micromarket'),
                    },
                    {
                      id: 'location',
                      label: 'Show Location',
                      on: g.display.includes('location'),
                      off: !g.locationId,
                      click: () => toggleDisplay(g, 'location'),
                    },
                  ] as const
                ).map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    disabled={disabled || b.off}
                    onClick={b.click}
                    title={b.off ? 'Select a location first' : undefined}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                      b.on ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {b.label}
                    {b.on && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
              {g.display.length === 0 && (
                <p className="text-xs text-gray-500">
                  Nothing selected: app shows only &apos;Sales Team&apos; and member names.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {activeMembers.map((m) => {
                const on = g.memberIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    disabled={disabled}
                    onClick={() => toggleMember(g, m.id)}
                    className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${
                      on ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-gray-100 text-[10px] flex items-center justify-center">
                        {m.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span>
                      {m.name}
                      {m.designation ? ` · ${m.designation}` : ''}
                    </span>
                    {on && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => setAddFor(g.key)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-primary/50 px-3 py-1 text-xs text-primary"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add new member
                </button>
              )}
            </div>
            {activeMembers.length === 0 && (
              <p className="text-xs text-amber-700">This developer has no team members yet. Add one.</p>
            )}
          </div>
        );
      })}

      <TeamMemberFormDialog
        open={!!addFor}
        developerId={developerId}
        pages={['coming_soon']}
        onClose={() => setAddFor(null)}
        onSaved={onMemberCreated}
      />
    </div>
  );
}
