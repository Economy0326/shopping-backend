import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePageSize } from '../../shared/pagination';
import { OrderMapper } from '../orders/mappers/order.mapper';
import { Prisma, OrderStatus } from '@prisma/client';
import type { QueryParams } from '../../shared/current-user';

const ORDER_STATUSES = new Set<string>(Object.values(OrderStatus));

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryParams) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);

    const where: Prisma.OrderWhereInput = {};

    const status = String(query?.status ?? '').trim();
    if (ORDER_STATUSES.has(status)) {
      where.status = status as OrderStatus;
    }

    const q = String(query?.q ?? '').trim();

    if (q) {
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { depositor: { contains: q, mode: 'insensitive' } },
        { receiverName: { contains: q, mode: 'insensitive' } },
        { receiverPhone: { contains: q, mode: 'insensitive' } },
        { receiverEmail: { contains: q, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          grandTotal: true,

          paymentMethod: true,
          depositor: true,

          receiverName: true,
          receiverPhone: true,
          receiverEmail: true,

          carrier: true,
          trackingNo: true,
          shippedAt: true,
          deliveredAt: true,

          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              phone: true,
            },
          },

          items: {
            take: 1,
            orderBy: { id: 'asc' },
            select: {
              name: true,
              thumbnailUrl: true,
              optionSummary: true,
            },
          },

          _count: {
            select: {
              items: true,
            },
          },

          return: {
            select: {
              id: true,
              status: true,
              reason: true,
              memo: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const data = rows.map((o) => OrderMapper.toAdminListItem(o));

    return {
      data,
      meta: { page, size, total },
    };
  }
}
