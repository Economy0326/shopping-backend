import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { ReturnStatus } from "@prisma/client";

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller("admin/returns")
export class AdminReturnsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.return.count({}),
      this.prisma.return.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: { id: true, orderId: true, status: true, reason: true, memo: true, createdAt: true },
      }),
    ]);
    return { data: rows, meta: { page, size, total } };
  }

  @Post(":id/approve")
  @HttpCode(200)
  async approve(@Param("id") id: string, @Body() body: { memo?: string }) {
    await this.prisma.return.update({
      where: { id: Number(id) },
      data: { status: ReturnStatus.APPROVED, memo: body.memo ?? null },
    });
    return true;
  }

  @Post(":id/reject")
  @HttpCode(200)
  async reject(@Param("id") id: string, @Body() body: { reason?: string }) {
    await this.prisma.return.update({
      where: { id: Number(id) },
      data: { status: ReturnStatus.REJECTED, reason: body.reason ?? "반품 불가", memo: null },
    });
    return true;
  }
}