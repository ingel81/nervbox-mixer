/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() in secure contexts, fallback for HTTP
 */
export function generateUUID(): string {
  // crypto.randomUUID() only works in secure contexts (HTTPS or localhost)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for insecure contexts (HTTP on LAN)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
