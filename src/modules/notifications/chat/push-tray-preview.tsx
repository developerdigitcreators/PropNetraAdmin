"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MarkdownText } from "./markdown-text";
import type {
  PushActionDraft,
  PushLayoutType,
} from "./push-layout-composer";

/** Android notification_colored_big.xml default. Omit bgColor to keep this. */
export const DEFAULT_PUSH_PEACH = "#F8D7C4";

type PushTrayPreviewProps = {
  layoutType: Exclude<PushLayoutType, "AUTO">;
  title: string;
  body: string;
  bodyFormat?: string | null;
  imageUrl?: string;
  bgColor?: string;
  countdownEndsAt?: string;
  actions?: PushActionDraft[];
  progressMax?: number;
  progress?: number;
  progressIndeterminate?: boolean;
};

function remainingHms(endsAt?: string, now = Date.now()) {
  if (!endsAt) return "00:00:00";
  const ends = new Date(endsAt).getTime();
  if (Number.isNaN(ends)) return "00:00:00";
  const ms = Math.max(0, ends - now);
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function CountdownClock({ endsAt }: { endsAt?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return (
    <p className="mt-2 font-mono text-lg font-semibold tabular-nums tracking-wide text-gray-900">
      {remainingHms(endsAt, now)}
    </p>
  );
}

function ColorCard({
  title,
  body,
  bodyFormat,
  imageUrl,
  bgColor,
  children,
  imageRequired,
}: {
  title: string;
  body: string;
  bodyFormat?: string | null;
  imageUrl?: string;
  bgColor?: string;
  children?: ReactNode;
  imageRequired?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: bgColor || DEFAULT_PUSH_PEACH }}
    >
      <p className="text-sm font-semibold text-gray-900">
        <MarkdownText
          value={title.trim() || "Notification title"}
          format={bodyFormat}
        />
      </p>
      {imageUrl ? (
        // Arbitrary external host, so next/image cannot be configured for it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="mt-2 max-h-36 w-full rounded-lg object-cover"
        />
      ) : imageRequired ? (
        <div className="mt-2 rounded-lg border border-dashed border-black/20 bg-white/40 px-3 py-6 text-center text-xs text-gray-500">
          Image required
        </div>
      ) : null}
      <p className="mt-2 line-clamp-4 text-xs text-gray-700">
        <MarkdownText
          value={body.trim() || "Your message"}
          format={bodyFormat}
        />
      </p>
      {children}
    </div>
  );
}

export function PushTrayPreview({
  layoutType,
  title,
  body,
  bodyFormat,
  imageUrl,
  bgColor,
  countdownEndsAt,
  actions,
  progressMax = 100,
  progress = 0,
  progressIndeterminate,
}: PushTrayPreviewProps) {
  const colorProps = {
    title,
    body,
    bodyFormat,
    imageUrl,
    bgColor,
  };
  const header = (
    <div className="mb-2 flex items-center gap-2">
      <span className="flex size-5 items-center justify-center rounded bg-primary text-[9px] font-bold text-white">
        P
      </span>
      <span className="text-[11px] font-medium text-gray-500">PropNetra</span>
      <span className="text-[11px] text-gray-400">· now</span>
    </div>
  );

  if (layoutType === "TEXT") {
    return (
      <div className="rounded-2xl bg-gray-800 p-3">
        <div className="rounded-xl bg-neutral-100 p-3 shadow-sm">
          {header}
          <p className="text-sm font-semibold text-gray-900">
            <MarkdownText
              value={title.trim() || "Notification title"}
              format={bodyFormat}
            />
          </p>
          <p className="mt-0.5 line-clamp-3 text-xs text-gray-600">
            <MarkdownText
              value={body.trim() || "Your message"}
              format={bodyFormat}
            />
          </p>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="mt-2 max-h-24 w-full rounded-lg object-cover"
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gray-800 p-3">
      <div className="rounded-xl bg-white p-3 shadow-sm">
        {header}
        {layoutType === "IMAGE" ? (
          <ColorCard {...colorProps} imageRequired />
        ) : layoutType === "COUNTDOWN" ? (
          <ColorCard {...colorProps}>
            <CountdownClock endsAt={countdownEndsAt} />
          </ColorCard>
        ) : layoutType === "MULTI_ACTION" ? (
          <ColorCard {...colorProps}>
            <div className="mt-2.5 flex items-start justify-around gap-1 border-t border-black/10 pt-2">
              {(actions || [])
                .filter((a) => a.label.trim() || a.deepLink.trim())
                .slice(0, 3)
                .map((action, i) => (
                  <div
                    key={`${action.label}-${i}`}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  >
                    {action.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={action.iconUrl}
                        alt=""
                        className="size-7 rounded object-contain"
                      />
                    ) : (
                      <span className="size-7 rounded bg-black/10" />
                    )}
                    <span className="truncate text-center text-[11px] text-gray-800">
                      {action.label || "Action"}
                    </span>
                  </div>
                ))}
            </div>
          </ColorCard>
        ) : layoutType === "PROGRESS" ? (
          <ColorCard {...colorProps}>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/15">
              {progressIndeterminate ? (
                <div className="h-full w-1/3 animate-pulse rounded-full bg-gray-800/50" />
              ) : (
                <div
                  className="h-full rounded-full bg-gray-800/60"
                  style={{
                    width: `${Math.min(100, Math.max(0, (progress / Math.max(1, progressMax)) * 100))}%`,
                  }}
                />
              )}
            </div>
          </ColorCard>
        ) : (
          <ColorCard {...colorProps} />
        )}
      </div>
    </div>
  );
}
