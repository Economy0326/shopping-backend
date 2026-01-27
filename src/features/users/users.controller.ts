import { Body, Controller, Get, Patch, Put, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { User } from "../../shared/decorators/user.decorator";
import type { CurrentUser } from "../../shared/current-user";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { DefaultAddressDto } from "./dto/default-address.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAccessGuard)
  @Get("me")
  async me(@User() user: CurrentUser) {
    return this.users.getMe(user.sub);
  }

  @UseGuards(JwtAccessGuard)
  @Patch("me/profile")
  async updateProfile(@User() user: CurrentUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.sub, dto);
  }

  @UseGuards(JwtAccessGuard)
  @Put("default-address")
  async setDefaultAddress(@User() user: CurrentUser, @Body() dto: DefaultAddressDto) {
    return this.users.setDefaultAddress(user.sub, dto as any);
  }
}
