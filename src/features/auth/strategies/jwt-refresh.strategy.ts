import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import type { Request } from "express";
import { PrismaService } from "../../../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { ERR } from "../../../shared/errors";

function cookieExtractor(req: Request): string | null {
  return (req as any)?.cookies?.refresh_token ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
      passReqToCallback: true,
    } as any);
  }

  async validate(req: Request, payload: any) {
    const refreshToken = (req as any)?.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException({ ...ERR.AUTH_REFRESH_MISSING, details: {} } as any);
    }

    const userId = Number(payload?.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException({ ...ERR.AUTH_REFRESH_INVALID, details: { reason: "bad sub" } } as any);
    }

    // ✅ active session 조회
    const session = await this.prisma.refreshSession.findFirst({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, tokenHash: true, expiresAt: true },
    });

    if (!session) {
      throw new UnauthorizedException({ ...ERR.AUTH_REFRESH_INVALID, details: { reason: "no session" } } as any);
    }

    const ok = await bcrypt.compare(refreshToken, session.tokenHash);
    if (!ok) {
      throw new UnauthorizedException({ ...ERR.AUTH_REFRESH_INVALID, details: { reason: "hash mismatch" } } as any);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException({ ...ERR.AUTH_REFRESH_INVALID, details: { reason: "user not found" } } as any);
    }

    // access 전략과 동일한 형태로 넘김
    return { sub: user.id, email: user.email, role: user.role };
  }
}