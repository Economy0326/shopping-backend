import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";
import { User } from "../../shared/decorators/user.decorator";
import type { CurrentUser } from "../../shared/current-user";
import { AsksService } from "./asks.service";
import { AskDto } from "./dto/ask.dto";
import { ReplyDto } from "./dto/reply.dto";

@UseGuards(JwtAccessGuard)
@Controller("asks")
export class AsksController {
  constructor(private readonly asks: AsksService) {}

  @Get()
  async list(@User() user: CurrentUser, @Query() query: any) {
    return this.asks.list(user, query);
  }

  @Get(":id")
  async detail(@User() user: CurrentUser, @Param("id") id: string) {
    return this.asks.detail(user, id);
  }

  @Post()
  @HttpCode(200)
  async create(@User() user: CurrentUser, @Body() dto: AskDto) {
    return this.asks.create(user, dto);
  }

  // ✅ 관리자 reply (명세)
  @UseGuards(AdminGuard)
  @Post(":id/replies")
  @HttpCode(200)
  async reply(@User() user: CurrentUser, @Param("id") id: string, @Body() dto: ReplyDto) {
    return this.asks.reply(user, id, dto.body);
  }

  // ✅ soft delete (본인 또는 admin)
  @Delete(":id")
  @HttpCode(200)
  async remove(@User() user: CurrentUser, @Param("id") id: string) {
    return this.asks.remove(user, id);
  }
}
