import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpException
} from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { makeId } from "src/shared/ids";

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller("admin/notices")
export class AdminNoticesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);

    const q = (query?.q ?? "").toString().trim();

    // ⚠️ Notice 모델 필드명은 프로젝트에 맞게 확인 필요
    // 보통: id, title, body, createdAt, updatedAt
    const where: any = q.length
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notice.count({ where }),
      this.prisma.notice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          title: true,
          body: true,
          createdAt: true,
        },
      }),
    ]);

    return { data: rows, meta: { page, size, total } };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() dto: { title: string; body: string }) {
    const title = (dto?.title ?? "").toString().trim();
    const content = (dto?.body ?? "").toString();

    if (!title || !content) throw new HttpException({ code: "VALIDATION_ERROR", message: "title/body가 필요합니다", details: {} }, 400);

    const id = makeId("n");
    return this.prisma.notice.create({
      data: {id, title, body: content },
      select: { id: true },
    });
  }

  @Patch(":id")
  @HttpCode(200)
  async update(@Param("id") id: string, @Body() dto: { title?: string; body?: string }) {
    const title = dto?.title != null ? String(dto.title).trim() : undefined;
    const body = dto?.body != null ? String(dto.body) : undefined;

    return this.prisma.notice.update({
      where: { id: Number(id) || id as any }, // ⚠️ id 타입(number/string)에 맞게 프로젝트에 맞춰 정리
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(body !== undefined ? { body } : {}),
      },
      select: { id: true },
    });
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id") id: string) {
    await this.prisma.notice.delete({
      where: { id: Number(id) || id as any }, // ⚠️ id 타입 맞추기
    });
    return true;
  }
}
