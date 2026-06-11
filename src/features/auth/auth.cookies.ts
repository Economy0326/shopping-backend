import type { CookieOptions, Response } from 'express';

function getSameSite(): CookieOptions['sameSite'] {
  const sameSiteRaw = String(
    process.env.COOKIE_SAMESITE ?? 'lax',
  ).toLowerCase();

  return sameSiteRaw === 'none'
    ? 'none'
    : sameSiteRaw === 'strict'
      ? 'strict'
      : 'lax';
}

function parseDurationToMs(input: string, fallbackMs: number) {
  const m = (input ?? '').trim().match(/^(\d+)\s*([smhd])$/i);
  if (!m) return fallbackMs;

  const n = Number(m[1]);
  const u = m[2].toLowerCase();

  const mul =
    u === 's'
      ? 1000
      : u === 'm'
        ? 60_000
        : u === 'h'
          ? 3_600_000
          : u === 'd'
            ? 86_400_000
            : 1;

  return n * mul;
}

export function setRefreshCookie(res: Response, token: string) {
  const secure = String(process.env.COOKIE_SECURE ?? 'false') === 'true';
  const sameSite = getSameSite();

  const domain = (process.env.COOKIE_DOMAIN ?? '').trim();

  const maxAge = parseDurationToMs(
    process.env.REFRESH_EXPIRES_IN ?? '14d',
    14 * 86_400_000,
  );

  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure,
    sameSite,
    domain: domain.length ? domain : undefined,
    path: '/',
    maxAge,
  });
}

export function clearRefreshCookie(res: Response) {
  const secure = String(process.env.COOKIE_SECURE ?? 'false') === 'true';
  const sameSite = getSameSite();

  const domain = (process.env.COOKIE_DOMAIN ?? '').trim();

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure,
    sameSite,
    domain: domain.length ? domain : undefined,
    path: '/',
  });
}
