import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ERR } from "../../shared/errors";
import { makeId } from "../../shared/ids";
import { parsePageSize } from "../../shared/pagination";
import { CreateOrderDto } from "./dto/create-order.dto";
import type { CurrentUser } from "../../shared/current-user";
import { OrderStatus, ReturnStatus } from "@prisma/client";

function addHours(d: Date, h: number) {
  return new Date(d.getTime() + h * 3600_000);
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureOwnerOrAdmin(user: CurrentUser, orderUserId: number) {
    if (user.role === "admin") return;
    if (user.sub !== orderUserId) {
      throw new ForbiddenException({ ...ERR.FORBIDDEN, details: {} } as any);
    }
  }

  // - receiver.address(zip/zipcode/address1/address2) 지원
  // - payment.depositor 지원
  // - items: variantId 우선, 없으면 optionIds 조합으로 variant 매칭
  async create(user: CurrentUser, dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new HttpException(
        { code: "VALIDATION_ERROR", message: "items가 비어있습니다", details: {} },
        400
      );
    }

    const now = new Date();
    const expiresAt = addHours(now, 12);
    const orderId = makeId("O");

    return this.prisma.$transaction(async (tx) => {
      // receiver address 정규화 (zip/zipcode 모두 허용)
      const zip =
        dto.receiver.address?.zip ??
        dto.receiver.address?.zipcode ??
        "";

      if (!zip) {
        throw new HttpException(
          {
            code: "VALIDATION_ERROR",
            message: "receiver.address.zip(또는 zipcode)가 필요합니다",
            details: {},
          },
          400
        );
      }

      // item별 variantId 결정 (variantId 우선, 없으면 optionIds로 매칭)
      for (const it of dto.items) {
        if (it.variantId) continue;

        const optionIds = it.optionIds ?? [];
        if (optionIds.length === 0) {
          throw new HttpException(
            {
              code: "VALIDATION_ERROR",
              message: "variantId 또는 optionIds가 필요합니다",
              details: { productId: it.productId },
            },
            400
          );
        }

        // 현재 모델이 sizeOptionId + colorOptionId(또는 한쪽 null) 구조라
        // optionIds 1~2개 케이스를 지원
        const a = optionIds[0];
        const b = optionIds[1];

        const found = await tx.productVariant.findFirst({
          where: {
            productId: it.productId,
            OR:
              b == null
                ? [
                    { sizeOptionId: a, colorOptionId: null },
                    { sizeOptionId: null, colorOptionId: a },
                  ]
                : [
                    { sizeOptionId: a, colorOptionId: b },
                    { sizeOptionId: b, colorOptionId: a },
                  ],
          },
          select: { id: true },
        });

        if (!found) {
          throw new NotFoundException({
            ...ERR.VARIANT_NOT_FOUND,
            details: { productId: it.productId, optionIds },
          } as any);
        }

        it.variantId = found.id;
      }

      // items 검증 + 재고 hold (atomic)
      const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          categorySlug: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      });

      const pMap = new Map(products.map((p) => [p.id, p]));
      if (products.length !== productIds.length) {
        throw new NotFoundException({
          ...ERR.NOT_FOUND,
          details: { what: "product" },
        } as any);
      }

      // variant 한번에 읽기
      const variantIds = dto.items.map((i) => i.variantId!);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          productId: true,
          stock: true,
          priceDelta: true,
          sizeOptionId: true,
          colorOptionId: true,
          sizeOption: { select: { value: true } },
          colorOption: { select: { value: true } },
        },
      });

      const vMap = new Map(variants.map((v) => [v.id, v]));
      if (variants.length !== variantIds.length) {
        throw new NotFoundException({
          ...ERR.VARIANT_NOT_FOUND,
          details: {},
        } as any);
      }

      const orderItemsData: any[] = [];
      let grandTotal = 0;

      for (const it of dto.items) {
        const p = pMap.get(it.productId);
        const v = vMap.get(it.variantId!);

        if (!p || !v) {
          throw new NotFoundException({ ...ERR.NOT_FOUND, details: {} } as any);
        }

        // variant는 반드시 해당 product 소속
        if (v.productId !== it.productId) {
          throw new HttpException(
            {
              ...ERR.INVALID_VARIANT,
              details: { productId: it.productId, variantId: it.variantId },
            },
            400
          );
        }

        // 재고 hold: stock >= qty 인 경우에만 decrement
        const dec = await tx.productVariant.updateMany({
          where: { id: it.variantId!, stock: { gte: it.qty } },
          data: { stock: { decrement: it.qty } },
        });
        if (dec.count !== 1) {
          throw new ConflictException({
            ...ERR.OUT_OF_STOCK,
            details: { variantId: it.variantId },
          } as any);
        }

        const unit = (p.price ?? 0) + (v.priceDelta ?? 0);
        grandTotal += unit * it.qty;

        const size = v.sizeOption?.value;
        const color = v.colorOption?.value;
        const optionSummary = [color, size].filter(Boolean).join(" / ") || null;

        orderItemsData.push({
          productId: p.id,
          variantId: v.id,
          qty: it.qty,
          price: unit,
          name: p.name,
          thumbnailUrl: p.images?.[0]?.url ?? null,
          optionSummary,
        });
      }

      // 주문 생성
      const order = await tx.order.create({
        data: {
          id: orderId,
          userId: user.sub,
          status: OrderStatus.AWAITING_DEPOSIT,
          createdAt: now,
          expiresAt,

          receiverName: dto.receiver.name,
          receiverPhone: dto.receiver.phone,
          receiverEmail: dto.receiver.email ?? null,

          zip,
          address1: dto.receiver.address.address1,
          address2: dto.receiver.address.address2,

          // memo는 receiver.memo를 사용
          memo: dto.receiver.memo ?? null,

          paymentMethod: dto.payment.method,
          depositor: dto.payment.depositor ?? null,
          grandTotal,

          items: { create: orderItemsData },
        },
        select: { id: true },
      });

      return { id: order.id };
    });
  }

  async list(user: CurrentUser, query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);
    const where: any = user.role === "admin" ? {} : { userId: user.sub };

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
          items: { take: 1, select: { name: true, thumbnailUrl: true } },
        },
      }),
    ]);

    const data = rows.map((o) => ({
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      expiresAt: o.expiresAt,
      amounts: { itemsTotal: o.grandTotal, shippingFee: 0, discountTotal: 0, grandTotal: o.grandTotal },
      preview: {
        name: o.items?.[0]?.name ?? null,
        thumbnailUrl: o.items?.[0]?.thumbnailUrl ?? null,
      },
    }));

    return { data, meta: { page, size, total } };
  }

  async detail(user: CurrentUser, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        return: true,
        refundLogs: { orderBy: { createdAt: "desc" } },
        user: { select: { id: true } },
      },
    });
    if (!order) {
      throw new NotFoundException({ ...ERR.ORDER_NOT_FOUND, details: { id } } as any);
    }

    this.ensureOwnerOrAdmin(user, order.userId);

    return {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      canceledAt: order.canceledAt,

      amounts: { grandTotal: order.grandTotal },

      items: order.items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId,
        name: it.name,
        optionSummary: it.optionSummary,
        qty: it.qty,
        price: it.price,
        thumbnailUrl: it.thumbnailUrl,
      })),

      receiver: {
        name: order.receiverName,
        phone: order.receiverPhone,
        address: { zip: order.zip, address1: order.address1, address2: order.address2 },
      },

      shipping: {
        carrier: order.carrier,
        trackingNo: order.trackingNo,
      },

      return: order.return ? { id: order.return.id, status: order.return.status } : null,

      refundLogs: order.refundLogs.map((r) => ({
        id: r.id,
        amount: r.amount,
        memo: r.memo,
        createdAt: r.createdAt,
      })),
    };
  }

  async confirmDelivered(user: CurrentUser, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException({ ...ERR.ORDER_NOT_FOUND, details: { id } } as any);

    this.ensureOwnerOrAdmin(user, order.userId);

    if (order.status === OrderStatus.DELIVERED) return true;

    if (order.status !== OrderStatus.SHIPPED) {
      throw new HttpException({ ...ERR.INVALID_ORDER_STATUS, details: { status: order.status } }, 400);
    }

    await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
    });

    return true;
  }

  async cancelRequest(user: CurrentUser, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException({ ...ERR.ORDER_NOT_FOUND, details: { id } } as any);

    this.ensureOwnerOrAdmin(user, order.userId);

    if (order.status === OrderStatus.CANCELED) return true;

    if (order.status !== OrderStatus.AWAITING_DEPOSIT) {
      throw new HttpException({ ...ERR.INVALID_ORDER_STATUS, details: { status: order.status } }, 400);
    }

    await this.prisma.$transaction(async (tx) => {
      // 재고 복구
      for (const it of order.items) {
        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { increment: it.qty } },
          });
        }
      }
      await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELED, canceledAt: new Date() },
      });
    });

    return true;
  }

  async returnRequest(user: CurrentUser, id: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { return: true },
    });
    if (!order) throw new NotFoundException({ ...ERR.ORDER_NOT_FOUND, details: { id } } as any);

    this.ensureOwnerOrAdmin(user, order.userId);

    if (order.status !== OrderStatus.DELIVERED) {
      throw new HttpException({ ...ERR.RETURN_NOT_ALLOWED, details: { status: order.status } }, 400);
    }

    if (order.return) {
      // 주문당 활성 반품 1개, REJECTED 후 재신청 불가(= orderId unique)
      throw new HttpException({ ...ERR.RETURN_ALREADY_EXISTS, details: { returnId: order.return.id } }, 409);
    }

    const ret = await this.prisma.return.create({
      data: { orderId: id, status: ReturnStatus.REQUESTED, reason: reason ?? null },
      select: { id: true },
    });

    return { id: ret.id, status: "REQUESTED" };
  }
}
