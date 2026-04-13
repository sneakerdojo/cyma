/**
 * Escapes user-controlled strings before interpolation into HTML templates.
 *
 * Covers the five characters that can break out of HTML text/attribute contexts.
 * Returns an empty string for null/undefined input so callers don't need to guard.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
