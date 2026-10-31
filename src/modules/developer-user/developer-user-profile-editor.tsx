"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/common/searchable-select";
import { COMPANY_LOGO_HINT } from "@/modules/app-users/company-logo-field";
import {
  adminUsersService,
  type MasterProfile,
} from "@/services/admin-users.service";
import { listingsService } from "@/services/listings.service";
import { uploadAdminMedia } from "@/services/media.service";
import { apiErrorInfo } from "@/services/password-reset.service";
import { resolveProjectPrefixError } from "@/lib/project-prefix-error";
import { DEV_COMPANY_BIO_MAX, DEV_HEADER_MAX_IMAGES, DEV_HEADER_MAX_VIDEOS } from "@/lib/developer-form-limits";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  profile: MasterProfile;
  /** Bumps when parent refetches master profile — sync form from server. */
  profileRevision?: number;
  canUpdate: boolean;
  onSaved: () => void;
};

const COMPANY_ROLE_LABEL: Record<string, string> = {
  id_owner: "Owner",
  team_member: "Team Member",
};

function resolveCompanyRoleForApi(raw: string): "id_owner" | "team_member" | undefined {
  if (raw === "id_owner" || raw === "team_member") return raw;
  if (raw === "Owner") return "id_owner";
  if (raw === "Team Member") return "team_member";
  return undefined;
}

function readFormFromProfile(profile: MasterProfile) {
  const company = profile.company!;
  const builder = profile.builderProfile!;
  const vids = builder.banners.filter((b) => b.kind === "video");
  let bannerImages: string[];
  if (vids.length) {
    const thumb = builder.banners.find((b) => b.kind === "image")?.url;
    bannerImages = thumb ? [thumb] : [];
  } else {
    bannerImages = builder.banners.filter((b) => b.kind === "image").map((b) => b.url);
  }
  return {
    name: profile.user.name || "",
    companyName: company.name || profile.user.companyName || "",
    gst: company.gst || "",
    companyRole: resolveCompanyRoleForApi(company.companyRole || "") || "",
    website: company.websiteUrl || "",
    prefix: company.prefix || "",
    about: String(builder.about || "").slice(0, DEV_COMPANY_BIO_MAX),
    years: String(builder.years ?? ""),
    bannerImages,
    bannerVideos: vids.map((b) => b.url),
    showcaseIds: profile.showcaseListingIds ?? [],
  };
}

function labelFromUnknown(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return labelFromUnknown(
      rec.name ??
        rec.title ??
        rec.label ??
        rec.projectName ??
        rec.project_name,
    );
  }
  return "";
}

function listingRowLabel(row: Record<string, unknown>): string {
  return (
    labelFromUnknown(row.displayTitle ?? row.display_title) ||
    labelFromUnknown(row.title) ||
    labelFromUnknown(row.propertyName ?? row.property_name) ||
    labelFromUnknown(row.name) ||
    "Untitled"
  );
}

function DeveloperProfileBannerEditor({
  images,
  videos,
  thumbnail,
  disabled,
  onChange,
  onUploadImages,
  onUploadVideos,
  uploading,
}: {
  images: string[];
  videos: string[];
  thumbnail: string | null;
  disabled?: boolean;
  onChange: (next: { images: string[]; videos: string[] }) => void;
  onUploadImages: (files: File[]) => Promise<string[]>;
  onUploadVideos?: (files: File[]) => Promise<string[]>;
  uploading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<"image" | "video" | "thumb">("image");
  const isVideoMode = videos.length > 0;
  const galleryImages = isVideoMode ? [] : images;
  const imageCount = isVideoMode ? 0 : galleryImages.length;
  const thumbUrl = isVideoMode ? thumbnail || images[0] || null : null;

  return (
    <div className="space-y-2">
      <span className="text-sm text-gray-600">Profile banner</span>
      <p className="text-xs text-gray-500">
        Up to {DEV_HEADER_MAX_IMAGES} images, or 1 video with one thumbnail — not both.
        Adding images replaces a video; adding a video replaces images.
      </p>
      <div className="flex flex-wrap gap-2">
        {galleryImages.map((url) => (
          <div key={url} className="relative h-20 w-28 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {!disabled ? (
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                onClick={() =>
                  onChange({
                    images: galleryImages.filter((u) => u !== url),
                    videos: [],
                  })
                }
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        {videos.map((url) => (
          <div key={url} className="relative h-20 w-28 overflow-hidden rounded-lg border">
            <video src={url} className="h-full w-full object-cover" />
            {!disabled ? (
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                onClick={() => onChange({ images: [], videos: [] })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        {thumbUrl && isVideoMode ? (
          <div className="relative">
            <p className="mb-1 text-xs text-gray-500">Video thumbnail</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl} alt="" className="h-20 w-28 rounded-lg border object-cover" />
          </div>
        ) : null}
      </div>
      {!disabled ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || imageCount >= DEV_HEADER_MAX_IMAGES}
            onClick={() => {
              setUploadKind("image");
              inputRef.current?.click();
            }}
          >
            Add image ({imageCount}/{DEV_HEADER_MAX_IMAGES})
          </Button>
          {onUploadVideos ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || videos.length >= DEV_HEADER_MAX_VIDEOS}
              onClick={() => {
                setUploadKind("video");
                inputRef.current?.click();
              }}
            >
              Add video ({videos.length}/{DEV_HEADER_MAX_VIDEOS})
            </Button>
          ) : null}
          {isVideoMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => {
                setUploadKind("thumb");
                inputRef.current?.click();
              }}
            >
              {thumbUrl ? "Replace thumbnail" : "Video thumbnail"}
            </Button>
          ) : null}
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={uploadKind === "video" ? "video/mp4,video/webm" : "image/*"}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (!files.length) return;
          void (async () => {
            if (uploadKind === "video" && onUploadVideos) {
              const nextVideos = await onUploadVideos(files);
              onChange({
                images: [],
                videos: nextVideos.slice(0, DEV_HEADER_MAX_VIDEOS),
              });
            } else if (uploadKind === "thumb" && isVideoMode) {
              const added = await onUploadImages(files);
              onChange({ images: [added[0]], videos });
            } else {
              const added = await onUploadImages(files);
              onChange({
                images: [...galleryImages, ...added].slice(0, DEV_HEADER_MAX_IMAGES),
                videos: [],
              });
            }
          })();
        }}
      />
    </div>
  );
}

export function DeveloperUserProfileEditor({
  userId,
  profile,
  profileRevision = 0,
  canUpdate,
  onSaved,
}: Props) {
  const company = profile.company!;
  const builder = profile.builderProfile!;
  const initialForm = readFormFromProfile(profile);

  const showcaseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of profile.developerShowcase ?? []) {
      const id = String(item.listingId || "").trim();
      const name = String(item.projectName || "").trim();
      if (id && name) map.set(id, name);
    }
    return map;
  }, [profile.developerShowcase]);

  const [name, setName] = useState(initialForm.name);
  const [companyName, setCompanyName] = useState(initialForm.companyName);
  const [gst, setGst] = useState(initialForm.gst);
  const [companyRole, setCompanyRole] = useState(initialForm.companyRole);
  const [website, setWebsite] = useState(initialForm.website);
  const [prefix, setPrefix] = useState(initialForm.prefix);
  const [about, setAbout] = useState(initialForm.about);
  const [years, setYears] = useState(initialForm.years);
  const [bannerImages, setBannerImages] = useState<string[]>(initialForm.bannerImages);
  const [bannerVideos, setBannerVideos] = useState<string[]>(initialForm.bannerVideos);
  const [showcaseIds, setShowcaseIds] = useState<string[]>(initialForm.showcaseIds);
  const [listingOptions, setListingOptions] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState("");
  const [prefixError, setPrefixError] = useState("");
  const [showcasePick, setShowcasePick] = useState("");

  const groupChatEnabled = profile.groupChatEnabled === true;
  const companyRoleLabel = COMPANY_ROLE_LABEL[companyRole] ?? "";

  useEffect(() => {
    const next = readFormFromProfile(profile);
    setName(next.name);
    setCompanyName(next.companyName);
    setGst(next.gst);
    setCompanyRole(next.companyRole);
    setWebsite(next.website);
    setPrefix(next.prefix);
    setAbout(next.about);
    setYears(next.years);
    setBannerImages(next.bannerImages);
    setBannerVideos(next.bannerVideos);
    setShowcaseIds(next.showcaseIds);
  }, [userId, profileRevision]);

  useEffect(() => {
    let cancelled = false;
    const loadTab = (tab: "active" | "inactive") =>
      listingsService.getAdminUserListings(userId, {
        tab,
        categoryGroup: "developer",
        page: 1,
        limit: 100,
      });

    void Promise.all([loadTab("active"), loadTab("inactive")])
      .then(([active, inactive]) => {
        if (cancelled) return;
        const byId = new Map<string, string>();
        for (const res of [active, inactive]) {
          const items = Array.isArray(res.items) ? res.items : [];
          for (const row of items) {
            const rec = row as Record<string, unknown>;
            const id = String(rec.id || "");
            if (!id) continue;
            const label =
              showcaseNameById.get(id) ||
              listingRowLabel(rec) ||
              "Untitled";
            byId.set(id, label);
          }
        }
        for (const [id, label] of showcaseNameById) {
          if (!byId.has(id)) byId.set(id, label);
        }
        setListingOptions(
          [...byId.entries()].map(([id, title]) => ({ id, title })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setListingOptions(
            [...showcaseNameById.entries()].map(([id, title]) => ({
              id,
              title,
            })),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId, showcaseNameById]);

  const listingTitleById = useCallback(
    (id: string) => {
      const fromShowcase = showcaseNameById.get(id);
      if (fromShowcase) return fromShowcase;
      const fromList = listingOptions.find((o) => o.id === id)?.title;
      if (fromList && fromList !== "[object Object]") return fromList;
      return fromList || "Project";
    },
    [listingOptions, showcaseNameById],
  );

  const addShowcase = useCallback(
    (listingId: string) => {
      if (!listingId || showcaseIds.includes(listingId)) return;
      if (showcaseIds.length >= 3) return;
      setShowcaseIds((prev) => [...prev, listingId]);
      setShowcasePick("");
    },
    [showcaseIds],
  );

  const removeShowcase = useCallback((listingId: string) => {
    setShowcaseIds((prev) => prev.filter((id) => id !== listingId));
  }, []);

  const uploadBannerImages = useCallback(async (files: File[]) => {
    setBannerUploading(true);
    try {
      const { images } = await listingsService.uploadAdminUserListingMedia(
        userId,
        files,
      );
      return images;
    } finally {
      setBannerUploading(false);
    }
  }, [userId]);

  const uploadBannerVideos = useCallback(async (files: File[]) => {
    setBannerUploading(true);
    try {
      const { videos } = await listingsService.uploadAdminUserListingVideos(
        userId,
        files,
      );
      return videos;
    } finally {
      setBannerUploading(false);
    }
  }, [userId]);

  const saveProfile = async () => {
    setBusy(true);
    setError("");
    try {
      const trimmedName = name.trim();
      const trimmedCompany = companyName.trim();
      let identitySavedViaPut = false;
      try {
        await adminUsersService.updateUser(userId, {
          name: trimmedName,
          companyName: trimmedCompany,
        });
        identitySavedViaPut = true;
      } catch (userErr) {
        const info = apiErrorInfo(userErr, "");
        if (info.status !== 403) throw userErr;
      }

      const bannerPayload =
        bannerVideos.length > 0
          ? {
              images: bannerImages.slice(0, 1),
              videos: bannerVideos.slice(0, 1),
            }
          : { images: bannerImages.slice(0, 4), videos: [] as string[] };

      const roleForApi = resolveCompanyRoleForApi(companyRole);

      await adminUsersService.patchDeveloperProfile(userId, {
        ...(identitySavedViaPut
          ? {}
          : {
              name: trimmedName || undefined,
              companyName: trimmedCompany || undefined,
            }),
        gstNumber: gst.trim() || null,
        ...(roleForApi ? { companyRole: roleForApi } : {}),
        companyWebsiteUrl: website.trim() || null,
        aboutBuilder: about.trim() || null,
        yearsOfExperience: years.trim() === "" ? null : Number(years),
        bannerMedia: bannerPayload,
        showcaseListingIds: groupChatEnabled ? showcaseIds : undefined,
      });
      if (prefix.trim() !== (company.prefix || "").trim()) {
        await adminUsersService.updateUser(userId, {
          projectPrefix: prefix.trim(),
        });
      }
      onSaved();
    } catch (err) {
      setError(apiErrorInfo(err, "Could not save profile.").message);
    } finally {
      setBusy(false);
    }
  };

  const saveIdentity = async () => {
    setBusy(true);
    setError("");
    try {
      const trimmedName = name.trim();
      const trimmedCompany = companyName.trim();
      let identitySavedViaPut = false;
      try {
        await adminUsersService.updateUser(userId, {
          name: trimmedName,
          companyName: trimmedCompany,
        });
        identitySavedViaPut = true;
      } catch (userErr) {
        const info = apiErrorInfo(userErr, "");
        if (info.status !== 403) throw userErr;
      }
      const roleForApi = resolveCompanyRoleForApi(companyRole);
      await adminUsersService.patchDeveloperProfile(userId, {
        ...(identitySavedViaPut
          ? {}
          : {
              name: trimmedName || undefined,
              companyName: trimmedCompany || undefined,
            }),
        gstNumber: gst.trim() || null,
        ...(roleForApi ? { companyRole: roleForApi } : {}),
        companyWebsiteUrl: website.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorInfo(err, "Could not save identity.").message);
    } finally {
      setBusy(false);
    }
  };

  const savePrefixOnly = async () => {
    setPrefixError("");
    setLogoBusy(true);
    try {
      await adminUsersService.updateUser(userId, { projectPrefix: prefix.trim() });
      onSaved();
    } catch (err) {
      const { message, isPrefixConflict } = resolveProjectPrefixError(
        err,
        "Could not update project prefix.",
      );
      if (isPrefixConflict) setPrefixError(message);
      else setError(message);
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoPick = async (file: File | undefined) => {
    if (!file || !canUpdate) return;
    setLogoBusy(true);
    setError("");
    try {
      const url = await uploadAdminMedia("company_logo", file);
      await adminUsersService.updateUser(userId, { companyLogoUrl: url });
      onSaved();
    } catch (err) {
      setError(apiErrorInfo(err, "Upload failed.").message);
    } finally {
      setLogoBusy(false);
    }
  };

  const showcaseHint = useMemo(() => {
    if (groupChatEnabled) {
      return "Pick up to 3 published projects from the dropdown (display order below).";
    }
    return "Launch Update (group chat) is off — showcase cannot be changed.";
  }, [groupChatEnabled]);

  const showcaseSelectOptions = useMemo(
    () =>
      listingOptions
        .filter((o) => !showcaseIds.includes(o.id))
        .map((o) => ({ value: o.id, label: o.title })),
    [listingOptions, showcaseIds],
  );

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Identity & company</h3>
          {canUpdate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void saveIdentity()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save identity
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-gray-600">Display name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canUpdate || busy}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-600">Company name</span>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={!canUpdate || busy}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-600">GST</span>
            <Input
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              disabled={!canUpdate || busy}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-600">Company role</span>
            <Select
              value={companyRole || undefined}
              onValueChange={(v) => setCompanyRole(v ?? "")}
              disabled={!canUpdate || busy}
            >
              <SelectTrigger>
                {companyRoleLabel ? (
                  <span>{companyRoleLabel}</span>
                ) : (
                  <SelectValue placeholder="Role" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id_owner">Owner</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-gray-600">Website (https)</span>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={!canUpdate || busy}
            />
          </label>
        </div>
        <div className="max-w-sm space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Project prefix
          </p>
          <div className="flex gap-2">
            <Input
              value={prefix}
              onChange={(e) => {
                setPrefix(e.target.value);
                setPrefixError("");
              }}
              disabled={!canUpdate || busy || logoBusy}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canUpdate || busy || logoBusy}
              onClick={() => void savePrefixOnly()}
            >
              Save prefix
            </Button>
          </div>
          {prefixError ? <p className="text-xs text-red-600">{prefixError}</p> : null}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Logo</p>
          <div className="mt-2 flex items-center gap-3">
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo}
                alt=""
                className="h-[72px] w-[120px] rounded-md border object-cover"
              />
            ) : null}
            {canUpdate ? (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={logoBusy}
                  onChange={(e) => void onLogoPick(e.target.files?.[0])}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-gray-500">{COMPANY_LOGO_HINT}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Developer profile</h3>
        <label className="block space-y-1 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-600">About</span>
            <span
              className={cn(
                "text-xs",
                about.length > DEV_COMPANY_BIO_MAX
                  ? "text-red-600"
                  : "text-gray-500",
              )}
            >
              {about.length}/{DEV_COMPANY_BIO_MAX}
            </span>
          </div>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={about}
            onChange={(e) =>
              setAbout(e.target.value.slice(0, DEV_COMPANY_BIO_MAX))
            }
            maxLength={DEV_COMPANY_BIO_MAX}
            rows={4}
            disabled={!canUpdate || busy}
          />
        </label>
        <label className="block max-w-xs space-y-1 text-sm">
          <span className="text-gray-600">Years of experience</span>
          <Input
            type="number"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            disabled={!canUpdate || busy}
          />
        </label>
        <DeveloperProfileBannerEditor
          images={bannerImages}
          videos={bannerVideos}
          thumbnail={bannerVideos.length ? bannerImages[0] ?? null : null}
          disabled={!canUpdate || busy}
          uploading={bannerUploading}
          onUploadImages={uploadBannerImages}
          onUploadVideos={uploadBannerVideos}
          onChange={({ images, videos }) => {
            setBannerImages(images);
            setBannerVideos(videos);
          }}
        />
      </section>

      <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Showcase</h3>
        <p className="text-xs text-gray-500">{showcaseHint}</p>
        {groupChatEnabled && canUpdate ? (
          <div className="max-w-md space-y-1">
            <span className="text-sm text-gray-600">Add project</span>
            <SearchableSelect
              options={showcaseSelectOptions}
              value={showcasePick}
              onValueChange={(v) => {
                addShowcase(v);
              }}
              disabled={
                busy || showcaseIds.length >= 3 || !showcaseSelectOptions.length
              }
              placeholder={
                showcaseIds.length >= 3
                  ? "Maximum 3 projects selected"
                  : listingOptions.length
                    ? "Select a published project"
                    : "No published listings"
              }
              emptyText="No more projects to add."
            />
          </div>
        ) : null}
        {!showcaseIds.length ? (
          <p className="text-sm text-gray-500">No projects in showcase.</p>
        ) : (
          <ul className="space-y-2">
            {showcaseIds.map((id, index) => (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="mr-2 text-xs text-gray-400">#{index + 1}</span>
                  {listingTitleById(id)}
                </span>
                {canUpdate && groupChatEnabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-600"
                    disabled={busy}
                    onClick={() => removeShowcase(id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {canUpdate ? (
        <Button type="button" disabled={busy} onClick={() => void saveProfile()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save profile
        </Button>
      ) : null}
    </div>
  );
}
