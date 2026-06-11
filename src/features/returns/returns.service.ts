import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePageSize } from '../../shared/pagination';
import { Prisma } from '@prisma/client';
import type { CurrentUser, QueryParams } from '../../shared/current-user';

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser, query: QueryParams) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);

    const where: Prisma.ReturnWhereInput =
      user.role === 'admin' ? {} : { order: { userId: user.sub } };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.return.count({ where }),
      this.prisma.return.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          orderId: true,
          status: true,
          createdAt: true,
          reason: true,
        },
      }),
    ]);

    return { data: rows, meta: { page, size, total } };
  }

  async detail(user: CurrentUser, id: number) {
    const row = await this.prisma.return.findUnique({
      where: { id },
      include: { order: { select: { userId: true } } },
    });
    if (!row) return null;

    if (user.role !== 'admin' && row.order.userId !== user.sub) return null;

    return {
      id: row.id,
      orderId: row.orderId,
      status: row.status,
      reason: row.reason,
      memo: row.memo,
      createdAt: row.createdAt,
    };
  }
}
