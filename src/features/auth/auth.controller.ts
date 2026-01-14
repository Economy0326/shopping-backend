import { Body, Controller, Get, Post, Res, UseGuards,HttpCode } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAccessGuard } from "./guards/jwt-access.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { User } from "../../shared/decorators/user.decorator";
import type { CurrentUser } from "../../shared/current-user";
import { OptionalJwtAccessGuard } from "./guards/optional-jwt-access.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @HttpCode(200)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.register(dto, res);
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @UseGuards(JwtAccessGuard)
  @Get("me")
  async me(@User() user: CurrentUser) {
    return this.auth.me(user);
  }

  // 로그아웃은 access 없이도 가능하지만, access 있으면 hash 제거까지 수행
  @UseGuards(OptionalJwtAccessGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@User() user: CurrentUser | undefined, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(user?.sub ?? null, res);
  }

  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(200)
  async refresh(@User() user: CurrentUser, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(user, res);
  }
}