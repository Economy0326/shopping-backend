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
import { ChangePasswordDto } from "./dto/change-password.dto";
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";
import { Req } from "@nestjs/common";
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
  async me(@Req() req: any) {
    console.log("REQ.USER =", req.user);
    return req.user;
  }

  // 로그아웃은 access 없이도 가능하지만, access 있으면 hash 제거까지 수행
  @UseGuards(OptionalJwtAccessGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@User() user: CurrentUser | undefined, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(user?.sub ?? null, res);
  }

  @UseGuards(JwtAccessGuard)
  @Post("change-password")
  @HttpCode(200)
  async changePassword(@User() user: CurrentUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto);
  }

  @Post("password-reset/request")
  @HttpCode(200)
  async passwordResetRequest(@Body() dto: PasswordResetRequestDto) {
    return this.auth.passwordResetRequest(dto.email);
  }

  @Post("password-reset/confirm")
  @HttpCode(200)
  async passwordResetConfirm(@Body() dto: PasswordResetConfirmDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.passwordResetConfirm(dto.token, dto.newPassword, res);
  }

  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(200)
  async refresh(@User() user: CurrentUser, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(user, res);
  }
}