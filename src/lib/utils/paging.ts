export function parsePaging(url: URL, fallbackLimit = 24) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get('limit') ?? String(fallbackLimit))));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function parseSort(url: URL) {
  // sort=updatedAt:desc | price:asc | soldCount:desc | ratingAvg:desc
  const s = url.searchParams.get('sort') ?? 'updatedAt:desc';
  const [field, dir] = s.split(':');
  return { 
    field: field as 'updatedAt' | 'price' | 'soldCount' | 'ratingAvg',
    dir: (dir === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' 
  };
}