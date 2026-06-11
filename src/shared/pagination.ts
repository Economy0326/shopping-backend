import type { QueryParams } from './current-user';

function firstQueryValue(
  value: QueryParams[string],
): string | number | boolean | null | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePageSize(
  query: QueryParams = {},
  defaultSize = 20,
  maxSize = 100,
) {
  const pageRaw = firstQueryValue(query.page);
  const sizeRaw = firstQueryValue(query.size);

  const page = Math.max(1, Number(pageRaw ?? 1) || 1);
  const parsedSize = Number(sizeRaw ?? defaultSize) || defaultSize;
  const size = Math.min(Math.max(1, parsedSize), maxSize);
  const skip = (page - 1) * size;

  return { page, size, skip, take: size };
}
