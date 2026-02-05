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
import { OrderShipDto } from "../orders/dto/order-ship.dto";
import { OrderStatus, ReturnStatus } from "@prisma/client";
import { ERR } from "../../shared/errors";
import { OrderMapper } from "../orders/mappers/order.mapper";
import { AdminOrdersService } from "./admin-orders.service"; // ✅ 추가

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminOrdersService: AdminOrdersService, // ✅ 추가
  ) {}

  @Get()
  async list(@Query() query: any) {
    // 필터/검색 로직은 service로
    return this.adminOrdersService.list(query);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, displayName: true, phone: true } },
        items: true,
        return: true,
        refundLogs: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) throw new HttpException({ ...ERR.ORDER_NOT_FOUND, details: { id } }, 404);

    return OrderMapper.toAdminDetail(order as any);
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
