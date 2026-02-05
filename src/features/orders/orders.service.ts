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

  private toUserId(user: CurrentUser): number {
    const n = Number((user as any).sub);
    return Number.isFinite(n) ? n : 0;
  }

  private ensureOwnerOrAdmin(user: CurrentUser, orderUserId: number) {
    if (String((user as any)?.role ?? "").toLowerCase() === "admin") return;
    if (String((user as any)?.sub) !== String(orderUserId)) {
      throw new ForbiddenException({ ...ERR.FORBIDDEN, details: {} } as any);
    }
  }

  /**
   * ✅ 최종 확정: optionValues 기반 variantId 결정
   *
   * 매칭 절차
   * 1) productId로 해당 상품의 옵션(option) 조회 (groupKey=size/color)
   * 2) optionValues(size/color)의 value → optionId 매칭
   * 3) (sizeOptionId, colorOptionId)로 variant 탐색
   * 4) 없으면 400/404 처리
   */
  private async resolveVariantId(
    tx: PrismaService,
    params: { productId: number; optionValues: { size?: string; color?: string } }
  ) {
    const { productId } = params;

    const sizeValue = params.optionValues?.size != null ? String(params.optionValues.size).trim() : "";
    const colorValue = params.optionValues?.color != null ? String(params.optionValues.color).trim() : "";

    // value가 들어왔는데 공백이면 invalid
    if ((params.optionValues?.size && !sizeValue) || (params.optionValues?.color && !colorValue)) {
      throw new HttpException(
        {
          code: "VALIDATION_ERROR",
          message: "optionValues 값이 비어있습니다",
          details: { productId, optionValues: params.optionValues },
        },
        400
      );
    }

    // 이 상품에 옵션 자체가 있는지 확인(있는데 optionValues가 비면 400)
    const hasAnyOptions = await tx.productOption.findFirst({
      where: { productId },
      select: { id: true },
    });

    // 옵션 없는 상품(=DEFAULT variant) 허용
    if (!hasAnyOptions) {
      const v = await tx.productVariant.findFirst({
        where: { productId, sizeOptionId: null, colorOptionId: null },
        select: { id: true },
      });
      if (!v) {
        throw new NotFoundException({
          ...ERR.VARIANT_NOT_FOUND,
          details: { productId, reason: "no default variant" },
        } as any);
      }
      return v.id;
    }

    // 옵션 있는 상품인데 optionValues가 둘 다 비어있으면 명세상 400
    if (!sizeValue && !colorValue) {
      throw new HttpException(
        {
          code: "VALIDATION_ERROR",
          message: "옵션이 있는 상품은 optionValues가 필요합니다",
          details: { productId },
        },
        400
      );
    }

    // value → optionId 매칭
    const [sizeOpt, colorOpt] = await Promise.all([
      sizeValue
        ? tx.productOption.findFirst({
            where: { productId, groupKey: "size", value: sizeValue },
            select: { id: true },
          })
        : Promise.resolve(null),
      colorValue
        ? tx.productOption.findFirst({
            where: { productId, groupKey: "color", value: colorValue },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (sizeValue && !sizeOpt) {
      throw new HttpException(
        {
          code: "VALIDATION_ERROR",
          message: "optionValues.size가 상품 옵션과 일치하지 않습니다",
          details: { productId, size: sizeValue },
        },
        400
      );
    }
    if (colorValue && !colorOpt) {
      throw new HttpException(
        {
          code: "VALIDATION_ERROR",
          message: "optionValues.color가 상품 옵션과 일치하지 않습니다",
          details: { productId, color: colorValue },
        },
        400
      );
    }

    const sizeId = sizeOpt?.id ?? null;
    const colorId = colorOpt?.id ?? null;

    const found = await tx.productVariant.findFirst({
      where: { productId, sizeOptionId: sizeId, colorOptionId: colorId },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException({
        ...ERR.VARIANT_NOT_FOUND,
        details: { productId, optionValues: params.optionValues, sizeId, colorId },
      } as any);
    }

    return found.id;
  }

  // ✅ items는 optionValues 기반만 허용
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
      // receiver.address 정규화 (zip/zipcode 모두 허용)
      const zip = dto.receiver.address?.zip ?? dto.receiver.address?.zipcode ?? "";
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

      // items 정규화 (variantId 확정)
      const normalizedItems: Array<{ productId: number; qty: number; variantId: number }> = [];
      for (const it of dto.items) {
        const variantId = await this.resolveVariantId(tx as any, {
          productId: it.productId,
          optionValues: it.optionValues,
        });

        normalizedItems.push({
          productId: it.productId,
          qty: it.qty,
          variantId,
        });
      }

      // products 한번에 읽기
      const productIds = Array.from(new Set(normalizedItems.map((i) => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      });

      const pMap = new Map(products.map((p) => [p.id, p]));
      if (products.length !== productIds.length) {
        throw new NotFoundException({ ...ERR.NOT_FOUND, details: { what: "product" } } as any);
      }

      // variants 한번에 읽기
      const variantIds = normalizedItems.map((i) => i.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          productId: true,
          stock: true,
          priceDelta: true,
          sizeOption: { select: { value: true } },
          colorOption: { select: { value: true } },
        },
      });

      const vMap = new Map(variants.map((v) => [v.id, v]));
      if (variants.length !== variantIds.length) {
        throw new NotFoundException({ ...ERR.VARIANT_NOT_FOUND, details: {} } as any);
      }

      const orderItemsData: any[] = [];
      let grandTotal = 0;

      // item별 재고 차감 + 스냅샷 생성
      for (const it of normalizedItems) {
        const p = pMap.get(it.productId);
        const v = vMap.get(it.variantId);

        if (!p || !v) throw new NotFoundException({ ...ERR.NOT_FOUND, details: {} } as any);

        // variant는 반드시 해당 product 소속
        if (v.productId !== it.productId) {
          throw new HttpException(
            { ...ERR.INVALID_VARIANT, details: { productId: it.productId, variantId: it.variantId } },
            400
          );
        }

        // 재고 차감(hold): stock >= qty일 때만 decrement
        const dec = await tx.productVariant.updateMany({
          where: { id: it.variantId, stock: { gte: it.qty } },
          data: { stock: { decrement: it.qty } },
        });

        if (dec.count !== 1) {
          throw new ConflictException({ ...ERR.OUT_OF_STOCK, details: { variantId: it.variantId } } as any);
        }

        const unitPrice = (p.price ?? 0) + (v.priceDelta ?? 0);
        const lineTotal = unitPrice * it.qty;
        grandTotal += lineTotal;

        // 사용자에게 보여줄 옵션 요약(문서/상세에서 쓰는 snapshot)
        const size = v.sizeOption?.value;
        const color = v.colorOption?.value;
        const optionSummary = [color, size].filter(Boolean).join(" / ") || null;

        orderItemsData.push({
          productId: p.id,
          variantId: v.id,
          qty: it.qty,
          price: unitPrice,
          name: p.name,
          thumbnailUrl: p.images?.[0]?.url ?? null,
          optionSummary,
        });
      }

      const userId = this.toUserId(user);

      const order = await tx.order.create({
        data: {
          id: orderId,
          userId,
          status: OrderStatus.AWAITING_DEPOSIT,
          createdAt: now,
          expiresAt,

          receiverName: dto.receiver.name,
          receiverPhone: dto.receiver.phone,
          receiverEmail: dto.receiver.email ?? null,

          zip,
          address1: dto.receiver.address.address1,
          address2: dto.receiver.address.address2,
          memo: dto.receiver.memo ?? null,

          paymentMethod: dto.payment.method,
          depositor: dto.payment.depositor ?? null,

          grandTotal,
          items: { create: orderItemsData },
        },
        select: { id: true },
      });

      // ResponseTransformInterceptor가 최종적으로 { data: ... }로 감쌈
      return { id: order.id };
    });
  }

  async list(user: CurrentUser, query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);
    const isAdmin = String((user as any)?.role ?? "").toLowerCase() === "admin";
    const where: any = isAdmin ? {} : { userId: this.toUserId(user) };

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
      createdAt: o.createdAt.toISOString(),
      expiresAt: o.expiresAt.toISOString(),
      amounts: {
        itemsTotal: o.grandTotal,
        shippingFee: 0,
        discountTotal: 0,
        grandTotal: o.grandTotal,
      },
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

    if (!order) throw new NotFoundException({ ...ERR.ORDER_NOT_FOUND, details: { id } } as any);

    this.ensureOwnerOrAdmin(user, order.userId);

    return {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      expiresAt: order.expiresAt.toISOString(),

      payment: { method: order.paymentMethod, depositor: order.depositor ?? null },

      receiver: {
        name: order.receiverName,
        phone: order.receiverPhone,
        email: order.receiverEmail ?? null,
        address: { zip: order.zip, address1: order.address1, address2: order.address2 },
        memo: order.memo ?? null,
      },

      shipping: {
        carrier: order.carrier ?? null,
        trackingNo: order.trackingNo ?? null,
        shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
        deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      },

      amounts: {
        itemsTotal: order.grandTotal,
        shippingFee: 0,
        discountTotal: 0,
        grandTotal: order.grandTotal,
      },

      items: order.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        variantId: it.variantId, // 내부 ID지만 주문 상세에서는 운영상 OK (명세가 원하면 제거 가능)
        name: it.name,
        qty: it.qty,
        unitPrice: it.price,
        lineTotal: it.price * it.qty,
        thumbnailUrl: it.thumbnailUrl ?? null,
        optionSummary: it.optionSummary ?? null,
      })),

      refundLogs: order.refundLogs.map((r) => ({
        id: r.id,
        amount: r.amount,
        memo: r.memo,
        createdAt: r.createdAt.toISOString(),
      })),

      return: order.return
        ? {
            id: order.return.id,
            status: order.return.status,
            reason: order.return.reason ?? null,
            memo: order.return.memo ?? null,
            createdAt: order.return.createdAt.toISOString(),
          }
        : null,
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
      throw new HttpException(
        { ...ERR.RETURN_ALREADY_EXISTS, details: { returnId: order.return.id } },
        409
      );
    }

    const ret = await this.prisma.return.create({
      data: { orderId: id, status: ReturnStatus.REQUESTED, reason: reason ?? null },
      select: { id: true, status: true },
    });

    return { id: ret.id, status: ret.status };
  }
}
