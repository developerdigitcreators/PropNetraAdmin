"use client";

import type { ReactNode } from "react";
import { MarkdownText } from "./markdown-text";
import type { PushImageDisplay, PushTemplateLayout } from "./push-templates";

type Props = {
  layoutType: PushTemplateLayout;
  title: string;
  body: string;
  bodyFormat?: string | null;
  imageUrl?: string;
  expandedImageUrl?: string;
  imageDisplay?: PushImageDisplay;
};

function Header() {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="flex size-4 items-center justify-center rounded bg-primary text-[8px] font-bold text-white">
        P
      </span>
      <span className="text-[10px] font-medium text-gray-500">PropNetra</span>
      <span className="text-[10px] text-gray-400">· now</span>
    </div>
  );
}

function Img({ src, className }: { src?: string; className: string }) {
  if (!src) {
    return (
      <div
        className={`${className} flex items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400`}
      >
        Image required
      </div>
    );
  }
  // Arbitrary external host, so next/image cannot be configured for it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={`${className} object-cover`} />;
}

function Text({
  title,
  body,
  bodyFormat,
  lines = 2,
}: {
  title: string;
  body: string;
  bodyFormat?: string | null;
  lines?: number;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-semibold text-gray-900">
        <MarkdownText value={title.trim() || "Notification title"} format={bodyFormat} />
      </p>
      <p
        className="text-[11px] text-gray-600"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: lines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        <MarkdownText value={body.trim() || "Your message"} format={bodyFormat} />
      </p>
    </div>
  );
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="rounded-xl bg-white p-2.5 shadow-sm">
        <Header />
        {children}
      </div>
    </div>
  );
}

/** Static collapsed + expanded mock of how the Android tray renders each template. */
export function PushTemplatePreview({
  layoutType,
  title,
  body,
  bodyFormat,
  imageUrl,
  expandedImageUrl,
  imageDisplay = "both",
}: Props) {
  const big = expandedImageUrl || imageUrl;
  const showThumb = imageDisplay !== "expanded";
  const showBig = imageDisplay !== "collapsed";
  return (
    <div className="space-y-2 rounded-2xl bg-gray-800 p-3">
      {layoutType === "BANNER_ONLY" ? (
        <>
          <Card label="Collapsed">
            <Img src={imageUrl} className="h-12 w-full rounded-lg" />
          </Card>
          <Card label="Expanded">
            <Img src={big} className="h-28 w-full rounded-lg" />
          </Card>
        </>
      ) : layoutType === "EXPANDABLE_IMAGE" ? (
        <>
          <Card label="Collapsed">
            <div className="flex items-center gap-2">
              <Text title={title} body={body} bodyFormat={bodyFormat} lines={1} />
              {showThumb ? (
                <Img src={imageUrl || big} className="size-9 shrink-0 rounded-md" />
              ) : null}
            </div>
          </Card>
          <Card label="Expanded">
            {showBig ? (
              <>
                <Text title={title} body={body} bodyFormat={bodyFormat} lines={2} />
                <Img src={big} className="mt-2 h-28 w-full rounded-lg" />
              </>
            ) : (
              <div className="flex items-start gap-2">
                <Text title={title} body={body} bodyFormat={bodyFormat} lines={4} />
                <Img src={imageUrl || big} className="size-9 shrink-0 rounded-md" />
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card label="Collapsed / expanded">
          <div className="flex items-start gap-2">
            <Text title={title} body={body} bodyFormat={bodyFormat} lines={4} />
            <Img src={imageUrl} className="size-11 shrink-0 rounded-lg" />
          </div>
        </Card>
      )}
    </div>
  );
}
