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
} from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { OrderShipDto } from "../orders/dto/order-ship.dto";
import { OrderStatus, ReturnStatus } from "@prisma/client";
import { ERR } from "../../shared/errors";

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({}),
      this.prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          grandTotal: true,
        },
      }),
    ]);

    return { data: rows, meta: { page, size, total } };
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        return: true,
        refundLogs: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!order) throw new HttpException({ ...ERR.ORDER_NOT_FOUND, details: { id } }, 404);
    return order;
  }

  @Post(":id/deposit-confirm")
  @HttpCode(200)
  async deposit(@Param("id") id: string) {
    const o = await this.prisma.order.findUnique({ where: { id } });
    if (!o) throw new HttpException({ ...ERR.ORDER_NOT_FOUND, details: { id } }, 404);

    if (o.status !== OrderStatus.AWAITING_DEPOSIT) {
      throw new HttpException({ ...ERR.INVALID_ORDER_STATUS, details: { status: o.status } }, 400);
    }

    await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.DEPOSIT_CONFIRMED },
    });

    return true;
  }

  @Post(":id/ship")
  @HttpCode(200)
  async ship(@Param("id") id: string, @Body() dto: OrderShipDto) {
    const o = await this.prisma.order.findUnique({ where: { id } });
    if (!o) throw new HttpException({ ...ERR.ORDER_NOT_FOUND, details: { id } }, 404);

    if (o.status !== OrderStatus.DEPOSIT_CONFIRMED) {
      throw new HttpException({ ...ERR.INVALID_ORDER_STATUS, details: { status: o.status } }, 400);
    }

    await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.SHIPPED,
        shippedAt: new Date(),
        carrier: dto.carrier ?? null,
        trackingNo: dto.trackingNo ?? null,
      },
    });

    return true;
  }

  @Post(":id/deliver")
  @HttpCode(200)
  async deliver(@Param("id") id: string) {
    const o = await this.prisma.order.findUnique({ where: { id } });
    if (!o) throw new HttpException({ ...ERR.ORDER_NOT_FOUND, details: { id } }, 404);

    if (o.status === OrderStatus.DELIVERED) return true;

    if (o.status !== OrderStatus.SHIPPED) {
      throw new HttpException({ ...ERR.INVALID_ORDER_STATUS, details: { status: o.status } }, 400);
    }

    await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
    });

    return true;
  }

  /**
   * refund-log 규칙(명세):
   * - 해당 주문에 return.status === APPROVED 존재 시
   *   return.status -> REFUNDED
   * - Orders.status 변경 없음
   *
   * Body는 명세에 없지만 실무적으로 필요하니 최소 형태:
   * { amount: number, memo: string }
   */
  @Post(":id/refund-log")
  @HttpCode(200)
  async refundLog(@Param("id") id: string, @Body() body: { amount: number; memo: string }) {
    if (typeof body?.amount !== "number" || !body?.memo) {
      throw new HttpException(
        { code: "VALIDATION_ERROR", message: "amount/memo가 필요합니다", details: {} },
        400
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { return: true },
    });
    if (!order) throw new HttpException({ ...ERR.ORDER_NOT_FOUND, details: { id } }, 404);

    await this.prisma.$transaction(async (tx) => {
      await tx.refundLog.create({
        data: { orderId: id, amount: body.amount, memo: body.memo },
      });

      if (order.return?.status === ReturnStatus.APPROVED) {
        await tx.return.update({
          where: { id: order.return.id },
          data: { status: ReturnStatus.REFUNDED },
        });
      }
    });

    return true;
  }
}
