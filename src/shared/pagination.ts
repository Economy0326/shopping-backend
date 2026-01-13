export function parsePageSize(query: any, defaultSize = 20, maxSize = 100) {
  const page = Math.max(1, Number(query?.page ?? 1));
  const sizeRaw = Number(query?.size ?? defaultSize);
  const size = Math.min(Math.max(1, sizeRaw), maxSize);
  const skip = (page - 1) * size;
  return { page, size, skip, take: size };
}
