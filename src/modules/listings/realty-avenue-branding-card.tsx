"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUrlOrUpload } from "@/components/image-url-or-upload";
import type { ShowToast } from "@/components/common/floating-toast";
import { listingCreateApiError } from "@/services/listings.service";
import {
  realtyAvenueService,
  type RealtyAvenueBranding,
} from "@/services/realty-avenue.service";

/** Logo shown in the app on verified-listing contact popups and "Listing Contacted" chats. */
export function RealtyAvenueBrandingCard({
  canEdit,
  onToast,
}: {
  canEdit: boolean;
  onToast: ShowToast;
}) {
  const [branding, setBranding] = useState<RealtyAvenueBranding | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void realtyAvenueService
      .get()
      .then((b) => {
        if (cancelled) return;
        setBranding(b);
        setDraft(b.logoUrl || "");
      })
      .catch((err) => {
        if (!cancelled)
          onToast(
            listingCreateApiError(err, "Failed to load Realty Avenue branding."),
            "error",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onToast]);

  const save = async (logoUrl: string | null) => {
    setSaving(true);
    try {
      const next = await realtyAvenueService.setLogo(logoUrl);
      setBranding(next);
      setDraft(next.logoUrl || "");
      onToast(logoUrl ? "Realty Avenue logo saved." : "Realty Avenue logo removed.");
    } catch (err) {
      onToast(listingCreateApiError(err, "Failed to update logo."), "error");
    } finally {
      setSaving(false);
    }
  };

  const currentLogo = branding?.logoUrl || null;
  const trimmed = draft.trim();
  const dirty = trimmed !== (currentLogo || "");

  return (
    <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <ImageIcon className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Realty Avenue branding
          </h2>
          <p className="text-xs text-gray-500">
            Shown in the app on verified-listing contact popups and in
            &quot;Listing Contacted&quot; chats.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" /> Loading branding…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            {currentLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentLogo}
                alt="Realty Avenue logo"
                className="size-16 rounded-lg border bg-gray-50 object-contain"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-lg border border-dashed text-[10px] text-gray-400">
                No logo
              </div>
            )}
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-500">Company name</label>
              <Input
                value={branding?.companyName || "Realty Avenue"}
                readOnly
                disabled
              />
            </div>
          </div>

          {canEdit ? (
            <>
              <ImageUrlOrUpload
                label="Logo"
                kind="icon"
                value={draft}
                onChange={setDraft}
                hint="Upload an image (stored on CDN) or paste an HTTPS URL, then save."
                previewClassName="size-16 rounded-lg border bg-gray-50 object-contain"
              />
              <div className="flex justify-end gap-2">
                {currentLogo ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => void save(null)}
                  >
                    Remove logo
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !dirty || !trimmed}
                  onClick={() => void save(trimmed)}
                >
                  {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                  Save logo
                </Button>
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
