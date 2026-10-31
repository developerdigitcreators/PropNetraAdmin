'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { MaskedContact } from '@/components/contact/masked-contact';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { humanizeRoleName } from '@/lib/role-label';
import { COMPANY_LOGO_HINT } from '@/modules/app-users/company-logo-field';
import { DeveloperShowcaseReadonly } from '@/modules/user-analytics/profile-stats-section';
import {
  adminUsersService,
  type MasterAppRole,
  type MasterProfile,
} from '@/services/admin-users.service';
import { developerHomeService, type AdminTeamMember } from '@/services/developer-home.service';
import { listingsService } from '@/services/listings.service';
import { uploadAdminMedia } from '@/services/media.service';
import { apiErrorInfo } from '@/services/password-reset.service';
import { useAuthStore } from '@/store/use-auth-store';

type ListingTab = 'active' | 'inactive' | 'in_approval' | 'rejected' | 'expired';
type CategoryGroup = 'resale_rent' | 'buy_requirement';

const ROLE_LABEL: Record<MasterAppRole, string> = {
  developer: 'Developer',
  floor: 'Direct builder floor',
  agent: 'Agent',
};

const LISTING_TABS: Array<{ id: ListingTab; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'in_approval', label: 'In approval' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'expired', label: 'Expired' },
];

const DOC_STATUS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const text = value == null || value === '' ? '—' : String(value);
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 break-words text-sm text-gray-800">{text}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

function listingTitle(item: Record<string, unknown>) {
  return String(item.title || item.name || item.propertyName || 'Untitled');
}

export function MasterProfileDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}) {
  const canReadTeam = useAuthStore((s) => s.hasPermission('developer_team', 'read'));
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [team, setTeam] = useState<AdminTeamMember[]>([]);
  const [teamError, setTeamError] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setProfile(null);
    setLogoError('');
    adminUsersService
      .getMasterProfile(userId)
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorInfo(err, 'Failed to load profile.').message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open || !userId || profile?.appRole !== 'developer') {
      setTeam([]);
      return;
    }
    if (!canReadTeam) {
      setTeamError('You need developer team read permission.');
      return;
    }
    let cancelled = false;
    setTeamLoading(true);
    setTeamError('');
    developerHomeService
      .listTeam(userId)
      .then((rows) => {
        if (!cancelled) setTeam(rows);
      })
      .catch((err) => {
        if (!cancelled) setTeamError(apiErrorInfo(err, 'Failed to load sales team.').message);
      })
      .finally(() => {
        if (!cancelled) setTeamLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId, profile?.appRole, canReadTeam]);

  const saveLogo = async (url: string) => {
    if (!userId || !profile?.companyLogoEditable) return;
    setLogoBusy(true);
    setLogoError('');
    try {
      await adminUsersService.updateUser(userId, { companyLogoUrl: url });
      setProfile((current) =>
        current
          ? {
              ...current,
              company: current.company ? { ...current.company, logo: url } : current.company,
              user: { ...current.user, companyLogoUrl: url },
            }
          : current,
      );
    } catch (err) {
      setLogoError(apiErrorInfo(err, 'Could not update company logo.').message);
    } finally {
      setLogoBusy(false);
    }
  };

  const onPickLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    setLogoError('');
    try {
      const url = await uploadAdminMedia('company_logo', file);
      await saveLogo(url);
    } catch (err) {
      setLogoError(apiErrorInfo(err, 'Upload failed.').message);
      setLogoBusy(false);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const user = profile?.user;
  const role = profile?.appRole;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Master profile</DialogTitle>
          <DialogDescription>
            {role ? ROLE_LABEL[role] : 'Role-specific profile'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="py-8 text-sm text-red-600">{error}</p>
        ) : profile && user ? (
          <div className="space-y-4 pb-2">
            <section className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user.name || '—'}</p>
                  <p className="text-sm text-gray-500">
                    {role ? ROLE_LABEL[role] : humanizeRoleName(user.roleName) || '—'}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {String(user.status || '—').replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Phone</p>
                  <p className="mt-0.5 text-sm text-gray-800">
                    <MaskedContact value={user.contact} revealKey={`master-profile:${user.id}:contact`} />
                  </p>
                </div>
                <Field label="Email" value={user.email} />
                <Field label="City" value={user.city || user.cityName} />
                <Field
                  label="Plan"
                  value={
                    user.subscriptionStatus ||
                    user.subscription ||
                    (user.planCode ? String(user.planCode).replace(/_/g, ' ') : '')
                  }
                />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Documents
                  </p>
                  <div className="mt-1">
                    {!user.documentsStatus || user.documentsStatus === 'none' ? (
                      <span className="text-sm text-gray-400">—</span>
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          DOC_STATUS[user.documentsStatus] ||
                          'border-gray-200 bg-gray-50 text-gray-700'
                        }
                      >
                        {user.documentsStatusLabel || user.documentsStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {role === 'developer' && profile.company ? (
              <Section title="Company">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Name" value={profile.company.name} />
                  <Field label="Project prefix" value={profile.company.prefix} />
                  <Field label="GST" value={profile.company.gst} />
                  <Field label="Company role" value={profile.company.companyRole} />
                  <Field label="Website" value={profile.company.websiteUrl} />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Logo</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-[72px] w-[120px] items-center justify-center overflow-hidden rounded-md border bg-gray-50">
                      {profile.company.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.company.logo} alt="Company logo" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                    {profile.companyLogoEditable ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={logoBusy}
                          onClick={() => fileRef.current?.click()}
                        >
                          {logoBusy ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-1.5 h-4 w-4" />
                          )}
                          {profile.company.logo ? 'Replace' : 'Upload'}
                        </Button>
                        {profile.company.logo ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50 hover:text-red-700"
                            disabled={logoBusy}
                            onClick={() => void saveLogo('')}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => void onPickLogo(e.target.files?.[0])}
                        />
                      </div>
                    ) : null}
                  </div>
                  {profile.companyLogoEditable ? (
                    <p className="mt-2 text-xs text-gray-500">{COMPANY_LOGO_HINT}</p>
                  ) : null}
                  {logoError ? <p className="mt-1 text-xs text-red-500">{logoError}</p> : null}
                </div>
              </Section>
            ) : null}

            {role === 'developer' && profile.sections.developerShowcase !== false ? (
              <DeveloperShowcaseReadonly items={profile.developerShowcase ?? []} />
            ) : null}

            {profile.builderProfile && (role === 'developer' || role === 'floor' || role === 'agent') ? (
              <Section title={role === 'agent' ? 'Agent profile' : 'Builder profile'}>
                {role === 'agent' && profile.builderProfile.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.builderProfile.photo}
                    alt=""
                    className="h-16 w-16 rounded-full border object-cover"
                  />
                ) : null}
                {role !== 'agent' && profile.builderProfile.banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.builderProfile.banner}
                    alt="Banner"
                    className="h-28 w-full rounded-lg border object-cover"
                  />
                ) : null}
                <Field label="About" value={profile.builderProfile.about} />
                {role === 'floor' || role === 'agent' ? (
                  <Field label="Experience" value={profile.builderProfile.experience} />
                ) : null}
                {role !== 'agent' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Projects" value={profile.builderProfile.projectCount} />
                    <Field
                      label="Cities"
                      value={
                        profile.builderProfile.citiesLabel ||
                        (profile.builderProfile.cityCount == null
                          ? ''
                          : String(profile.builderProfile.cityCount))
                      }
                    />
                  </div>
                ) : null}
                {role === 'agent' ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Associated developers
                    </p>
                    {profile.builderProfile.associatedDevelopers.length ? (
                      <ul className="mt-1 list-disc pl-4 text-sm text-gray-800">
                        {profile.builderProfile.associatedDevelopers.map((dev) => (
                          <li key={dev.id}>{dev.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-0.5 text-sm text-gray-800">—</p>
                    )}
                  </div>
                ) : null}
              </Section>
            ) : null}

            {role === 'developer' ? (
              <Section title="Sales team">
                {teamLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : teamError ? (
                  <p className="text-sm text-red-600">{teamError}</p>
                ) : !team.length ? (
                  <p className="text-sm text-gray-500">No sales team members.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-2 py-2">Name</th>
                          <th className="px-2 py-2">Phone</th>
                          <th className="px-2 py-2">Designation</th>
                          <th className="px-2 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.map((member) => (
                          <tr key={member.id} className="border-b border-gray-50">
                            <td className="px-2 py-2">{member.name}</td>
                            <td className="px-2 py-2">
                              <MaskedContact
                                value={member.phone}
                                revealKey={`master-profile-team:${member.id}`}
                              />
                            </td>
                            <td className="px-2 py-2">{member.designation || '—'}</td>
                            <td className="px-2 py-2">{member.isActive ? 'Active' : 'Inactive'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            ) : null}

            {userId && role ? (
              <ProfileListings userId={userId} role={role} />
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProfileListings({ userId, role }: { userId: string; role: MasterAppRole }) {
  const groups: Array<{ id: CategoryGroup; label: string }> =
    role === 'agent'
      ? [
          { id: 'resale_rent', label: 'Resale / Rent' },
          { id: 'buy_requirement', label: 'Buy requirement' },
        ]
      : [{ id: 'resale_rent', label: 'Resale / Rent' }];

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <ListingGroup key={group.id} userId={userId} group={group.id} label={group.label} />
      ))}
    </div>
  );
}

function ListingGroup({
  userId,
  group,
  label,
}: {
  userId: string;
  group: CategoryGroup;
  label: string;
}) {
  const [tab, setTab] = useState<ListingTab>('active');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<Partial<Record<ListingTab, number>>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    listingsService
      .getMasterUserListings(userId, {
        tab,
        categoryGroup: group,
        page,
        limit: 20,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(Array.isArray(res.items) ? res.items : []);
        setTotalPages(Math.max(1, Number(res.totalPages || 1)));
        if (res.tabs) setCounts(res.tabs);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(apiErrorInfo(err, 'Failed to load listings.').message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, group, tab, page]);

  return (
    <Section title={label}>
      <div className="flex flex-wrap gap-2">
        {LISTING_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === item.id ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-700'
            }`}
          >
            {item.label}
            {counts[item.id] != null ? <span className="ml-1 opacity-80">({counts[item.id]})</span> : null}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : !items.length ? (
        <p className="text-sm text-gray-500">No listings in this tab.</p>
      ) : (
        <ul className="divide-y rounded-lg border border-gray-100">
          {items.map((item) => (
            <li key={String(item.id)} className="px-3 py-2 text-sm text-gray-800">
              {listingTitle(item)}
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs text-gray-600">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((n) => Math.max(1, n - 1))}
          >
            Previous
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((n) => n + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </Section>
  );
}
