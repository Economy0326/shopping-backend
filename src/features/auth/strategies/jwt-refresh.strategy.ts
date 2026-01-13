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

    const user = await this.prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, email: true, role: true, refreshTokenHash: true },
    });

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException({ ...ERR.AUTH_REFRESH_INVALID, details: {} } as any);
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) {
      throw new UnauthorizedException({ ...ERR.AUTH_REFRESH_INVALID, details: {} } as any);
    }

    return { sub: user.id, email: user.email, role: user.role };
  }
}