import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Response } from "express";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ERR } from "../../shared/errors";
import { setRefreshCookie, clearRefreshCookie } from "./auth.cookies";
import { ChangePasswordDto } from "./dto/change-password.dto";

// ✅ type은 클래스 밖에서 선언
type AccessPayload = { sub: number; email: string; role: "user" | "admin" };
type RefreshPayload = { sub: number; tokenId: string };

// ✅ "15m", "14d" 같은 env 값을 seconds(number)로 변환 (TS 오버로드 문제 해결)
function parseExpiresToSeconds(input: string | undefined, fallbackSec: number) {
  if (!input) return fallbackSec;
  const m = input.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!m) return fallbackSec;

  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mul = u === "s" ? 1 : u === "m" ? 60 : u === "h" ? 3600 : u === "d" ? 86400 : 1;

  return n * mul;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private async signAccess(user: { id: number; email: string; role: "user" | "admin" }) {
    const payload: AccessPayload = { sub: user.id, email: user.email, role: user.role };
    const expiresInSec = parseExpiresToSeconds(process.env.ACCESS_EXPIRES_IN, 15 * 60);

    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: expiresInSec, // ✅ number로 넣어서 ts2769 해결
    });
  }

  private async signRefresh(userId: number) {
    const payload: RefreshPayload = {
      sub: userId,
      tokenId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    const expiresInSec = parseExpiresToSeconds(process.env.REFRESH_EXPIRES_IN, 14 * 86400);

    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: expiresInSec, // ✅ number로
    });
  }

  async register(dto: RegisterDto, res: Response) {
    const exist = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exist) {
      throw new HttpException({ ...ERR.AUTH_EMAIL_EXISTS, details: {} }, HttpStatus.CONFLICT);
    }

    const pwHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: pwHash, role: "user" },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const accessToken = await this.signAccess({ id: user.id, email: user.email, role: user.role });
    const refreshToken = await this.signRefresh(user.id);
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: refreshHash },
    });

    setRefreshCookie(res, refreshToken);

    // ✅ 명세: { accessToken, user:{id, role} }
    return { accessToken, user: { id: user.id, role: user.role } };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, role: true, password: true },
    });

    if (!user) {
      throw new HttpException({ ...ERR.AUTH_INVALID_CREDENTIALS, details: {} }, HttpStatus.UNAUTHORIZED);
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new HttpException({ ...ERR.AUTH_INVALID_CREDENTIALS, details: {} }, HttpStatus.UNAUTHORIZED);
    }

    const accessToken = await this.signAccess({ id: user.id, email: user.email, role: user.role });
    const refreshToken = await this.signRefresh(user.id);

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: refreshHash },
    });

    setRefreshCookie(res, refreshToken);

    return { accessToken, user: { id: user.id, role: user.role } };
  }

  async me(payload: { sub: number; email: string; role: "user" | "admin" }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }

  async refresh(payload: { sub: number; email: string; role: "user" | "admin" }, res: Response) {
    const accessToken = await this.signAccess({ id: payload.sub, email: payload.email, role: payload.role });

    // refresh 회전(명세: body는 accessToken만)
    const newRefresh = await this.signRefresh(payload.sub);
    const refreshHash = await bcrypt.hash(newRefresh, 10);

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { refreshTokenHash: refreshHash },
    });

    setRefreshCookie(res, newRefresh);
    return { accessToken };
  }

  async logout(userId: number | null, res: Response) {
    clearRefreshCookie(res);

    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    }

    return true; // ✅ { data: true }
  }

  // -------------------------
  // Password management
  // -------------------------
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, password: true } });
    if (!user) throw new HttpException({ ...ERR.NOT_FOUND, details: {} }, HttpStatus.NOT_FOUND);

    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) throw new HttpException({ ...ERR.AUTH_INVALID_CREDENTIALS, details: {} }, HttpStatus.UNAUTHORIZED);

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: newHash, refreshTokenHash: null } });

    return true;
  }

  async passwordResetRequest(email: string) {
    // Always succeed to avoid user enumeration
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) return true;

    const expiresInSec = parseExpiresToSeconds(process.env.PW_RESET_EXPIRES_IN, 60 * 60); // default 1h
    const token = await this.jwt.signAsync({ sub: user.id, type: "pw-reset" }, { secret: process.env.JWT_PASSWORD_RESET_SECRET!, expiresIn: expiresInSec });

    // In production send email; for now log to console (or integrate mailer)
    // Example: sendEmail(user.email, `Reset token: ${token}`)
    console.log("[password-reset] token for:", user.email, token);

    return true;
  }

  async passwordResetConfirm(token: string, newPassword: string, res: Response) {
    try {
      const payload: any = await this.jwt.verifyAsync(token, { secret: process.env.JWT_PASSWORD_RESET_SECRET! });
      if (!payload || payload.type !== "pw-reset" || !payload.sub) {
        throw new Error("invalid token");
      }

      const userId = Number(payload.sub);
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new Error("user not found");

      const newHash = await bcrypt.hash(newPassword, 10);
      await this.prisma.user.update({ where: { id: userId }, data: { password: newHash, refreshTokenHash: null } });

      // Clear refresh cookie if present
      clearRefreshCookie(res);

      return true;
    } catch (e) {
      throw new HttpException({ ...ERR.INVALID_TOKEN, details: {} }, HttpStatus.BAD_REQUEST);
    }
  }
}
