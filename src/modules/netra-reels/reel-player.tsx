'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  parseReelSource,
  platformLabel,
  youtubeEmbedSrc,
  type NetraReel,
} from '@/services/netra-reels.service';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Pause,
  Play,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { InstagramIcon } from '@/modules/netra-reels/platform-icons';

type ReelPlayerProps = {
  reels: NetraReel[];
  startIndex?: number;
  onClose: () => void;
};

type YtCommand = 'playVideo' | 'pauseVideo' | 'mute' | 'unMute' | 'seekTo';

function sendYt(iframe: HTMLIFrameElement | null, func: YtCommand, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

function listenYt(iframe: HTMLIFrameElement | null) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
}

function PlatformMark({ platform }: { platform: NetraReel['platform'] }) {
  if (platform === 'instagram') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white">
        <InstagramIcon className="w-3 h-3" /> Instagram
      </span>
    );
  }
  if (platform === 'upload') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white">
        <Upload className="w-3 h-3" /> Upload
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white">
      {platformLabel(platform)}
    </span>
  );
}

function ReelSlide({
  reel,
  index,
  active,
  muted,
  liked,
  onToggleLike,
  onToggleMute,
  onEnded,
  onPlayingChange,
}: {
  reel: NetraReel;
  index: number;
  active: boolean;
  muted: boolean;
  liked: boolean;
  onToggleLike: () => void;
  onToggleMute: () => void;
  onEnded: () => void;
  onPlayingChange: (playing: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onEndedRef = useRef(onEnded);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  onEndedRef.current = onEnded;

  const parsed = useMemo(() => parseReelSource(reel.sourceUrl), [reel.sourceUrl]);
  const platform = reel.platform !== 'unknown' ? reel.platform : parsed?.platform || 'unknown';
  const videoId = reel.externalId || parsed?.externalId || '';
  const nativeSrc = reel.videoUrl;
  const isNative = Boolean(nativeSrc) || platform === 'upload';
  const isYoutube = !isNative && platform === 'youtube' && Boolean(videoId);
  const isInstagram = !isNative && !isYoutube && platform === 'instagram';
  const instagramSrc = reel.embedUrl || parsed?.embedUrl;

  const setPlayState = useCallback(
    (next: boolean) => {
      setPlaying(next);
      onPlayingChange(next);
    },
    [onPlayingChange],
  );

  useEffect(() => {
    if (!active) {
      videoRef.current?.pause();
      if (isYoutube) sendYt(iframeRef.current, 'pauseVideo');
      setPlayState(false);
      setProgress(0);
      return;
    }

    if (isNative && videoRef.current) {
      videoRef.current.play().then(() => setPlayState(true)).catch(() => setPlayState(false));
    }
    if (isYoutube) {
      const iframe = iframeRef.current;
      listenYt(iframe);
      sendYt(iframe, 'playVideo');
      setPlayState(true);
    }
  }, [active, isNative, isYoutube, reel.id, setPlayState]);

  useEffect(() => {
    if (!active || !isYoutube) return;
    sendYt(iframeRef.current, muted ? 'mute' : 'unMute');
  }, [active, isYoutube, muted]);

  useEffect(() => {
    if (!active || !isNative || !videoRef.current) return;
    videoRef.current.muted = muted;
  }, [active, isNative, muted]);

  useEffect(() => {
    if (!active || !isYoutube) return;
    const onMessage = (event: MessageEvent) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      if (!raw || !raw.includes('info')) return;
      try {
        const data = JSON.parse(raw) as {
          event?: string;
          info?: number | { playerState?: number; currentTime?: number; duration?: number };
        };
        if (data.event === 'onStateChange' && data.info === 0) onEndedRef.current();
        if (data.event === 'onStateChange' && data.info === 1) setPlayState(true);
        if (data.event === 'onStateChange' && data.info === 2) setPlayState(false);
        if (data.event === 'infoDelivery' && data.info && typeof data.info === 'object') {
          if (typeof data.info.currentTime === 'number' && typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
            setProgress(data.info.currentTime / data.info.duration);
          }
          if (data.info.playerState === 0) onEndedRef.current();
        }
      } catch {
        // ignore non-player messages
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [active, isYoutube, setPlayState]);

  const togglePlay = () => {
    if (isInstagram) return;
    if (isNative && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => setPlayState(true)).catch(() => undefined);
      } else {
        videoRef.current.pause();
        setPlayState(false);
      }
      return;
    }
    if (isYoutube) {
      if (playing) {
        sendYt(iframeRef.current, 'pauseVideo');
        setPlayState(false);
      } else {
        sendYt(iframeRef.current, 'playVideo');
        setPlayState(true);
      }
    }
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      onToggleLike();
      setHeartBurst(true);
      window.setTimeout(() => setHeartBurst(false), 700);
      return;
    }
    lastTapRef.current = now;
    window.setTimeout(() => {
      if (Date.now() - lastTapRef.current >= 260) togglePlay();
    }, 260);
  };

  const seek = (ratio: number) => {
    const clamped = Math.min(1, Math.max(0, ratio));
    if (isNative && videoRef.current && Number.isFinite(videoRef.current.duration)) {
      videoRef.current.currentTime = clamped * videoRef.current.duration;
      setProgress(clamped);
    }
    if (isYoutube && duration > 0) {
      sendYt(iframeRef.current, 'seekTo', [clamped * duration, true]);
      setProgress(clamped);
    }
  };

  const onSeekPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - rect.left) / rect.width);
  };

  return (
    <section
      data-index={index}
      className="h-dvh w-full snap-start snap-always relative flex items-center justify-center"
    >
      <div className="relative h-full w-full max-w-105 bg-black overflow-hidden sm:h-[min(92vh,820px)] sm:rounded-2xl sm:shadow-2xl">
        {isNative ? (
          <video
            ref={videoRef}
            src={nativeSrc}
            poster={reel.thumbnailUrl || undefined}
            playsInline
            loop={false}
            muted={muted}
            className="absolute inset-0 h-full w-full object-cover"
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (el.duration) setProgress(el.currentTime / el.duration);
            }}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onPlay={() => setPlayState(true)}
            onPause={() => setPlayState(false)}
            onEnded={onEnded}
          />
        ) : isYoutube ? (
          <iframe
            ref={iframeRef}
            title={reel.title || 'YouTube reel'}
            src={active ? youtubeEmbedSrc(videoId, { autoplay: true, muted: true, origin }) : undefined}
            className="absolute inset-0 h-full w-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            onLoad={() => {
              listenYt(iframeRef.current);
              sendYt(iframeRef.current, muted ? 'mute' : 'unMute');
              sendYt(iframeRef.current, 'playVideo');
            }}
          />
        ) : isInstagram && instagramSrc ? (
          active ? (
            <iframe
              title={reel.title || 'Instagram reel'}
              src={`${instagramSrc}${instagramSrc.includes('?') ? '&' : '?'}autoplay=1`}
              className="absolute inset-0 h-full w-full bg-black"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
          ) : reel.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reel.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-black" />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            Unable to play this link
          </div>
        )}

        {!isInstagram && (
          <button
            type="button"
            className="absolute inset-0 z-10"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={handleTap}
          />
        )}

        {!playing && !isInstagram && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="rounded-full bg-black/45 p-4">
              <Play className="w-10 h-10 text-white fill-white" />
            </div>
          </div>
        )}

        {heartBurst && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg animate-ping" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-linear-to-b from-black/55 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-48 bg-linear-to-t from-black/80 to-transparent" />

        <div className="absolute top-4 left-4 z-30">
          <PlatformMark platform={platform} />
        </div>

        <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onToggleLike}
            className="flex flex-col items-center text-white"
            aria-label="Like"
          >
            <span className="rounded-full bg-black/35 p-2.5">
              <Heart className={cn('w-6 h-6', liked && 'fill-red-500 text-red-500')} />
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="flex flex-col items-center text-white"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            <span className="rounded-full bg-black/35 p-2.5">
              {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </span>
          </button>
          {!isInstagram && (
            <button
              type="button"
              onClick={togglePlay}
              className="flex flex-col items-center text-white"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              <span className="rounded-full bg-black/35 p-2.5">
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </span>
            </button>
          )}
        </div>

        <div className="absolute left-4 right-16 bottom-8 z-30 text-white">
          <p className="font-semibold text-sm drop-shadow-sm truncate">{reel.title || 'NetraReel'}</p>
          {reel.caption && (
            <p className="mt-1 text-xs text-white/85 line-clamp-3 whitespace-pre-wrap">{reel.caption}</p>
          )}
        </div>

        {!isInstagram && (
          <div
            className="absolute left-3 right-3 bottom-3 z-40 h-5 flex items-center cursor-pointer"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSeekPointer(e);
            }}
          >
            <div className="h-0.5 w-full rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function ReelPlayer({ reels, startIndex = 0, onClose }: ReelPlayerProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const activeIndexRef = useRef(startIndex);

  const playable = reels;
  const count = playable.length;

  const scrollTo = useCallback((index: number) => {
    const root = scrollerRef.current;
    if (!root) return;
    const slide = root.querySelector<HTMLElement>(`[data-index="${index}"]`);
    slide?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      const next = Math.min(count - 1, Math.max(0, index));
      activeIndexRef.current = next;
      setActiveIndex(next);
      scrollTo(next);
    },
    [count, scrollTo],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => goTo(startIndex), 30);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [goTo, startIndex]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        if (!Number.isFinite(index) || index === activeIndexRef.current) return;
        activeIndexRef.current = index;
        setActiveIndex(index);
      },
      { root, threshold: 0.7 },
    );
    root.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        goTo(activeIndexRef.current + 1);
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        goTo(activeIndexRef.current - 1);
      }
      if (e.key === 'm' || e.key === 'M') setMuted((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, onClose]);

  if (count === 0) {
    return (
      <div className="fixed inset-0 z-80 bg-black/90 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-lg font-semibold">No active reels</p>
          <button type="button" onClick={onClose} className="mt-4 text-sm underline">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-80 bg-black">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-90 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
        aria-label="Close reels"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-90 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex <= 0}
          className="rounded-full bg-white/15 p-2 text-white disabled:opacity-30"
          aria-label="Previous reel"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex >= count - 1}
          className="rounded-full bg-white/15 p-2 text-white disabled:opacity-30"
          aria-label="Next reel"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory overscroll-contain scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {playable.map((reel, index) => (
          <ReelSlide
            key={reel.id}
            reel={reel}
            index={index}
            active={index === activeIndex}
            muted={muted}
            liked={!!liked[reel.id]}
            onToggleLike={() => setLiked((prev) => ({ ...prev, [reel.id]: !prev[reel.id] }))}
            onToggleMute={() => setMuted((v) => !v)}
            onEnded={() => {
              if (index < count - 1) goTo(index + 1);
            }}
            onPlayingChange={() => undefined}
          />
        ))}
      </div>
    </div>
  );
}
