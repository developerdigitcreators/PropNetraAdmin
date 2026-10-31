import { apiErrorInfo } from '@/services/password-reset.service';

export const PROJECT_PREFIX_TAKEN_MESSAGE =
  "You couldn't use that name, It is already taken";

function isProjectPrefixField(field: string | undefined): boolean {
  const key = String(field || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return key === 'projectprefix' || key === 'project_prefix';
}

/** Maps duplicate project prefix (409) to the standard admin message. */
export function resolveProjectPrefixError(
  err: unknown,
  fallback: string,
): { message: string; isPrefixConflict: boolean } {
  const info = apiErrorInfo(err, fallback);
  if (info.status === 409 && isProjectPrefixField(info.field)) {
    return { message: PROJECT_PREFIX_TAKEN_MESSAGE, isPrefixConflict: true };
  }
  if (info.status === 409 && /\bproject\s*prefix\b/i.test(info.message)) {
    return { message: PROJECT_PREFIX_TAKEN_MESSAGE, isPrefixConflict: true };
  }
  return { message: info.message, isPrefixConflict: false };
}
