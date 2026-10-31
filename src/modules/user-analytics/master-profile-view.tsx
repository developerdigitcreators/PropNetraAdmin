'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { MaskedContact } from '@/components/contact/masked-contact';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { humanizeRoleName } from '@/lib/role-label';
import { COMPANY_LOGO_HINT } from '@/modules/app-users/company-logo-field';
import { DeviceLockSection } from '@/modules/user-analytics/device-lock-section';
import { ProfileStatsSection, DeveloperShowcaseReadonly } from '@/modules/user-analytics/profile-stats-section';
import { DeveloperUserProfileEditor } from '@/modules/developer-user/developer-user-profile-editor';
import { canUpdateDeveloperUserHub } from '@/modules/app-users/app-users-access';
import {
  adminUsersService,
  type MasterAppRole,
  type MasterBuilderProfile,
  type MasterCategoryGroup,
  type MasterListingTab,
  type MasterProfile,
} from '@/services/admin-users.service';
import { developerHomeService, type AdminTeamMember } from '@/services/developer-home.service';
import { listingsService } from '@/services/listings.service';
import { uploadAdminMedia } from '@/services/media.service';
import { apiErrorInfo } from '@/services/password-reset.service';
import { resolveProjectPrefixError } from '@/lib/project-prefix-error';
import { useAuthStore } from '@/store/use-auth-store';

const ROLE_LABEL: Record<MasterAppRole, string> = {
  developer: 'Developer',
  floor: 'Direct builder floor',
  agent: 'Agent',
};

const LISTING_TABS: Array<{ id: MasterListingTab; label: string }> = [
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
    <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

function listingTitle(item: Record<string, unknown>) {
  return String(item.title || item.name || item.propertyName || 'Untitled');
}

function experienceLabel(profile: MasterBuilderProfile) {
  if (profile.experience) return profile.experience;
  const parts = [
    profile.years ? `${profile.years} years` : '',
    profile.months ? `${profile.months} months` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

export function MasterProfilePage({ userId }: { userId: string }) {
  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb
        items={[
          { label: 'User Profile master data', href: '/user-analytics' },
          { label: 'Profile' },
        ]}
      />
      <div className="flex items-center gap-3">
        <Link
          href="/user-analytics"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
          title="Back to master list"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">User profile</h1>
      </div>
      <MasterProfileBody userId={userId} active />
    </div>
  );
}

export function MasterProfileBodyForHub(props: {
  userId: string;
  active?: boolean;
  onProfileUpdated?: (profile: MasterProfile) => void;
}) {
  return (
    <MasterProfileBody
      userId={props.userId}
      active={props.active ?? true}
      omitHubSections
      onProfileUpdated={props.onProfileUpdated}
    />
  );
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Master profile</DialogTitle>
          <DialogDescription>Role-specific profile from master data.</DialogDescription>
        </DialogHeader>
        <MasterProfileBody userId={userId} active={open} />
      </DialogContent>
    </Dialog>
  );
}

function MasterProfileBody({
  userId,
  active,
  omitHubSections = false,
  onProfileUpdated,
}: {
  userId: string | null;
  active: boolean;
  /** Hide sales team and listings when shown in Developer User hub tabs. */
  omitHubSections?: boolean;
  onProfileUpdated?: (profile: MasterProfile) => void;
}) {
  const canReadTeam = useAuthStore((s) => s.hasPermission('developer_team', 'read'));
  const canUpdateMaster = useAuthStore((s) => s.hasPermission('app_users_master', 'update'));
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canEditDeveloperProfile =
    canUpdateMaster || canUpdateDeveloperUserHub(hasPermission);
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!active || !userId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    adminUsersService
      .getMasterProfile(userId)
      .then((next) => {
        if (!cancelled) {
          setProfile(next);
          onProfileUpdated?.(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProfile(null);
          setError(apiErrorInfo(err, 'Failed to load profile.').message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, userId, reloadKey]);

  if (!userId) return null;

  if (loading && !profile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !profile) return <p className="py-8 text-sm text-red-600">{error}</p>;
  if (!profile) return null;

  const user = profile.user;
  const role = profile.appRole;
  const roleLabel = role ? ROLE_LABEL[role] : humanizeRoleName(user.roleName) || '—';

  return (
    <div className="space-y-4">
      {omitHubSections ? (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.name || '—'}</h2>
              <p className="text-sm text-gray-500">{roleLabel}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {String(user.status || '—').replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Phone</p>
              <p className="mt-0.5 text-sm text-gray-800">
                <MaskedContact
                  value={user.contact}
                  revealKey={`master-profile:${user.id || userId}:contact`}
                />
              </p>
            </div>
            <Field label="Email" value={user.email} />
            <Field label="Company name" value={user.companyName || profile.company?.name} />
          </div>
        </section>
      ) : null}

      {!omitHubSections ? (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.name || '—'}</h2>
              <p className="text-sm text-gray-500">{roleLabel}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {String(user.status || '—').replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Phone</p>
              <p className="mt-0.5 text-sm text-gray-800">
                <MaskedContact value={user.contact} revealKey={`master-profile:${user.id || userId}:contact`} />
              </p>
            </div>
            <Field label="Email" value={user.email} />
            <Field label="Company name" value={user.companyName} />
            <Field label="Address" value={user.address} />
            <Field label="City" value={user.city || user.cityName} />
            <Field label="Role" value={roleLabel} />
            <Field label="Plan" value={user.subscription || user.subscriptionStatus} />
            <Field label="Badge" value={user.badge} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Documents</p>
              <div className="mt-1">
                {!user.documentsStatus || user.documentsStatus === 'none' ? (
                  <span className="text-sm text-gray-400">—</span>
                ) : (
                  <Badge
                    variant="outline"
                    className={
                      DOC_STATUS[user.documentsStatus] || 'border-gray-200 bg-gray-50 text-gray-700'
                    }
                  >
                    {user.documentsStatusLabel || user.documentsStatus}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <DeviceLockSection userId={userId} />

      {profile.appRole === 'developer' &&
      profile.company &&
      profile.builderProfile &&
      canEditDeveloperProfile ? (
        <DeveloperUserProfileEditor
          userId={userId}
          profile={profile}
          profileRevision={reloadKey}
          canUpdate={canEditDeveloperProfile}
          onSaved={() => setReloadKey((n) => n + 1)}
        />
      ) : null}

      {profile.appRole === 'developer' && canEditDeveloperProfile ? null : (
        <>
          {profile.sections.company && profile.company ? (
            <CompanySection
              userId={userId}
              profile={profile}
              onSaved={() => setReloadKey((n) => n + 1)}
            />
          ) : null}
        </>
      )}

      {profile.sections.profileStats && profile.profileStats ? (
        <ProfileStatsSection
          userId={userId}
          stats={profile.profileStats}
          canUpdate={canUpdateMaster}
          onSaved={() => setReloadKey((n) => n + 1)}
        />
      ) : null}

      {profile.appRole === 'developer' && canEditDeveloperProfile ? null : (
        <>
          {profile.sections.developerShowcase !== false && profile.appRole === 'developer' ? (
            <DeveloperShowcaseReadonly items={profile.developerShowcase ?? []} />
          ) : null}

          {profile.sections.builderProfile && profile.builderProfile ? (
            <BuilderSection role={role} builder={profile.builderProfile} />
          ) : null}
        </>
      )}

      {profile.sections.salesTeam && !omitHubSections ? (
        <SalesTeamSection userId={userId} enabled={active} canRead={canReadTeam} />
      ) : null}

      {profile.sections.listings && role && !omitHubSections ? (
        <ProfileListings userId={userId} role={role} profile={profile} />
      ) : null}
    </div>
  );
}

function CompanySection({
  userId,
  profile,
  onSaved,
}: {
  userId: string;
  profile: MasterProfile;
  onSaved: () => void;
}) {
  const company = profile.company!;
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [prefix, setPrefix] = useState(company.prefix);
  const [prefixBusy, setPrefixBusy] = useState(false);
  const [prefixError, setPrefixError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPrefix(company.prefix);
  }, [company.prefix]);

  const saveLogo = async (url: string) => {
    setLogoBusy(true);
    setError('');
    try {
      await adminUsersService.updateUser(userId, { companyLogoUrl: url });
      onSaved();
    } catch (err) {
      setError(apiErrorInfo(err, 'Could not update company logo.').message);
    } finally {
      setLogoBusy(false);
    }
  };

  const onPickLogo = async (file: File | undefined) => {
    if (!file || !profile.companyLogoEditable) return;
    setLogoBusy(true);
    setError('');
    try {
      const url = await uploadAdminMedia('company_logo', file);
      await adminUsersService.updateUser(userId, { companyLogoUrl: url });
      onSaved();
    } catch (err) {
      setError(apiErrorInfo(err, 'Upload failed.').message);
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const savePrefix = async () => {
    setPrefixBusy(true);
    setPrefixError('');
    setError('');
    try {
      await adminUsersService.updateUser(userId, { projectPrefix: prefix.trim() });
      onSaved();
    } catch (err) {
      const { message, isPrefixConflict } = resolveProjectPrefixError(
        err,
        'Could not update project prefix.',
      );
      if (isPrefixConflict) setPrefixError(message);
      else setError(message);
    } finally {
      setPrefixBusy(false);
    }
  };

  return (
    <Section title="Company">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Company name" value={company.name} />
        <Field label="GST" value={company.gst} />
        <Field label="Company role" value={company.companyRole} />
        <Field label="Website" value={company.websiteUrl} />
      </div>
      <div className="max-w-sm space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Project prefix</p>
        <div className="flex gap-2">
          <Input
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value);
              setPrefixError('');
            }}
            disabled={prefixBusy}
            className={prefixError ? 'border-red-500' : undefined}
          />
          <Button type="button" size="sm" disabled={prefixBusy} onClick={() => void savePrefix()}>
            {prefixBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
        {prefixError ? <p className="text-xs text-red-600">{prefixError}</p> : null}
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Logo</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-[72px] w-[120px] items-center justify-center overflow-hidden rounded-md border bg-gray-50">
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt="Company logo" className="h-full w-full object-cover" />
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
                {company.logo ? 'Replace' : 'Upload'}
              </Button>
              {company.logo ? (
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
        {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
      </div>
    </Section>
  );
}

function BannerStrip({ banners }: { banners: MasterBuilderProfile['banners'] }) {
  if (!banners.length) return <Field label="Banner" value="" />;
  return (
    <div className="flex gap-3 overflow-x-auto">
      {banners.map((item) =>
        item.kind === 'video' ? (
          <video key={item.url} src={item.url} controls className="h-32 w-56 shrink-0 rounded-lg border bg-black" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.url} src={item.url} alt="" className="h-32 w-56 shrink-0 rounded-lg border object-cover" />
        ),
      )}
    </div>
  );
}

function ProjectCounts({ builder }: { builder: MasterBuilderProfile }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Total projects" value={builder.projects.total} />
      <Field label="Delivered" value={builder.projects.delivered} />
      <Field label="Under development" value={builder.projects.underDevelopment} />
      <Field label="Total cities" value={builder.citiesLabel || builder.cityCount} />
    </div>
  );
}

function BuilderSection({
  role,
  builder,
}: {
  role: MasterAppRole | null;
  builder: MasterBuilderProfile;
}) {
  if (role === 'agent') {
    const names = builder.associatedDevelopers.map((row) => row.name);
    const ids = builder.associatedDeveloperIds;
    return (
      <Section title="Agent profile">
        {builder.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={builder.photo} alt="" className="h-16 w-16 rounded-full border object-cover" />
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" value={builder.name} />
          <Field label="Years" value={builder.years} />
          <Field label="Months" value={builder.months} />
        </div>
        <Field label="About" value={builder.about} />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Associated developers
          </p>
          {names.length ? (
            <ul className="mt-1 list-disc pl-4 text-sm text-gray-800">
              {names.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : ids.length ? (
            <p className="mt-0.5 text-sm text-gray-800">{ids.join(', ')}</p>
          ) : (
            <p className="mt-0.5 text-sm text-gray-800">—</p>
          )}
        </div>
      </Section>
    );
  }

  return (
    <Section title={role === 'floor' ? 'Builder profile' : 'Builder profile'}>
      {role === 'floor' && builder.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={builder.photo} alt="" className="h-16 w-16 rounded-full border object-cover" />
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {role === 'floor' ? <Field label="Display name" value={builder.displayName} /> : null}
        {role === 'floor' ? <Field label="Address" value={builder.address} /> : null}
        {role === 'floor' ? <Field label="Experience" value={experienceLabel(builder)} /> : null}
        {role === 'developer' ? <Field label="Years" value={builder.years || builder.experience} /> : null}
      </div>
      <Field label="About" value={builder.about} />
      <BannerStrip banners={builder.banners} />
      <ProjectCounts builder={builder} />
      {builder.citiesLabel ? <Field label="Cities" value={builder.citiesLabel} /> : null}
    </Section>
  );
}

function SalesTeamSection({
  userId,
  enabled,
  canRead,
}: {
  userId: string;
  enabled: boolean;
  canRead: boolean;
}) {
  const [team, setTeam] = useState<AdminTeamMember[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!canRead) {
      setError('You need developer team read permission.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    developerHomeService
      .listTeam(userId)
      .then((rows) => {
        if (!cancelled) setTeam(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorInfo(err, 'Failed to load sales team.').message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, canRead]);

  return (
    <Section title="Sales team">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
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
                    <MaskedContact value={member.phone} revealKey={`master-profile-team:${member.id}`} />
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
  );
}

function ProfileListings({
  userId,
  role,
  profile,
}: {
  userId: string;
  role: MasterAppRole;
  profile: MasterProfile;
}) {
  const groups: Array<{ id: MasterCategoryGroup; label: string }> =
    role === 'agent'
      ? [
          { id: 'resale_rent', label: 'Resale / Rent' },
          { id: 'buy_requirement', label: 'Buy requirement' },
        ]
      : [{ id: 'resale_rent', label: 'Resale / Rent' }];

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <ListingGroup
          key={group.id}
          userId={userId}
          group={group.id}
          label={group.label}
          initialTab={
            profile.listings.defaultCategoryGroup === group.id
              ? profile.listings.defaultTab
              : 'active'
          }
        />
      ))}
    </div>
  );
}

function ListingGroup({
  userId,
  group,
  label,
  initialTab,
}: {
  userId: string;
  group: MasterCategoryGroup;
  label: string;
  initialTab: MasterListingTab;
}) {
  const [tab, setTab] = useState<MasterListingTab>(initialTab);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<Partial<Record<MasterListingTab, number>>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    listingsService
      .getMasterUserListings(userId, { tab, categoryGroup: group, page, limit: 20 })
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
