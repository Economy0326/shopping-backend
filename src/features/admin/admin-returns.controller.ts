import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { AdminGuard } from '../../shared/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePageSize } from '../../shared/pagination';
import { ReturnStatus } from '@prisma/client';
import type { QueryParams } from '../../shared/current-user';

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller('admin/returns')
export class AdminReturnsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: QueryParams) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.return.count({}),
      this.prisma.return.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          orderId: true,
          status: true,
          reason: true,
          memo: true,
          createdAt: true,
        },
      }),
    ]);

    return { data: rows, meta: { page, size, total } };
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(@Param('id') id: string, @Body() body: { memo?: string }) {
    const ret = await this.prisma.return.findUnique({
      where: { id: Number(id) },
      select: { id: true, status: true },
    });

    if (!ret) {
      throw new HttpException(
        {
          code: 'RETURN_NOT_FOUND',
          message: '반품 정보를 찾을 수 없습니다',
          details: { id },
        },
        404,
      );
    }

    if (ret.status !== ReturnStatus.REQUESTED) {
      throw new HttpException(
        {
          code: 'INVALID_RETURN_STATUS',
          message: 'REQUESTED 상태에서만 승인할 수 있습니다',
          details: { status: ret.status },
        },
        400,
      );
    }

    await this.prisma.return.update({
      where: { id: ret.id },
      data: {
        status: ReturnStatus.APPROVED,
        memo: body?.memo ?? null,
      },
    });

    return true;
  }

  @Post(':id/reject')
  @HttpCode(200)
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string; memo?: string },
  ) {
    const ret = await this.prisma.return.findUnique({
      where: { id: Number(id) },
      select: { id: true, status: true },
    });

    if (!ret) {
      throw new HttpException(
        {
          code: 'RETURN_NOT_FOUND',
          message: '반품 정보를 찾을 수 없습니다',
          details: { id },
        },
        404,
      );
    }

    if (ret.status !== ReturnStatus.REQUESTED) {
      throw new HttpException(
        {
          code: 'INVALID_RETURN_STATUS',
          message: 'REQUESTED 상태에서만 거절할 수 있습니다',
          details: { status: ret.status },
        },
        400,
      );
    }

    await this.prisma.return.update({
      where: { id: ret.id },
      data: {
        status: ReturnStatus.REJECTED,
        reason: body?.reason?.trim() || '반품 불가',
        memo: body?.memo?.trim() || null,
      },
    });

    return true;
  }
}
