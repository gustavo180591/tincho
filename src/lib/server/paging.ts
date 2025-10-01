/**
 * Parse pagination parameters from URL
 * @param url URL object from SvelteKit
 * @param defaults Default values for page and limit
 * @returns Object with page, limit and skip values
 */
export function parsePaging(url: URL, defaults = { page: 1, limit: 20 }) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? defaults.page));
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get('limit') ?? defaults.limit)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
