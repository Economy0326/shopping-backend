import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { OrderMapper } from "../orders/mappers/order.mapper";

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);

    const where: any = {};

    const status = String(query?.status ?? "").trim();
    if (status) {
      where.status = status;
    }

    const q = String(query?.q ?? "").trim();
    if (q) {
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { depositor: { contains: q, mode: "insensitive" } },
        { receiverName: { contains: q, mode: "insensitive" } },
        { receiverPhone: { contains: q, mode: "insensitive" } },
        { receiverEmail: { contains: q, mode: "insensitive" } },
        {
          user: {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
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
            select: { id: true, email: true, displayName: true, phone: true },
          },

          // 추가: 대표상품용
          items: {
            take: 1,
            orderBy: { id: "asc" },
            select: {
              name: true,
              thumbnailUrl: true,
              optionSummary: true,
            },
          },

          // 추가: 총 상품 수
          _count: {
            select: {
              items: true,
            },
          },

          // 추가: 반품 상태
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

    const data = rows.map((o) => OrderMapper.toAdminListItem(o as any));
    return { data, meta: { page, size, total } };
  }
}