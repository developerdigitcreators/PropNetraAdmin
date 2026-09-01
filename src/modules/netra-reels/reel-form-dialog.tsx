'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  isSupportedReelUrl,
  netraReelsApiError,
  netraReelsService,
  parseReelSource,
  platformLabel,
  type NetraReel,
} from '@/services/netra-reels.service';
import { uploadAdminMedia } from '@/services/media.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';
import { InstagramIcon } from '@/modules/netra-reels/platform-icons';

type ReelFormMode = 'instagram' | 'upload';

type ReelFormDialogProps = {
  open: boolean;
  reel?: NetraReel | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm';
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export function ReelFormDialog({ open, reel, onOpenChange, onSaved }: ReelFormDialogProps) {
  const isEdit = Boolean(reel?.id);
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [previewedUrl, setPreviewedUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => parseReelSource(sourceUrl), [sourceUrl]);
  const urlLooksValid = isSupportedReelUrl(sourceUrl);
  const isUploadReel = reel?.platform === 'upload';
  // Instagram create is disabled in admin; existing Instagram reels still open in Instagram mode for edit.
  const effectiveMode: ReelFormMode = isEdit ? (isUploadReel ? 'upload' : 'instagram') : 'upload';
  const canSubmitInstagram = urlLooksValid;
  const canSubmitUpload = Boolean(videoFile) || (isEdit && isUploadReel);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSubmitting(false);
    setPreviewing(false);
    setVideoFile(null);
    setThumbnailFile(null);
    setThumbnailPreview('');
    if (reel) {
      setSourceUrl(reel.platform === 'upload' ? '' : reel.sourceUrl);
      setTitle(reel.title);
      setCaption(reel.caption);
      setThumbnailUrl(reel.thumbnailUrl);
      setIsActive(reel.isActive);
      setPreviewedUrl(reel.platform === 'upload' ? '' : reel.sourceUrl);
    } else {
      setSourceUrl('');
      setTitle('');
      setCaption('');
      setThumbnailUrl('');
      setIsActive(true);
      setPreviewedUrl('');
    }
  }, [open, reel]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview('');
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const applyPreview = async (url: string) => {
    const trimmed = url.trim();
    if (!isSupportedReelUrl(trimmed)) {
      setError('Paste a valid Instagram reel or post URL.');
      return;
    }
    setPreviewing(true);
    setError('');
    try {
      const preview = await netraReelsService.preview(trimmed);
      setTitle((current) => current || preview.title);
      setCaption((current) => current || preview.caption);
      setThumbnailUrl((current) => current || preview.thumbnailUrl);
      setPreviewedUrl(trimmed);
    } catch (err) {
      setPreviewedUrl(trimmed);
      setError(netraReelsApiError(err, 'Could not fetch preview. You can still save the link.'));
    } finally {
      setPreviewing(false);
    }
  };

  const uploadThumbnailFromFile = async (file: File) => {
    setUploadingThumb(true);
    setError('');
    try {
      const url = await uploadAdminMedia('icon', file);
      setThumbnailUrl(url);
      setThumbnailFile(null);
    } catch (err) {
      setError(netraReelsApiError(err, 'Failed to upload thumbnail.'));
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (effectiveMode === 'instagram') {
        const trimmed = sourceUrl.trim();
        if (!isSupportedReelUrl(trimmed)) {
          setError('Paste a valid Instagram reel or post URL.');
          return;
        }
        const payload = {
          sourceUrl: trimmed,
          title: title.trim() || undefined,
          caption: caption.trim() || undefined,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          isActive,
        };
        if (isEdit && reel) {
          await netraReelsService.update(reel.id, payload);
        } else {
          await netraReelsService.create(payload);
        }
      } else {
        if (isEdit && reel) {
          if (videoFile || thumbnailFile) {
            await netraReelsService.replaceUploadMedia(reel.id, {
              video: videoFile,
              thumbnail: thumbnailFile,
            });
          }
          await netraReelsService.update(reel.id, {
            title: title.trim() || undefined,
            caption: caption.trim() || undefined,
            thumbnailUrl: thumbnailUrl.trim() || undefined,
            isActive,
          });
        } else {
          if (!videoFile) {
            setError('Choose a video file to upload.');
            return;
          }
          await netraReelsService.createUpload({
            video: videoFile,
            thumbnail: thumbnailFile,
            title: title.trim() || undefined,
            caption: caption.trim() || undefined,
            isActive,
          });
        }
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(netraReelsApiError(err, isEdit ? 'Failed to update reel.' : 'Failed to add reel.'));
    } finally {
      setSubmitting(false);
    }
  };

  const displayThumbnail = thumbnailPreview || thumbnailUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 font-sans sm:max-w-xl">
        <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pr-12 pb-4 text-left">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit reel' : 'Add reel'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Upload a video with an optional thumbnail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-6 py-1">
            {/* Instagram create disabled in admin — Add reel is upload-only.
            {!isEdit && (
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button type="button" onClick={() => setMode('instagram')}>
                  Instagram link
                </button>
                <button type="button" onClick={() => setMode('upload')}>
                  Upload video
                </button>
              </div>
            )}
            */}

            {effectiveMode === 'instagram' ? (
              <div className="min-w-0 space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Instagram URL</label>
                <div className="flex min-w-0 items-center gap-2">
                  <Input
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/..."
                    className="h-10 min-w-0 flex-1 bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0"
                    disabled={previewing || !urlLooksValid}
                    onClick={() => applyPreview(sourceUrl)}
                  >
                    {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Preview'}
                  </Button>
                </div>
                {parsed && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500">
                    <InstagramIcon className="h-3.5 w-3.5 shrink-0" />
                    {platformLabel(parsed.platform)} {parsed.kind}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="min-w-0 space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Video file</label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept={VIDEO_ACCEPT}
                    className="hidden"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-start gap-2 bg-gray-50"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {videoFile?.name || (isEdit && reel?.videoUrl ? 'Replace video (optional)' : 'Choose MP4, MOV, or WebM (max 50MB)')}
                    </span>
                  </Button>
                  {isEdit && reel?.videoUrl && !videoFile && (
                    <p className="text-xs text-gray-500">Current video is saved. Pick a file only to replace it.</p>
                  )}
                </div>
              </div>
            )}

            {(displayThumbnail || previewedUrl || (effectiveMode === 'upload' && reel?.videoUrl)) && (
              <div className="flex min-w-0 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-black">
                  {displayThumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayThumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/70">
                      {effectiveMode === 'upload' ? (
                        <Upload className="h-6 w-6" />
                      ) : (
                        <InstagramIcon className="h-6 w-6" />
                      )}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{title || 'Untitled reel'}</p>
                  <p className="mt-1 line-clamp-3 wrap-break-word text-xs text-gray-500">
                    {caption || 'No caption yet'}
                  </p>
                </div>
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
                className="h-10 min-w-0 bg-gray-50"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Optional caption shown on the reel"
                rows={3}
                className="w-full min-w-0 resize-none rounded-lg border border-input bg-gray-50 px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium text-gray-700">Thumbnail</label>
              {effectiveMode === 'instagram' ? (
                <div className="space-y-2">
                  <Input
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="Filled from preview when available"
                    className="h-10 min-w-0 bg-gray-50"
                  />
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadThumbnailFromFile(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-start gap-2 bg-gray-50"
                    disabled={uploadingThumb}
                    onClick={() => thumbInputRef.current?.click()}
                  >
                    {uploadingThumb ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 shrink-0" />
                    )}
                    Upload thumbnail image (optional)
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setThumbnailFile(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-start gap-2 bg-gray-50"
                    disabled={uploadingThumb}
                    onClick={() => thumbInputRef.current?.click()}
                  >
                    {uploadingThumb ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {thumbnailFile?.name || (thumbnailUrl ? 'Replace thumbnail image' : 'Upload thumbnail image (optional)')}
                    </span>
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Active</p>
                <p className="text-xs text-gray-500">Hidden from Watch reels when off.</p>
              </div>
              <Switch
                className="shrink-0"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(Boolean(checked))}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm wrap-break-word text-red-600">{error}</div>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                uploadingThumb ||
                (effectiveMode === 'instagram' ? !canSubmitInstagram : !canSubmitUpload)
              }
              className="bg-primary text-white"
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add reel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
