import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { OrderMapper } from "../orders/mappers/order.mapper";

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);

    // 필터/검색 where 구성
    const where: any = {};

    // status filter (프론트는 "AWAITING_DEPOSIT" 같은 enum을 보냄)
    const status = String(query?.status ?? "").trim();
    if (status) {
      where.status = status;
    }

    // q search: 주문ID / 이메일 / 이름(디스플레이네임) / 입금자 / 수령인 정보 등
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
        },
      }),
    ]);

    const data = rows.map((o) => OrderMapper.toAdminListItem(o as any));
    return { data, meta: { page, size, total } };
  }
}
