import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
  type StrategyOptionsWithRequest,
} from 'passport-jwt';
import type { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { ERR } from '../../../shared/errors';
import type { CurrentUser } from '../../../shared/current-user';

type RefreshJwtPayload = {
  sub: number;
};

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
};

function getCookies(req: Request): Record<string, string | undefined> {
  return (req as RequestWithCookies).cookies ?? {};
}

function cookieExtractor(req: Request): string | null {
  return getCookies(req).refresh_token ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly prisma: PrismaService) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
      passReqToCallback: true,
    };

    super(options);
  }

  async validate(
    req: Request,
    payload: RefreshJwtPayload,
  ): Promise<CurrentUser> {
    const refreshToken = getCookies(req).refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException({
        ...ERR.AUTH_REFRESH_MISSING,
        details: {},
      });
    }

    const userId = Number(payload.sub);

    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException({
        ...ERR.AUTH_REFRESH_INVALID,
        details: { reason: 'bad sub' },
      });
    }

    const session = await this.prisma.refreshSession.findFirst({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tokenHash: true,
        expiresAt: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException({
        ...ERR.AUTH_REFRESH_INVALID,
        details: { reason: 'no session' },
      });
    }

    const ok = await bcrypt.compare(refreshToken, session.tokenHash);

    if (!ok) {
      throw new UnauthorizedException({
        ...ERR.AUTH_REFRESH_INVALID,
        details: { reason: 'hash mismatch' },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        ...ERR.AUTH_REFRESH_INVALID,
        details: { reason: 'user not found' },
      });
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
