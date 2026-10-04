import { axiosClient } from '@/lib/axios-client';

export const HOME_SECTION_KINDS = [
  { value: 'trending_projects', label: 'Trending Projects', items: 'listing', autoslide: true },
  { value: 'new_launch_1', label: 'New Launch', items: 'listing', autoslide: true },
  { value: 'new_launch_2', label: 'New Launch – Section 2 (legacy)', items: 'listing', autoslide: true },
  { value: 'coming_soon', label: 'Coming Soon Projects', items: 'developer', autoslide: true },
  { value: 'top_developers', label: 'Top Picker', items: 'developer', autoslide: false },
  { value: 'handpicked_developers', label: 'Handpicked Developers', items: 'developer', autoslide: true },
] as const;

export type HomeSectionKind = (typeof HOME_SECTION_KINDS)[number]['value'];

/** Sections managed on the Developer Home admin page, in display order. */
export const HOME_PAGE_KINDS: HomeSectionKind[] = [
  'trending_projects',
  'coming_soon',
  'new_launch_1',
  'top_developers',
  'handpicked_developers',
];

export const kindMeta = (kind: string) =>
  HOME_SECTION_KINDS.find((k) => k.value === kind) ?? HOME_SECTION_KINDS[0];

export type HomeListingPreview = {
  id: string;
  title: string;
  location: string | null;
  priceLabel: string | null;
  imageUrl: string | null;
  developer: { id: string; name: string | null; logoUrl: string | null } | null;
};

export type HomeDeveloperPreview = {
  id: string;
  name: string | null;
  companyName?: string | null;
  logoUrl: string | null;
  contact?: string | null;
  /** Published developer projects in the selected city. */
  projectCount?: number | null;
};

export type TeamGroupDisplay = 'micromarket' | 'location';

export type ComingSoonTeamGroupView = {
  location: { id: string; name: string } | null;
  display?: TeamGroupDisplay[];
  microMarket: { id: string; name: string; cityId: string; cityName: string | null };
  members: Array<{
    id: string;
    name: string;
    phone: string;
    designation: string | null;
    photoUrl: string | null;
    isActive: boolean;
  }>;
};

export type ComingSoonTeamGroupInput = {
  locationId?: string | null;
  microMarketId: string;
  memberIds: string[];
  display: TeamGroupDisplay[];
};

export type HomeSectionItem =
  | { id?: string; postIndex?: number; listing: HomeListingPreview }
  | {
      id?: string;
      developer: HomeDeveloperPreview;
      title: string | null;
      imageUrl: string | null;
      teamGroups?: ComingSoonTeamGroupView[];
    };

export type HomeSectionSummary = {
  id: string;
  kind: HomeSectionKind;
  title: string | null;
  defaultTitle: string;
  stateId: string;
  cityId: string;
  stateName: string | null;
  cityName: string | null;
  autoslide: string;
  isActive: boolean;
  itemCount: number;
};

export type HomeSectionDetail = {
  id: string | null;
  kind: HomeSectionKind;
  title: string | null;
  defaultTitle: string;
  stateId: string;
  cityId: string;
  cityName: string | null;
  autoslide: string;
  isActive: boolean;
  /** Handpicked only: `manual` keeps cards still; `auto` uses the fade step. */
  scrollMode?: 'manual' | 'auto';
  backgroundWidth?: number | null;
  reraBackgroundUrl?: string | null;
  items: HomeSectionItem[];
};

export type SaveHomeSectionPayload = {
  kind: HomeSectionKind;
  stateId?: string;
  cityIds: string[];
  title?: string;
  autoslide: string;
  isActive: boolean;
  scrollMode?: 'manual' | 'auto';
  backgroundWidth?: number;
  reraBackgroundUrl?: string;
  items: Array<{
    listingId?: string;
    postIndex?: number;
    developerId?: string;
    title?: string;
    imageUrl?: string;
    teamGroups?: ComingSoonTeamGroupInput[];
  }>;
};

export type LocationRow = { id: string; name: string; microMarketId: string | null };

export type TeamMicroMarket = { id: string; name: string; cityId: string; cityName: string | null };

export type AdminTeamMember = {
  id: string;
  name: string;
  phone: string;
  designation: string | null;
  photoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  assignments: Array<{ page: string; listingId: string | null }>;
  microMarkets: TeamMicroMarket[];
};

export type NamedRow = { id: string; name: string; stateId?: string | null; cityName?: string | null };

function unwrap<T = unknown>(data: unknown): T {
  let cur: any = data;
  while (cur && typeof cur === 'object' && !Array.isArray(cur) && 'data' in cur && cur.data != null) {
    cur = cur.data;
  }
  return cur as T;
}

function asArray<T = any>(data: unknown): T[] {
  const v = unwrap<any>(data);
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.items)) return v.items;
  return [];
}

export function developerHomeApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: any }; message?: string };
  const d = e?.response?.data;
  const msg = d?.error?.message ?? d?.message ?? d?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

const SECTIONS = '/admin/developer-home-sections';
const DEVELOPERS = '/admin/developers';

export const developerHomeService = {
  listSections: async (params: { stateId?: string; cityId?: string; kind?: string } = {}) =>
    asArray<HomeSectionSummary>((await axiosClient.get(SECTIONS, { params })).data),

  getSection: async (id: string) =>
    unwrap<HomeSectionDetail>((await axiosClient.get(`${SECTIONS}/${id}`)).data),

  byCity: async (cityId: string) =>
    unwrap<{
      cityId: string;
      cityName: string;
      stateId: string;
      kinds: HomeSectionKind[];
      sections: Partial<Record<HomeSectionKind, HomeSectionDetail>>;
      developers: HomeDeveloperPreview[];
    }>((await axiosClient.get(`${SECTIONS}/by-city`, { params: { cityId } })).data),

  saveSection: async (payload: SaveHomeSectionPayload) =>
    unwrap<{ ids: string[]; section: HomeSectionDetail | null }>(
      (await axiosClient.put(SECTIONS, payload)).data,
    ),

  deleteSection: async (id: string) => {
    await axiosClient.delete(`${SECTIONS}/${id}`);
  },

  searchPosts: async (q?: string, cityId?: string) =>
    asArray<{
      id: string;
      title: string;
      location: string | null;
      priceLabel: string | null;
      developerName: string | null;
      imageUrl: string | null;
    }>(
      (
        await axiosClient.get(`${SECTIONS}/posts`, {
          params: { limit: 30, ...(q?.trim() ? { q: q.trim() } : {}), ...(cityId ? { cityId } : {}) },
        })
      ).data,
    ),

  searchSectionDevelopers: async (q?: string) =>
    asArray<HomeDeveloperPreview>(
      (await axiosClient.get(`${SECTIONS}/developers`, { params: q?.trim() ? { q: q.trim() } : {} })).data,
    ),

  searchDevelopers: async (q?: string) =>
    asArray<HomeDeveloperPreview>(
      (await axiosClient.get(DEVELOPERS, { params: q?.trim() ? { q: q.trim() } : {} })).data,
    ),

  listTeam: async (developerId: string) =>
    asArray<AdminTeamMember>((await axiosClient.get(`${DEVELOPERS}/${developerId}/team-members`)).data),

  createMember: async (
    developerId: string,
    payload: { name: string; phone: string; designation?: string; photoUrl?: string; pages?: string[] },
  ) => unwrap<AdminTeamMember>((await axiosClient.post(`${DEVELOPERS}/${developerId}/team-members`, payload)).data),

  updateMember: async (
    developerId: string,
    id: string,
    payload: { name?: string; phone?: string; designation?: string; photoUrl?: string; isActive?: boolean },
  ) =>
    unwrap<AdminTeamMember>(
      (await axiosClient.patch(`${DEVELOPERS}/${developerId}/team-members/${id}`, payload)).data,
    ),

  deleteMember: async (developerId: string, id: string) => {
    await axiosClient.delete(`${DEVELOPERS}/${developerId}/team-members/${id}`);
  },

  setAssignments: async (
    developerId: string,
    id: string,
    assignments: Array<{ page: string; listingId?: string | null }>,
  ) =>
    unwrap<AdminTeamMember>(
      (
        await axiosClient.put(`${DEVELOPERS}/${developerId}/team-members/${id}/assignments`, {
          assignments: assignments.map((a) => (a.listingId ? a : { page: a.page })),
        })
      ).data,
    ),

  setMicroMarkets: async (developerId: string, id: string, microMarketIds: string[]) =>
    unwrap<AdminTeamMember>(
      (
        await axiosClient.put(`${DEVELOPERS}/${developerId}/team-members/${id}/micro-markets`, {
          microMarketIds,
        })
      ).data,
    ),

  states: async (): Promise<NamedRow[]> =>
    asArray<any>(
      (await axiosClient.get('/admin/states', { params: { activeOnly: true } })).data,
    ).map((s) => ({ id: s.id, name: s.name })),

  cities: async (): Promise<NamedRow[]> =>
    asArray<any>(
      (await axiosClient.get('/admin/cities', { params: { activeOnly: true } })).data,
    ).map((c) => ({
      id: c.id,
      name: c.name,
      stateId: c.state_id ?? c.state?.id ?? null,
    })),

  microMarkets: async (cityId: string): Promise<NamedRow[]> =>
    asArray<any>((await axiosClient.get('/admin/micro-markets', { params: { cityId } })).data)
      .filter((m) => m.is_active !== false && (!m.status || m.status === 'approved'))
      .map((m) => ({ id: m.id, name: m.name, cityName: m.city?.name ?? null })),

  locations: async (cityId: string): Promise<LocationRow[]> =>
    asArray<any>((await axiosClient.get('/admin/locations', { params: { cityId } })).data)
      .filter((l) => l.is_active !== false && (!l.status || l.status === 'approved'))
      .map((l) => ({ id: l.id, name: l.name, microMarketId: l.micro_market_id ?? l.micro_market?.id ?? null })),
};
