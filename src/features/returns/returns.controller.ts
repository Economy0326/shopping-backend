import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { User } from "../../shared/decorators/user.decorator";
import type { CurrentUser } from "../../shared/current-user";
import { ReturnsService } from "./returns.service";

@UseGuards(JwtAccessGuard)
@Controller("returns")
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get()
  async list(@User() user: CurrentUser, @Query() query: any) {
    return this.returns.list(user, query);
  }

  @Get(":id")
  async detail(@User() user: CurrentUser, @Param("id") id: string) {
    return this.returns.detail(user, Number(id));
  }
}