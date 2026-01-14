import { Body, Controller, Get, Param, Post, Query, UseGuards, HttpCode } from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { User } from "../../shared/decorators/user.decorator";
import type { CurrentUser } from "../../shared/current-user";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ReturnRequestDto } from "./dto/return-request.dto";

@UseGuards(JwtAccessGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @HttpCode(200)
  async create(@User() user: CurrentUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Get()
  async list(@User() user: CurrentUser, @Query() query: any) {
    return this.orders.list(user, query);
  }

  @Get(":id")
  async detail(@User() user: CurrentUser, @Param("id") id: string) {
    return this.orders.detail(user, id);
  }

  @Post(":id/confirm")
  @HttpCode(200)
  async confirm(@User() user: CurrentUser, @Param("id") id: string) {
    return this.orders.confirmDelivered(user, id);
  }

  @Post(":id/cancel-request")
  @HttpCode(200)
  async cancel(@User() user: CurrentUser, @Param("id") id: string) {
    return this.orders.cancelRequest(user, id);
  }

  @Post(":id/return-request")
  @HttpCode(200)
  async returnReq(@User() user: CurrentUser, @Param("id") id: string, @Body() dto: ReturnRequestDto) {
    return this.orders.returnRequest(user, id, dto.reason);
  }
}