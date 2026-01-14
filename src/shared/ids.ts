export function makeId(prefix: string) {
  // 예: O-1700000000000-ab12
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}