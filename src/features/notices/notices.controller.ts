import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { NoticesService } from "./notices.service";
import { NoticeDto } from "./dto/notice.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";

@Controller("notices")
export class NoticesController {
  constructor(private readonly notices: NoticesService) {}

  @Get()
  async list(@Query() query: any) {
    return this.notices.list(query);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    return this.notices.detail(id);
  }

  // 관리자만
  @UseGuards(JwtAccessGuard, AdminGuard)
  @Post()
  @HttpCode(200)
  async create(@Body() dto: NoticeDto) {
    return this.notices.create(dto);
  }

  @UseGuards(JwtAccessGuard, AdminGuard)
  @Put(":id")
  @HttpCode(200)
  async update(@Param("id") id: string, @Body() dto: NoticeDto) {
    return this.notices.update(id, dto);
  }

  @UseGuards(JwtAccessGuard, AdminGuard)
  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id") id: string) {
    return this.notices.remove(id);
  }
}